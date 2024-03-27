using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Net;
using System.Linq;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Bson;

using OneOS.Common;
using static System.Collections.Specialized.BitVector32;

namespace OneOS.Runtime
{
    public class Registry
    {
        // TODO: Determine whether we need a separate Language info from binary info
        //       For now, keep both.
        public static Dictionary<string, AgentInfo.LanguageInfo> LanguageMap = new Dictionary<string, AgentInfo.LanguageInfo>()
        {
            { "osh", AgentInfo.LanguageInfo.OneOS },
            { "lambda.filter", AgentInfo.LanguageInfo.OneOSLambda },
            { "lambda.map", AgentInfo.LanguageInfo.OneOSLambda },
            { "lambda.reduce", AgentInfo.LanguageInfo.OneOSLambda },
            { "node", AgentInfo.LanguageInfo.JavaScript },
            { "python", AgentInfo.LanguageInfo.Python },
            { "java", AgentInfo.LanguageInfo.Java },
            { "ruby", AgentInfo.LanguageInfo.Ruby },
            { "dotnet", AgentInfo.LanguageInfo.CSharp },
            { "docker", AgentInfo.LanguageInfo.Docker }
        };

        public static Dictionary<string, string> IODriverMap = new Dictionary<string, string>()
        {
            { "ffmpeg", "video-in" },
            { "gpio", "gpio" }
        };

        public Dictionary<string, string> Sessions { get; private set; }
        public Dictionary<string, string> Users { get; private set; }
        public Dictionary<string, string> Kernels { get; private set; }
        public Dictionary<string, AgentInfo> Agents { get; private set; }

        public Directory FileSystem { get; private set; }
        public Dictionary<string, PipeInfo> Pipes { get; private set; }
        public Dictionary<int, Socket> Sockets { get; private set; }
        public Dictionary<string, IOHandle> IO { get; private set; }

        private static string GetPipeKey(string source, string sink, string group)
        {
            return Helpers.Checksum(Encoding.UTF8.GetBytes($"{source}|{sink}|{group}"), "MD5");
        }

        public Registry ()
        {
            Sessions = new Dictionary<string, string>();
            Users = new Dictionary<string, string>()
            {
                { "root", "Y7TbJWtl6YVB4Tyv6qZIx24ncyBguf9u4Y100Fd1ECbaER+C80qKara3AtkOSic=" }
            };

            // TODO: Remove hard-coded info
            Kernels = new Dictionary<string, string>();
            Agents = new Dictionary<string, AgentInfo>();
            Pipes = new Dictionary<string, PipeInfo>();
            Sockets = new Dictionary<int, Socket>();
            IO = new Dictionary<string, IOHandle>();

            InitializeFileSystem();
        }

        public void AddAgent(string agentUri, AgentInfo agentInfo)
        {
            Agents.Add(agentUri, agentInfo);
        }

        public void RemoveAgent(string agentUri)
        {
            Agents.Remove(agentUri);
        }

        private void InitializeFileSystem()
        {
            // TODO: Remove hard-coded info
            FileSystem = new Directory();
            FileSystem["bin"] = new Directory();
            FileSystem["etc"] = new Directory();
            var lib = new Directory();
            lib["web-terminal-server.js"] = new File("*", "web-terminal-server.js");
            var wwwClient = new Directory();
            lib["client"] = wwwClient;
            wwwClient["index.html"] = new File("*", "web-terminal.html");
            wwwClient["app.js"] = new File("*", "web-terminal-client.js");
            wwwClient["style.css"] = new File("*", "web-terminal-style.css");
            wwwClient["bundle.js"] = new File("*", "web-terminal-client-dependency.js");
            wwwClient["bundle.css"] = new File("*", "web-terminal-style-dependency.css");
            FileSystem["lib"] = lib;
            FileSystem["tmp"] = new Directory();
            FileSystem["var"] = new Directory();
            var home = new Directory();
            var root = new Directory();
            home.Add("root", root);
            root.Add("Desktop", new Directory());
            FileSystem["home"] = home;
        }

