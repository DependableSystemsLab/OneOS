using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace OneOS.Runtime
{
    public class Configuration
    {
        // getting the home directory based on the OS
        // and resolving the OneOS directory and the config path
        static string HomePath = (Environment.OSVersion.Platform == PlatformID.Unix || Environment.OSVersion.Platform == PlatformID.MacOSX)
            ? Environment.GetEnvironmentVariable("HOME") : Environment.ExpandEnvironmentVariables("%HOMEDRIVE%%HOMEPATH%");
        static string OneOSPath = Path.Combine(HomePath, ".oneos");
        public static string DefaultOneOSPath { get => OneOSPath; }

        public static Dictionary<string, string> LanguageMap = new Dictionary<string, string>()
        {
            { "csharp", "dotnet" },
            { "fsharp", "dotnet" },
            { "javascript", "node" },
            { "wasm", "node" },
            { "python", "python" },
            { "java", "java" },
            { "scala", "java" },
            { "ruby", "ruby" },
            { "docker", "docker" }
        };

        public string Domain { get; set; }
        public string ID { get; set; }

        public int Port { get; set; }
        public string StoragePath { get; set; }
        public List<VMConfiguration> VMs { get; set; }
        public List<IOConfiguration> IO { get; set; }
        public (int, long) Cores { get; set; }                // in MHz
        public long Memory { get; set; }                     // in MB
        public long Disk { get; set; }                       // in MB
        public List<string> Tags { get; set; }
        public Dictionary<string, IPEndPoint> Peers { get; set; }
        
        public string URI { get => $"{ID}.{Domain}"; }
        public string MountPath { get; private set; }
        public string EventLogPath { get => Path.Combine(MountPath, "log/runtime-events.log"); }
        public string ErrorLogPath { get => Path.Combine(MountPath, "log/runtime-errors.log"); }
        public string RegistryPath { get => Path.Combine(MountPath, "registry.json"); }
        public string LogDataPath { get => Path.Combine(MountPath, "log"); }
        public string TempDataPath { get => Path.Combine(MountPath, "temp"); }

        override public string ToString()
        {
            return $@"--- {URI} Configuration ---
Domain:       {Domain}
ID:           {ID}
Port:         {Port}
StoragePath:  {StoragePath}
VMs:          {string.Join(", ", VMs.Select(item => item.Language))}
IO:           {( IO.Count > 0 ? "\n" + string.Join("\n", IO.Select(item => $"\t{item.Name}\t{item.Driver}\t{string.Join(", ", item.Arguments)}")) : "")}
Capacity:
    Cores:    {Cores.Item1} x {Cores.Item2} MHz
    Memory:   {Memory} MB
    Disk:     {Disk} MB
Tags:         {string.Join(", ", Tags)}
Peers:
{string.Join("\n", Peers.Select(item => $"\t{item.Key}: {item.Value}"))}
";
        }

        // load configuration from the mount path
        public static Configuration LoadConfig(string mountPath = null)
        {
            if (mountPath == null) mountPath = OneOSPath;

            CheckOneOSDirectory(mountPath);
            var json = LoadOrCreateConfigJSON(mountPath);
            var config = LoadFromJSON(json);
            config.MountPath = mountPath;
            return config;
        }

        public static void CreateOrUpdateConfig(string mountPath = null)
        {
            if (mountPath == null) mountPath = OneOSPath;

            // look for home directory
            if (!Directory.Exists(mountPath))
            {
                Console.WriteLine($"{mountPath} directory not found. Creating ...");
                Directory.CreateDirectory(mountPath);
            };

            string configPath = Path.Combine(mountPath, "config.json");

            var json = JObject.Parse("{}");

            if (File.Exists(configPath))
            {
                json = JObject.Parse(File.ReadAllText(configPath));
            }

            json = RunInteractiveConfigSetup(mountPath, json);
            SaveConfig(configPath, json);
        }

        private static void InstallNodeJSDependencies(string tempDataPath, string dependencies)
        {
            var tcs = new TaskCompletionSource<object>();

            Console.WriteLine($"Installing oneos.js NPM Dependencies");

            var startInfo = new ProcessStartInfo();
            startInfo.UseShellExecute = false;
            startInfo.WorkingDirectory = tempDataPath;
            startInfo.RedirectStandardInput = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                startInfo.FileName = "cmd";
                startInfo.Arguments = "/c npm install " + dependencies;
            }
            else
            {
                startInfo.FileName = "npm";
                startInfo.Arguments = "install " + dependencies;
            }

            var npm = new Process();
            npm.StartInfo = startInfo;
            npm.EnableRaisingEvents = true;
            npm.Exited += (sender, evt) =>
            {
                string output;
                if (npm.ExitCode != 0)
                {
                    output = npm.StandardError.ReadToEnd();
                }
                else
                {
                    output = npm.StandardOutput.ReadToEnd();
                }

                tcs.SetResult(output);
            };

            npm.Start();

            var result = tcs.Task.Result;

            Console.WriteLine(result);

            return;
        }

        // ensures that the OneOS directory exists
        static void CheckOneOSDirectory(string mountPath)
        {
            var dataDirectory = Path.Combine(mountPath, "data");
            var logDirectory = Path.Combine(mountPath, "log");
            var tempDirectory = Path.Combine(mountPath, "temp");
            var manifestPath = Path.Combine(mountPath, "boot.json");
            var indexPath = Path.Combine(mountPath, "registry.json");

            var npmPackageJson = Path.Combine(tempDirectory, "package.json");
            var npmModules = Path.Combine(tempDirectory, "node_modules");

            // look for home directory
            if (!Directory.Exists(mountPath))
            {
                Console.WriteLine($"{mountPath} directory not found. Creating ...");
                Directory.CreateDirectory(mountPath);
            };

            // look for data directory
            if (!Directory.Exists(dataDirectory))
            {
                Console.WriteLine($"{dataDirectory} directory not found. Creating ...");
                Directory.CreateDirectory(dataDirectory);
            };

            // look for log directory
            if (!Directory.Exists(logDirectory))
            {
                Console.WriteLine($"{logDirectory} directory not found. Creating ...");
                Directory.CreateDirectory(logDirectory);
            };

            // look for temp directory
            if (!Directory.Exists(tempDirectory))
            {
                Console.WriteLine($"{tempDirectory} directory not found. Creating ...");
                Directory.CreateDirectory(tempDirectory);
            };

            // look for package.json file (needed for JavaScript agents)
            if (!File.Exists(npmPackageJson))
            {
                Console.WriteLine($"{npmPackageJson} file not found. Creating ...");
                File.WriteAllText(npmPackageJson, "{}");

                // install oneos.js dependencies
                InstallNodeJSDependencies(tempDirectory, "esprima@4.0.1 escodegen@2.1.0 js-beautify@1.14.11");
            }

            // check node_modules (needed for JavaScript agents)
            if (!Directory.Exists(npmModules))
            {
                Console.WriteLine($"{npmModules} directory not found. Creating ...");
                Directory.CreateDirectory(npmModules);
            }

            // make sure the oneos javascript library is up to date
            var jsOneOSPath = Path.Combine(npmModules, "oneos");
            if (!Directory.Exists(jsOneOSPath))
            {
                Console.WriteLine($"{jsOneOSPath} directory not found. Creating ...");
                Directory.CreateDirectory(jsOneOSPath);
            }
            File.WriteAllText(Path.Combine(jsOneOSPath, "index.js"), Properties.Resources.indexJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "instrument.js"), Properties.Resources.instrumentJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "restore.js"), Properties.Resources.restoreJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "Code.js"), Properties.Resources.CodeJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "Runtime.js"), Properties.Resources.RuntimeJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "fs.js"), Properties.Resources.fsJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "net.js"), Properties.Resources.netJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "child_process.js"), Properties.Resources.child_processJs);
            File.WriteAllText(Path.Combine(jsOneOSPath, "io.js"), Properties.Resources.ioJs);
            if (!Directory.Exists(Path.Combine(jsOneOSPath, "test")))
            {
                Directory.CreateDirectory(Path.Combine(jsOneOSPath, "test"));
            }
            File.WriteAllText(Path.Combine(jsOneOSPath, "test/workload.js"), Properties.Resources.workloadJs);

            // make sure the default filesystem files are up to date
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal-server.js"), Properties.Resources.webTerminalServerJS);
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal.html"), Properties.Resources.webTerminalClientHtml);
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal-client.js"), Properties.Resources.webTerminalClientJs);
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal-style.css"), Properties.Resources.webTerminalClientCss);
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal-client-dependency.js"), Properties.Resources.webTerminalClientDependencyJs);
            File.WriteAllText(Path.Combine(dataDirectory, "web-terminal-style-dependency.css"), Properties.Resources.webTerminalClientDependencyCss);

            // look for manifest file
            if (!File.Exists(manifestPath))
            {
                Console.WriteLine($"{manifestPath} file not found. Creating ...");
                File.WriteAllText(manifestPath, "{}");
            }

            // look for index file
            if (!File.Exists(indexPath))
            {
                Console.WriteLine($"{indexPath} file not found. Creating ...");
                var registry = new Registry();
                //File.WriteAllText(indexPath, "{ \"version\": -1, \"content\": {} }");
                File.WriteAllText(indexPath, registry.ToJsonString());
            }
        }

        static JObject LoadOrCreateConfigJSON(string mountPath)
        {
            string configPath = Path.Combine(mountPath, "config.json");

            // look for config file
            if (!File.Exists(configPath))
            {
                var json = RunInteractiveConfigSetup(mountPath);
                SaveConfig(configPath, json);
            }

            // load config file
            return JObject.Parse(File.ReadAllText(configPath));
        }

        static void SaveConfig(string configPath, JObject config)
        {
            File.WriteAllText(configPath, config.ToString());
        }

        static Configuration LoadFromJSON(JToken json)
        {
            var domain = json["domain"].ToObject<string>();

            var vms = new List<VMConfiguration>();

            ((JArray)json["vms"]).Values<JObject>().ToList().ForEach(obj => vms.Add(VMConfiguration.FromJObject(obj)));

            var io = new List<IOConfiguration>();

            ((JArray)json["io"]).Values<JObject>().ToList().ForEach(obj => io.Add(IOConfiguration.FromJObject(obj)));

            var cores = ((JArray)json["cores"]).Values<int>().ToList();

            var memory = json["memory"].ToObject<int>();

            var disk = json["disk"].ToObject<int>();

            var tags = ((JArray)json["tags"]).Values<string>().ToList();

            var peers = new Dictionary<string, IPEndPoint>();

            var jsonPeers = ((JObject)json["peers"]);
            foreach (var item in jsonPeers)
            {
                var tokens = item.Value.ToObject<string>().Split(':');
                var address = Dns.GetHostAddresses(tokens[0])[0];
                //peers.Add(item.Key + "." + domain, new IPEndPoint(IPAddress.Parse(tokens[0]), int.Parse(tokens[1])));
                peers.Add(item.Key + "." + domain, new IPEndPoint(address, int.Parse(tokens[1])));
            }

            var config = new Configuration()
            {
                Domain = domain,
                ID = json["id"].ToObject<string>(),
                Port = json["port"].ToObject<int>(),
                StoragePath = json["storage"].ToObject<string>(),
                VMs = vms,
                IO = io,
                Cores = (cores[0], cores[1]),
                Memory = memory,
                Disk = disk,
                Tags = tags,
                Peers = peers
            };

            return config;
        }

        // if given json, it modifies the given json object
        static JObject RunInteractiveConfigSetup(string mountPath = null, JObject json = null)
        {
            if (mountPath == null) mountPath = OneOSPath;
            if (json == null) json = JObject.Parse("{}");

            // update each field
            CreateOrUpdateField(json, "domain", "Domain Name");
            CreateOrUpdateField(json, "id", "Node ID");
            CreateOrUpdateField(json, "port", "TCP Port to listen");

            if (!json.ContainsKey("storage")) json["storage"] = Path.Combine(mountPath, "data");
            CreateOrUpdateField(json, "storage", "Data Storage Directory", "(e.g.: /home/user/.oneos/data)");

            if (!json.ContainsKey("vms")) json["vms"] = JArray.Parse("[]");

            // check if runtime binaries can be found
            JObject foundVMs = new JObject();

            foreach (var lang in LanguageMap)
            {
                try
                {
                    foundVMs[lang.Key] = LookupVM(lang.Value);
                }
                catch (NullReferenceException ex)
                {
                    // do nothing
                }
            }

            JArray vmAgents = (JArray)json["vms"];

            Console.WriteLine($"Current list of VMs - {vmAgents.Count} agents:\n{string.Join("\n", vmAgents.Select(item => "  - " + ((JObject)item)["name"].ToObject<string>()))}");

            string[] vmOptions = foundVMs.Properties().Select(prop => $"{prop.Name}").Concat(new string[] { "manual" }).ToArray();
            string[] vmOptionsDisplay = foundVMs.Properties().Select(prop => $"{prop.Name} ({LanguageMap[prop.Name]} at {prop.Value})").Concat(new string[] { "Add Manually" }).ToArray();

            while (Ask("Add a VM? (y/n)") == "y")
            {
                string selection = AskMultipleChoice("Found the following VMs, select an option: ", vmOptions, vmOptionsDisplay);

                var vmConfig = new JObject();

                if (selection == "manual")
                {
                    vmConfig["name"] = Ask("VM Name (will be used in the public URI of the VM agent): ");

                    vmConfig["language"] = AskMultipleChoice("VM Language: ", LanguageMap.Keys.ToArray());
                    vmConfig["bin"] = Ask("VM Executable Path: ");
                }
                else
                {
                    vmConfig["name"] = Ask("VM Name (will be used in the public URI of the VM agent): ");

                    vmConfig["language"] = selection;
                    vmConfig["bin"] = foundVMs[selection];
                }

                vmAgents.Add(vmConfig);
            }

            // io drivers
            if (!json.ContainsKey("io")) json["io"] = JArray.Parse("[]");

            JArray ioAgents = (JArray)json["io"];

            Console.WriteLine($"Current list of IO Agents - {ioAgents.Count} agents:\n{string.Join("\n", ioAgents.Select(item => "  - " + ((JObject)item)["name"].ToObject<string>()))}");

            while (Ask("Add an IO Agent? (y/n)") == "y")
            {
                string ioName = Ask("IO name (will be used in the public URI of the VM agent - e.g.: ffmpeg-1): ");
                string ioDriver = Ask("IO driver (e.g.: ffmpeg): ");

                var ioConfig = new JObject();
                ioConfig["name"] = ioName;
                ioConfig["driver"] = ioDriver;
                ioConfig["args"] = new JArray();

                ioAgents.Add(ioConfig);
            }

            // cpu allocation
            if (!json.ContainsKey("cores")) json["cores"] = JArray.Parse("[ 0, 0 ]");

            var availableCores = LookupCores();

            Console.WriteLine($"Currently allocated CPU cores: {json["cores"][0].ToString()} x {json["cores"][1].ToString()} MHz");
            while (Ask("Update CPU core allocation? (y/n)") == "y")
            {
                int cores = int.Parse(Ask($"Enter number of cores to allocate (max = {availableCores.Item1}): "));
                while (cores > availableCores.Item1 || cores < 0)
                {
                    cores = int.Parse(Ask($"Number of cores must be between 0 and {availableCores.Item1}.\nEnter number of cores to allocate (max = {availableCores.Item1}): "));
                }
                json["cores"][0] = cores;
                json["cores"][1] = availableCores.Item2;

                Console.WriteLine($"Allocated {json["cores"][0].ToString()} x {json["cores"][1].ToString()} MHz");
            }

            // memory allocation
            if (!json.ContainsKey("memory")) json["memory"] = 0;

            var availableMemory = LookupMemory();

            Console.WriteLine($"Currently allocated memory: {json["memory"].ToString()} MB");
            while (Ask("Update memory allocation? (y/n)") == "y")
            {
                int mem = int.Parse(Ask($"Enter memory to allocate (max = {availableMemory}): "));
                while (mem > availableMemory || mem < 0)
                {
                    mem = int.Parse(Ask($"Memory size must be between 0 and {availableMemory}.\nEnter memory to allocate (max = {availableMemory}): "));
                }
                json["memory"] = mem;

                Console.WriteLine($"Allocated {json["memory"].ToString()} MB");
            }

            // disk allocation
            if (!json.ContainsKey("disk")) json["disk"] = 0;

            var availableDisk = LookupDisk(mountPath);

            Console.WriteLine($"Currently allocated disk: {json["disk"].ToString()} MB");
            while (Ask("Update disk allocation? (y/n)") == "y")
            {
                int disk = int.Parse(Ask($"Enter disk space to allocate (max = {availableDisk} MB): "));
                while (disk > availableDisk || disk < 0)
                {
                    disk = int.Parse(Ask($"Disk size must be between 0 and {availableDisk}.\nEnter disk to allocate (max = {availableDisk} MB): "));
                }
                json["disk"] = disk;

                Console.WriteLine($"Allocated {json["disk"].ToString()} MB");
            }

            // user defined tags
            if (!json.ContainsKey("tags")) json["tags"] = JToken.Parse("[]");

            JArray tags = (JArray)json["tags"];
            Console.WriteLine($"Current list of tags - {tags.Count} tags:\n{string.Join("\n", tags.Select(item => "    " + item.ToString()))}");

            while (Ask("Add a Tag? (y/n)") == "y")
            {
                string tag = Ask("Tag (e.g.: #camera): ");
                tags.Add(tag);
            }

            if (!json.ContainsKey("peers")) json["peers"] = JObject.Parse("{}");

            JObject peers = (JObject)json["peers"];
            Console.WriteLine($"Current list of peers - {peers.Count} nodes:\n{string.Join("\n", peers.Properties().Select(item => "  - " + item.Name + " at " + peers[item.Name].ToObject<string>()))}");

            while (Ask("Add a Peer? (y/n)") == "y")
            {
                string peerUri = Ask("peer ID (e.g.: host-1): ");
                string peerAddress = Ask("peer address (e.g.: 127.0.0.1:4000): ");
                peers.Add(peerUri, peerAddress);
            }

            return json;
        }

        static void CreateOrUpdateField(JObject json, string key, string fieldName, string enterExample = "")
        {
            if (json.ContainsKey(key))
            {
                string val = Ask($"Current {fieldName} is '{json[key]}'. Enter new {fieldName} (or leave blank to use current): ", true).Trim();

                if (val != "")
                {
                    json[key] = val;
                }
            }
            else
            {
                json[key] = Ask($"No {fieldName} set. Enter new {fieldName} {enterExample}: ");
            }
        }

        public static string LookupVM(string binaryName)
        {
            Process cmd = new Process();

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                cmd.StartInfo.FileName = "where.exe";
            }
            else
            {
                cmd.StartInfo.FileName = "which";
            }

            cmd.StartInfo.Arguments = binaryName;
            cmd.StartInfo.RedirectStandardOutput = true;
            cmd.Start();

            cmd.WaitForExit();

            string[] result = cmd.StandardOutput.ReadToEnd().Trim().Split('\n');

            if (result[0].Contains("Could not find")) throw new NullReferenceException();

            if (!File.Exists(result[0])) throw new NullReferenceException();

            return result[0];
        }

        public static (int, int) LookupCores()
        {
            Process cmd = new Process();
            cmd.StartInfo.RedirectStandardOutput = true;

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                // wmic is deprecated as of Win 10,
                // but is at least reliable across environments (PowerShell or CMD)
                cmd.StartInfo.FileName = "wmic";
                cmd.StartInfo.Arguments = "cpu get maxclockspeed,numberofcores";
                cmd.Start();

                cmd.WaitForExit();

                var result = cmd.StandardOutput.ReadToEnd().Trim().Split('\n');
                var tokens = result[1].Split(' ').Where(item => item.Length > 0).ToArray();
                var clockSpeed = int.Parse(tokens[0]);
                var numCores = int.Parse(tokens[1]);

                return (numCores, clockSpeed);
            }
            else
            {
                cmd.StartInfo.FileName = "lscpu";
                cmd.Start();

                cmd.WaitForExit();

                var result = cmd.StandardOutput.ReadToEnd().Trim().Split('\n');
                var numCores = int.Parse(result.Where(line => line.IndexOf("CPU(s):") == 0).First().Split(' ').Where(item => item.Length > 0).Last());
                var clockSpeed = (int)float.Parse(result.Where(line => line.Contains("CPU MHz:") || line.Contains("CPU max MHz:")).First().Split(' ').Where(item => item.Length > 0).Last());

                return (numCores, clockSpeed);
            }
            
        }

        static int LookupMemory()
        {
            Process cmd = new Process();
            cmd.StartInfo.RedirectStandardOutput = true;

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                // wmic is deprecated as of Win 10,
                // but is at least reliable across environments (PowerShell or CMD)
                cmd.StartInfo.FileName = "wmic";
                cmd.StartInfo.Arguments = "memorychip list full";
                cmd.Start();

                cmd.WaitForExit();

                var result = cmd.StandardOutput.ReadToEnd().Trim().Split('\n');
                var memory = result.Where(line => line.IndexOf("Capacity=") == 0).Aggregate((long)0, (acc, line) => acc + long.Parse(line.Trim().Split('=')[1]));

                return (int)( memory / 1000000 );
            }
            else
            {
                cmd.StartInfo.FileName = "free";
                cmd.Start();

                cmd.WaitForExit();

                var result = cmd.StandardOutput.ReadToEnd().Trim().Split('\n');
                var memory = long.Parse(result.Where(line => line.IndexOf("Mem:") == 0).First().Split(' ').Where(item => item.Length > 0).ToArray()[1]);

                return (int)( memory / 1000 );
            }
        }

        static int LookupDisk(string mountPath)
        {
            var volumeInfo = Directory.GetDirectoryRoot(mountPath);

            var volume = DriveInfo.GetDrives().Where(info => info.Name == volumeInfo).First();
            return (int)(volume.AvailableFreeSpace / 1000000);
        }

        // helper function to collect user input
        static string Ask(string prompt, bool allowBlank = false)
        {
            Console.Write(prompt);
            string input = Console.ReadLine();
            while (input == "" && !allowBlank)
            {
                Console.Write(prompt);
                input = Console.ReadLine();
            }
            return input;
        }

        // helper function to collect user input
        static string AskMultipleChoice(string prompt, string[] choices, string[] display = null)
        {
            int selection = -1;
            string selected = "";
            string input = "";

            if (display != null)
            {
                Console.WriteLine(prompt + "\n" + string.Join("\n", choices.Select((item, index) => $"    {index + 1}) {display[index]}")));
            }
            else
            {
                Console.WriteLine(prompt + "\n" + string.Join("\n", choices.Select((item, index) => $"    {index + 1}) {item}")));
            }

            while (selection < 0 || selection >= choices.Length)
            {
                Console.Write($"Enter a value between 1 and {choices.Length}: ");
                input = Console.ReadLine();
                try
                {
                    selection = int.Parse(input) - 1;
                    selected = choices[selection];
                }
                catch (IndexOutOfRangeException ex)
                {
                    continue;
                }
                catch (FormatException ex)
                {
                    continue;
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
            }
            return selected;
        }
    }

    public class VMConfiguration
    {
        public string Name;
        public string Language;
        public string InterpreterExecutablePath;

        public static VMConfiguration FromJObject(JObject obj)
        {
            return new VMConfiguration()
            {
                Name = obj["name"].ToObject<string>(),
                Language = obj["language"].ToObject<string>(),
                InterpreterExecutablePath = obj["bin"].ToObject<string>()
            };
        }
    }

    public class IOConfiguration
    {
        public string Name;
        public string Driver;
        public string[] Arguments;

        public static IOConfiguration FromJObject(JObject obj)
        {
            return new IOConfiguration()
            {
                Name = obj["name"].ToObject<string>(),
                Driver = obj["driver"].ToObject<string>(),
                Arguments = ((JArray)obj["args"]).Select(token => token.ToObject<string>()).ToArray()
            };
        }

        public JObject ToJObject()
        {
            var json = new JObject();
            json["name"] = Name;
            json["driver"] = Driver;
            json["args"] = new JArray(Arguments);
            return json;
        }
    }
}
