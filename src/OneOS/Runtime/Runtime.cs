using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Net;
using System.Linq;
using System.Threading.Tasks;

using OneOS.Common;
using OneOS.Runtime.Driver;

namespace OneOS.Runtime
{
    public class Runtime : RpcAgent
    {
        public const string Version = "0.3";
        private static Dictionary<string, Func<Runtime, Agent>> KernelInitializers = new Dictionary<string, Func<Runtime, Agent>>
        {
            { "SessionManager", (runtime) => new Kernel.SessionManager(runtime) },
            { "RegistryManager", (runtime) => new Kernel.RegistryManager(runtime) }
        };
        private static Dictionary<string, AgentInitializerForCLI> OneOSInitializers = new Dictionary<string, AgentInitializerForCLI>
        {
            { "UserShell", (runtime, args) => new Kernel.UserShell((Runtime)runtime, args.Split(' ')[0]) }
        };

        private Configuration Config;           // Configuration loaded from JSON
        private FileStream EventLog;            // Event Log
        private FileStream ErrorLog;            // Error Log
        private AgentMonitor Monitor;           // Performance Monitor

        private Router Router;                  // Router
        private TcpAgent ConnectionManager;     // TCP ConnectionManager
        private StorageAgent StorageManager;    // Local Storage Manager
        private LanguageManager LanguageManager;            // Local Language VM Manager
        private IOManager IOManager;            // Local IO Manager
        private Synchronizer Synchronizer;      // Registry Synchronizer

        internal Registry Registry;                         // Global registry of agents and files
        private Dictionary<string, Agent> KernelAgents;     // Kernel agents locally hosted
        private Dictionary<string, Agent> UserAgents;       // Userland agents locally hosted
        private Dictionary<string, Agent> StandbyAgents;    // Standby agents for quick recovery
        private Dictionary<string, RemoteAgent> RemoteAgents;       // Agents located on other Runtimes
        //private Dictionary<string, List<string>> Pipes;             // Userland pipes locally hosted
        private Dictionary<int, ReverseProxy> ReverseProxies;       // Reverse proxies for global sockets

        private Action OnNextTick;  // A quick hack for emulating events
        public event Action<string, object> OnRuntimeStateEvent;   // we use the C# events as this message should act like an "interrupt" and not as a regular message

        public string Domain { get => Config.Domain; }
        internal string LocalAddress { get => $"{Dns.GetHostName()}:{Config.Port}"; }
        public Dictionary<string, IPEndPoint> Peers { get => Config.Peers; }
        internal string TempDataPath { get => Config.TempDataPath; }
        public string RegistryManagerUri { get => $"kernels.{Domain}/RegistryManager"; }
        public string SessionManagerUri { get => $"kernels.{Domain}/SessionManager"; }

        //public bool IsLeader { get => Synchronizer.Status == RaftStatus.Leader; }
        public bool IsLeader { get => CurrentLeader == URI; }
        public string CurrentLeader { get => AllRuntimes.OrderBy(item => item).ToList()[0]; }
        public List<string> ActivePeers { get => Peers.Keys.Where(key => RemoteAgents[key].IsReachable).ToList(); }
        public List<string> ActiveRuntimes { get => new List<string>() { URI }.Concat(Peers.Keys.Where(key => RemoteAgents[key].IsReachable)).ToList(); }
        public List<string> AllRuntimes { get => new List<string>() { URI }.Concat(Peers.Keys).ToList(); }

        public Runtime(Configuration config) : base(null)
        {
            Config = config;
            URI = Config.URI;
            EventLog = new FileStream(Config.EventLogPath, FileMode.Append);
            ErrorLog = new FileStream(Config.ErrorLogPath, FileMode.Append);
            
            Monitor = new AgentMonitor(Config.LogDataPath, 250);
            Router = new Router(this);
            ConnectionManager = new TcpAgent(this, Config.Port);
            StorageManager = new StorageAgent(this, Config.StoragePath, Config.Port);
            LanguageManager = new LanguageManager(this, Config.VMs);
            IOManager = new IOManager(this, Config.Port, Config.IO);
            Synchronizer = new Synchronizer(this);

            Router.AddAgent(StorageManager);
            Router.AddAgent(LanguageManager);
            Router.AddAgent(IOManager);
            Router.AddAgent(Synchronizer);

            Router.AddSubscriber("events." + Config.Domain + "/agent-lifecycle", StorageManager.URI);

            Registry = new Registry();
            KernelAgents = new Dictionary<string, Agent>();
            UserAgents = new Dictionary<string, Agent>();
            StandbyAgents = new Dictionary<string, Agent>();
            RemoteAgents = new Dictionary<string, RemoteAgent>();
            //Pipes = new Dictionary<string, List<string>>();
            ReverseProxies = new Dictionary<int, ReverseProxy>();

            Synchronizer.OnPeerDropped += peerUri =>
            {
                Console.WriteLine($"{this} Detected {peerUri} dropped");

                // Drop peer if not already dropped
                // (OnPeerDropped can potentially be called several times
                // as subsequent heartbeats are missed)
                bool dropped = DropPeer(peerUri);
                if (dropped)
                {
                    // if this node is leader, notify all other peers
                    if (IsLeader)
                    {
                        Task.Run(async () =>
                        {
                            // check if any kernel agents were dropped
                            // and if yes reschedule them
                            var kernelsDropped = Registry.Kernels.Where(item => item.Value == peerUri).ToList();

                            if (kernelsDropped.Count > 0)
                            {
                                foreach (var item in kernelsDropped)
                                {
                                    Registry.Kernels[item.Key] = ActiveRuntimes.PickRandom();
                                }

                                await SyncRegistry();
                            }

                            // Notify other peers that a peer was dropped
                            var tasks = new List<Task>();

                            foreach (var item in ActivePeers)
                            {
                                //Console.WriteLine($"{this} Asking {item} to drop {peerUri}");
                                tasks.Add(Request(item, "DropPeer", peerUri));
                            }

                            await Task.WhenAll(tasks);

                            // Notify RegistryManager
                            await Request(RegistryManagerUri, "DropRuntime", peerUri);

                            Console.WriteLine($"{this} Runtime {peerUri} Dropped Successfully");
                        });
                    }

                    //OnRuntimeStateEvent?.Invoke("runtime-leave", peerUri);
                }
            };

            Synchronizer.OnPeerJoined += peerUri =>
            {
                Console.WriteLine($"{this} Detected {peerUri} joined");

                // This event handler must be synchronous to make sure
                // that the newly joined peer is up to date
                var task = Request(peerUri, "UpdateRegistry", Registry.Serialize());
                task.Wait();

                Console.WriteLine($"{this} {peerUri} was brought up to date");

                bool admitted = AdmitPeer(peerUri);

                if (admitted)
                {
                    // if this node is leader, notify all other peers
                    if (IsLeader)
                    {
                        Task.Run(async () =>
                        {
                            // Notify other peers that a peer was admitted
                            var tasks = new List<Task>();

                            foreach (var item in ActivePeers)
                            {
                                //Console.WriteLine($"{this} Asking {item} to drop {peerUri}");
                                tasks.Add(Request(item, "AdmitPeer", peerUri));
                            }

                            await Task.WhenAll(tasks);

                            // Notify RegistryManager
                            await Request(RegistryManagerUri, "AdmitRuntime", peerUri);

                            Console.WriteLine($"{this} Runtime {peerUri} Admitted Successfully");
                        });
                    }
                }

                //OnRuntimeStateEvent?.Invoke("runtime-join", peerUri);
            };
        }

        /*private List<string> LocalKernelSchedule
        {
            get => Registry.GetKernelAgentsByRuntimeURI(URI);
        }

        private List<string> LocalUserSchedule
        {
            get => Registry.GetUserAgentsByRuntimeURI(URI);
        }

        private List<Registry.PipeInfo> LocalPipeSchedule
        {
            get => Registry.GetPipesByRuntimeURI(URI);
        }*/

        private void SaveRegistry()
        {
            // TODO: Handle the exception
            //       For now, just print to console and ignore it as it isn't critical to save registry to disk
            try
            {
                File.WriteAllText(Config.RegistryPath, Registry.ToJsonString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} Failed to Save Registry to Disk");
            }
        }

        private void LoadRegistry()
        {
            Registry = Registry.FromJsonString(File.ReadAllText(Config.RegistryPath));
        }

        internal async Task<List<string>> SyncRegistry()
        {
            var tasks = new List<Task>();
            var results = new List<string>();

            Console.WriteLine($"\n{this} Syncing Registry with {ActivePeers.Count} peers...");

            foreach (var item in ActivePeers)
            {
                var task = Request(item, "UpdateRegistry", Registry.Serialize());
                var cont = task.ContinueWith(prev =>
                {
                    results.Add(item);
                }, TaskContinuationOptions.OnlyOnRanToCompletion);
                tasks.Add(cont);
            }

            await Task.WhenAll(tasks);

            SaveRegistry();

            Console.WriteLine($"{this} Done Syncing Registry!\n");

            return results;
        }

        [RpcMethod]
        public string UpdateRegistry(byte[] payload)
        {
            Registry = Registry.FromBytes(payload);

            SaveRegistry();

            Console.WriteLine($"{this} Updated Registry");
            return URI;
        }

        [RpcMethod]
        public bool DropPeer(string peerUri)
        {
            if (RemoteAgents[peerUri].Status != RemoteAgent.ConnectionStatus.Dropped)
            {
                RemoteAgents[peerUri].DropSockets();
                Console.WriteLine($"{this} {peerUri} dropped");

                OnRuntimeStateEvent?.Invoke("runtime-leave", peerUri);

                // If the dropped peer (peerUri) was the primary runtime for the
                // standby agents that this runtime is hosting, start the standby agents
                foreach (var item in StandbyAgents)
                {
                    var agentInfo = Registry.Agents[item.Key];
                    if (agentInfo.Runtime == peerUri)
                    {
                        StartStandbyAgent(agentInfo);
                    }
                }

                return true;
            }

            return false;
        }

