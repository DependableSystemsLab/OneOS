using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json.Linq;

using OneOS.Common;
using Pipelines.Sockets.Unofficial.Arenas;
using OneOS.Language;

namespace OneOS.Runtime
{
    public class ProcessAgent : RpcAgent
    {
        public enum ProcessStatus
        {
            Initialized,    // initialized but not started
            Running,        // started and running
            Paused,         // paused
            Exited          // exited
        }

        private const int BufferSize = 131072;

        protected Runtime Runtime;
        protected Dictionary<string, string> Environment;
        protected ProcessStartInfo Info;
        internal Process Process;
        internal long BytesIn { get; private set; }
        internal long BytesOut { get; private set; }
        internal int MessagesIn { get; private set; }
        internal int MessagesOut { get; private set; }
        public string User { get; private set; }
        public ProcessStatus Status { get; protected set; }
        protected int CheckpointInterval;
        public DateTime LastCheckpointTime { get; protected set; }
        public object LastCheckpoint { get; protected set; }
        public string InputFormat { get; protected set; }
        public string OutputFormat { get; protected set; }
        public event EventHandler OnExit;
        public event Action<string> OnCheckpointUpdate;

        private string StdoutChannel;
        private StreamControl OutputController;
        internal Dictionary<string, InputPipe> DirectInputPipes;
        internal Dictionary<string, OutputPipe> DirectOutputPipes;
        private Queue<byte[]> InputBuffer;
        private Dictionary<string, MessageSequencer<byte[]>> InputSequencers;
        private Interpreter Interpreter;    // this is initialized lazily
        public readonly List<byte[]> StderrBuffer;

        public ProcessAgent(Runtime runtime, string username, Dictionary<string, string> environ, ProcessStartInfo info) : base(runtime)
        {
            Runtime = runtime;
            URI = Runtime.URI + "/" + Helpers.RandomText.Next();
            User = username;
            StdoutChannel = $"{URI}:stdout";
            BytesIn = 0;
            BytesOut = 0;
            MessagesIn = 0;
            MessagesOut = 0;
            DirectInputPipes = new Dictionary<string, InputPipe>();
            DirectOutputPipes = new Dictionary<string, OutputPipe>();
            InputBuffer = new Queue<byte[]>();
            InputSequencers = new Dictionary<string, MessageSequencer<byte[]>>();
            OutputController = new StreamControl(1);
            StderrBuffer = new List<byte[]>();

            Info = info;
            Info.UseShellExecute = false;
            Info.WorkingDirectory = Runtime.TempDataPath;
            Info.RedirectStandardInput = true;
            Info.RedirectStandardOutput = true;
            Info.RedirectStandardError = true;

            SetEnvironment(environ);

            Process = new Process();
            Process.StartInfo = Info;
            Process.EnableRaisingEvents = true;

            Process.Exited += new EventHandler(OnProcessExit);

            Status = ProcessStatus.Initialized;
        }

        public ProcessAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string binaryPath, string args) : base(runtime)
        {
            Runtime = runtime;
            URI = uri;
            User = username;
            StdoutChannel = $"{URI}:stdout";
            BytesIn = 0;
            BytesOut = 0;
            MessagesIn = 0;
            MessagesOut = 0;
            DirectInputPipes = new Dictionary<string, InputPipe>();
            DirectOutputPipes = new Dictionary<string, OutputPipe>();
            InputBuffer = new Queue<byte[]>();
            InputSequencers = new Dictionary<string, MessageSequencer<byte[]>>();
            OutputController = new StreamControl(1);
            StderrBuffer = new List<byte[]>();

            Info = new ProcessStartInfo();
            Info.UseShellExecute = false;
            Info.WorkingDirectory = Runtime.TempDataPath;
            Info.RedirectStandardInput = true;
            Info.RedirectStandardOutput = true;
            Info.RedirectStandardError = true;
            Info.FileName = binaryPath;
            Info.Arguments = args;

            SetEnvironment(environ);

            Process = new Process();
            Process.StartInfo = Info;
            Process.EnableRaisingEvents = true;

            Process.Exited += new EventHandler(OnProcessExit);

            Status = ProcessStatus.Initialized;
        }

