using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using System.Linq;

using OneOS.Common;
using OneOS.Language;

namespace OneOS.Runtime
{
    /* The VirtualRuntime represents the "operating system"
     * and provides the API that user applications uses.
     * In other words, it provides the "compatibility layer"
     * for regular POSIX applications to run on OneOS.
     * It exposes APIs such as fs.readFile, and transparently
     * handles the operation by directly communicating with
     * the "kernel" services like RegistryManager.
     * */
    public class VirtualRuntime
    {
        Runtime Runtime;
        RpcAgent Agent;
        RpcAgent.RequestDelegate Request; // Request method is a protected method, so a delegate needs to be given explicitly

        public VirtualRuntime(Runtime runtime, RpcAgent agent, RpcAgent.RequestDelegate requestFunc)
        {
            Runtime = runtime;
            Agent = agent;
            Request = requestFunc;
        }

        public async Task<string> ReadTextFile(string absoluteVirtualPath)
        {
            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath, Runtime.URI);
            var copyHolder = locations.Keys.Where(uri => Runtime.ActiveRuntimes.Contains(uri)).ToList().PickRandom();
            var copyPath = locations[copyHolder];

            Console.WriteLine($"Reading {copyPath} from {copyHolder}");
            var content = await Request(copyHolder + "/storage", "ReadTextFile", copyPath);
            Console.WriteLine($"{this} {content.GetType()}");

            return (string)content;
        }

        public async Task<bool> WriteTextFile(string absoluteVirtualPath, string content)
        {
            //var filePath = await Request(Runtime.RegistryManagerUri, "CreateFile", absoluteVirtualPath);
            var filePath = await Request(Runtime.RegistryManagerUri, "CreateFileIfNotFound", absoluteVirtualPath);

            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath);

            var operations = locations.Select(item => Request(item.Key + "/storage", "WriteTextFile", item.Value, content)).ToList();

            await Task.WhenAny(operations);

            Console.WriteLine($"Wrote {absoluteVirtualPath} on {string.Join(", ", locations.Keys)}");