        [RpcMethod]
        public bool AdmitPeer(string peerUri)
        {
            OnRuntimeStateEvent?.Invoke("runtime-join", peerUri);

            return true;
        }

        // This method is called by the remote runtime hosting the Sink of the DirectOutputPipe
        [RpcMethod]
        public bool RestoreDirectOutputPipe(string sinkRuntime, string pipeKey)
        {
            var pipeInfo = Registry.Pipes[pipeKey];
            var source = UserAgents[pipeInfo.Source];
            if (source is ProcessAgent)
            {
                var agent = (ProcessAgent)source;

                Console.WriteLine($"{this} Restoring Pipe ({pipeInfo.Group}) {pipeInfo.Source} -> {pipeInfo.Sink}");
                CreateAgentLinkAt(sinkRuntime, pipeInfo.Source, pipeInfo.Sink, pipeInfo.Group).ContinueWith(prev =>
                {
                    if (prev.Status == TaskStatus.RanToCompletion)
                    {
                        agent.DirectOutputPipes[pipeInfo.Group].UpdateSink(pipeInfo.Sink, prev.Result);
                    }
                    else
                    {
                        Console.WriteLine(prev.Exception);
                        Console.WriteLine($"{this} Failed to update Agent Link from {pipeInfo.Source} to {pipeInfo.Sink}");
                    }
                });

                return true;
            }
            else if (source is OneOSLambdaAgent)
            {
                var agent = (OneOSLambdaAgent)source;

                Console.WriteLine($"{this} Restoring Pipe ({pipeInfo.Group}) {pipeInfo.Source} -> {pipeInfo.Sink}");
                CreateAgentLinkAt(sinkRuntime, pipeInfo.Source, pipeInfo.Sink, pipeInfo.Group).ContinueWith(prev =>
                {
                    if (prev.Status == TaskStatus.RanToCompletion)
                    {
                        agent.DirectOutputPipes[pipeInfo.Group].UpdateSink(pipeInfo.Sink, prev.Result);
                    }
                    else
                    {
                        Console.WriteLine(prev.Exception);
                        Console.WriteLine($"{this} Failed to update Agent Link from {pipeInfo.Source} to {pipeInfo.Sink}");
                    }
                });

                return true;
            }
            else
            {
                return false;
            }
        }

        [RpcMethod]
        public string CreateAgentMonitorStream(string agentUri, string clientUri)
        {
            var pipeKey = Monitor.CreateMonitorReadStream(agentUri, clientUri);

            string hostName = Dns.GetHostName();

            return hostName + ":" + Config.Port.ToString() + ":" + pipeKey;
        }

        private async Task RequestHandshake(string peerUri)
        {
            var remote = GetOrCreateRemoteAgent(peerUri);
            // TODO: Devise a generic way to add remote agent's children.
            //       For now, just add them manually as there aren't many
            var remoteStorage = GetOrCreateRemoteAgent($"{peerUri}/storage", peerUri);
            var remoteLanguage = GetOrCreateRemoteAgent($"{peerUri}/language", peerUri);
            var remoteIO = GetOrCreateRemoteAgent($"{peerUri}/io", peerUri);
            var remoteSync = GetOrCreateRemoteAgent($"{peerUri}/sync", peerUri);

            var socket = ConnectionManager.ConnectTo(Peers[peerUri]);

            try
            {
                await socket.Connected;
            }
            catch (Exception ex)
            {
                DropPeer(peerUri);
                return;
            }

            //Console.WriteLine($"{this} Connected to {peerUri}... Exchanging handshake");
            var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.PeerConnectionRequest, URI);
            await socket.StreamWrite(request.Serialize());

            var responsePayload = await socket.StreamRead();
            if (responsePayload.Length > 0)
            {
                var response = RuntimeMessage.FromBytes(responsePayload);
                //Console.WriteLine($"{this} ... exchanged handshake with {response.Arguments[0]}");

                socket.Listen(payload =>
                {
                    //Console.WriteLine($"Received {payload.Length} bytes");

                    // This connection is now used for Message objects.
                    // Parse a Message, and push it to the Router
                    try
                    {
                        var message = Message.FromBytes(payload);
                        if (RemoteAgents.ContainsKey(message.Author))
                        {
                            RemoteAgents[message.Author].Outbox.Write(message);
                        }
                        else
                        {
                            Console.WriteLine($"{this} Unexpected message from {message.Author} on channel {message.Channel} (from peer {peerUri} on ActiveSocket)");
                        }
                    }
                    catch (ArgumentException ex)
                    {
                        Console.WriteLine($"{this} Invalid message received from {socket}");
                        Console.WriteLine(ex);
                    }
                });

                //var remote = GetOrCreateRemoteAgent(peer.Key);
                remote.SetActiveSocket(socket);
                remoteStorage.SetActiveSocket(socket);
                remoteLanguage.SetActiveSocket(socket);
                remoteSync.SetActiveSocket(socket);

                //Router.AddSubscriber("events." + Config.Domain + "/agent-lifecycle", remoteStorage.URI);
            }

            await Task.Delay(1000);

            ProfileConnection(peerUri);
        }

        private async Task AcceptHandshake(string peerUri, TcpAgent.ServerSideSocket socket, Action onConnected = null)
        {
            //Console.WriteLine($"{this} Received PeerConnectionRequest from {peerUri}");

            var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.PeerConnectionResponse, URI);
            await socket.StreamWrite(response.Serialize());

            onConnected?.Invoke();

            // Once the client is connected to the runtime,
            // the socket's protocol is "elevated" to handle Message objects (not RuntimeMessage).
            socket.Listen(payload =>
            {
                // Update the peer status so that we don't make wasteful heartbeats
                Synchronizer.UpdatePeerHeartbeat(peerUri);

                //Console.WriteLine($"Received {payload.Length} bytes");

                // This connection is now used for Message objects.
                // Parse a Message, and push it to the Router
                try
                {
                    var message = Message.FromBytes(payload);

                    if (RemoteAgents.ContainsKey(message.Author))
                    {
                        RemoteAgents[message.Author].Outbox.Write(message);
                    }
                    else
                    {
                        Console.WriteLine($"{this} Unexpected message from {message.Author} on channel {message.Channel} (from peer {peerUri} on PassiveSocket)");
                    }
                }
                catch (ArgumentException ex)
                {
                    Console.WriteLine($"{this} Invalid message ({payload.Length} bytes) received from {socket}");
                    Console.WriteLine(ex);
                }
            });

            var remote = GetOrCreateRemoteAgent(peerUri);
            remote.SetPassiveSocket(socket);

            var remoteStorage = GetOrCreateRemoteAgent($"{peerUri}/storage", peerUri);
            var remoteLanguage = GetOrCreateRemoteAgent($"{peerUri}/language", peerUri);
            var remoteIO = GetOrCreateRemoteAgent($"{peerUri}/io", peerUri);
            var remoteSync = GetOrCreateRemoteAgent($"{peerUri}/sync", peerUri);

            Router.TryAddSubscriber($"events.{Config.Domain}/agent-lifecycle", $"{peerUri}/storage");

