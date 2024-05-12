using System;
using System.IO;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using System.Net.Http;
using Newtonsoft.Json.Linq;

using OneOS.Common;
using OneOS.Language;

namespace OneOS.Runtime.Kernel
{
    public class RegistryManager : RpcAgent
    {
        // should use static instance. See: https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient?view=net-6.0
        static readonly HttpClient HttpClient = new HttpClient();

        private Runtime Runtime;
        private Random Random;
        private Dictionary<string, (Task, TaskCompletionSource<object>)> PendingSpawns;
        private Dictionary<string, (Task, TaskCompletionSource<object>)> PendingKills;
        private Scheduler Scheduler;

        private List<string> ActiveRuntimes { get => Runtime.ActiveRuntimes; }

        public RegistryManager(Runtime runtime) : base(runtime)
        {
            Runtime = runtime;
            URI = Runtime.RegistryManagerUri;
            Random = new Random();
            PendingSpawns = new Dictionary<string, (Task, TaskCompletionSource<object>)>();
            PendingKills = new Dictionary<string, (Task, TaskCompletionSource<object>)>();
            Scheduler = new Scheduler(this, Runtime);

            PrepareForInitialSpawns();
        }

        // When the runtimes start up, the agents residing on that runtime
        // will attempt to "check in", assuming that there are pending TCS objects
        private void PrepareForInitialSpawns()
        {
            foreach (var item in Runtime.Registry.Agents)
            {
                PendingSpawns.Add(item.Key, (Task.CompletedTask, new TaskCompletionSource<object>()));
            }
        }

        private string SelectRuntime(Registry.AgentInfo agentInfo)
        {
            /*var index = Random.Next(0, Runtimes.Count);
            return Runtimes[index];*/
            return ActiveRuntimes.PickRandom();
        }

        private string GenerateAgentURI(string username, string binaryPath, string codePath)
        {
            string codeName = Path.GetFileName(codePath);
            return $"{username}.{Runtime.Domain}/agents/{binaryPath}/{codeName}/{RandomText.Next()}";
        }

        // TODO: Error handling
        private async Task<object> SpawnSequentially(List<Registry.AgentInfo> infos)
        {
            if (infos.Count == 0) return null;

            Console.WriteLine($"{this} Spawning {infos[0].URI} on {infos[0].Runtime}");

            // TODO: Synchronize Registry across the cluster
            Runtime.Registry.AddAgent(infos[0].URI, infos[0]);

            // TODO: Synchronize once at the beginning and reuse the sync
            var sync = Runtime.SyncRegistry();

            // Wait until the Runtime actually spawns the agent
            // -- the Runtime will emit a signal
            var tcs = new TaskCompletionSource<object>();
            PendingSpawns[infos[0].URI] = (sync, tcs);

            await tcs.Task;

            await SpawnSequentially(infos.Skip(1).ToList());

            return null;
        }

        [RpcMethod]
        public async Task<object> Spawn(string username, string language, JObject environment, string binaryPath, string arguments = null)
        {
            string uri = GenerateAgentURI(username, binaryPath, arguments.Split(' ')[0]);

            return await SpawnAs(uri, username, language, environment, binaryPath, arguments);
        }