        // This constructor is only used in exceptional cases
        // such as when restoring an agent, or spawning an NPMAgent
        // The caller must make sure to take care of assigning the property values.
        // properties that need to be set:
        // - Environment
        // - Info.FileName
        // - Info.Arguments
        protected ProcessAgent(Runtime runtime, string uri, string username) : base(runtime)
        {
            Runtime = runtime;
            URI = uri;
            User = username;
            StdoutChannel = $"{URI}:stdout";
            BytesIn = 0;
            BytesOut = 0;
            MessagesIn = 0;
            MessagesOut = 0;
            DirectInputPipes = new Dictionary<string, InputPipe>();
            DirectOutputPipes = new Dictionary<string, OutputPipe>();
            InputBuffer = new Queue<byte[]>();
            InputSequencers = new Dictionary<string, MessageSequencer<byte[]>>();
            OutputController = new StreamControl(1);
            StderrBuffer = new List<byte[]>();

            Info = new ProcessStartInfo();
            Info.UseShellExecute = false;
            Info.WorkingDirectory = Runtime.TempDataPath;
            Info.RedirectStandardInput = true;
            Info.RedirectStandardOutput = true;
            Info.RedirectStandardError = true;

            Process = new Process();
            Process.StartInfo = Info;
            Process.EnableRaisingEvents = true;

            Process.Exited += new EventHandler(OnProcessExit);

            Status = ProcessStatus.Initialized;
        }

        public void SetEnvironment(Dictionary<string, string> environ)
        {
            Environment = environ;
            foreach (var item in Environment)
            {
                Info.Environment["ONEOS_" + item.Key] = item.Value;
            }
        }

        public void EnableOutputToShell()
        {
            StdoutChannel = $"{User}.{Runtime.Domain}/shell:stdout";
        }

        public void DisableOutputToShell()
        {
            StdoutChannel = $"{URI}:stdout";
        }

        protected override void OnBegin()
        {
            // Start the pipes first
            foreach (var item in DirectOutputPipes)
            {
                item.Value.Start();
            }

            Process.Start();
            Status = ProcessStatus.Running;

            Task stdoutReadTask = null;

            //Console.WriteLine($"{this} Started, input format = {InputFormat}, output format = {OutputFormat}");
            if (OutputFormat == "json")
            {
                stdoutReadTask = Task.Run(HandleJsonStdout, Cts.Token);
            }
            else
            {
                stdoutReadTask = Task.Run(HandleStdout, Cts.Token);
            }

            stdoutReadTask.ContinueWith(prev =>
            {
                Console.WriteLine($"{this} Agent.Cts Canceled in the main stdout task");
                StopDirectOutputPipes();

            }, TaskContinuationOptions.OnlyOnCanceled);

            Task stderrReadTask = Task.Run(HandleStderr, Cts.Token);

            Console.WriteLine($"{this} Process {Process.Id} Started - {Info.FileName} {Info.Arguments}\n\t\t inputFormat: {InputFormat}, outputFormat: {OutputFormat}, checkpointing every {CheckpointInterval} ms");
        }

        protected override void OnMessage(Message message)
        {
            //Console.WriteLine($"{this} Received {message.Payload.Length} bytes, pushing to process");
            if (message.Channel == $"{URI}:stdin")
            {
                lock (Process.StandardInput)
                {
                    // no need to format input, because this is using OneOS message, which already contains formatted input
                    Process.StandardInput.BaseStream.Write(message.Payload, 0, message.Payload.Length);
                    Process.StandardInput.BaseStream.Flush();
                    BytesIn += message.Payload.Length;
                    MessagesIn++;
                }
            }
            else if (message.Channel == $"{URI}:upstream")
            {
                var tokens = Encoding.UTF8.GetString(message.Payload).Split(',');
                if (tokens[0] == "checkpoint")
                {
                    Checkpoint().Wait();
                }
                else
                {
                    Console.WriteLine($"{this} Received invalid message from upstream");
                }
            }
            else if (message.Channel == URI)
            {
                // Use RPC Message format for control messages
                base.OnMessage(message);
            }
            else
            {
                Console.WriteLine($"{this} Unexpected message received on channel {message.Channel}");
            }
        }

        protected override void OnTick()
        {
            if (Status == ProcessStatus.Running
                && CheckpointInterval > 0
                && DirectInputPipes.Count == 0  // This is rather hacky (it prevents an agent from initiating checkpoints when it is not the most upstream agent)
                && (LastCheckpointTime == null
                   || (DateTime.Now - LastCheckpointTime).TotalMilliseconds > CheckpointInterval))
            {
                Checkpoint().Wait();
            }
        }