            return false;
        }

        public async Task<string> AppendTextFile(string absoluteVirtualPath, string content)
        {
            //var filePath = await Request(Runtime.RegistryManagerUri, "CreateFile", absoluteVirtualPath);
            var filePath = await Request(Runtime.RegistryManagerUri, "CreateFileIfNotFound", absoluteVirtualPath);

            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath);

            var operations = locations.Select(item => Request(item.Key + "/storage", "AppendTextFile", item.Value, content)).ToList();

            await Task.WhenAll(operations);

            Console.WriteLine($"Wrote {absoluteVirtualPath} on {string.Join(", ", locations.Keys)}");

            return (string)content;
        }

        public async Task<string> TouchFile(string absoluteVirtualPath)
        {
            var filePath = await Request(Runtime.RegistryManagerUri, "CreateFileIfNotFound", absoluteVirtualPath);

            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath);

            var operations = locations.Select(item => Request(item.Key + "/storage", "AppendTextFile", item.Value, "")).ToList();

            await Task.WhenAll(operations);

            Console.WriteLine($"Touched {absoluteVirtualPath} on {string.Join(", ", locations.Keys)}");

            return (string)filePath;
        }

        public async Task<bool> RemoveFile(string absoluteVirtualPath)
        {
            var filePath = await Request(Runtime.RegistryManagerUri, "RemoveFile", absoluteVirtualPath);
            return false;
        }

        public async Task<string> CreateReadStream(string absoluteVirtualPath)
        {
            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath, Runtime.URI);
            var copyHolder = locations.Keys.ToList().PickRandom();
            var copyPath = locations[copyHolder];

            var result = await Request(copyHolder + "/storage", "CreateReadStream", copyPath, Agent.URI, absoluteVirtualPath);

            return (string)result;
        }

        public async Task<string> RestoreReadStream(string absoluteVirtualPath, long startAt)
        {
            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath, Runtime.URI);
            var copyHolder = locations.Keys.ToList().PickRandom();
            var copyPath = locations[copyHolder];

            var result = await Request(copyHolder + "/storage", "RestoreReadStream", copyPath, startAt, Agent.URI, absoluteVirtualPath);

            return (string)result;
        }

        public async Task<string> CreateWriteStream(string absoluteVirtualPath)
        {
            var filePath = await Request(Runtime.RegistryManagerUri, "CreateFileIfNotFound", absoluteVirtualPath);

            var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath);
            var copyHolder = locations.Keys.ToList().PickRandom();
            var copyPath = locations[copyHolder];

            var result = await Request(copyHolder + "/storage", "CreateWriteStream", copyPath, Agent.URI, absoluteVirtualPath);

            return (string)result;
        }

        public async Task<Dictionary<string, object>> GetFileStatus(string absoluteVirtualPath)
        {
            Console.WriteLine($"{this} Querying info about {absoluteVirtualPath}");

            var exists = Runtime.Registry.FileSystemNodeExists(absoluteVirtualPath);

            if (!exists)
            {
                return new Dictionary<string, object> { { "error", "ENOENT" } };
            }
            else
            {
                var isDir = Runtime.Registry.IsDirectory(absoluteVirtualPath);
                if (isDir)
                {
                    return new Dictionary<string, object> { { "type", "directory" } };
                }
                else
                {
                    var locations = Runtime.Registry.ListFileLocations(absoluteVirtualPath, Runtime.URI);
                    var copyHolder = locations.Keys.Where(uri => Runtime.ActiveRuntimes.Contains(uri)).ToList().PickRandom();
                    var copyPath = locations[copyHolder];

                    Console.WriteLine($"Getting info about {copyPath} from {copyHolder}");
                    var info = await Request(copyHolder + "/storage", "GetFileInfo", copyPath);

                    return new Dictionary<string, object> {
                        { "type", "file" },
                        { "size", (long)info }
                    };
                }
            }
        }

        public async Task<Dictionary<string, string>> ReadDirectory(string absoluteVirtualPath)
        {
            return Runtime.Registry.ReadDirectory(absoluteVirtualPath);
        }

        public async Task<long> CreateServer(long port)
        {
            var result = await Request(Runtime.RegistryManagerUri, "CreateSocket", Agent.URI, port, Runtime.URI);

            return (long)result;
        }

        public async Task<string> CreateAgentMonitorStream(string agentUri)
        {
            Registry.AgentInfo agentInfo;
            if (!Runtime.Registry.Agents.TryGetValue(agentUri, out agentInfo))
            {
                throw new OperationError($"Agent {agentUri} does not exist");
            }

            var result = await Request(agentInfo.Runtime, "CreateAgentMonitorStream", agentUri, Agent.URI);

            return (string)result;
        }

        public async Task<string> CreateVideoInputStream(string deviceName)
        {
            var ioHandle = Runtime.Registry.IO[deviceName];

            if (!Runtime.ActiveRuntimes.Contains(ioHandle.HostRuntime))
            {
                throw new OperationError($"Runtime {ioHandle.HostRuntime} is not available");
            }

            var result = await Request(ioHandle.HostRuntime + "/io", "CreateVideoInputStream", deviceName.Split('/').Last(), Agent.URI);

            return (string)result;
        }

        public async Task<string> CreateKafkaInputStream(string kafkaServer, string topic, long batchSize = 10000)
        {
            // we create Kafka agent in the same Runtime as the requesting agent
            var result = await Request(Runtime.URI + "/io", "CreateKafkaInputStream", kafkaServer, topic, batchSize, Agent.URI);
            
            return (string)result;
        }

        public async Task<List<Dictionary<string,object>>> ListAllAgents()
        {
            var list = new List<Dictionary<string, object>>();
            foreach (var kernel in Runtime.Registry.Kernels)
            {
                list.Add(new Dictionary<string, object>()
                {
                    { "uri", kernel.Key },
                    { "pid", Helpers.GetNRI(kernel.Key) },
                    { "runtime", kernel.Value }
                });
            }

            foreach (var agent in Runtime.Registry.Agents)
            {
                list.Add(new Dictionary<string, object>()
                {
                    { "uri", agent.Value.URI },
                    { "pid", agent.Value.NRI },
                    { "runtime", agent.Value.Runtime },
                    { "bin", agent.Value.BinaryPath },
                    { "args", agent.Value.Arguments }
                });
            }

            return list;
        }

        public async Task<List<Dictionary<string, object>>> ListAllPipes()
        {
            return Runtime.Registry.Pipes.Select(item => new Dictionary<string, object>()
            {
                { "key", item.Key },
                { "source", item.Value.Source },
                { "sink", item.Value.Sink },
                { "group", item.Value.Group },
                { "type", item.Value.Type },
                { "orderBy", item.Value.OrderBy }
            }).ToList();
        }

        public async Task<object> ListAllRuntimes()
        {
            return await Request(Runtime.RegistryManagerUri, "GetNetworkModel");
        }

        public async Task<List<Dictionary<string, object>>> ListAllSockets()
        {
            return Runtime.Registry.Sockets.Select(item => new Dictionary<string, object>()
            {
                { "port", item.Value.Port },
                { "owner", item.Value.Owner },
                { "hostRuntime", item.Value.HostRuntime }
            }).ToList();
        }

        public async Task<List<Dictionary<string, object>>> ListAllIOHandles()
        {
            return Runtime.Registry.IO.Select(item => new Dictionary<string, object>()
            {
                { "uri", item.Key },
                { "deviceType", item.Value.DeviceType },
                { "driver", item.Value.Driver },
                { "hostRuntime", item.Value.HostRuntime }
            }).ToList();
        }
    }
}