        [RpcMethod]
        public async Task<object> SpawnAs(string agentUri, string username, string language, JObject environment, string binaryPath, string arguments = null, string children = null)
        {
            var env = environment.ToObject<Dictionary<string, string>>();
            var agentInfo = new Registry.AgentInfo();
            agentInfo.URI = agentUri;
            agentInfo.User = username;
            agentInfo.Language = (Registry.AgentInfo.LanguageInfo)Enum.Parse(typeof(Registry.AgentInfo.LanguageInfo), language);
            agentInfo.Environment = env;
            agentInfo.OutputToShell = true;
            agentInfo.BinaryPath = binaryPath;
            agentInfo.Arguments = arguments;
            agentInfo.CheckpointInterval = int.Parse(env["CHECKPOINT_INTERVAL"]);
            agentInfo.OutputRateLimit = 9999;

            if (agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOSKernel)
            {
                agentInfo.Subscriptions = new List<string> { $"{agentInfo.URI}:stdin", $"{agentInfo.URI}:upstream" };

                // first translate the file path from global namespace to local
                var tokens = arguments.Split(' ');
                var abspath = tokens[0];
                //var args = string.Join(" ", tokens.Skip(1));

                var locations = Runtime.Registry.ListFileLocations(abspath, Runtime.URI);
                var copyHolder = locations.Keys.ToList().PickRandom();
                //var copyPath = locations[copyHolder];

                // Request local absolute path at the target Runtime
                //var localAbsolutePath = await Request(copyHolder + "/storage", "GetLocalAbsolutePath", copyPath);

                // TODO: Select Runtime based on copy holder
                // TODO: Replicate file to new Runtime if needed
                agentInfo.Runtime = copyHolder;
            }
            else
            {
                agentInfo.Runtime = SelectRuntime(agentInfo);
            }

            // This is a hacky way to inform about child agents when creating RemoteAgents
            if (children != null)
            {
                //Console.WriteLine($"{this} Added children to {agentInfo.URI}");
                agentInfo.Children = children.Split(',').Select(child => agentInfo.URI + "/" + child).ToList();
            }
            else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOS)
            {
                agentInfo.Children = new List<string>() { $"{agentInfo.URI}/interpreter" };
            }

            // TODO: Synchronize Registry across the cluster
            Runtime.Registry.AddAgent(agentUri, agentInfo);
            Console.WriteLine($"{this} Spawning {agentUri} on {agentInfo.Runtime}");

            var sync = Runtime.SyncRegistry();

            // Wait until the Runtime actually spawns the agent
            // -- the Runtime will emit a signal
            var tcs = new TaskCompletionSource<object>();
            PendingSpawns[agentUri] = (sync, tcs);

            await tcs.Task;

            return agentUri;
        }

        [RpcMethod]
        public async Task<object> SpawnPipeline(string username, JObject environment, params object[] args)
        {
            var commands = args.Select(item => (string)item).ToArray();

            var agentInfos = commands.Select((expr, index) =>
            {
                var agentInfo = new Registry.AgentInfo();
                agentInfo.URI = GenerateAgentURI(username, "node", expr.Split(' ')[0]);
                agentInfo.User = username;
                agentInfo.Language = Registry.AgentInfo.LanguageInfo.JavaScript;
                agentInfo.Environment = environment.ToObject<Dictionary<string, string>>();
                agentInfo.OutputToShell = false;
                agentInfo.BinaryPath = "node";
                agentInfo.Arguments = expr;
                agentInfo.CheckpointInterval = index == 0 ? 1000 : 0;
                agentInfo.OutputRateLimit = 9999;

                var tokens = expr.Split(' ');
                var abspath = tokens[0];
                var locations = Runtime.Registry.ListFileLocations(abspath, Runtime.URI);
                var copyHolder = locations.Keys.ToList().PickRandom();
                agentInfo.Runtime = copyHolder;
                return agentInfo;
            }).ToList();

            for (var i = 1; i < agentInfos.Count; i++)
            {
                Runtime.Registry.CreatePipe(agentInfos[i-1].URI, agentInfos[i].URI);
            }

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            // Start spawning agents one by one, starting from the sink agent
            agentInfos.Reverse();
            await SpawnSequentially(agentInfos);

            return true;
        }

        /*[RpcMethod]
        public async Task<object> SpawnGraph(string username, JObject environment, JObject json)
        {
            return await SpawnGraph(username, environment, json, null);
        }*/