        // This is a slow lookup, but it's seldom used.
        // Looking up by NRI is usually done by a human user.
        public bool TryGetURIFromNRI(UInt16 nri, out string uri)
        {
            var agents = Agents.Where(item => item.Value.NRI == nri).ToList();
            if (agents.Count == 1)
            {
                uri = agents[0].Key;
                return true;
            }

            var kernels = Kernels.Where(item => Helpers.GetNRI(item.Key) == nri).ToList();
            if (kernels.Count == 1)
            {
                uri = kernels[0].Key;
                return true;
            }

            uri = null;
            return false;
        }

        public bool TryGetURIFromNRI(string maybeNri, out string uri)
        {
            UInt16 nri;
            if (UInt16.TryParse(maybeNri, out nri))
            {
                return TryGetURIFromNRI(nri, out uri);
            }
            else
            {
                uri = maybeNri;
                return false;
            }
        }

        public List<string> GetKernelAgentsByRuntimeURI(string runtimeUri)
        {
            return Kernels.Where(item => item.Value == runtimeUri).Select(item => item.Key).ToList();
        }

        public List<string> GetUserAgentsByRuntimeURI(string runtimeUri)
        {
            return Agents.Where(item => item.Value.Runtime == runtimeUri).Select(item => item.Key).ToList();
        }

        public List<PipeInfo> GetPipesBySourceAgentURI(string sourceUri)
        {
            return Pipes.Values.Where(item => item.Source == sourceUri).ToList();
        }

        public List<PipeInfo> GetPipesBySinkAgentURI(string sinkUri)
        {
            return Pipes.Values.Where(item => item.Sink == sinkUri).ToList();
        }

        public List<PipeInfo> GetPipesBySourceRuntimeURI(string runtimeUri)
        {
            var agents = GetKernelAgentsByRuntimeURI(runtimeUri).Concat(GetUserAgentsByRuntimeURI(runtimeUri));

            return Pipes.Values.Where(item => agents.Contains(item.Source)).ToList();
        }

        public List<PipeInfo> GetPipesBySinkRuntimeURI(string runtimeUri)
        {
            var agents = GetKernelAgentsByRuntimeURI(runtimeUri).Concat(GetUserAgentsByRuntimeURI(runtimeUri));

            return Pipes.Values.Where(item => agents.Contains(item.Sink)).ToList();
        }

        public List<PipeInfo> GetPipesByRuntimeURIs(string sourceRuntimeUri, string sinkRuntimeUri)
        {
            var sourceAgents = GetKernelAgentsByRuntimeURI(sourceRuntimeUri).Concat(GetUserAgentsByRuntimeURI(sourceRuntimeUri));
            var sinkAgents = GetKernelAgentsByRuntimeURI(sinkRuntimeUri).Concat(GetUserAgentsByRuntimeURI(sinkRuntimeUri));

            return Pipes.Values.Where(item => sourceAgents.Contains(item.Source) && sinkAgents.Contains(item.Sink)).ToList();
        }

        public string PrintAllAgents()
        {
            var longestUriLength = Agents.Aggregate(0, (acc, item) => item.Key.Length > acc ? item.Key.Length : acc);

            return $"Agent URI{new string(' ', (longestUriLength > 9 ? longestUriLength : 9) - 9)}\tPID\tHost Runtime\n\n{string.Join("\n", Kernels.Select(item => $"{item.Key}{new string(' ', longestUriLength - item.Key.Length)}\t{Helpers.GetNRI(item.Key)}\t{item.Value}"))}\n{string.Join("\n", Agents.Select(item => $"{item.Key}{new string(' ', longestUriLength - item.Key.Length)}\t{Helpers.GetNRI(item.Key)}\t{item.Value.Runtime}"))}";
        }