        private void OnProcessExit(object sender, EventArgs evt)
        {
            Console.WriteLine($"{this} Process {Process.Id} Exited with Exit code {Process.ExitCode} at {Process.ExitTime}, IN: {BytesIn} bytes ({MessagesIn} messages), OUT: {BytesOut} bytes ({MessagesOut} messages)");
            /*if (Process.ExitCode != 0)
            {
                var errorMessage = Process.StandardError.ReadToEnd();
                Console.WriteLine($"{this} Process {Process.Id} Error:\n{errorMessage}");
            }*/
            var bufferedErrors = string.Join("", StderrBuffer.Select(chunk => Encoding.UTF8.GetString(chunk)));
            var errorMessage = Process.StandardError.ReadToEnd();
            Console.WriteLine($"{this} Process {Process.Id} Error:\n{bufferedErrors}{errorMessage}");

            // Wait for any outgoing pipes to finish writing
            Task.Run(async () =>
            {
                while (!DirectOutputPipes.Aggregate(true, (acc, item) => acc && item.Value.BytesOut == BytesOut))
                {
                    if (Cts.IsCancellationRequested) break;

                    await Task.Delay(250);
                    Console.WriteLine($"{this} Still waiting for outgoing pipes to write {BytesOut}... {string.Join(", ", DirectOutputPipes.Select(item => item.Key + ": " + item.Value.BytesOut + " (" + item.Value.BytesPending + "), " + item.Value.FramesOut + " frames"))}");
                }

                Status = ProcessStatus.Exited;

                // TODO: Notify Runtime about the exit event.
                // This is important, as any downstream processes will
                // keep their inputs open unless the upstream process closes it
                // * under normal circumstances, this invocation is the signal sent to the
                //   registry manager, which then removes the agent from the runtime.
                //   Only then the agent instance is Stop()ed by the runtime.
                OnExit?.Invoke(this, evt);

            });
        }

        public override Task Stop()
        {
            Console.WriteLine($"{this} Stopping ProcessAgent...");

            // If the process is still running, this is a force kill.
            // A force kill should not emit the onExit handler
            if (Status != ProcessStatus.Initialized && !Process.HasExited)
            {
                OnExit = null;
                Process.Kill();
            }

            return base.Stop();
        }

        public void SetCheckpointInterval(int intervalInSec)
        {
            CheckpointInterval = intervalInSec * 1000;
        }

        public void SetOutputRateLimit(double mbps)
        {
            OutputController.SetLimit(mbps);
        }

        public void SetInputFormat(string format)
        {
            InputFormat = format;
        }

        public void SetOutputFormat(string format)
        {
            OutputFormat = format;
        }

        internal void CloseStandardInput()
        {
            lock (Process.StandardInput)
            {
                Process.StandardInput.BaseStream.Close();
            }
        }

        internal void CloseStandardOutput()
        {
            Process.StandardOutput.BaseStream.Close();
        }

        private void ReceiveInput(byte[] payload)
        {
            if (Status != ProcessStatus.Running)
            {
                InputBuffer.Enqueue(payload);
            }
            else
            {
                lock (Process.StandardInput)
                {
                    // push missed messages in the queue before reading new message
                    while (InputBuffer.Count > 0)
                    {
                        var missed = InputBuffer.Dequeue();
                        Process.StandardInput.BaseStream.Write(missed, 0, missed.Length);
                        //Process.StandardInput.BaseStream.Flush();
                        BytesIn += missed.Length;
                        MessagesIn++;

                        Console.WriteLine($"{this} Wrote {missed.Length} bytes of missed message first");
                    }

                    Process.StandardInput.BaseStream.Write(payload, 0, payload.Length);
                    Process.StandardInput.BaseStream.Flush();
                    BytesIn += payload.Length;
                    MessagesIn++;
                }
            }
        }