        [RpcMethod]
        public async Task<object> SpawnGraph(string username, JObject environment, JObject graphJson, JObject policyJson = null)
        {
            var graph = Graph.FromJson(graphJson);
            Console.WriteLine(graph.ToJson().ToString());

            Policy policy = null;

            if (policyJson != null)
            {
                policy = Policy.FromJson(policyJson);
                Console.WriteLine(policy.ToJson().ToString());
            }

            // generate agent infos
            //var agentMap = new Dictionary<string, Registry.AgentInfo>();
            var schedule = Scheduler.ScheduleGraph(username, environment.ToObject<Dictionary<string, string>>(), graph, policy);

            /*foreach (var item in graph.Nodes)
            {
                var node = item.Value;
                var agentInfo = new Registry.AgentInfo();
                agentInfo.URI = GenerateAgentURI(username, node.BinaryPath, node.Arguments.Split(' ')[0]);
                agentInfo.User = username;
                agentInfo.Language = LanguageMap[node.BinaryPath];
                agentInfo.Environment = environment.ToObject<Dictionary<string, string>>();
                agentInfo.OutputToShell = false;
                agentInfo.BinaryPath = node.BinaryPath;
                agentInfo.Arguments = node.Arguments;
                agentInfo.CheckpointInterval = 0;
                agentInfo.OutputRate = 1;

                agentInfo.Runtime = schedule[node.Id].Item1;
                schedule[node.Id].Item2?.Invoke(agentInfo);

                agentMap[node.Id] = agentInfo;
            }

            foreach (var item in graph.Edges)
            {
                var edge = item.Value;
                var pipeGroup = graph.URI + "." + item.Key;
                Runtime.Registry.CreatePipe(agentMap[edge.Source.Id].URI, agentMap[edge.Sink.Id].URI, pipeGroup);
            }*/

            foreach (var item in schedule.Pipes)
            {
                Runtime.Registry.CreatePipe(item.Value);
            }

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            // Determine spawn order by traversing the graph,
            // starting from the most downstream
            //var agentInfos = graph.GetSpawnOrder().Select(id => agentMap[id]).ToList();
            
            //agentInfos.Last().CheckpointInterval = 60000; // the top source begins the checkpointing waterfall

            await SpawnSequentially(schedule.Agents.Values.ToList());
            //await SpawnSequentially(agentInfos);

            return true;
        }

        [RpcMethod]
        public string TestSpawnGraph(string username, JObject environment, JObject graphJson, JObject policyJson = null)
        {
            var graph = Graph.FromJson(graphJson);
            Console.WriteLine(graph.ToJson().ToString());

            Policy policy = null;

            if (policyJson != null)
            {
                policy = Policy.FromJson(policyJson);
                Console.WriteLine(policy.ToJson().ToString());
            }

            // generate agent infos
            //var agentMap = new Dictionary<string, Registry.AgentInfo>();
            var schedule = Scheduler.ScheduleGraph(username, environment.ToObject<Dictionary<string, string>>(), graph, policy);

            return string.Join("\n", schedule.Agents.Values.Select(agent => $"{agent.BinaryPath} {agent.Arguments} on {agent.Runtime}{(agent.StandbyRuntime != null ? $" ({agent.StandbyRuntime})" : "")}"));
        }

        // This method will be called exclusively by the runtime
        // spawning the newly created agent
        // in order to signal to the RegistryManager that the agent is ready
        // Note: This method will be called concurrently with the SyncRegistry method (whose task is stored in Item1).
        //       We make sure to wait for the SyncRegistry to complete before checking in the agent
        [RpcMethod]
        public async Task<object> CheckInAgent(string agentUri)
        {
            if (PendingSpawns.ContainsKey(agentUri))
            {
                var checks = PendingSpawns[agentUri];
                PendingSpawns.Remove(agentUri);

                await checks.Item1;

                if (checks.Item2.Task.IsCompleted
                    || checks.Item2.Task.IsFaulted
                    || checks.Item2.Task.IsCanceled)
                {
                    throw new OperationError($"{agentUri} was already checked in");
                }

                checks.Item2.SetResult(new object());
                return true;
            }

            throw new OperationError($"Not expecting {agentUri} to check in");
        }

