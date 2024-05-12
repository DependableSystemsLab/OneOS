using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Text;
using System.IO;
using System.IO.Pipes;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using OneOS.Common;

namespace OneOS.Runtime.Driver
{
    public class JavaScriptAgent : ProcessAgent
    {
        private string OriginalSourceCode;
        private string OriginalArgs;
        private string FileName { get => $"{Path.GetFileNameWithoutExtension(OriginalSourceCode)}.inst.{URI.Split('/').Last()}.js"; }
        public string SnapPath { get => $"{URI.Replace("/","-")}.snap"; }

        private VirtualRuntime VirtualRuntime;
        private Socket IpcTxSocket;
        private Socket IpcRxSocket;
        private ConcurrentDictionary<string, TaskCompletionSource<object>> PendingIpcRequests;

        private Action<string, object> RuntimeEventHandler;

        private JavaScriptAgent(Runtime runtime, string uri, string username) : base(runtime, uri, username)
        {
            PendingIpcRequests = new ConcurrentDictionary<string, TaskCompletionSource<object>>();
            VirtualRuntime = new VirtualRuntime(runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));

            AttachRuntimeEventHandler();
        }

        public JavaScriptAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string filePath, string args) : base(runtime, uri, username, environ, "node", filePath + " " + args)
        {
            OriginalSourceCode = filePath;
            OriginalArgs = args;
            PendingIpcRequests = new ConcurrentDictionary<string, TaskCompletionSource<object>>();
            VirtualRuntime = new VirtualRuntime(runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));

            InstrumentCode();

            AttachRuntimeEventHandler();
        }

        private void AttachRuntimeEventHandler()
        {
            RuntimeEventHandler = (evtType, evtData) =>
            {
                if (Status == ProcessStatus.Running)
                {
                    IpcRequest("emitRuntimeEvent", evtType, evtData).ContinueWith(prev =>
                    {
                        Console.WriteLine($"{this} Failed to relay runtime event to child process");
                    }, TaskContinuationOptions.OnlyOnFaulted);
                }
            };

            Runtime.OnRuntimeStateEvent += RuntimeEventHandler;
        }

        private void DetachRuntimeEventHandler()
        {
            Runtime.OnRuntimeStateEvent -= RuntimeEventHandler;
        }

        // Instrument source code to replace the evaluation context of the program.
        // i.e., make the process use the OneOS virtual environment
        private void InstrumentCode()
        {
            try
            {
                //var filename = Path.GetFileNameWithoutExtension(OriginalSourceCode);
                var instPath = Path.Combine(Runtime.TempDataPath, FileName);
                var instrumentPath = Path.Combine(Runtime.TempDataPath, "node_modules/oneos/instrument.js");

                //Console.WriteLine($"{this} Instrumenting {OriginalSourceCode} at {instPath} ...");
                //Console.WriteLine($"node {instrumentPath} {OriginalSourceCode} {instPath} {URI}");

                var instrument = new Process();
                var startInfo = new ProcessStartInfo("node", $"{instrumentPath} {OriginalSourceCode} {instPath} {URI} {Environment["CWD"]}");
                startInfo.UseShellExecute = false;
                startInfo.WorkingDirectory = Runtime.TempDataPath;
                startInfo.RedirectStandardInput = false;
                startInfo.RedirectStandardOutput = false;
                startInfo.RedirectStandardError = false;
                instrument.StartInfo = startInfo;
                instrument.Start();
                instrument.WaitForExit(5000);

                Info.Arguments = instPath + " " + OriginalArgs;

                //Console.WriteLine($"{this} Instrumented {OriginalSourceCode} at {instPath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while instrumenting: {ex}");
            }
            
        }

        public static JavaScriptAgent RestoreFromSnapshot(Runtime runtime, Registry.AgentInfo agentInfo, string snapPath)
        {
            var fileName = Path.GetFileNameWithoutExtension(agentInfo.Arguments.Split(' ')[0]);
            //var snapPath = agentInfo.LastCheckpoint;
            var restPath = Path.Combine(runtime.TempDataPath, $"{fileName}.rest.{agentInfo.URI.Split('/').Last()}.js");

            var restorePath = Path.Combine(runtime.TempDataPath, "node_modules/oneos/restore.js");
            var restore = new Process();
            var startInfo = new ProcessStartInfo("node", $"{restorePath} {snapPath} {restPath}");
            startInfo.UseShellExecute = false;
            startInfo.WorkingDirectory = runtime.TempDataPath;
            startInfo.RedirectStandardInput = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;
            restore.StartInfo = startInfo;
            restore.Start();
            restore.WaitForExit();

            var agent = new JavaScriptAgent(runtime, agentInfo.URI, agentInfo.User);
            agent.OriginalSourceCode = fileName;
            agent.Info.FileName = "node";
            agent.Info.Arguments = restPath;
            agent.SetEnvironment(agentInfo.Environment);

            Console.WriteLine($"Agent {agentInfo.URI} restored");

            return agent;
        }

        private void CleanUp()
        {
            var instPath = Path.Combine(Runtime.TempDataPath, FileName);
            File.Delete(instPath);
        }

        private async Task<object> IpcRequest(string command, params object[] arguments)
        {
            var transactionId = RandomText.Next(8);
            var request = new JObject();
            request["type"] = "request";
            request["transactionId"] = transactionId;
            request["method"] = command;
            request["arguments"] = JArray.FromObject(arguments);

            var serialized = JsonConvert.SerializeObject(request);
            var message = Encoding.UTF8.GetBytes(serialized);

            // Create a "callback" TCS to resolve after receiving the response
            var tcs = new TaskCompletionSource<object>();
            PendingIpcRequests[transactionId] = tcs;

            tcs.Task.ContinueWith(data =>
            {
                TaskCompletionSource<object> removed;
                PendingIpcRequests.TryRemove(transactionId, out removed);
            });

            await IpcTxSocket.Send(message);

            return await tcs.Task;
        }

        protected override void OnBegin()
        {
            base.OnBegin();

            var socketPrefix = System.Environment.OSVersion.Platform == PlatformID.Win32NT ? FileName : $"{Path.Combine(Runtime.TempDataPath, FileName)}";

            // connect to child process IPC channel
            // NOTE: we need to use 2 tx/rx pipes because name pipe streams are blocking (leads to deadlock)
            var ipcTxPipe = new NamedPipeClientStream(socketPrefix + ".rp.sock");
            ipcTxPipe.Connect();

            //Console.WriteLine($"{this} Connected to TxPipe {ipcTxPipe.IsConnected}");

            var ipcRxPipe = new NamedPipeClientStream(socketPrefix + ".pr.sock");
            ipcRxPipe.Connect();

            //Console.WriteLine($"{this} Connected to RxPipe {ipcRxPipe.IsConnected}");

            IpcTxSocket = new Socket(ipcTxPipe);
            IpcRxSocket = new Socket(ipcRxPipe);
            IpcRxSocket.Listen(payload =>
            {
                var message = JObject.Parse(Encoding.UTF8.GetString(payload));
                var messageType = message["type"].ToObject<string>();
                var transactionId = message["transactionId"].ToObject<string>();

                if (messageType == "request")
                {
                    var method = message["method"].ToObject<string>();
                    var args = ((JArray)message["arguments"]).Select(item => item.ToObject<object>()).ToArray();
                    //Console.WriteLine($"Received request for {method}");

                    Task<JToken> task;
                    switch (method)
                    {
                        case "ReadTextFile":
                            task = VirtualRuntime.ReadTextFile(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "WriteTextFile":
                            task = VirtualRuntime.WriteTextFile(Helpers.ResolvePath(Environment["CWD"], (string)args[0]), (string)args[1]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "AppendTextFile":
                            task = VirtualRuntime.AppendTextFile(Helpers.ResolvePath(Environment["CWD"], (string)args[0]), (string)args[1]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ReadFile":
                            task = VirtualRuntime.ReadFile(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "WriteFile":
                            byte[] content = Convert.FromBase64String((string)args[1]);
                            task = VirtualRuntime.WriteFile(Helpers.ResolvePath(Environment["CWD"], (string)args[0]), content).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateReadStream":
                            task = VirtualRuntime.CreateReadStream(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateWriteStream":
                            task = VirtualRuntime.CreateWriteStream(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "RestoreReadStream":
                            task = VirtualRuntime.RestoreReadStream(Helpers.ResolvePath(Environment["CWD"], (string)args[0]), (long)args[1]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "GetFileStatus":
                            task = VirtualRuntime.GetFileStatus(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ReadDirectory":
                            task = VirtualRuntime.ReadDirectory(Helpers.ResolvePath(Environment["CWD"], (string)args[0])).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateServer":
                            task = VirtualRuntime.CreateServer((long)args[0]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateAgentMonitorStream":
                            task = VirtualRuntime.CreateAgentMonitorStream((string)args[0]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateVideoInputStream":
                            task = VirtualRuntime.CreateVideoInputStream((string)args[0]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "CreateKafkaInputStream":
                            task = VirtualRuntime.CreateKafkaInputStream((string)args[0], (string)args[1], (long)args[2]).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "RpcRequest":
                            task = Request((string)args[0], (string)args[1], args.Skip(2).ToArray()).ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ListAllAgents":
                            task = VirtualRuntime.ListAllAgents().ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ListAllPipes":
                            task = VirtualRuntime.ListAllPipes().ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ListAllRuntimes":
                            task = VirtualRuntime.ListAllRuntimes().ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ListAllSockets":
                            task = VirtualRuntime.ListAllSockets().ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        case "ListAllIOHandles":
                            task = VirtualRuntime.ListAllIOHandles().ContinueWith(prev =>
                            {
                                if (prev.Status == TaskStatus.RanToCompletion)
                                {
                                    return JToken.FromObject(prev.Result);
                                }
                                else throw prev.Exception.InnerException;
                            });
                            break;
                        default:
                            task = Task.FromException<JToken>(new OperationError($"{method} is not available on VirtualRuntime"));
                            break;
                    }

                    task.ContinueWith(prev =>
                    {
                        var response = new JObject();
                        response["type"] = "response";
                        response["transactionId"] = transactionId;

                        if (prev.Status == TaskStatus.RanToCompletion)
                        {
                            response["hasError"] = false;
                            response["result"] = prev.Result;
                        }
                        else
                        {
                            response["hasError"] = true;
                            response["result"] = prev.Exception.InnerException.Message;
                        }

                        var serialized = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(response));
                        IpcTxSocket.Send(serialized);
                    });
                }
                else if (messageType == "response")
                {
                    var hasError = message["hasError"].ToObject<bool>();
                    if (PendingIpcRequests.ContainsKey(transactionId))
                    {
                        if (hasError)
                        {
                            var errorMessage = message["result"].ToObject<string>();
                            PendingIpcRequests[transactionId].SetException(new OperationError(errorMessage));
                        }
                        else
                        {
                            PendingIpcRequests[transactionId].SetResult(message["result"].ToObject<object>());
                        }
                    }
                    else
                    {
                        throw new OperationError($"IpcResponse received for an unknown Transaction ID");
                    }
                }
            });
        }

        protected override void OnEnd()
        {
            DetachRuntimeEventHandler();

            IpcTxSocket.Stop().Wait();
            IpcRxSocket.Stop().Wait();

            base.OnEnd();

#if !DEBUG
            CleanUp();
#endif
        }

        public override async Task<object> Pause()
        {
            await IpcRequest("pause");

            return await base.Pause();
        }

        public override async Task<object> Resume()
        {
            await IpcRequest("resume");

            return await base.Resume();
        }

        public override async Task<object> Checkpoint()
        {
            try
            {
                var result = await IpcRequest("checkpoint");

                var snapshot = (JObject)result;

                /*LastCheckpointTime = DateTime.Now;
                LastCheckpoint = snapshot;*/

                //var snapPath = Path.Combine(Runtime.TempDataPath, FileName + ".snap.json");
                //File.WriteAllText(snapPath, JsonConvert.SerializeObject(snapshot));

                var savePath = Helpers.ResolvePath(Environment["CWD"], SnapPath);

                // Snapshot should be saved asynchronously, otherwise the thread blocks
                VirtualRuntime.WriteTextFile(savePath, JsonConvert.SerializeObject(snapshot));

                //UpdateCheckpoint(snapshot, snapPath);
                UpdateCheckpoint(snapshot, savePath);

                /*var snapshot = (string)result;

                LastCheckpointTime = DateTime.Now;
                LastCheckpoint = snapshot;

                var snapPath = Path.Combine(Runtime.TempDataPath, FileName + ".snap.js");
                File.WriteAllText(snapPath, snapshot);*/

                return base.Checkpoint();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} FAILED to checkpoint - ({ex.GetType().Name}) {ex.Message}");
                //Console.WriteLine(ex);
                return URI;
            }
        }
    }
}