        internal void AddDirectInputPipe(string upstream, string pipeGroup, TcpAgent.ServerSideSocket socket, string mode = "create")
        {
            if (!DirectInputPipes.ContainsKey(pipeGroup))
            {
                DirectInputPipes.Add(pipeGroup, new InputPipe());
            }

            // check if Source was already added
            // - if it was, check if the host runtime is dead, to determine whether this is a restored pipe
            // - if it is not, simply add the input pipe
            InputPipe.Source source;
            if (DirectInputPipes[pipeGroup].HasSource(upstream) && mode == "update")
            {
                /*var srcRuntime = Runtime.Registry.Agents[upstream].Runtime;
                if (Runtime.ActivePeers.Contains(srcRuntime))
                {
                    throw new OperationError($"{this} Cannot add DirectInputPipe from {upstream}, because there is already a DirectInputPipe coming from an active runtime hosting the agent {upstream}");
                }*/
                source = DirectInputPipes[pipeGroup].UpdateSource(upstream, socket);
            }
            else
            {
                source = DirectInputPipes[pipeGroup].AddSource(upstream, socket);
            }

            // Check if pipe is a merge pipe, and if ordering is required
            var pipeInfo = Runtime.Registry.GetPipesBySinkAgentURI(URI).Where(pipe => pipe.Source == upstream && pipe.Group == pipeGroup).First();
            var needsSequencer = pipeInfo.Type == "merge" && pipeInfo.OrderBy != null;
            Console.WriteLine(pipeInfo.ToJson());

            // Create sequencer if it does not exist yet
            if (needsSequencer && !InputSequencers.ContainsKey(pipeGroup))
            {
                if (Interpreter == null)
                {
                    Interpreter = Interpreter.CreateLightweightInterpreter();
                }

                var innerFunction = SerializableFunction.FromCode(pipeInfo.OrderBy);
                innerFunction.Activate(Interpreter);
                Func<byte[], long> sequenceGetter;

                if (InputFormat == "json")
                {
                    sequenceGetter = (byte[] payload) =>
                    {
                        var message = Dict.FromJObject(JObject.Parse(Encoding.UTF8.GetString(payload)));
                        var result = innerFunction.Invoke(Interpreter.Context, message);
                        return Convert.ToInt64((int)result.Value);
                    };
                }
                else
                {
                    sequenceGetter = (byte[] payload) =>
                    {
                        var message = new ByteArray(payload);
                        var result = innerFunction.Invoke(Interpreter.Context, message);
                        return Convert.ToInt64((int)result.Value);
                    };
                }

                InputSequencers.Add(pipeGroup, new MessageSequencer<byte[]>(sequenceGetter, 1, ReceiveInput));
            }

            // create onMessage handler for the source
            Action<byte[]> onMessageFromSource;
            if (InputFormat == "json")
            {
                if (needsSequencer)
                {
                    var sequencer = InputSequencers[pipeGroup];
                    onMessageFromSource = CreateJsonStdinHandler(payload => sequencer.Enqueue(payload));
                }
                else
                {
                    onMessageFromSource = CreateJsonStdinHandler(ReceiveInput);
                }
            }
            else
            {
                if (needsSequencer)
                {
                    var sequencer = InputSequencers[pipeGroup];
                    onMessageFromSource = sequencer.Enqueue;
                }
                else
                {
                    onMessageFromSource = ReceiveInput;
                }
            }

            // start listening to source
            source.Listen(onMessageFromSource);

            /*// initialize input handlers
            if (InputFormat == "json")
            {
                if (needsSequencer)
                {
                    var sequencer = InputSequencers[pipeGroup];
                    HandleJsonStdin(socket, payload => sequencer.Enqueue(payload));
                }
                else
                {
                    HandleJsonStdin(socket, ReceiveInput);
                }
            }
            else
            {
                if (needsSequencer)
                {
                    var sequencer = InputSequencers[pipeGroup];
                    HandleStdin(socket, payload => sequencer.Enqueue(payload));
                }
                else
                {
                    HandleStdin(socket, ReceiveInput);
                }
            }*/

            Console.WriteLine($"{this} Added Direct Input ({InputFormat}) {pipeGroup}");
        }

        internal void RemoveDirectInputPipe(string pipeGroup)
        {
            DirectInputPipes[pipeGroup].Stop();
            DirectInputPipes.Remove(pipeGroup);
        }

        internal void AddDirectOutputPipe(string downstream, string pipeGroup, TcpAgent.ClientSideSocket socket)
        {
            if (!DirectOutputPipes.ContainsKey(pipeGroup))
            {
                DirectOutputPipes.Add(pipeGroup, new OutputPipe());
            }

            DirectOutputPipes[pipeGroup].AddSink(downstream, socket);

            Console.WriteLine($"{this} Added Direct Output ({OutputFormat}) {pipeGroup}");
        }