        public string PrintAllSockets()
        {
            return $"Port\tHost Runtime\tReal Address\n\n{string.Join("\n", Sockets.Select(item => $"{item.Key}\t{item.Value.HostRuntime}\t{item.Value.HostRuntime}"))}";
        }

        public string PrintAllIO()
        {
            var longestUidLength = IO.Aggregate(0, (acc, item) => item.Key.Length > acc ? item.Key.Length : acc);

            return $"Name{new string(' ', (longestUidLength > 4 ? longestUidLength : 4) - 4)}\tType    \tDriver  \tHost Runtime\n\n{string.Join("\n", IO.Select(item => $"{item.Key}{new string(' ', longestUidLength - item.Key.Length)}\t{item.Value.DeviceType}\t{item.Value.Driver}\t{item.Value.HostRuntime}"))}";
        }

        public void AddSession(string sessionKey, string username)
        {
            Sessions[sessionKey] = username;
        }

        public string GetSession(string sessionKey)
        {
            if (Sessions.ContainsKey(sessionKey))
            {
                return Sessions[sessionKey];
            }
            else
            {
                throw new OperationError($"Session {sessionKey} does not exist");
            }
        }

        public bool FileSystemNodeExists(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            return FileSystem.Exists(tokens.Skip(1).ToArray());
        }

        public bool IsDirectory(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            return (item is Directory);
        }

        public bool IsFile(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            return (item is File);
        }

        public string PrintDirectory(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());

            if (item is File)
            {
                var file = (File)item;
                var fileName = tokens.Last();
                return $"Name{new string(' ', fileName.Length - 4)}\tSize\tRedundancy\n\n{ fileName }\t{file.Size}\t{file.Copies.Count} Copies at [ {string.Join(", ", file.Copies.Keys) } ]";
            }
            else
            {
                var dir = (Directory)item;
                var longestNameLength = dir.Aggregate(0, (acc, entry) => entry.Key.Length > acc ? entry.Key.Length : acc);
                var subdirs = dir.Where(entry => entry.Value is Directory).OrderBy(entry => entry.Key).Select(entry => $"{entry.Key}/{new string(' ', longestNameLength - entry.Key.Length)}");
                var files = dir.Where(entry => entry.Value is File).OrderBy(entry => entry.Key).Select(entry => $"{entry.Key}{new string(' ', longestNameLength - entry.Key.Length + 1)}\t{((File)entry.Value).Size}\t{((File)entry.Value).Copies.Count}");

                return $"Name{new string(' ', (longestNameLength > 3 ? longestNameLength : 3) - 3)}\tSize\tRedundancy\n\n{string.Join("\n", subdirs)}\n{string.Join("\n", files)}";
            }
        }