        [RpcMethod]
        public async Task<object> Kill(string username, string agentUri)
        {
            if (!Runtime.Registry.Agents.ContainsKey(agentUri))
            {
                throw new OperationError($"Agent {agentUri} does not exist");
            }

            // TODO: Synchronize Registry across the cluster
            Runtime.Registry.RemoveAgent(agentUri);

            var sync = Runtime.SyncRegistry();

            // Wait until the Runtime actually kills the agent
            // -- the Runtime will emit a signal
            var tcs = new TaskCompletionSource<object>();
            PendingKills[agentUri] = (sync, tcs);

            await tcs.Task;
            //Console.WriteLine($"Killed {agentUri}");

            return agentUri;
        }

        // This method will be called exclusively by the runtime
        // killing the newly created agent
        // in order to signal to the RegistryManager that the agent is killed
        [RpcMethod]
        public async Task<object> CheckOutAgent(string agentUri, JObject outpipeStatus)
        {
            if (PendingKills.ContainsKey(agentUri))
            {
                var checks = PendingKills[agentUri];
                PendingKills.Remove(agentUri);

                await checks.Item1;

                if (checks.Item2.Task.IsCompleted
                    || checks.Item2.Task.IsFaulted
                    || checks.Item2.Task.IsCanceled)
                {
                    throw new OperationError($"{agentUri} was already checked out");
                }

                checks.Item2.SetResult(new object());

                // remove sockets
                foreach (var key in Runtime.Registry.Sockets.Keys)
                {
                    var socket = Runtime.Registry.Sockets[key];
                    if (socket.Owner == agentUri)
                    {
                        Runtime.Registry.Sockets.Remove(key);
                    }
                }

                // remove associated pipes asynchronously and
                // respond immediately to the agent requesting to check out
                RemovePipesFrom(agentUri, outpipeStatus.ToObject<Dictionary<string, long>>());

                // emit oneos global event to notify other agents such as storage agents
                // to close any related resources (e.g., file streams)
                var evt = new ObjectMessage<Dictionary<string, string>>(new Dictionary<string, string>()
                {
                    { "type", "end" },
                    { "agent", agentUri }
                });
                var message = CreateMessage("events." + Runtime.Domain + "/agent-lifecycle", evt.Serialize());
                Outbox.Write(message);

                Console.WriteLine($"{this} Emitted lifecycle event for {agentUri} while on {Runtime.URI}");

                return true;
            }
            throw new OperationError($"{agentUri} was already checked out");
        }

        [RpcMethod]
        public async Task<object> CreatePipe(string source, string sink)
        {
            // TODO: Synchronize Registry across the cluster
            var pipeId = Runtime.Registry.CreatePipe(source, sink);

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            return pipeId;
        }

        [RpcMethod]
        public async Task<object> RemovePipe(string source, string sink)
        {
            // TODO: Synchronize Registry across the cluster
            Runtime.Registry.RemovePipe(source, sink);

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            return true;
        }

        [RpcMethod]
        public async Task<object> RemovePipesFrom(string source, Dictionary<string, long> outpipeStatus)
        {
            var pipes = Runtime.Registry.GetPipesBySourceAgentURI(source);

            Runtime.Registry.RemovePipesFrom(source);
            
            await Runtime.SyncRegistry();

            var responses = pipes.Select(pipe => Request(pipe.Sink, "CloseUpstream", pipe.Group, source, outpipeStatus[pipe.Group + ":" + pipe.Sink])).ToList();

            //var downstreams = Runtime.Registry.Pipes[source];

            //var responses = downstreams.Select(agentUri => Request(agentUri, "CloseUpstream", source)).ToList();

            await Task.WhenAll(responses);

            //Runtime.Registry.RemovePipesFrom(source);

            // TODO: Synchronize Registry across the cluster
            // Wait until Registry is Synchronized
            //await Runtime.SyncRegistry();

            return true;
        }

        [RpcMethod]
        public async Task<object> CreateDirectory(string absPath)
        {
            // TODO: Synchronize Registry across the cluster
            var directoryPath = Runtime.Registry.CreateDirectory(absPath);

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            return directoryPath;
        }