        internal void AddDirectOutputPipe(Registry.PipeInfo info, TcpAgent.ClientSideSocket socket)
        {
            if (!DirectOutputPipes.ContainsKey(info.Group))
            {
                var routingPolicy = info.Type == "split" ? OutputPipe.RoutingPolicy.Adaptive : OutputPipe.RoutingPolicy.Fixed;
                DirectOutputPipes.Add(info.Group, new OutputPipe(info.MinRate, info.MaxRate, routingPolicy));
            }

            DirectOutputPipes[info.Group].AddSink(info.Sink, socket);

            Console.WriteLine($"{this} Added Direct Output ({OutputFormat}) {info.Group} to {info.Sink}");
        }

        internal void RemoveDirectOutputPipe(string pipeGroup)
        {
            DirectOutputPipes[pipeGroup].Stop();
            DirectOutputPipes.Remove(pipeGroup);
        }

        private void StopDirectOutputPipes()
        {
            foreach (var item in DirectOutputPipes)
            {
                item.Value.Stop();
                Console.WriteLine($"{this} Stopped Pipe {item.Key}");
            }
        }

        public Dictionary<string, long> GetDirectOutputPipesStatus()
        {
            var dict = new Dictionary<string, long>();
            foreach (var item in DirectOutputPipes)
            {
                foreach (var sink in item.Value.Sinks)
                {
                    dict.Add(item.Key + ":" + sink.AgentURI, sink.BytesOut);
                }
            }
            return dict;
        }

        [RpcMethod]
        public async Task<object> CloseUpstream(string pipeGroup, string upstream, long bytesOut)
        {
            Console.WriteLine($"{this} Pipe {pipeGroup} - Upstream {upstream} was closed! Current DirectInputs = {DirectInputPipes.Count}, need to receive all pending messages");

            var inputPipe = DirectInputPipes[pipeGroup];
            var task = inputPipe.StopSourceAfterReceiving(upstream, bytesOut).ContinueWith(prev =>
            {
                if (inputPipe.IsEmpty)
                {
                    DirectInputPipes.Remove(pipeGroup);
                }
            });
            await task;

            /*var closeTasks = new List<Task>();
            foreach (var item in DirectInputPipes)
            {
                var task = item.Value.StopSourceAfterReceiving(upstream, bytesOut).ContinueWith(prev =>
                {
                    if (item.Value.IsEmpty)
                    {
                        DirectInputPipes.Remove(item.Key);
                    }
                });
                closeTasks.Add(task);
            }

            await Task.WhenAll(closeTasks);*/

            Console.WriteLine($"{this} Pipe {pipeGroup} - Upstream {upstream} was closed! Current DirectInputs = {DirectInputPipes.Count}");

            if (DirectInputPipes.Count == 0)
            {
                CloseStandardInput();
                Console.WriteLine($"{this} No more upstream sources, closing stdin!");
            }
            
            return URI;
        }

        [RpcMethod]
        public virtual async Task<object> Pause()
        {
            Console.WriteLine($"{this} Paused");
            Status = ProcessStatus.Paused;
            return URI;
        }

        [RpcMethod]
        public virtual async Task<object> Resume()
        {
            Console.WriteLine($"{this} Resumed");
            Status = ProcessStatus.Running;
            return URI;
        }

        [RpcMethod]
        public virtual async Task<object> Checkpoint()
        {
            Console.WriteLine($"{this} Checkpointed");

            var notification = CreateMessage(URI + ":downstream", Encoding.UTF8.GetBytes($"checkpoint"));
            Outbox.Write(notification);

            return URI;
        }

        protected virtual void UpdateCheckpoint(object snapshot, string snapPath)
        {
            bool isFirstTime = (LastCheckpoint == null);
            LastCheckpointTime = DateTime.Now;
            LastCheckpoint = snapshot;

            if (isFirstTime)
            {
                OnCheckpointUpdate?.Invoke(snapPath);
            }
        }