        public List<string> ListDirectory(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File) return new List<string> { tokens.Last() };
            else return ((Directory)item).Select(entry => (entry.Value is Directory) ? entry.Key + "/" : entry.Key).ToList();
        }

        public Dictionary<string, string> ReadDirectory(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File) throw new OperationError($"{absPath} is not a directory");
            else return ((Directory)item).ToDictionary(entry => entry.Key, entry => entry.Value.GetType().Name.ToLower());
        }

        public Dictionary<string, string> ListFileLocations(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File) return ((File)item).Copies;
            throw new OperationError($"{absPath} is not a file");
        }

        // resolveRuntimeUri is the URI of the host Runtime on which this function is invoked.
        // This URI is used to translate symbolic URI such as "*" to the host Runtime's URI.
        public Dictionary<string, string> ListFileLocations(string absPath, string resolveRuntimeUri)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File) return ((File)item).Copies.ToDictionary(entry => entry.Key == "*" ? resolveRuntimeUri : entry.Key, entry => entry.Value);
            throw new OperationError($"{absPath} is not a file");
        }

        public Dictionary<string, string> AddFileLocation(string absPath, string runtimeUri, string localPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File)
            {
                var file = (File)item;
                file.AddCopy(runtimeUri, localPath);
                return file.Copies;
            }
            throw new OperationError($"{absPath} is not a file");
        }

        public bool UpdateFileInfo(string absPath, long size, string checksum)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File)
            {
                var file = (File)item;
                file.Size = size;
                file.Checksum = checksum;
                return true;
            }
            throw new OperationError($"{absPath} is not a file");
        }

        public string CreateDirectory(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var parentDir = tokens.Take(tokens.Length - 1);
            var toCreate = tokens.Last();

            var item = FileSystem.Get(parentDir.Skip(1).ToArray());
            if (item is Directory)
            {
                var dir = (Directory)item;
                if (dir.ContainsKey(toCreate))
                {
                    throw new OperationError($"{absPath} already exists");
                }
                dir.Add(toCreate, new Directory());

                return absPath;
            }
            else
            {
                throw new OperationError($"{string.Join("/", parentDir)} is not a directory");
            }
        }

        public string CreateFile(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var parentDir = tokens.Take(tokens.Length - 1);
            var toCreate = tokens.Last();

            var item = FileSystem.Get(parentDir.Skip(1).ToArray());
            if (item is Directory)
            {
                var dir = (Directory)item;
                if (dir.ContainsKey(toCreate))
                {
                    throw new OperationError($"{absPath} already exists");
                }
                dir.Add(toCreate, new File());

                return absPath;
            }
            else
            {
                throw new OperationError($"{string.Join("/", parentDir)} is not a directory");
            }
        }

        public string RemoveFile(string absPath)
        {
            if (absPath[0] != '/') throw new OperationError("Must provide absolute path");
            var tokens = absPath.Split('/');
            var item = FileSystem.Get(tokens.Skip(1).ToArray());
            if (item is File)
            {
                var dir = (Directory)FileSystem.Get(tokens.Take(tokens.Length - 1).Skip(1).ToArray());
                dir.Remove(tokens.Last());
                return absPath;
            }
            else throw new OperationError($"{absPath} is not a file");
        }

        public string CreatePipe(string source, string sink, string group = null, string type = null)
        {
            if (source == sink) throw new OperationError($"Cannot pipe {source} to itself");
            
            var key = GetPipeKey(source, sink, group);
            if (!Pipes.ContainsKey(key)) Pipes[key] = new PipeInfo(source, sink, group, type);
            return key;
        }

        public string CreatePipe(PipeInfo pipe)
        {
            if (pipe.Source == pipe.Sink) throw new OperationError($"Cannot pipe {pipe.Source} to itself");

            if (!Pipes.ContainsKey(pipe.Key)) Pipes[pipe.Key] = pipe;
            return pipe.Key;
        }

        public void RemovePipe(string source, string sink, string group = null)
        {
            var key = GetPipeKey(source, sink, group);
            if (!Pipes.ContainsKey(key))
            {
                throw new OperationError($"Pipe from {source} to {sink} with group {group} does not exist");
            }
            Pipes.Remove(key);
        }

        public int RemovePipesFrom(string source)
        {
            var removed = 0;
            foreach (var key in Pipes.Keys)
            {
                if (Pipes[key].Source == source)
                {
                    Pipes.Remove(key);
                    removed++;
                }
            }

            //if (removed == 0) throw new OperationError($"{source} does not have any outgoing pipes");
            return removed;
        }

        public int CreateSocket(string owner, long longPort, string hostRuntime)
        {
            var port = Convert.ToInt32(longPort);
            if (Sockets.ContainsKey(port)) throw new OperationError($"Port {port} is already in use by another socket");
            Sockets[port] = new Socket()
            {
                Owner = owner,
                Port = port,
                HostRuntime = hostRuntime,
                IsIndependent = false
            };

            return port;
        }

        public string CreateIO(string runtime, string name, string driver)
        {
            var uid = $"/dev/{runtime}/{name}";
            if (IO.ContainsKey(uid)) throw new OperationError($"IO {uid} already exists");
            IO[uid] = new IOHandle()
            {
                DeviceType = IODriverMap[driver],
                Driver = driver,
                HostRuntime = runtime
            };

            return uid;
        }

        public string CreateOrUpdateIO(string runtime, string name, string driver)
        {
            var uid = $"/dev/{runtime}/{name}";
            IO[uid] = new IOHandle()
            {
                DeviceType = IODriverMap[driver],
                Driver = driver,
                HostRuntime = runtime
            };

            return uid;
        }

        public JObject ToJson()
        {
            var json = new JObject();

            json["sessions"] = JObject.FromObject(Sessions);
            json["users"] = JObject.FromObject(Users);
            json["kernels"] = JObject.FromObject(Kernels);
            json["agents"] = Agents.Aggregate(new JObject(), (acc, item) =>
            {
                acc[item.Key] = item.Value.ToJson();
                return acc;
            });
            json["pipes"] = Pipes.Aggregate(new JObject(), (acc, item) =>
            {
                acc[item.Key] = item.Value.ToJson();
                return acc;
            });
            json["sockets"] = Sockets.Aggregate(new JObject(), (acc, item) =>
            {
                acc[item.Key.ToString()] = item.Value.ToJson();
                return acc;
            });
            json["io"] = IO.Aggregate(new JObject(), (acc, item) =>
            {
                acc[item.Key.ToString()] = item.Value.ToJson();
                return acc;
            });
            json["filesystem"] = FileSystem.ToJson();

            return json;
        }

        public string ToJsonString()
        {
            return ToJson().ToString();
        }

        public byte[] Serialize()
        {
            var stream = new MemoryStream();
            using (BsonWriter writer = new BsonWriter(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                serializer.Serialize(writer, ToJson());
            }
            return stream.ToArray();
        }

        public static Registry FromJson(JObject json)
        {
            var registry = new Registry();

            var sessions = (JObject)json["sessions"];
            foreach (var item in sessions)
            {
                registry.Sessions[item.Key] = item.Value.ToObject<string>();
            }

            var users = (JObject)json["users"];
            foreach (var item in users)
            {
                registry.Users[item.Key] = item.Value.ToObject<string>();
            }

            var kernels = (JObject)json["kernels"];
            foreach (var item in kernels)
            {
                registry.Kernels[item.Key] = item.Value.ToObject<string>();
            }

            var agents = (JObject)json["agents"];
            foreach (var item in agents)
            {
                registry.Agents[item.Key] = AgentInfo.FromJson((JObject)item.Value);
            }

            var pipes = (JObject)json["pipes"];
            foreach (var item in pipes)
            {
                registry.Pipes[item.Key] = PipeInfo.FromJson((JObject)item.Value);
                //registry.Pipes[item.Key] = item.Value.ToObject<List<string>>();
            }

            var sockets = (JObject)json["sockets"];
            foreach (var item in sockets)
            {
                registry.Sockets[int.Parse(item.Key)] = Socket.FromJson((JObject)item.Value);
            }

            var ioHandles = (JObject)json["io"];
            foreach (var item in ioHandles)
            {
                registry.IO[item.Key] = IOHandle.FromJson((JObject)item.Value);
            }

            var filesystem = (JObject)json["filesystem"];
            var root = Directory.FromJson(filesystem);

            Directory.CopyRecursively(root, registry.FileSystem);

            return registry;
        }

        public static Registry FromJsonString(string jsonString)
        {
            return FromJson(JObject.Parse(jsonString));
        }

        public static Registry FromBytes(byte[] payload)
        {
            var stream = new MemoryStream(payload);
            JObject obj;

            using (BsonReader reader = new BsonReader(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                obj = serializer.Deserialize<JObject>(reader);
            }

            return FromJson(obj);
        }
        
        /* nested classes */
        public class AgentInfo
        {
            public enum StartMode
            {
                New,
                Load
            }
            public enum LanguageInfo
            {
                OneOSKernel,
                OneOS,
                OneOSLambda,
                CSharp,
                FSharp,
                JavaScript,
                Wasm,
                Python,
                Java,
                Scala,
                Ruby,
                Docker
            }

            public string URI;
            public StartMode Mode;
            public LanguageInfo Language;
            public string Runtime;
            public string StandbyRuntime;
            public string User;
            public Dictionary<string, string> Environment = new Dictionary<string, string>();
            public bool OutputToShell;
            public string BinaryPath;
            public string Arguments;
            public List<string> Subscriptions = new List<string>();
            public int CheckpointInterval;
            public float OutputRateLimit;
            public string LastCheckpoint;
            public Dictionary<string, object> Options = new Dictionary<string, object>();
            public List<string> Children = new List<string>();   // This is a hacky way to encode child agent information, for use in remote agent creation
            
            public UInt16 NRI { get => Helpers.GetNRI(URI); }   // Numeric Resource Identifier (non-unique, alias for quick lookup using UInt16)
            public JObject ToJson()
            {
                return new JObject()
                {
                    { "uri", URI },
                    { "mode", Mode.ToString() },
                    { "language", Language.ToString() },
                    { "user", User },
                    { "runtime", Runtime },
                    { "standbyRuntime", StandbyRuntime },
                    { "environment", JObject.FromObject(Environment) },
                    { "outputToShell", OutputToShell },
                    { "binary", BinaryPath },
                    { "arguments", Arguments },
                    { "subscriptions", JArray.FromObject(Subscriptions) },
                    { "checkpointInterval", CheckpointInterval },
                    { "outputRateLimit", OutputRateLimit },
                    { "lastCheckpoint", LastCheckpoint },
                    { "options", JObject.FromObject(Options) },
                    { "children", JArray.FromObject(Children) }
                };
            }

            public static AgentInfo FromJson(JObject json)
            {
                return new AgentInfo()
                {
                    URI = json["uri"].ToObject<string>(),
                    Mode = (AgentInfo.StartMode)Enum.Parse(typeof(AgentInfo.StartMode), json["mode"].ToObject<string>()),
                    Language = (AgentInfo.LanguageInfo)Enum.Parse(typeof(AgentInfo.LanguageInfo), json["language"].ToObject<string>()),
                    User = json["user"].ToObject<string>(),
                    Runtime = json["runtime"].ToObject<string>(),
                    StandbyRuntime = json["standbyRuntime"].ToObject<string>(),
                    Environment = json["environment"].ToObject<Dictionary<string, string>>(),
                    OutputToShell = json["outputToShell"].ToObject<bool>(),
                    BinaryPath = json["binary"].ToObject<string>(),
                    Arguments = json["arguments"].ToObject<string>(),
                    Subscriptions = json["subscriptions"].ToObject<List<string>>(),
                    CheckpointInterval = json["checkpointInterval"].ToObject<int>(),
                    OutputRateLimit = json["outputRateLimit"].ToObject<float>(),
                    LastCheckpoint = json.ContainsKey("lastCheckpoint") ? json["lastCheckpoint"].ToObject<string>() : null,
                    Options = json["options"].ToObject<Dictionary<string, object>>(),
                    Children = json["children"].ToObject<List<string>>()
                };
            }
        }

        public class PipeInfo
        {
            public string Source;
            public string Sink;
            public string Group;    // Group is used for split/merge pipes
            public string Type;     // basic/split/merge
            public string OrderBy;
            private double _minRate;
            private double _maxRate;
            public double MinRate { get => _minRate; set
                {
                    CheckRates(value, MaxRate);
                    _minRate = value;
                } }
            public double MaxRate { get => _maxRate; set
                {
                    CheckRates(MinRate, value);
                    _maxRate = value;
                } }
            public string Key { get => Helpers.Checksum(Encoding.UTF8.GetBytes($"{Source}|{Sink}|{Group}"), "MD5"); }

            public PipeInfo(string source, string sink, string group = null, string type = "basic")
            {
                Source = source;
                Sink = sink;
                Group = group;
                Type = type;
                OrderBy = null;
                _minRate = 0.0;
                _maxRate = 9999.0;
            }

            private void CheckRates(double minRate, double maxRate)
            {
                if (minRate > maxRate) throw new AssertionError($"MinRate (value = {minRate}) must be less than or equal to the MaxRate (value = {maxRate})");
            }

            public JObject ToJson()
            {
                return new JObject()
                {
                    { "source", Source },
                    { "sink", Sink },
                    { "group", Group },
                    { "type", Type },
                    { "orderBy", OrderBy },
                    { "minRate", _minRate },
                    { "maxRate", _maxRate }
                };
            }

            public static PipeInfo FromJson(JObject json)
            {
                return new PipeInfo(json["source"].ToObject<string>(), json["sink"].ToObject<string>(), json["group"].ToObject<string>(), json["type"].ToObject<string>())
                {
                    OrderBy = json["orderBy"].ToObject<string>(),
                    _minRate = json["minRate"].ToObject<double>(),
                    _maxRate = json["maxRate"].ToObject<double>()
                };
            }
        }

        public interface IFileSystemNode
        {
            JToken ToJson();
        }

        public class Directory : Dictionary<string, IFileSystemNode>, IFileSystemNode
        {
            public bool Exists(params string[] tokens)
            {
                if (tokens.Length == 0) return true;
                if (tokens[0] == string.Empty) return Exists(tokens.Skip(1).ToArray());
                if (!ContainsKey(tokens[0])) return false;
                if (tokens.Length > 1) return (this[tokens[0]] is File || this[tokens[0]] is Socket) ? false : ((Directory)this[tokens[0]]).Exists(tokens.Skip(1).ToArray());
                return true;
            }

            public IFileSystemNode Get(params string[] tokens)
            {
                if (tokens.Length == 0) return this;
                if (tokens[0] == string.Empty) return Get(tokens.Skip(1).ToArray());
                if (!ContainsKey(tokens[0])) throw new OperationError($"{tokens[0]} does not exist");
                if (tokens.Length == 1) return this[tokens[0]];
                if (this[tokens[0]] is File) throw new OperationError($"Cannot get {string.Join("/", tokens.Skip(1))} at {tokens[0]}, which is a File");
                if (this[tokens[0]] is Socket) throw new OperationError($"Cannot get {string.Join("/", tokens.Skip(1))} at {tokens[0]}, which is a Socket");
                return ((Directory)this[tokens[0]]).Get(tokens.Skip(1).ToArray());
            }

            public JToken ToJson()
            {
                var json = new JObject();
                json["type"] = "directory";
                json["content"] = this.Aggregate(new JObject(), (acc, item) =>
                {
                    acc[item.Key] = item.Value.ToJson();
                    return acc;
                });
                return json;
            }

            public static Directory FromJson(JObject json)
            {
                if (json["type"].ToObject<string>() != "directory")
                {
                    throw new OperationError($"Could not create directory from given JSON object (type = {json["type"]})");
                }

                var dir = new Directory();

                var content = (JObject)json["content"];
                foreach (var item in content)
                {
                    if (item.Value["type"].ToObject<string>() == "directory")
                    {
                        dir[item.Key] = Directory.FromJson((JObject)item.Value);
                    }
                    else if (item.Value["type"].ToObject<string>() == "file")
                    {
                        dir[item.Key] = File.FromJson((JObject)item.Value);
                    }
                    else if (item.Value["type"].ToObject<string>() == "socket")
                    {
                        dir[item.Key] = Socket.FromJson((JObject)item.Value);
                    }
                    else
                    {
                        Console.WriteLine($"Cannot parse JSON object with type {item.Value["type"]}, ignoring it");
                    }
                }

                return dir;
            }

            // recursively shallow-copy contents of src to dst,
            // if dst contains a key that exists in src, then it will be overwritten
            // if dst contains a key that does not exist in src, the key will be untouched
            public static void CopyRecursively(Directory src, Directory dst)
            {
                foreach (var item in src)
                {
                    if (item.Value is Directory && dst.ContainsKey(item.Key) && dst[item.Key] is Directory)
                    {
                        CopyRecursively((Directory)item.Value, (Directory)dst[item.Key]);
                    }
                    else
                    {
                        dst[item.Key] = item.Value;
                    }
                }
            }
        }

        public class File : IFileSystemNode
        {
            public Dictionary<string, string> Copies = new Dictionary<string, string>();
            public string Checksum; // SHA256
            public long Size;

            public File()
            {

            }

            public File(string runtimeUri, string localPath)
            {
                AddCopy(runtimeUri, localPath);
            }

            public void AddCopy(string runtimeUri, string localPath)
            {
                Copies.Add(runtimeUri, localPath);
            }

            public JToken ToJson()
            {
                var json = new JObject();
                json["type"] = "file";
                json["content"] = JObject.FromObject(Copies);
                json["checksum"] = Checksum;
                json["size"] = Size;
                return json;
            }

            public static File FromJson(JObject json)
            {
                if (json["type"].ToObject<string>() != "file")
                {
                    throw new OperationError($"Could not create file from given JSON object (type = {json["type"]})");
                }

                var file = new File();

                var content = (JObject)json["content"];
                foreach (var item in content)
                {
                    file.Copies[item.Key] = item.Value.ToObject<string>();
                }

                // TODO: Remove the "if" after all files in the registry file are updated
                if (json.ContainsKey("checksum"))
                {
                    file.Checksum = json["checksum"].ToObject<string>();
                }

                if (json.ContainsKey("size"))
                {
                    file.Size = json["size"].ToObject<long>();
                }

                return file;
            }
        }

        public class Socket : IFileSystemNode
        {
            public string Owner;
            public int Port;
            public string HostRuntime;
            public bool IsIndependent;   // Independent if it is explicitly and directly created by a user - it's not independent if it's created by a program (e.g., node)
            
            public Socket() { }

            public JToken ToJson()
            {
                var json = new JObject();
                json["type"] = "socket";
                json["owner"] = Owner;
                json["port"] = Port;
                json["hostRuntime"] = HostRuntime;
                json["isIndependent"] = IsIndependent;
                return json;
            }

            public static Socket FromJson(JObject json)
            {
                if (json["type"].ToObject<string>() != "socket")
                {
                    throw new OperationError($"Could not create socket from given JSON object (type = {json["type"]})");
                }

                var socket = new Socket()
                {
                    Owner = json["owner"].ToObject<string>(),
                    Port = json["port"].ToObject<int>(),
                    HostRuntime = json["hostRuntime"].ToObject<string>(),
                    IsIndependent = json["isIndependent"].ToObject<bool>()
                };

                return socket;
            }
        }

        public class IOHandle : IFileSystemNode
        {
            public string DeviceType;
            public string Driver;
            public string HostRuntime;

            public IOHandle() { }

            public JToken ToJson()
            {
                var json = new JObject();
                json["type"] = "ioHandle";
                json["deviceType"] = DeviceType;
                json["driver"] = Driver;
                json["hostRuntime"] = HostRuntime;
                return json;
            }

            public static IOHandle FromJson(JObject json)
            {
                if (json["type"].ToObject<string>() != "ioHandle")
                {
                    throw new OperationError($"Could not create IOHandle from given JSON object (type = {json["type"]})");
                }

                var handle = new IOHandle()
                {
                    DeviceType = json["deviceType"].ToObject<string>(),
                    Driver = json["driver"].ToObject<string>(),
                    HostRuntime = json["hostRuntime"].ToObject<string>()
                };

                return handle;
            }
        }
    }
}