        [RpcMethod]
        public async Task<object> CreateFile(string absPath)
        {
            var filePath = Runtime.Registry.CreateFile(absPath);
            var copies = Runtime.Registry.AddFileLocation(filePath, ActiveRuntimes.PickRandom(), "/" + Helpers.RandomText.Next(10));

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            return filePath;
        }

        [RpcMethod]
        public async Task<object> CreateFileIfNotFound(string absPath)
        {
            if (!(Runtime.Registry.FileSystemNodeExists(absPath) && Runtime.Registry.IsFile(absPath)))
            {
                var filePath = Runtime.Registry.CreateFile(absPath);

                var copies = ActiveRuntimes.PickRandom(3).ToList();
                foreach (var host in copies)
                {
                    Runtime.Registry.AddFileLocation(filePath, host, "/" + Helpers.RandomText.Next(10));
                }

                // Wait until Registry is Synchronized
                await Runtime.SyncRegistry();
            }

            return absPath;
        }

        [RpcMethod]
        public async Task<object> RemoveFile(string absPath)
        {
            // TODO: Synchronize Registry across the cluster
            var filePath = Runtime.Registry.RemoveFile(absPath);

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            return filePath;
        }

        [RpcMethod]
        public async Task<object> DownloadFile(string cwd, string webURL, string saveName = null)
        {
            try
            {
                //var response = await HttpClient.GetByteArrayAsync(webURL);
                var stream = await HttpClient.GetStreamAsync(webURL);

                var fileName = saveName != null ? saveName : Path.GetFileName(webURL);
                var absPath = Helpers.ResolvePath(cwd, fileName);

                await CreateFileIfNotFound(absPath);

                var locations = Runtime.Registry.ListFileLocations(absPath);

                //var operations = locations.Select(item => Request(item.Key + "/storage", "WriteFile", item.Value, response)).ToList();
                var operations = locations.Select(async item =>
                {
                    var tempClientUri = Helpers.RandomText.Next();

                    var accessKey = await Request(item.Key + "/storage", "CreateWriteStream", item.Value, tempClientUri, absPath);

                    var client = await StorageAgent.GetWriteStream((string)accessKey);

                    return (tempClientUri, client);
                }).ToList();

                var writers = await Task.WhenAll(operations);

                var buffer = new byte[65536];
                while (true)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead > 0)
                    {
                        foreach (var writer in writers)
                        {
                            await writer.client.Stream.WriteAsync(buffer, 0, bytesRead);
                        }
                    }
                    else
                    {
                        foreach (var writer in writers)
                        {
                            await writer.client.Stop();

                            // emit lifecycle event to emulate end of stream
                            // (TODO: this is hacky -- update CreateWriteStream in StorageAgent to better
                            //        accommodate this use case)
                            var evt = new ObjectMessage<Dictionary<string, string>>(new Dictionary<string, string>()
                            {
                                { "type", "end" },
                                { "agent", writer.tempClientUri }
                            });
                            var message = CreateMessage("events." + Runtime.Domain + "/agent-lifecycle", evt.Serialize());
                            Outbox.Write(message);
                        }
                        break;
                    }
                }