            // Check if this peer was previously connected, but dropped
            // If it was dropped, we need to request handshake again
            if (remote.Status == RemoteAgent.ConnectionStatus.Dropped)
            {
                await RequestHandshake(peerUri);
            }
        }

        internal void AddUserAgent(Agent agent)
        {
            Router.AddAgentAndAllDescendants(agent);
        }

        // This method is called when the Runtime detects that
        // it is responsible for the given agent in the Registry
        // i.e., either new agent spawned, or migrated
        private async void CreateUserAgent(Registry.AgentInfo agentInfo)
        {
            Agent agent;
            TaskCompletionSource<bool> pipesReady = new TaskCompletionSource<bool>();

            if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOSKernel)
            {
                var initializer = agentInfo.BinaryPath;
                agent = OneOSInitializers[initializer](this, agentInfo.Arguments);
                UserAgents[agentInfo.URI] = agent;
                Router.AddAgentAndAllDescendants(agent);

                pipesReady.SetResult(true);
            }
            else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOS)
            {
                // The agentInfo contains global paths for any resources.
                // Resolve the global paths to local paths before proceeding
                var tokens = agentInfo.Arguments.Split(' ');
                var locations = Registry.ListFileLocations(tokens[0], URI);
                //var copyPath = locations[URI];  // We assume that this Runtime has the file
                //var localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);

                string localAbsolutePath;

                // if this Runtime has the file, translate to local path
                if (locations.Keys.Contains(URI))
                {
                    var copyPath = locations[URI];
                    localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);

                    Console.WriteLine($"{this} has the file {tokens[0]} locally");
                }
                else
                {
                    // fetch the file and use temporary path
                    var copyHolder = locations.Keys.ToList().PickRandom();
                    var copyPath = locations[copyHolder];

                    Console.WriteLine($"{this} does not have the file {tokens[0]} -- reading from {copyHolder}");

                    var response = await Request(copyHolder + "/storage", "ReadTextFile", copyPath);
                    var content = (string)response;
                    localAbsolutePath = Path.Combine(TempDataPath, Path.GetFileName(tokens[0]));
                    File.WriteAllText(localAbsolutePath, content);
                }

                var scriptArguments = string.Join(" ", tokens.Skip(1));

                OneOSScriptAgent script = new OneOSScriptAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                agent = script;
                UserAgents[agentInfo.URI] = agent;
                Router.AddAgentAndAllDescendants(agent);

                script.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");

                        // TODO: Remove this Hack
                        // This hack is used to double-force synchronization after termination
                        SyncRegistry();
                    });
                });

                pipesReady.SetResult(true);
            }
            else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOSLambda)
            {
                OneOSLambdaAgent lambda = new OneOSLambdaAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, agentInfo.BinaryPath, agentInfo.Arguments);

                agent = lambda;
                UserAgents[agentInfo.URI] = agent;
                Router.AddAgentAndAllDescendants(agent);
                //Router.AddSubscriber(agent.URI + ":stdin", agent.URI);  // Process agents subscribe to messages directed at its stdin
                //Router.AddSubscriber(agent.URI + ":upstream", agent.URI);
                foreach (var topic in agentInfo.Subscriptions)
                {
                    Router.AddSubscriber(topic, agent.URI);
                }

                lambda.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");

                        // TODO: Remove this Hack
                        // This hack is used to double-force synchronization after termination
                        SyncRegistry();
                    });
                });

                // check if there are direct output pipes
                var outPipes = Registry.GetPipesBySourceAgentURI(agentInfo.URI);
                var agentLinks = new List<Task>();

                foreach (var pipe in outPipes)
                {
                    Console.WriteLine($"{this} Creating Pipe ({pipe.Group}) {pipe.Source} -> {pipe.Sink}");
                    var linkReady = CreateAgentLink(agentInfo.URI, pipe.Sink, pipe.Group).ContinueWith(prev =>
                    {
                        if (prev.Status == TaskStatus.RanToCompletion)
                        {
                            lambda.AddDirectOutputPipe(pipe.Sink, pipe.Group, prev.Result);
                        }
                        else
                        {
                            Console.WriteLine(prev.Exception);
                            Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {pipe.Sink}");
                        }
                    });

                    // Add a redirect rule to route messages from the :downstream channel to the :upstream channel
                    Router.AddRedirectRule(agentInfo.URI + ":downstream", pipe.Sink + ":upstream");   // TODO: Revise this experimental mechanism

                    agentLinks.Add(linkReady);
                }

                Task.WhenAll(agentLinks).ContinueWith(_ =>
                {
                    pipesReady.SetResult(true);
                });
            }
            else
            {
                // The following line is needed to signal that
                // CreateUserAgent process has begun for this agent.
                // Without this, CreateUserAgent will be called multiple times.
                // Because this method complete asynchronously, the calling
                // thread can only observe its completion asynchronously.
                var placeHolder = new AgentPlaceHolder();
                UserAgents[agentInfo.URI] = placeHolder;

                // The agentInfo contains global paths for any resources.
                // Resolve the global paths to local paths before proceeding
                var tokens = agentInfo.Arguments.Split(' ');
                var locations = Registry.ListFileLocations(tokens[0], URI);
                string localAbsolutePath;

                // if this Runtime has the file, translate to local path
                if (locations.Keys.Contains(URI))
                {
                    var copyPath = locations[URI];
                    localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);
                    
                    Console.WriteLine($"{this} has the file {tokens[0]} locally");
                }
                else
                {
                    // fetch the file and use temporary path
                    var copyHolder = locations.Keys.ToList().PickRandom();
                    var copyPath = locations[copyHolder];
                    
                    Console.WriteLine($"{this} does not have the file {tokens[0]} -- reading from {copyHolder}");

                    var response = await Request(copyHolder + "/storage", "ReadTextFile", copyPath);
                    var content = (string)response;
                    localAbsolutePath = Path.Combine(TempDataPath, Path.GetFileName(tokens[0]));
                    File.WriteAllText(localAbsolutePath, content);
                }
                
                var scriptArguments = string.Join(" ", tokens.Skip(1));
                var resolvedArguments = localAbsolutePath + " " + scriptArguments;

                ProcessAgent proc;

                if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.JavaScript)
                {
                    proc = new JavaScriptAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                    proc.OnCheckpointUpdate += async snapPath =>
                    {
                        Registry.Agents[agentInfo.URI].LastCheckpoint = snapPath;
                        
                        await SyncRegistry();
                    };
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Python)
                {
                    proc = new PythonAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Java)
                {
                    proc = new JavaAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Ruby)
                {
                    proc = new RubyAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.CSharp)
                {
                    proc = new DotnetAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Docker)
                {
                    proc = new DockerAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else
                {
                    proc = new ProcessAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, agentInfo.BinaryPath, resolvedArguments);
                }
                proc.SetCheckpointInterval(agentInfo.CheckpointInterval);
                proc.SetOutputRateLimit(agentInfo.OutputRateLimit);
                if (agentInfo.OutputToShell) proc.EnableOutputToShell();
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("inputFormat")) proc.SetInputFormat((string)agentInfo.Options["inputFormat"]);
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("outputFormat")) proc.SetOutputFormat((string)agentInfo.Options["outputFormat"]);

                agent = proc;
                UserAgents[agentInfo.URI] = agent;
                Router.AddAgentAndAllDescendants(agent);
                //Router.AddSubscriber(agent.URI + ":stdin", agent.URI);  // Process agents subscribe to messages directed at its stdin
                //Router.AddSubscriber(agent.URI + ":upstream", agent.URI);
                foreach (var topic in agentInfo.Subscriptions)
                {
                    Router.AddSubscriber(topic, agent.URI);
                }

                proc.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");
                    });
                });

                placeHolder.SetReady(agent);

                // check if there are direct output pipes
                var outPipes = Registry.GetPipesBySourceAgentURI(agentInfo.URI);
                var agentLinks = new List<Task>();

                foreach (var pipe in outPipes)
                {
                    Console.WriteLine($"{this} Creating Pipe ({pipe.Group}) {pipe.Source} -> {pipe.Sink}");
                    var linkReady = CreateAgentLink(agentInfo.URI, pipe.Sink, pipe.Group).ContinueWith(prev =>
                    {
                        try
                        {
                            if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                //proc.AddDirectOutputPipe(pipe.Sink, pipe.Group, prev.Result);
                                proc.AddDirectOutputPipe(pipe, prev.Result);
                            }
                            else
                            {
                                Console.WriteLine(prev.Exception);
                                Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {pipe.Sink}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"{this} Failed to add Direct Output Pipe");
                            Console.WriteLine(ex);
                        }
                        
                    });

                    // Add a redirect rule to route messages from the :downstream channel to the :upstream channel
                    Router.AddRedirectRule(agentInfo.URI + ":downstream", pipe.Sink + ":upstream");   // TODO: Revise this experimental mechanism

                    agentLinks.Add(linkReady);
                }

                Task.WhenAll(agentLinks).ContinueWith(_ =>
                {
                    pipesReady.SetResult(true);
                });

                /*if (LocalPipeSchedule.ContainsKey(agentInfo.URI))
                {
                    var agentLinks = new List<Task>();

                    foreach (var downstream in LocalPipeSchedule[agentInfo.URI])
                    {
                        var linkReady = CreateAgentLink(agentInfo.URI, downstream).ContinueWith(prev =>
                        {
                            if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                proc.AddDirectOutputPipe(downstream, prev.Result);
                            }
                            else
                            {
                                Console.WriteLine(prev.Exception);
                                Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {downstream}");
                            }
                        });

                        agentLinks.Add(linkReady);
                    }

                    Task.WhenAll(agentLinks).ContinueWith(_ =>
                    {
                        pipesReady.SetResult(true);
                    });
                }
                else
                {
                    pipesReady.SetResult(true);
                }*/

                Monitor.WatchAgent(proc);

                //agent.Start();
            }

            // TODO: Revise where to notify the RegistryManager -- for now, do it from here
            Request(RegistryManagerUri, "CheckInAgent", agentInfo.URI).ContinueWith(async prev =>
            {
                if (prev.Status == TaskStatus.RanToCompletion)
                {
                    Console.WriteLine($"{this} Successfully checked in {agentInfo.URI}");

                    await pipesReady.Task;

                    agent.Start();
                    Console.WriteLine($"{this} Successfully started {agentInfo.URI}");

                    /*pipesReady.Task.ContinueWith(_ =>
                    {
                        agent.Start();
                        Console.WriteLine($"{this} Successfully started {agentInfo.URI}");
                    });*/
                }
                else
                {
                    Console.WriteLine($"{this} Something went wrong activating agent {agentInfo.URI}");
                    Console.WriteLine(prev.Exception);
                }
            });
        }

        // This method is called when the Runtime detects that
        // the agent no longer exists on the Registry
        // i.e., either killed by the user, or exited
        //       (both scenarios involve the "Kill" command at RegistryManager)
        private void RemoveUserAgent(string uri)
        {
            Console.WriteLine($"{this} Removing agent {uri}");

            var agent = UserAgents[uri];
            agent.Stop();
            UserAgents.Remove(uri);

            Dictionary<string, long> outpipeStatus = new Dictionary<string, long>();

            if (agent is ProcessAgent || agent is OneOSLambdaAgent)
            {
                Router.RemoveSubscriber(uri + ":stdin", uri);
                Router.RemoveSubscriber(uri + ":upstream", uri);

                if (agent is ProcessAgent)
                {
                    outpipeStatus = ((ProcessAgent)agent).GetDirectOutputPipesStatus();
                }
                else if (agent is OneOSLambdaAgent)
                {
                    outpipeStatus = ((OneOSLambdaAgent)agent).GetDirectOutputPipesStatus();
                }
            }

            // TODO: Revise where to notify the RegistryManager -- for now, do it from here
            // TODO: CheckOutAgent should be called only when the current Runtime is indeed
            //       responsible for running the agent. Otherwise the agent should be killed
            //       silently as it has been moved to some other Runtime.
            // INFO: We send the total bytes this agent wrote out so that downstream
            //       components can finish receiving any remaining bytes in the socket
            Request(RegistryManagerUri, "CheckOutAgent", uri, outpipeStatus).ContinueWith(prev =>
            {
                if (prev.Status == TaskStatus.RanToCompletion)
                {
                    Console.WriteLine($"{this} Agent {uri} was terminated");
                    //Console.WriteLine($"{this} {String.Join(", ", Registry.Agents.Keys)}");

                    /*// Notify downstream pipes about termination
                    if (Pipes.ContainsKey(uri))
                    {
                        foreach (var downstream in Pipes[uri])
                        {
                            // Use RPC Message format for control messages
                            // TODO: Use a different message class
                            Request(downstream, "CloseUpstream");
                        }

                        // Destroy the related pipes
                        Request(RegistryManagerUri, "RemovePipesFrom", uri)
                        .ContinueWith(prev2 =>
                        {
                            if (prev2.Status != TaskStatus.RanToCompletion)
                            {
                                Console.WriteLine($"{this} Something went wrong removing pipes from {uri}");
                            }
                        });
                    }*/
                }
                else
                {
                    Console.WriteLine(prev.Exception);
                    Console.WriteLine($"{this} Something went wrong killing agent {uri}");
                }
            });
        }

        private async void RestoreUserAgent(Registry.AgentInfo agentInfo)
        {
            // We only support JS for now (using ThingsMigrate)
            if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.JavaScript)
            {
                Console.WriteLine($"{this} Restoring Agent {agentInfo.URI}");
                // The following line is needed to signal that
                // CreateUserAgent process has begun for this agent.
                // Without this, CreateUserAgent will be called multiple times.
                // Because this method complete asynchronously, the calling
                // thread can only observe its completion asynchronously.
                var placeHolder = new AgentPlaceHolder();
                UserAgents[agentInfo.URI] = placeHolder;

                // Read snapshot file
                var locations = Registry.ListFileLocations(agentInfo.LastCheckpoint);
                string localAbsolutePath;

                // if this Runtime has the file, translate to local path
                if (locations.Keys.Contains(URI))
                {
                    var copyPath = locations[URI];
                    localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);
                }
                else
                {
                    // fetch the file and use temporary path
                    var copyHolder = locations.Keys.Where(host => ActiveRuntimes.Contains(host)).ToList().PickRandom();
                    var copyPath = locations[copyHolder];

                    Console.WriteLine($"{this} does not have the snapshot file -- reading from {copyHolder}");

                    var response = await Request(copyHolder + "/storage", "ReadTextFile", copyPath);
                    var content = (string)response;
                    localAbsolutePath = Path.Combine(TempDataPath, Path.GetFileName(copyPath));
                    File.WriteAllText(localAbsolutePath, content);
                }

                var agent = JavaScriptAgent.RestoreFromSnapshot(this, agentInfo, localAbsolutePath);

                agent.SetCheckpointInterval(agentInfo.CheckpointInterval);
                agent.SetOutputRateLimit(agentInfo.OutputRateLimit);
                if (agentInfo.OutputToShell) agent.EnableOutputToShell();
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("inputFormat")) agent.SetInputFormat((string)agentInfo.Options["inputFormat"]);
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("outputFormat")) agent.SetOutputFormat((string)agentInfo.Options["outputFormat"]);

                UserAgents[agentInfo.URI] = agent;
                Router.AddAgentAndAllDescendants(agent);
                //Router.AddSubscriber(agent.URI + ":stdin", agent.URI);  // Process agents subscribe to messages directed at its stdin
                //Router.AddSubscriber(agent.URI + ":upstream", agent.URI);
                foreach (var topic in agentInfo.Subscriptions)
                {
                    Router.AddSubscriber(topic, agent.URI);
                }

                agent.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");
                    });
                });

                placeHolder.SetReady(agent);

                TaskCompletionSource<bool> pipesReady = new TaskCompletionSource<bool>();

                // check if there are direct output pipes
                var outPipes = Registry.GetPipesBySourceAgentURI(agentInfo.URI);
                var agentLinks = new List<Task>();

                foreach (var pipe in outPipes)
                {
                    Console.WriteLine($"{this} Creating Pipe ({pipe.Group}) {pipe.Source} -> {pipe.Sink}");
                    var linkReady = CreateAgentLink(agentInfo.URI, pipe.Sink, pipe.Group).ContinueWith(prev =>
                    {
                        try
                        {
                            if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                //proc.AddDirectOutputPipe(pipe.Sink, pipe.Group, prev.Result);
                                agent.AddDirectOutputPipe(pipe, prev.Result);
                            }
                            else
                            {
                                Console.WriteLine(prev.Exception);
                                Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {pipe.Sink}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"{this} Failed to add Direct Output Pipe");
                            Console.WriteLine(ex);
                        }

                    });

                    // Add a redirect rule to route messages from the :downstream channel to the :upstream channel
                    Router.AddRedirectRule(agentInfo.URI + ":downstream", pipe.Sink + ":upstream");   // TODO: Revise this experimental mechanism

                    agentLinks.Add(linkReady);
                }

                Task.WhenAll(agentLinks).ContinueWith(_ =>
                {
                    pipesReady.SetResult(true);
                });

                Monitor.WatchAgent(agent);

                // TODO: Revise where to notify the RegistryManager -- for now, do it from here
                Request(RegistryManagerUri, "CheckInAgent", agentInfo.URI).ContinueWith(async prev =>
                {
                    if (prev.Status == TaskStatus.RanToCompletion)
                    {
                        Console.WriteLine($"{this} Successfully checked in (restored) {agentInfo.URI}");

                        await pipesReady.Task;
                        Console.WriteLine($"{this} Successfully started {agentInfo.URI}");

                        agent.Start();
                    }
                    else
                    {
                        Console.WriteLine($"{this} Something went wrong activating (restoring) agent {agentInfo.URI}");
                        Console.WriteLine(prev.Exception);
                    }
                });

            }
            else
            {
                CreateUserAgent(agentInfo);
            }
        }

        private async void CreateStandbyAgent(Registry.AgentInfo agentInfo)
        {
            Agent agent;
            //TaskCompletionSource<bool> pipesReady = new TaskCompletionSource<bool>();

            if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOSKernel)
            {
                var initializer = agentInfo.BinaryPath;
                agent = OneOSInitializers[initializer](this, agentInfo.Arguments);
                StandbyAgents[agentInfo.URI] = agent;
                //Router.AddAgentAndAllDescendants(agent);

                //pipesReady.SetResult(true);
            }
            else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOS)
            {
                // The agentInfo contains global paths for any resources.
                // Resolve the global paths to local paths before proceeding
                var tokens = agentInfo.Arguments.Split(' ');
                var locations = Registry.ListFileLocations(tokens[0], URI);
                var copyPath = locations[URI];  // We assume that this Runtime has the file
                var localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);
                var scriptArguments = string.Join(" ", tokens.Skip(1));

                OneOSScriptAgent script = new OneOSScriptAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                agent = script;
                StandbyAgents[agentInfo.URI] = agent;
                //Router.AddAgentAndAllDescendants(agent);

                script.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");

                        // TODO: Remove this Hack
                        // This hack is used to double-force synchronization after termination
                        SyncRegistry();
                    });
                });

                //pipesReady.SetResult(true);
            }
            else
            {
                // The following line is needed to signal that
                // CreateUserAgent process has begun for this agent.
                // Without this, CreateUserAgent will be called multiple times.
                // Because this method complete asynchronously, the calling
                // thread can only observe its completion asynchronously.
                var placeHolder = new AgentPlaceHolder();
                StandbyAgents[agentInfo.URI] = placeHolder;

                // The agentInfo contains global paths for any resources.
                // Resolve the global paths to local paths before proceeding
                var tokens = agentInfo.Arguments.Split(' ');
                var locations = Registry.ListFileLocations(tokens[0], URI);
                string localAbsolutePath;

                // if this Runtime has the file, translate to local path
                if (locations.Keys.Contains(URI))
                {
                    var copyPath = locations[URI];
                    localAbsolutePath = StorageManager.GetLocalAbsolutePath(copyPath);
                }
                else
                {
                    // fetch the file and use temporary path
                    var copyHolder = locations.Keys.ToList().PickRandom();
                    var copyPath = locations[copyHolder];

                    Console.WriteLine($"{this} does not have the file {tokens[0]} -- reading from {copyHolder}");

                    var response = await Request(copyHolder + "/storage", "ReadTextFile", copyPath);
                    var content = (string)response;
                    localAbsolutePath = Path.Combine(TempDataPath, Path.GetFileName(tokens[0]));
                    File.WriteAllText(localAbsolutePath, content);
                }

                var scriptArguments = string.Join(" ", tokens.Skip(1));
                var resolvedArguments = localAbsolutePath + " " + scriptArguments;

                ProcessAgent proc;

                if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.JavaScript)
                {
                    proc = new JavaScriptAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                    proc.OnCheckpointUpdate += async snapPath =>
                    {
                        Registry.Agents[agentInfo.URI].LastCheckpoint = snapPath;

                        await SyncRegistry();
                    };
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Python)
                {
                    proc = new PythonAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Java)
                {
                    proc = new JavaAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Ruby)
                {
                    proc = new RubyAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.CSharp)
                {
                    proc = new DotnetAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.Docker)
                {
                    proc = new DockerAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, localAbsolutePath, scriptArguments);
                }
                else
                {
                    proc = new ProcessAgent(this, agentInfo.URI, agentInfo.User, agentInfo.Environment, agentInfo.BinaryPath, resolvedArguments);
                }
                proc.SetCheckpointInterval(agentInfo.CheckpointInterval);
                proc.SetOutputRateLimit(agentInfo.OutputRateLimit);
                if (agentInfo.OutputToShell) proc.EnableOutputToShell();
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("inputFormat")) proc.SetInputFormat((string)agentInfo.Options["inputFormat"]);
                if (agentInfo.Options != null && agentInfo.Options.ContainsKey("outputFormat")) proc.SetOutputFormat((string)agentInfo.Options["outputFormat"]);

                agent = proc;
                StandbyAgents[agentInfo.URI] = agent;
                /*Router.AddAgentAndAllDescendants(agent);
                Router.AddSubscriber(agent.URI + ":stdin", agent.URI);  // Process agents subscribe to messages directed at its stdin
                Router.AddSubscriber(agent.URI + ":upstream", agent.URI);*/

                proc.OnExit += new EventHandler((obj, evt) =>
                {
                    Request(RegistryManagerUri, "Kill", agentInfo.User, agentInfo.URI)
                    .ContinueWith(_ =>
                    {
                        Console.WriteLine($"{agent.URI} was successfully destroyed");
                    });
                });

                placeHolder.SetReady(agent);

                // check if there are direct output pipes
                /*if (LocalPipeSchedule.ContainsKey(agentInfo.URI))
                {
                    var agentLinks = new List<Task>();

                    foreach (var downstream in LocalPipeSchedule[agentInfo.URI])
                    {
                        var linkReady = CreateAgentLink(agentInfo.URI, downstream).ContinueWith(prev =>
                        {
                            if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                proc.AddDirectOutputPipe(downstream, prev.Result);
                            }
                            else
                            {
                                Console.WriteLine(prev.Exception);
                                Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {downstream}");
                            }
                        });

                        agentLinks.Add(linkReady);
                    }

                    Task.WhenAll(agentLinks).ContinueWith(_ =>
                    {
                        pipesReady.SetResult(true);
                    });
                }
                else
                {
                    pipesReady.SetResult(true);
                }*/

                //Monitor.WatchAgent(proc);
            }

            // TODO: Revise where to notify the RegistryManager -- for now, do it from here
            /*Request(RegistryManagerUri, "CheckInAgent", agentInfo.URI).ContinueWith(prev =>
            {
                if (prev.Status == TaskStatus.RanToCompletion)
                {
                    Console.WriteLine($"{this} Successfully checked in {agentInfo.URI}");

                    pipesReady.Task.ContinueWith(_ =>
                    {
                        agent.Start();
                        Console.WriteLine($"{this} Successfully started {agentInfo.URI}");
                    });
                }
                else
                {
                    Console.WriteLine($"{this} Something went wrong activating agent {agentInfo.URI}");
                    Console.WriteLine(prev.Exception);
                }
            });*/

            Console.WriteLine($"{this} Created standby agent {agentInfo.URI}");
        }

        private void StartStandbyAgent(Registry.AgentInfo agentInfo)
        {
            var agent = StandbyAgents[agentInfo.URI];

            agentInfo.Runtime = URI; // This is set to prevent onTick handler from taking action
            RemoveRemoteAgent(agentInfo);
            StandbyAgents.Remove(agentInfo.URI);
            UserAgents[agentInfo.URI] = agent;  // Move the StandbyAgent to UserAgents

            TaskCompletionSource<bool> pipesReady = new TaskCompletionSource<bool>();

            Router.AddAgentAndAllDescendants(agent);

            if (agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOSKernel
                && agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOS)
            {
                ProcessAgent proc = (ProcessAgent)agent;

                //Router.AddSubscriber(agent.URI + ":stdin", agent.URI);  // Process agents subscribe to messages directed at its stdin
                //Router.AddSubscriber(agent.URI + ":upstream", agent.URI);
                foreach (var topic in agentInfo.Subscriptions)
                {
                    Router.AddSubscriber(topic, agent.URI);
                }

                // check if there are direct output pipes
                var outPipes = Registry.GetPipesBySourceAgentURI(agentInfo.URI);
                var agentLinks = new List<Task>();

                foreach (var pipe in outPipes)
                {
                    var linkReady = CreateAgentLink(agentInfo.URI, pipe.Sink, pipe.Group, "update").ContinueWith(prev =>
                    {
                        if (prev.Status == TaskStatus.RanToCompletion)
                        {
                            //proc.AddDirectOutputPipe(pipe.Sink, pipe.Group, prev.Result);
                            proc.AddDirectOutputPipe(pipe, prev.Result);
                        }
                        else
                        {
                            Console.WriteLine(prev.Exception);
                            Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {pipe.Sink}");
                        }
                    });

                    // Add a redirect rule to route messages from the :downstream channel to the :upstream channel
                    Router.AddRedirectRule(agentInfo.URI + ":downstream", pipe.Sink + ":upstream");   // TODO: Revise this experimental mechanism

                    agentLinks.Add(linkReady);
                }

                Task.WhenAll(agentLinks).ContinueWith(_ =>
                {
                    pipesReady.SetResult(true);
                });

                /*if (LocalPipeSchedule.ContainsKey(agentInfo.URI))
                {
                    var agentLinks = new List<Task>();

                    foreach (var downstream in LocalPipeSchedule[agentInfo.URI])
                    {
                        var linkReady = CreateAgentLink(agentInfo.URI, downstream).ContinueWith(prev =>
                        {
                            if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                proc.AddDirectOutputPipe(downstream, prev.Result);
                            }
                            else
                            {
                                Console.WriteLine(prev.Exception);
                                Console.WriteLine($"{this} Failed to create Agent Link from {agentInfo.URI} to {downstream}");
                            }
                        });

                        agentLinks.Add(linkReady);
                    }

                    Task.WhenAll(agentLinks).ContinueWith(_ =>
                    {
                        pipesReady.SetResult(true);
                    });
                }
                else
                {
                    pipesReady.SetResult(true);
                }*/

                Monitor.WatchAgent(proc);
            }
            else
            {
                pipesReady.SetResult(true);
            }

            /*Request(RegistryManagerUri, "CheckInAgent", agentInfo.URI).ContinueWith(prev =>
            {
                if (prev.Status == TaskStatus.RanToCompletion)
                {
                    Console.WriteLine($"{this} Successfully checked in {agentInfo.URI}");

                    pipesReady.Task.ContinueWith(_ =>
                    {
                        agent.Start();
                        Console.WriteLine($"{this} Successfully started {agentInfo.URI}");
                    });
                }
                else
                {
                    Console.WriteLine($"{this} Something went wrong activating agent {agentInfo.URI}");
                    Console.WriteLine(prev.Exception);
                }
            });*/

            pipesReady.Task.ContinueWith(async _ =>
            {
                agent.Start();
                Console.WriteLine($"{this} Successfully started {agentInfo.URI} (converted from standby to primary)");

                // restore any input pipes by notifying the upstream agent
                var inPipes = Registry.GetPipesBySinkAgentURI(agentInfo.URI);
                var upstreamsReady = inPipes.Select(pipeInfo =>
                {
                    var sourceRuntime = Registry.Agents[pipeInfo.Source].Runtime;
                    // If two or more communicating StandbyAgents are started on this runtime,
                    // their pipes are already created by the AddDirectOutputPipe above.
                    // In that case, we don't need to make a RestoreDirectOutputPipe call.
                    // In fact, it leads to an ArgumentException (key already exists).
                    if (sourceRuntime == URI
                        && agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOSKernel
                        && agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOS)
                    {
                        ProcessAgent proc = (ProcessAgent)agent;
                        if (proc.DirectInputPipes.ContainsKey(pipeInfo.Group)
                            && proc.DirectInputPipes[pipeInfo.Group].HasSource(pipeInfo.Source))
                        {
                            return null;
                        }
                    }
                    return Request(sourceRuntime, "RestoreDirectOutputPipe", URI, pipeInfo.Key);
                }).ToList();

                await Task.WhenAll(upstreamsReady);

                if (upstreamsReady.Count > 0)
                {
                    Console.WriteLine($"{this} Requested Runtimes hosting {upstreamsReady.Count} upstream components of {agentInfo.URI} to restore DirectOutputPipes");
                }
            });

        }

        private void RemoveStandbyAgent(Registry.AgentInfo agentInfo)
        {
            if (StandbyAgents.ContainsKey(agentInfo.URI))
            {
                StandbyAgents.Remove(agentInfo.URI);
            }
        }

        private RemoteAgent GetOrCreateRemoteAgent(string uri)
        {
            if (!RemoteAgents.ContainsKey(uri))
            {
                var remote = new RemoteAgent(this, uri);
                RemoteAgents.Add(uri, remote);
                Router.AddAgent(remote);
                remote.Start();
            }
            return RemoteAgents[uri];
        }

        private void RemoveRemoteAgent(Registry.AgentInfo agentInfo)
        {
            var agent = RemoteAgents[agentInfo.URI];
            agent.Stop();
            RemoteAgents.Remove(agentInfo.URI);
            Router.RemoveAgent(agent);

            if (agentInfo.Language != Registry.AgentInfo.LanguageInfo.OneOSKernel)
            {
                /*Router.RemoveSubscriber(agentInfo.URI + ":stdin", agentInfo.URI);
                Router.RemoveSubscriber(agentInfo.URI + ":upstream", agentInfo.URI);*/
                foreach (var topic in agentInfo.Subscriptions)
                {
                    Router.RemoveSubscriber(topic, agentInfo.URI);
                }
            }
            // Remote UserShell is special, as processes may redirect stdout to shell's stdout
            else if (agentInfo.Language == Registry.AgentInfo.LanguageInfo.OneOSKernel
                && agentInfo.BinaryPath == "UserShell")
            {
                Router.RemoveHandlers(agentInfo.URI + ":stdout");
            }

            foreach (var child in agentInfo.Children)
            {
                var childAgent = RemoteAgents[child];
                childAgent.Stop();
                RemoteAgents.Remove(child);
                Router.RemoveAgent(childAgent);
            }
        }

        private RemoteAgent GetOrCreateRemoteAgent(string uri, string runtimeUri, bool guaranteeDelivery = true)
        {
            if (!RemoteAgents.ContainsKey(uri))
            {
                var runtime = RemoteAgents[runtimeUri];
                var remote = new RemoteAgent(this, uri, runtime, guaranteeDelivery);
                //remote.SetActiveSocket(runtime.ActiveSocket);
                //remote.SetPassiveSocket(runtime.PassiveSocket);

                RemoteAgents.Add(uri, remote);
                Router.AddAgent(remote);
                remote.Start();
                //Console.WriteLine($"{this} Added RemoteAgent {uri}");
            }
            return RemoteAgents[uri];
        }

        private RemoteAgent GetOrCreateRemoteAgent(Registry.AgentInfo agentInfo, bool guaranteeDelivery = true)
        {
            if (!RemoteAgents.ContainsKey(agentInfo.URI))
            {
                var runtime = RemoteAgents[agentInfo.Runtime];
                var remote = new RemoteAgent(this, agentInfo, runtime, guaranteeDelivery);
                //remote.SetActiveSocket(runtime.ActiveSocket);
                //remote.SetPassiveSocket(runtime.PassiveSocket);

                RemoteAgents.Add(agentInfo.URI, remote);
                Router.AddAgent(remote);
                remote.Start();
                //Console.WriteLine($"{this} Added RemoteAgent {uri}");
            }
            return RemoteAgents[agentInfo.URI];
        }

        private async Task<TcpAgent.ClientSideSocket> CreateAgentLinkAt(string host, string upstream, string downstream, string pipeGroup, string mode = "create")
        {
            TcpAgent.ClientSideSocket socket;

            if (host == URI)
            {
                socket = ConnectionManager.ConnectTo(new IPEndPoint(IPAddress.Loopback, Config.Port));
            }
            else
            {
                socket = ConnectionManager.ConnectTo(Peers[host]);
            }

            await socket.Connected;

            var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkRequest, upstream, downstream, pipeGroup, mode);
            await socket.StreamWrite(request.Serialize());

            var responsePayload = await socket.StreamRead();
            while (responsePayload.Length == 0)
            {
                responsePayload = await socket.StreamRead();
            }

            var response = RuntimeMessage.FromBytes(responsePayload);
            
            if (response.Arguments[3] != "OK")
            {
                socket.Stop();
                throw new OperationError($"{this} Downstream runtime {host} says '{response.Arguments[3]}'");
            }
            //Console.WriteLine($"{this} ... peer acknowledged agent link");

            return socket;
        }

        private Task<TcpAgent.ClientSideSocket> CreateAgentLink(string upstream, string downstream, string pipeGroup, string mode = "create")
        {
            var host = Registry.Agents[downstream].Runtime;
            return CreateAgentLinkAt(host, upstream, downstream, pipeGroup, mode);
        }

        private async Task ProfileConnection(string peerUri)
        {
            //Console.WriteLine($"{this} initiating profiling request to {peerUri}");

            var socket = ConnectionManager.ConnectTo(Peers[peerUri]);

            await socket.Connected;

            // Measure throughput
            var workloadSize = 1;

            // Tell peer how many MB this runtime will be sending
            var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ConnectionProfileRequest, workloadSize.ToString());
            await socket.StreamWrite(request.Serialize());

            // Wait for ready cue
            var responsePayload = await socket.StreamRead();
            while (responsePayload.Length == 0)
            {
                responsePayload = await socket.StreamRead();
            }

            var response = RuntimeMessage.FromBytes(responsePayload);
            //Console.WriteLine($"{this} ... {peerUri} said begin!");

            var count = 0;
            var random = new Random();
            byte[] chunk = new byte[1000000];
            while (count < workloadSize)
            {
                random.NextBytes(chunk);
                await socket.Stream.WriteAsync(chunk, 0, chunk.Length);
                count++;
            }

            // Wait for finish signal
            responsePayload = await socket.StreamRead();
            while (responsePayload.Length == 0)
            {
                responsePayload = await socket.StreamRead();
            }

            response = RuntimeMessage.FromBytes(responsePayload);

            var elapsed = long.Parse(response.Arguments[0]);

            var throughput = ((float)workloadSize * 10000000000) / (float)elapsed;

            //Console.WriteLine($"{this} ... peer said finished in {elapsed / 10000} ms -- throughput = {Math.Round(throughput, 3)} KB/s");

            // Measure latency
            double latency = 0;
            
            byte[] marker = new byte[1] { 0xf1 };

            for (var i = 0; i < 10; i++)
            {
                var pingStart = DateTime.Now;
                await socket.Stream.WriteAsync(marker, 0, 1);
                await socket.StreamRead();
                var pingTime = (double)(DateTime.Now - pingStart).Ticks;

                latency += pingTime / 10;
            }

            await socket.Stop();

            //Console.WriteLine($"{this} completed profiling connection to {peerUri} -- {throughput} KB/s, {latency / 10000} ms");
            
            await Task.Delay(5000); // HACK: Just wait till RegistryManager is ready

            await Request(RegistryManagerUri, "UpdateLinkInfo", URI, peerUri, (long)throughput, (double)latency / 10000);
        }

        protected override void OnBegin()
        {
            LoadRegistry();

            // Set up TCP listener
            ConnectionManager.SetConnectionHandler(async socket =>
            {
                try
                {
                    bool connected = false;

                    while (!connected)
                    {
                        // determine type of message
                        var requestPayload = await socket.StreamRead();
                        if (requestPayload.Length > 0)
                        {
                            //Console.WriteLine($"{this} Received {requestPayload.Length} bytes from {socket}");

                            var request = RuntimeMessage.FromBytes(requestPayload);

                            // This is a request that comes from the Runtime hosting an Agent
                            // that wishes to stream its output directly to a downstream Agent on this Runtime
                            if (request.Type == RuntimeMessage.RuntimeMessageType.AgentLinkRequest)
                            {
                                //Console.WriteLine($"{this} Received AgentLinkRequest for sender {request.Arguments[0]} to {request.Arguments[1]}");

                                if (UserAgents.ContainsKey(request.Arguments[1]))
                                {
                                    if (UserAgents[request.Arguments[1]] is ProcessAgent)
                                    {
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "OK");
                                        await socket.StreamWrite(response.Serialize());

                                        var receiver = (ProcessAgent)UserAgents[request.Arguments[1]];

                                        receiver.AddDirectInputPipe(request.Arguments[0], request.Arguments[2], socket, request.Arguments[3]);

                                        connected = true;
                                    }
                                    else if (UserAgents[request.Arguments[1]] is OneOSLambdaAgent)
                                    {
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "OK");
                                        await socket.StreamWrite(response.Serialize());

                                        var receiver = (OneOSLambdaAgent)UserAgents[request.Arguments[1]];

                                        receiver.AddDirectInputPipe(request.Arguments[0], request.Arguments[2], socket);

                                        connected = true;
                                    }
                                    else if (UserAgents[request.Arguments[1]] is AgentPlaceHolder)
                                    {
                                        // Agent is currently being created/restored and will be ready soon.
                                        // Better to wait a little bit than to reject the request.
                                        var placeHolder = (AgentPlaceHolder)UserAgents[request.Arguments[1]];

                                        var placeHolderAgent = await placeHolder.WhenReady();

                                        if (placeHolderAgent is ProcessAgent)
                                        {
                                            var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "OK");
                                            await socket.StreamWrite(response.Serialize());

                                            var receiver = (ProcessAgent)UserAgents[request.Arguments[1]];

                                            receiver.AddDirectInputPipe(request.Arguments[0], request.Arguments[2], socket, request.Arguments[3]);

                                            connected = true;
                                        }
                                        else if (placeHolderAgent is OneOSLambdaAgent)
                                        {
                                            var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "OK");
                                            await socket.StreamWrite(response.Serialize());

                                            var receiver = (OneOSLambdaAgent)UserAgents[request.Arguments[1]];

                                            receiver.AddDirectInputPipe(request.Arguments[0], request.Arguments[2], socket);

                                            connected = true;
                                        }
                                        else
                                        {
                                            Console.WriteLine($"{this} Agent {request.Arguments[1]} is not a supported agent type ({UserAgents[request.Arguments[1]].GetType().Name})");
                                            
                                            var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "NotSupported");
                                            await socket.StreamWrite(response.Serialize());

                                            await socket.Stop();
                                        }
                                        
                                    }
                                    else
                                    {
                                        Console.WriteLine($"{this} Agent {request.Arguments[1]} is not a supported agent type ({UserAgents[request.Arguments[1]].GetType().Name})");
                                        
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "NotSupported");
                                        await socket.StreamWrite(response.Serialize());

                                        await socket.Stop();
                                    }
                                }
                                else
                                {
                                    Console.WriteLine($"{this} does not host {request.Arguments[1]}");

                                    var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentLinkResponse, request.Arguments[0], request.Arguments[1], request.Arguments[2], "DoesNotExist");
                                    await socket.StreamWrite(response.Serialize());

                                    connected = true;
                                }

                            }
                            else if (request.Type == RuntimeMessage.RuntimeMessageType.FileStreamConnectionRequest)
                            {
                                Console.WriteLine($"{this} Received FileStreamConnectionRequest {request.Arguments[0]} {request.Arguments[1]}");

                                if (request.Arguments[0] == "fs")
                                {
                                    // For now, StorageAgent is the only agent that creates TcpFileStreams.
                                    // Later, we might need a Runtime-wide local registry of TcpFileStreams.
                                    await StorageManager.ConnectFileStream(request.Arguments[1], socket);
                                }
                                else if (request.Arguments[0] == "io")
                                {
                                    await IOManager.ConnectIOStream(request.Arguments[1], socket);
                                }
                                else if (request.Arguments[0] == "monitor")
                                {
                                    await Monitor.ConnectReadStream(request.Arguments[1], socket);
                                }
                                connected = true;
                            }
                            else if (request.Type == RuntimeMessage.RuntimeMessageType.PeerConnectionRequest)
                            {
                                await AcceptHandshake(request.Arguments[0], socket, () => { connected = true; });

                                /*Console.WriteLine($"{this} Received PeerConnectionRequest from {request.Arguments[0]}");

                                var peer = request.Arguments[0];

                                var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.PeerConnectionResponse, URI);
                                await socket.StreamWrite(response.Serialize());

                                connected = true;

                                // Once the client is connected to the runtime,
                                // the socket is "elevated" to handle Message objects (not RuntimeMessage).

                                // TODO: Investigate the cause of SocketError 10054 in the client side (terminal)
                                //       when the following Listen call is removed
                                socket.Listen(payload =>
                                {
                                    //Console.WriteLine($"Received {payload.Length} bytes");

                                    // This connection is now used for Message objects.
                                    // Parse a Message, and push it to the Router
                                    try
                                    {
                                        var message = Message.FromBytes(payload);
                                        *//*if (message.Channel == "kernels." + Domain + "/RegistryManager")
                                        {
                                            Console.WriteLine($"{this} Received message on {message.Channel} from {message.Author}");
                                        }*//*

                                        if (RemoteAgents.ContainsKey(message.Author))
                                        {
                                            RemoteAgents[message.Author].Outbox.Write(message);
                                        }
                                        else
                                        {
                                            Console.WriteLine($"{this} Unexpected message from {message.Author} on channel {message.Channel} (from peer {peer} on PassiveSocket)");
                                        }
                                    }
                                    catch (ArgumentException ex)
                                    {
                                        Console.WriteLine($"{this} Invalid message ({payload.Length} bytes) received from {socket}");
                                        Console.WriteLine(ex);
                                    }
                                });

                                var remote = GetOrCreateRemoteAgent(peer);
                                remote.SetPassiveSocket(socket);

                                // TODO: Devise a generic way to add remote agent's children.
                                //       For now, just add them manually as there aren't many
                                var remoteStorage = GetOrCreateRemoteAgent(peer + "/storage");
                                var remoteLanguage = GetOrCreateRemoteAgent(peer + "/language");
                                var remoteSync = GetOrCreateRemoteAgent(peer + "/sync");

                                remoteStorage.SetPassiveSocket(socket);
                                remoteLanguage.SetPassiveSocket(socket);
                                remoteSync.SetPassiveSocket(socket);

                                Router.TryAddSubscriber("events." + Config.Domain + "/agent-lifecycle", remoteStorage.URI);*/

                            }
                            else if (request.Type == RuntimeMessage.RuntimeMessageType.ConnectionProfileRequest)
                            {
                                connected = true;

                                //Console.WriteLine($"{this} received profiling request");

                                var workloadSize = int.Parse(request.Arguments[0]);

                                var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ConnectionProfileResponse, "Begin");
                                await socket.StreamWrite(response.Serialize());

                                var started = DateTime.Now;
                                var totalRead = 0;
                                var bytesExpected = workloadSize * 1000000;
                                byte[] buffer = new byte[1000000];
                                while (totalRead < bytesExpected)
                                {
                                    var bytesRead = await socket.Stream.ReadAsync(buffer, 0, buffer.Length);
                                    totalRead += bytesRead;
                                    /*if (totalRead % 100000000 == 0)
                                    {
                                        Console.WriteLine($"{this} read {totalRead / 1000000} MB");
                                    }*/
                                }

                                var elapsed = DateTime.Now - started;

                                response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ConnectionProfileResponse, elapsed.Ticks.ToString());
                                await socket.StreamWrite(response.Serialize());

                                // wait for latency measurement requests
                                byte[] marker = new byte[1];
                                for (var i = 0; i < 10; i++)
                                {
                                    await socket.Stream.ReadAsync(marker, 0, 1);
                                    await socket.Stream.WriteAsync(marker, 0, 1);
                                }

                                await socket.Stop();

                                //Console.WriteLine($"{this} finished profiling request");
                            }
                            else if (request.Type == RuntimeMessage.RuntimeMessageType.ClientConnectionRequest)
                            {
                                try
                                {
                                    var shellResult = await Request(SessionManagerUri, "GetShell", request.Arguments[1], request.Arguments[2]);
                                    var shellUri = (string)shellResult;
                                    if (Registry.Agents[shellUri].Runtime == URI)
                                    {
                                        var shell = UserAgents[shellUri];
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ClientConnectionResponse, "OK", shell.URI, Domain);
                                        await socket.StreamWrite(response.Serialize());

                                        connected = true;

                                        // Once the client is connected to the runtime,
                                        // the socket is "elevated" to handle Message objects (not RuntimeMessage).

                                        // TODO: Investigate the cause of SocketError 10054 in the client side (terminal)
                                        //       when the following Listen call is removed
                                        socket.Listen(payload =>
                                        {
                                            //Console.WriteLine($"Received {payload.Length} bytes");

                                            // This connection is now used for Message objects.
                                            // Parse a Message, and push it to the Router
                                            try
                                            {
                                                var message = Message.FromBytes(payload);
                                                shell.Inbox.Write(message);
                                            }
                                            catch (ArgumentException ex)
                                            {
                                                Console.WriteLine($"{this} Invalid message received from {socket}");
                                                Console.WriteLine(ex);
                                            }
                                        });

                                        Router.AddHandler(shell.URI + ":stdout", message =>
                                        {
                                            socket.Send(message.Serialize());
                                        });
                                    }
                                    else
                                    {
                                        connected = true;

                                        // redirect to the machine that has the shell
                                        var shellHost = Registry.Agents[shellUri].Runtime;
                                        var shellAddress = Peers[shellHost].ToString();
                                        Console.WriteLine($"{this} does not have Shell, redirecting to {shellHost} at {shellAddress}");
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ClientConnectionResponse, "Redirect", shellHost, shellAddress);
                                        await socket.StreamWrite(response.Serialize());

                                        await socket.Stop();
                                    }
                                }
                                catch (RpcError ex)
                                {
                                    Console.WriteLine($"{ex.Message}");
                                    var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ClientConnectionResponse, ex.InnerException is InvalidPasswordError ? "WrongPassword" : "NoUser");
                                    await socket.StreamWrite(response.Serialize());
                                }
                                catch (PermissionError ex)
                                {
                                    Console.WriteLine($"{ex.Message}");
                                    var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ClientConnectionResponse, ex.UserExists ? "WrongPassword" : "NoUser");
                                    await socket.StreamWrite(response.Serialize());
                                }
                            }
                            else if (request.Type == RuntimeMessage.RuntimeMessageType.AgentTunnelRequest)
                            {
                                try
                                {
                                    // check session
                                    var username = Registry.GetSession(request.Arguments[0]);

                                    // check agent exists
                                    var agentUri = request.Arguments[1];
                                    var agentHost = Registry.Agents[agentUri].Runtime;
                                    if (agentHost == URI)
                                    {
                                        var agent = UserAgents[agentUri];
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentTunnelResponse, "OK", agent.URI, Domain);
                                        await socket.StreamWrite(response.Serialize());

                                        connected = true;

                                        Console.WriteLine($"{this} created AgentTunnel to {agentUri}");

                                        // Once the client is connected to the runtime,
                                        // the socket is "elevated" to handle Message objects (not RuntimeMessage).
                                        socket.Listen(payload =>
                                        {
                                            // This connection is now used for Message objects.
                                            // Parse a Message, and push it to the Router
                                            try
                                            {
                                                var message = Message.FromBytes(payload);
                                                agent.Inbox.Write(message);
                                            }
                                            catch (ArgumentException ex)
                                            {
                                                Console.WriteLine($"{this} Invalid message received from {socket}");
                                                Console.WriteLine(ex);
                                            }
                                        });

                                        Router.AddHandler(agent.URI + ":stdout", message =>
                                        {
                                            socket.Send(message.Serialize());
                                        });
                                    }
                                    else
                                    {
                                        connected = true;

                                        // redirect to the machine that has the shell
                                        var agentAddress = Peers[agentHost].ToString();
                                        Console.WriteLine($"{this} does not have {agentUri}, redirecting to {agentHost} at {agentAddress}");
                                        var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentTunnelResponse, "Redirect", agentHost, agentAddress);
                                        await socket.StreamWrite(response.Serialize());

                                        await socket.Stop();
                                    }
                                    
                                }
                                catch (OperationError ex)
                                {
                                    connected = true;

                                    Console.WriteLine($"{ex.Message}");
                                    var response = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.AgentTunnelResponse, "InvalidSession");
                                    await socket.StreamWrite(response.Serialize());
                                    await socket.Stream.FlushAsync();

                                    await socket.Stop();
                                }
                            }
                            else
                            {
                                Console.WriteLine($"{this} Unknown Request Type, Message : {request}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"{this} Error while handling new connection.\n{ex}");
                }
            });

            //Console.WriteLine($"{this} Listener set up completed, initiating handshake round");

            // Connect to peers
            foreach (var peer in Peers)
            {
                RequestHandshake(peer.Key);

                /*var remote = GetOrCreateRemoteAgent(peer.Key);
                // TODO: Devise a generic way to add remote agent's children.
                //       For now, just add them manually as there aren't many
                var remoteStorage = GetOrCreateRemoteAgent(peer.Key + "/storage");
                var remoteLanguage = GetOrCreateRemoteAgent(peer.Key + "/language");
                var remoteSync = GetOrCreateRemoteAgent(peer.Key + "/sync");

                var socket = ConnectionManager.ConnectTo(peer.Value);
                socket.Connected.ContinueWith(async prev =>
                {
                    if (prev.Status == TaskStatus.RanToCompletion)
                    {
                        //Console.WriteLine($"{this} Connected to {peer.Key}... Exchanging handshake");
                        var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.PeerConnectionRequest, URI);
                        await socket.StreamWrite(request.Serialize());

                        var responsePayload = await socket.StreamRead();
                        if (responsePayload.Length > 0)
                        {
                            var response = RuntimeMessage.FromBytes(responsePayload);
                            //Console.WriteLine($"{this} ... exchanged handshake with {response.Arguments[0]}");

                            socket.Listen(payload =>
                            {
                                //Console.WriteLine($"Received {payload.Length} bytes");

                                // This connection is now used for Message objects.
                                // Parse a Message, and push it to the Router
                                try
                                {
                                    var message = Message.FromBytes(payload);
                                    if (RemoteAgents.ContainsKey(message.Author))
                                    {
                                        RemoteAgents[message.Author].Outbox.Write(message);
                                    }
                                    else
                                    {
                                        Console.WriteLine($"{this} Unexpected message from {message.Author} on channel {message.Channel} (from peer {peer.Key} on ActiveSocket)");
                                    }
                                }
                                catch (ArgumentException ex)
                                {
                                    Console.WriteLine($"{this} Invalid message received from {socket}");
                                    Console.WriteLine(ex);
                                }
                            });

                            //var remote = GetOrCreateRemoteAgent(peer.Key);
                            remote.SetActiveSocket(socket);
                            remoteStorage.SetActiveSocket(socket);
                            remoteLanguage.SetActiveSocket(socket);
                            remoteSync.SetActiveSocket(socket);

                            //Router.AddSubscriber("events." + Config.Domain + "/agent-lifecycle", remoteStorage.URI);
                        }
                    }
                    else
                    {
                        Console.WriteLine($"{this} Could not connect to {peer.Key}");
                    }
                });

                Task.Delay(1000).ContinueWith(_ =>
                {
                    ProfileConnection(peer.Key);
                });*/
            }

            // For now, just use this quick hack
            OnNextTick = () => Task.Delay(1000).ContinueWith(_ => Request(RegistryManagerUri, "UpdateRuntimeInfo", URI, Config.Cores.Item1, Config.Cores.Item2, Config.Memory, Config.Disk, string.Join(",", Config.Tags), Config.IO.ToDictionary(item => item.Name, item => item.ToJObject())));

            Monitor.Start();
        }

        protected override void OnTick()
        {
            // check if the kernels are running on any of the runtimes
            // TODO: It is wasteful to check this every tick -- find a better place to do this
            if (IsLeader)
            {
                int updated = 0;

                foreach (var item in KernelInitializers)
                {
                    if (!Registry.Kernels.ContainsKey(item.Key))
                    {
                        Registry.Kernels[item.Key] = ActiveRuntimes.PickRandom();
                        updated++;

                        Console.WriteLine($"{this} {item.Key} not found, starting on {Registry.Kernels[item.Key]}");
                    }
                }

                // TODO: Synchronize Registry
                if (updated > 0)
                {
                    SyncRegistry();
                }
            }

            /* Begin - Check local Agent and Pipe schedule */
            // check pipe schedule first because they need to be created before the agents are spawned
            /*foreach (var item in Pipes)
            {
                foreach (var inAgent in Pipes[item.Key])
                {
                    if (!LocalPipeSchedule.ContainsKey(item.Key)
                        || !LocalPipeSchedule[item.Key].Contains(inAgent))
                    {
                        Router.RemoveRedirectRule(item.Key + ":stdout", inAgent + ":stdin");
                    }
                }
            }
            foreach (var item in LocalPipeSchedule)
            {
                foreach (var inAgent in LocalPipeSchedule[item.Key])
                {
                    if (!Pipes.ContainsKey(item.Key))
                    {
                        Pipes[item.Key] = new List<string>();
                    }
                    if (!Pipes[item.Key].Contains(inAgent))
                    {
                        //Console.WriteLine($"Adding Pipe from {item.Key} to {inAgent}");
                        Router.AddRedirectRule(item.Key + ":stdout", inAgent + ":stdin");
                        Router.AddRedirectRule(item.Key + ":downstream", inAgent + ":upstream");   // TODO: Revise this experimental mechanism
                        Pipes[item.Key].Add(inAgent);
                    }
                }
            }*/

            if (Synchronizer.IsStable)
            {
                // TODO: To reduce the number of checks, check if the registry was updated since the last check
                foreach (var item in Registry.Kernels)
                {
                    var kernelUri = $"kernels.{Domain}/{item.Key}";

                    if (item.Value == URI)
                    {
                        if (RemoteAgents.ContainsKey(kernelUri))
                        {
                            Console.WriteLine($"{this} {kernelUri} migrated to this Runtime, removing Remote Agent");

                            var agent = RemoteAgents[kernelUri];
                            agent.Stop();
                            RemoteAgents.Remove(kernelUri);
                            Router.RemoveAgent(agent);
                        }

                        if (!KernelAgents.ContainsKey(item.Key))
                        {
                            Console.WriteLine($"{this} {kernelUri} hosted on this Runtime, starting Kernel Agent");

                            var agent = KernelInitializers[item.Key](this);
                            KernelAgents[item.Key] = agent;
                            Router.AddAgent(agent);
                            agent.Start();
                        }
                    }
                    else
                    {
                        if (KernelAgents.ContainsKey(item.Key))
                        {
                            Console.WriteLine($"{this} {kernelUri} migrated from this Runtime to another Runtime, removing Local Kernel Agent");

                            var agent = KernelAgents[item.Key];
                            agent.Stop();
                            KernelAgents.Remove(item.Key);
                            Router.RemoveAgent(agent);
                        }

                        if (!RemoteAgents.ContainsKey(kernelUri))
                        {
                            GetOrCreateRemoteAgent(kernelUri, item.Value);
                        }
                        else if (RemoteAgents[kernelUri].Gateway.URI != item.Value)
                        {
                            var newRuntime = RemoteAgents[item.Value];
                            RemoteAgents[kernelUri].UpdateGateway(newRuntime);
                        }
                    }
                }

                foreach (var item in UserAgents)
                {
                    // Agent is no longer alive
                    if (!Registry.Agents.ContainsKey(item.Key))
                    {
                        RemoveUserAgent(item.Key);
                        OnRuntimeStateEvent?.Invoke("agent-leave", item.Key);
                    }
                }

                foreach (var item in RemoteAgents)
                {
                    // Agent is no longer alive
                    if (!Registry.Agents.ContainsKey(item.Key) && item.Value.AgentInfo != null)
                    {
                        RemoveRemoteAgent(item.Value.AgentInfo);
                        OnRuntimeStateEvent?.Invoke("agent-leave", item.Key);
                    }
                }

                foreach (var item in Registry.Agents)
                {
                    // This Runtime is responsible for the agent
                    if (item.Value.Runtime == URI)
                    {
                        if (RemoteAgents.ContainsKey(item.Key))
                        {
                            RemoveRemoteAgent(item.Value);
                        }

                        if (!UserAgents.ContainsKey(item.Key))
                        {
                            // Has checkpoint
                            if (item.Value.LastCheckpoint != null)
                            {
                                Console.WriteLine($"{this} Restoring agent {item.Key}");
                                RestoreUserAgent(item.Value);
                            }
                            else
                            {
                                Console.WriteLine($"{this} Creating agent {item.Key}");
                                CreateUserAgent(item.Value);
                            }

                            OnRuntimeStateEvent?.Invoke("agent-join", new Dictionary<string, object>()
                            {
                                { "uri", item.Value.URI },
                                { "pid", item.Value.NRI },
                                { "runtime", item.Value.Runtime },
                                { "bin", item.Value.BinaryPath },
                                { "args", item.Value.Arguments }
                            });
                        }
                    }
                    else
                    {
                        // Agent has migrated, this Runtime should not host it anymore
                        if (UserAgents.ContainsKey(item.Key))
                        {
                            RemoveUserAgent(item.Key);
                        }

                        if (!RemoteAgents.ContainsKey(item.Key))
                        {
                            var remote = GetOrCreateRemoteAgent(item.Value);
                            if (item.Value.Language != Registry.AgentInfo.LanguageInfo.OneOSKernel)
                            {
                                //Router.AddSubscriber(item.Key + ":stdin", item.Key);
                                //Router.AddSubscriber(item.Key + ":upstream", item.Key);
                                foreach (var topic in item.Value.Subscriptions)
                                {
                                    Router.AddSubscriber(topic, item.Value.URI);
                                }
                            }
                            // Remote UserShell is special, as processes may redirect stdout to shell's stdout
                            else if (item.Value.Language == Registry.AgentInfo.LanguageInfo.OneOSKernel
                                && item.Value.BinaryPath == "UserShell")
                            {
                                Router.AddHandler(item.Key + ":stdout", output =>
                                {
                                    remote.ActiveSocket.Send(output.Serialize());
                                });
                            }

                            foreach (var child in item.Value.Children)
                            {
                                GetOrCreateRemoteAgent(child, item.Value.Runtime);
                            }

                            OnRuntimeStateEvent?.Invoke("agent-join", new Dictionary<string, object>()
                            {
                                { "uri", item.Value.URI },
                                { "pid", item.Value.NRI },
                                { "runtime", item.Value.Runtime },
                                { "bin", item.Value.BinaryPath },
                                { "args", item.Value.Arguments }
                            });
                        }
                        else if (RemoteAgents[item.Key].Gateway.URI != item.Value.Runtime)
                        {
                            var newRuntime = RemoteAgents[item.Value.Runtime];
                            RemoteAgents[item.Key].UpdateGateway(newRuntime);

                            foreach (var child in item.Value.Children)
                            {
                                RemoteAgents[child].UpdateGateway(newRuntime);
                            }

                            OnRuntimeStateEvent?.Invoke("agent-join", new Dictionary<string, object>()
                            {
                                { "uri", item.Value.URI },
                                { "pid", item.Value.NRI },
                                { "runtime", item.Value.Runtime },
                                { "bin", item.Value.BinaryPath },
                                { "args", item.Value.Arguments }
                            });
                        }

                        // If this runtime is a standby runtime, create the agent without starting it
                        if (item.Value.StandbyRuntime == URI && !StandbyAgents.ContainsKey(item.Key))
                        {
                            CreateStandbyAgent(item.Value);
                        }
                        
                        if (item.Value.StandbyRuntime != URI && StandbyAgents.ContainsKey(item.Key))
                        {
                            RemoveStandbyAgent(item.Value);
                        }
                        
                    }
                }
                /* End - Check local Agent schedule */

                foreach (var item in ReverseProxies)
                {
                    if (!Registry.Sockets.ContainsKey(item.Key) || !Registry.Agents.ContainsKey(Registry.Sockets[item.Key].Owner))
                    {
                        item.Value.Stop();
                        ReverseProxies.Remove(item.Key);
                    }
                }

                foreach (var item in Registry.Sockets)
                {
                    if (!ReverseProxies.ContainsKey(item.Key) && Registry.Agents.ContainsKey(item.Value.Owner))
                    {
                        var address = item.Value.HostRuntime == URI ? IPAddress.Loopback : Peers[item.Value.HostRuntime].Address;
                        //var proxy = new ReverseProxy(item.Value.Port, new IPEndPoint(address, item.Value.Port));
                        var proxy = new ReverseProxy(item.Value.Port + Config.Port + 5000, new IPEndPoint(address, item.Value.Port));

                        ReverseProxies.Add(item.Key, proxy);
                        Console.WriteLine($"{this} Starting Reverse Proxy {item.Key}");
                        proxy.Start();
                    }
                }

                OnNextTick?.Invoke();
                OnNextTick = null;

            }

            /* Begin - Handle Error Messages */
            string errorText = "";
            Message message = Errbox.Read();
            while (message != null)
            {
                errorText += message.ToString();

                message = Errbox.Read();
            }

            // Flush Error Messages into Error Log
            Console.Write(errorText);
            // TODO: Write into the error log
            /* End - Handle Error Messages */
        }

        protected override void OnEnd()
        {
            EventLog.Close();
            ErrorLog.Close();

            Console.WriteLine($"{this} Stopped");
        }
    }
}