        private async Task HandleStdout()
        {
            OutputController.Reset();

            try
            {
                byte[] buffer = new byte[BufferSize];
                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    int bytesRead = await Process.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    if (bytesRead > 0)
                    {
                        var payload = buffer.Take(bytesRead).ToArray();
                        var message = CreateMessage(StdoutChannel, payload);
                        //Console.WriteLine($"{Outbox.URI} ({StdoutChannel}): {Encoding.UTF8.GetString(message.Payload)}");
                        //Console.WriteLine($"{this}: Raw ByteArray output {message.Payload.Length} bytes");
                        Outbox.Write(message);

                        foreach (var item in DirectOutputPipes)
                        {
                            // await item.Value.Send(payload);
                            //await item.Value.Write(payload, 0, payload.Length);
                            //await item.Value.Stream.WriteAsync(payload, 0, payload.Length);

                            // do not await -- each pipe will write according to its set rate
                            item.Value.Write(payload);
                        }

                        // write to the outgoing pipes in parallel
                        //await Task.WhenAll(DirectOutputPipes.Select(item => item.Value.Write(payload, 0, payload.Length)));

                        BytesOut += bytesRead;
                        MessagesOut++;

                        OutputController.Update(bytesRead);
                        await OutputController.Delay();

                        //await Task.Yield();
                    }
                    else
                    {
                        await Task.Delay(50);
                    }
                }
            }
            catch (OperationCanceledException ex)
            {
                Console.WriteLine($"{this} Agent.Cts Canceled while reading stdout");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} Failed to read stdout due to unexpected exception");
                Console.WriteLine(ex);
            }

            // This loop eventually breaks because Stop() is called by the Runtime.
            Console.WriteLine($"{this} Agent.Cts Canceled");

            // stop direct output pipes
            StopDirectOutputPipes();
        }

        private async Task HandleJsonStdout()
        {
            OutputController.Reset();
            
            try
            {
                byte[] buffer = new byte[BufferSize];
                byte[] frame = new byte[BufferSize];
                var depth = 0;
                var frameCursor = 0;
                var chunkStart = 0;
                var chunkSize = 0;

                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    int bytesRead = await Process.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    if (bytesRead > 0)
                    {
                        for (var i = 0; i < bytesRead; i++)
                        {
                            if (buffer[i] == 0x7B)
                            {
                                if (depth == 0)
                                {
                                    chunkStart = i;
                                    frameCursor = 0;
                                }
                                depth += 1;
                            }
                            else if (buffer[i] == 0x7D)
                            {
                                depth -= 1;
                                if (depth == 0)
                                {
                                    chunkSize = i - chunkStart + 1;
                                    Buffer.BlockCopy(buffer, chunkStart, frame, frameCursor, chunkSize);
                                    frameCursor += chunkSize;

                                    // frame is ready, emit payload
                                    var payload = frame.Take(frameCursor).ToArray();
                                    var message = CreateMessage(StdoutChannel, payload);
                                    //Console.WriteLine($"{Outbox.URI} ({StdoutChannel}): {Encoding.UTF8.GetString(message.Payload)}");
                                    //Console.WriteLine($"{this}: JSON output {payload.Length} bytes");
                                    Outbox.Write(message);

                                    foreach (var item in DirectOutputPipes)
                                    {
                                        // await item.Value.Send(payload);
                                        //await item.Value.Write(payload, 0, payload.Length);
                                        //await item.Value.Stream.WriteAsync(payload, 0, payload.Length);

                                        // do not await -- each pipe will write according to its set rate
                                        item.Value.Write(payload);
                                    }

                                    // write to the outgoing pipes in parallel
                                    //await Task.WhenAll(DirectOutputPipes.Select(item => item.Value.Write(payload, 0, payload.Length)));

                                    MessagesOut++;
                                }
                            }
                        }

                        if (depth > 0)
                        {
                            chunkSize = bytesRead - chunkStart;
                            Buffer.BlockCopy(buffer, chunkStart, frame, frameCursor, chunkSize);
                            frameCursor += chunkSize;

                            chunkStart = 0;
                        }

                        BytesOut += bytesRead;

                        OutputController.Update(bytesRead);
                        await OutputController.Delay();

                        //await Task.Yield();
                    }
                    else
                    {
                        await Task.Delay(50);
                    }
                }
            }
            catch (OperationCanceledException ex)
            {
                Console.WriteLine($"{this} Agent.Cts Canceled while reading stdout");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} Failed to read stdout due to unexpected exception");
                Console.WriteLine(ex);
            }

            // This loop eventually breaks because Stop() is called by the Runtime.
            Console.WriteLine($"{this} Agent.Cts Canceled");

            // stop direct output pipes
            StopDirectOutputPipes();
        }

        private async Task HandleStderr()
        {
            try
            {
                byte[] buffer = new byte[BufferSize];
                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    int bytesRead = await Process.StandardError.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    if (bytesRead > 0)
                    {
                        //var errorMessage = Encoding.UTF8.GetString(buffer, 0, bytesRead);

                        //Console.WriteLine($"{this} Stderr: {errorMessage.Length} bytes");
                        StderrBuffer.Add(buffer.Take(bytesRead).ToArray());

                        await Task.Yield();

                        //if (Cts.IsCancellationRequested) break;

                        //bytesRead = await Process.StandardError.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    }
                    else
                    {
                        // Use a large delay, assuming that errors are infrequent
                        await Task.Delay(50);
                    }
                }
            }
            catch (OperationCanceledException ex)
            {
                Console.WriteLine($"{this} Agent.Cts Canceled while reading stderr");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} Failed to read stderr due to unexpected exception");
                Console.WriteLine(ex);
            }

            // This loop eventually breaks because Stop() is called by the Runtime.
            Console.WriteLine($"{this} Agent.Cts Canceled (during stderr read)");
            
            var bufferedErrors = string.Join("", StderrBuffer.Select(chunk => Encoding.UTF8.GetString(chunk)));
            Console.WriteLine($"{this} Buffered Errors:\n{bufferedErrors}");
        }

        private Action<byte[]> CreateJsonStdinHandler(Action<byte[]> nextHandler)
        {
            //Queue<byte[]> queue = new Queue<byte[]>();

            byte[] frame = new byte[BufferSize];
            var depth = 0;
            var frameCursor = 0;
            var chunkStart = 0;
            var chunkSize = 0;

            return new Action<byte[]>(buffer =>
            {
                for (var i = 0; i < buffer.Length; i++)
                {
                    if (buffer[i] == 0x7B)
                    {
                        if (depth == 0)
                        {
                            chunkStart = i;
                            frameCursor = 0;
                        }
                        depth += 1;
                    }
                    else if (buffer[i] == 0x7D)
                    {
                        depth -= 1;
                        if (depth == 0)
                        {
                            chunkSize = i - chunkStart + 1;
                            Buffer.BlockCopy(buffer, chunkStart, frame, frameCursor, chunkSize);
                            frameCursor += chunkSize;

                            // frame is ready, emit payload
                            var payload = frame.Take(frameCursor).ToArray();
                            //Console.WriteLine($"{this}: JSON input {payload.Length} bytes");

                            nextHandler(payload);
                        }
                    }
                }

                if (depth > 0)
                {
                    chunkSize = buffer.Length - chunkStart;
                    Buffer.BlockCopy(buffer, chunkStart, frame, frameCursor, chunkSize);
                    frameCursor += chunkSize;

                    chunkStart = 0;
                }
            });
        }

    }

    // Taken from https://stackoverflow.com/questions/71257/suspend-process-in-c-sharp
    public static class ProcessExtension
    {
        public enum ThreadAccess : int
        {
            TERMINATE = (0x0001),
            SUSPEND_RESUME = (0x0002),
            GET_CONTEXT = (0x0008),
            SET_CONTEXT = (0x0010),
            SET_INFORMATION = (0x0020),
            QUERY_INFORMATION = (0x0040),
            SET_THREAD_TOKEN = (0x0080),
            IMPERSONATE = (0x0100),
            DIRECT_IMPERSONATION = (0x0200)
        }

        [DllImport("kernel32.dll")]
        static extern IntPtr OpenThread(ThreadAccess dwDesiredAccess, bool bInheritHandle, uint dwThreadId);
        [DllImport("kernel32.dll")]
        static extern uint SuspendThread(IntPtr hThread);
        [DllImport("kernel32.dll")]
        static extern int ResumeThread(IntPtr hThread);

        public static void Suspend(this Process process)
        {
            foreach (ProcessThread thread in process.Threads)
            {
                var pOpenThread = OpenThread(ThreadAccess.SUSPEND_RESUME, false, (uint)thread.Id);
                if (pOpenThread == IntPtr.Zero)
                {
                    break;
                }
                SuspendThread(pOpenThread);
            }
        }
        public static void Resume(this Process process)
        {
            foreach (ProcessThread thread in process.Threads)
            {
                var pOpenThread = OpenThread(ThreadAccess.SUSPEND_RESUME, false, (uint)thread.Id);
                if (pOpenThread == IntPtr.Zero)
                {
                    break;
                }
                ResumeThread(pOpenThread);
            }
        }
    }
}