                return absPath;
            }
            catch (HttpRequestException e)
            {
                throw new OperationError($"Error while downloading from {webURL}: {e.Message}");
            }
        }

        [RpcMethod]
        public async Task<object> DownloadFileFromLocalhost(string cwd, string pathOnLocalhost, string saveName = null)
        {
            try
            {
                //var response = await HttpClient.GetByteArrayAsync(webURL);
                //var stream = await HttpClient.GetStreamAsync(webURL);
                var stream = File.OpenRead(pathOnLocalhost);

                var fileName = saveName != null ? saveName : Path.GetFileName(pathOnLocalhost);
                var absPath = Helpers.ResolvePath(cwd, fileName);

                await CreateFileIfNotFound(absPath);

                var locations = Runtime.Registry.ListFileLocations(absPath);

                //var operations = locations.Select(item => Request(item.Key + "/storage", "WriteFile", item.Value, response)).ToList();
                var operations = locations.Select(async item =>
                {
                    var tempClientUri = Helpers.RandomText.Next();

                    var accessKey = await Request(item.Key + "/storage", "CreateWriteStream", item.Value, tempClientUri, absPath);

                    var client = await StorageAgent.GetWriteStream((string)accessKey);

                    return (tempClientUri, client);
                }).ToList();

                var writers = await Task.WhenAll(operations);

                var buffer = new byte[65536];
                while (true)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead > 0)
                    {
                        foreach (var writer in writers)
                        {
                            await writer.client.Stream.WriteAsync(buffer, 0, bytesRead);
                        }
                    }
                    else
                    {
                        foreach (var writer in writers)
                        {
                            await writer.client.Stop();

                            // emit lifecycle event to emulate end of stream
                            // (TODO: this is hacky -- update CreateWriteStream in StorageAgent to better
                            //        accommodate this use case)
                            var evt = new ObjectMessage<Dictionary<string, string>>(new Dictionary<string, string>()
                            {
                                { "type", "end" },
                                { "agent", writer.tempClientUri }
                            });
                            var message = CreateMessage("events." + Runtime.Domain + "/agent-lifecycle", evt.Serialize());
                            Outbox.Write(message);
                        }
                        break;
                    }
                }

                return absPath;
            }
            catch (HttpRequestException e)
            {
                throw new OperationError($"Error while downloading {pathOnLocalhost} from localhost: {e.Message}");
            }
        }

        [RpcMethod]
        public async Task<object> CreateSocket(string owner, long port, string hostRuntime)
        {
            var socket = Runtime.Registry.CreateSocket(owner, port, hostRuntime);

            await Runtime.SyncRegistry();

            return socket;
        }

        [RpcMethod]
        public async Task<object> UpdateFileInfo(string absPath, long size, string checksum)
        {
            if (!(Runtime.Registry.FileSystemNodeExists(absPath) && Runtime.Registry.IsFile(absPath)))
            {
                throw new OperationError($"UpdateFileInfo failed becaused {absPath} is not a file");
            }

            Runtime.Registry.UpdateFileInfo(absPath, size, checksum);

            // Wait until Registry is Synchronized
            await Runtime.SyncRegistry();

            Console.WriteLine($"{this} Updated file info for {absPath}: {size}, {checksum}");

            return absPath;
        }

        [RpcMethod]
        public bool UpdateLinkInfo (string source, string sink, long bandwidth, double latency)
        {
            Scheduler.UpdateLinkInfo(source, sink, bandwidth, latency);

            return true;
        }

        [RpcMethod]
        public bool UpdateRuntimeInfo(string runtime, long cores, long clockSpeed, long memory, long disk, string tags, JObject io)
        {
            foreach (var item in io)
            {
                var info = IOConfiguration.FromJObject((JObject)item.Value);
                Runtime.Registry.CreateOrUpdateIO(runtime, info.Name, info.Driver);
            }

            Scheduler.UpdateRuntimeInfo(runtime, (int)cores, clockSpeed, memory, disk, tags.Split(',').ToList());

            return true;
        }

        // Reschedule all the processes that were running on the dropped Runtime
        // Assumes all the runtimes are already aware of the dropped runtime
        // -- i.e., the runtime hosting this RegistryManager excludes it from
        //          the ActiveRuntimes list
        [RpcMethod]
        public async Task<object> DropRuntime(string runtimeUri)
        {
            Console.WriteLine($"{this} Dropping Runtime {runtimeUri}");
            Console.WriteLine($"{this} Currently Pending spawns: {string.Join(", ", PendingSpawns.Keys)}");

            foreach (var item in Runtime.Registry.Agents)
            {
                if (item.Value.Runtime == runtimeUri)
                {
                    if (item.Value.StandbyRuntime != null)
                    {
                        item.Value.Runtime = item.Value.StandbyRuntime;
                        var eligible = item.Value.RuntimePool.Where(uri => uri != runtimeUri && uri != item.Value.Runtime && ActiveRuntimes.Contains(uri)).ToList();
                        if (eligible.Count > 0)
                        {
                            item.Value.StandbyRuntime = eligible[0];
                        }
                        else
                        {
                            // No choice but to pick a runtime outside of the eligible pool
                            item.Value.StandbyRuntime = ActiveRuntimes.Where(uri => uri != item.Value.Runtime).ToList().PickRandom();
                        }

                        //item.Value.StandbyRuntime = ActiveRuntimes.Where(uri => uri != item.Value.Runtime).ToList().PickRandom();   // TODO: we need to get the scheduler to pick an appropriate runtime
                    }
                    else
                    {
                        item.Value.Runtime = ActiveRuntimes.PickRandom();   // TODO: we need to get the scheduler to pick an appropriate runtime
                    }
                    
                    Console.WriteLine($"{this} Rescheduling {item.Key} to {item.Value.Runtime}");

                    // We check for existing pending spawn for the given agent.
                    // If this RegistryManager is itself a newly recovered instance,
                    // it would have created pending spawns via PrepareForInitialSpawns
                    // and thus already have the pending spawn.
                    // If the agent has a standby agent, it will start immediately -- no need to check in
                    if (!PendingSpawns.ContainsKey(item.Key) && item.Value.StandbyRuntime == null)
                    {
                        PendingSpawns.Add(item.Key, (Task.CompletedTask, new TaskCompletionSource<object>()));
                    }
                }

                if (item.Value.StandbyRuntime == runtimeUri)
                {
                    var eligible = item.Value.RuntimePool.Where(uri => uri != runtimeUri && uri != item.Value.Runtime && ActiveRuntimes.Contains(uri)).ToList();
                    if (eligible.Count > 0)
                    {
                        item.Value.StandbyRuntime = eligible[0];
                    }
                    else
                    {
                        // No choice but to pick a runtime outside of the eligible pool
                        item.Value.StandbyRuntime = ActiveRuntimes.Where(uri => uri != item.Value.Runtime).ToList().PickRandom();
                    }

                    //item.Value.StandbyRuntime = ActiveRuntimes.Where(uri => uri != item.Value.Runtime).ToList().PickRandom();   // TODO: we need to get the scheduler to pick an appropriate runtime
                }
            }

            await Runtime.SyncRegistry();

            Console.WriteLine($"{this} Dropped Runtime {runtimeUri}");

            return runtimeUri;
        }

        [RpcMethod]
        public async Task<object> AdmitRuntime(string runtimeUri)
        {
            Console.WriteLine($"{this} Admitting Runtime {runtimeUri}");

            int changesMade = 0;

            foreach (var item in Runtime.Registry.Agents)
            {
                // update agents whose StandbyRuntime were arbitrarily assigned
                // due to none of the runtimes in the eligible pool being available
                if (item.Value.StandbyRuntime != null && !item.Value.RuntimePool.Contains(item.Value.StandbyRuntime))
                {
                    var eligible = item.Value.RuntimePool.Where(uri => uri != item.Value.Runtime && ActiveRuntimes.Contains(uri)).ToList();
                    if (eligible.Count > 0)
                    {
                        item.Value.StandbyRuntime = eligible[0];
                        changesMade++;
                    }
                }
            }

            if (changesMade > 0)
            {
                await Runtime.SyncRegistry();
            }

            Console.WriteLine($"{this} Admitted Runtime {runtimeUri}");

            return runtimeUri;
        }

        [RpcMethod]
        public async Task<object> ExecuteNPMCommand(string username, string args)
        {
            var tasks = Runtime.ActiveRuntimes.Select(host => Task.Run(async () =>
            {
                await Request(host + "/language", "ExecuteNPMCommand", username, true, args);

            })).ToArray();

            await Task.WhenAll(tasks);

            return "...done";
        }

        [RpcMethod]
        public string PrintNetworkModel()
        {
            return Scheduler.PrintNetworkModel();
        }

        [RpcMethod]
        public async Task<object> GetNetworkModel()
        {
            return Scheduler.GetNetworkModel();
        }
    }
}
