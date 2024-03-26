using System;
using System.IO;
using System.IO.Pipes;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.Timers;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

using OneOS.Common;
using OneOS.Runtime;

namespace OneOS.Test
{
    public class MonitoredProcess
    {
        private const int BufferSize = 131072;
        internal Process Process;
        int BytesIn;
        int BytesOut;

        string LogDirectory;
        int SamplingInterval;
        string Header;
        List<(long, long, long, long, long, long, float)> TimeSeries;    // timestamp, cpu, mem, bytesIn, bytesOut, snapshotSize, cpuPercent
        long[] Scratchpad;  // temp data used during monitor -- startedAt, numsamples, lastCpuTime, lastBytesIn, lastBytesOut
        public long LastSnapshotSize;

        CancellationTokenSource Cts;
        System.Timers.Timer Timer;
        Random Random;
        byte[] StdinBuffer;
        internal TaskCompletionSource<bool> Execution;

        public MonitoredProcess(string binary, string arguments, string logDirectory, int samplingInterval)
        {
            LogDirectory = logDirectory;
            SamplingInterval = samplingInterval;
            TimeSeries = new List<(long, long, long, long, long, long, float)>();
            Scratchpad = new long[] { 0, 0, 0, 0, 0 };

            var info = new ProcessStartInfo();
            info.UseShellExecute = false;
            info.RedirectStandardInput = true;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            info.FileName = binary;
            info.Arguments = arguments;

            Process = new Process();
            Process.StartInfo = info;
            Process.EnableRaisingEvents = true;

            BytesIn = 0;
            BytesOut = 0;
            LastSnapshotSize = 0;

            Execution = new TaskCompletionSource<bool>();
            Random = new Random();
            StdinBuffer = new byte[BufferSize];
            Random.NextBytes(StdinBuffer);
        }

        public void WriteRandomData(int length)
        {
            if (!Process.HasExited)
            {
                Buffer.BlockCopy(BitConverter.GetBytes(length - 4), 0, StdinBuffer, 0, 4);
                Process.StandardInput.BaseStream.Write(StdinBuffer, 0, length);
                Process.StandardInput.BaseStream.Flush();
                BytesIn += length;
            }
        }

        public void Start()
        {
            var startedAt = DateTime.Now;
            var lastSampledAt = Stopwatch.GetTimestamp();
            Scratchpad[0] = lastSampledAt;

            Process.Exited += (sender, evt) =>
            {
                if (Process.ExitCode != 0)
                {
                    var errorMessage = Process.StandardError.ReadToEnd();
                    Console.WriteLine($"Process {Process.Id} Error:\n{errorMessage}");
                }

                Stop();
                SaveProcessLog(startedAt);
            };

            Process.Start();
            Process.PriorityClass = ProcessPriorityClass.RealTime;
            Process.PriorityBoostEnabled = true;
            Process.ProcessorAffinity = new IntPtr(1);
            for (var i = 0; i < Process.Threads.Count; i++)
            {
                Process.Threads[i].ProcessorAffinity = Process.ProcessorAffinity;
            }

            Cts = new CancellationTokenSource();

            Task.Run(async () =>
            {
                byte[] buffer = new byte[BufferSize];
                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    int bytesRead = await Process.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    if (bytesRead > 0)
                    {
                        //Console.Write(Encoding.UTF8.GetString(buffer, 0, bytesRead));
                        Console.Write($" +{bytesRead}");
                        BytesOut += bytesRead;
                    }
                }
            }, Cts.Token);

            Timer = new System.Timers.Timer() { Interval = SamplingInterval, AutoReset = false };
            Timer.Elapsed += (sender, evt) =>
            {
                if (Cts.IsCancellationRequested)
                {
                    Timer.Dispose();
                }
                else
                {
                    var timeDiff = Stopwatch.GetTimestamp() - lastSampledAt;

                    Process.Refresh();

                    if (!Process.HasExited)
                    {
                        try
                        {
                            Scratchpad[1]++;

                            var procTime = Process.UserProcessorTime.Ticks - Scratchpad[2];
                            var cpuPercent = ((float)procTime) / ((float)timeDiff);
                            var memUsed = Process.WorkingSet64;
                            var bytesIn = BytesIn - Scratchpad[3];
                            var bytesOut = BytesOut - Scratchpad[4];

                            TimeSeries.Add((lastSampledAt - Scratchpad[0], procTime, memUsed, bytesIn, bytesOut, LastSnapshotSize, cpuPercent));

                            Scratchpad[2] += procTime;
                            Scratchpad[3] += bytesIn;
                            Scratchpad[4] += bytesOut;
                        }
                        catch (InvalidOperationException ex)
                        {
                            Stop();
                        }
                    }

                    lastSampledAt += timeDiff;
                }

                if (!Cts.IsCancellationRequested) Timer.Start();
            };

            Timer.Start();
        }

        public void Stop()
        {
            Cts.Cancel();
        }

        public void SetHeader(string header)
        {
            Header = header;
        }

        public async void SaveProcessLog(DateTime startedAt)
        {
            await Task.Delay(SamplingInterval); // wait till all data is collected

            var filename = Path.GetFileName(Process.StartInfo.Arguments.Split(' ')[0]);
            var logname = filename + "." + startedAt.ToString("yyyyMMddHHmmss") + ".csv";
            var log = new FileStream(Path.Combine(LogDirectory, logname), FileMode.Append);

            var header = $"file={filename},startedAt={startedAt},{Header}\n";
            header += "Timestamp,Ticks,CpuTicks,MemUsed,BytesIn,BytesOut,SnapshotSize,CpuPercent,MemUsedInMB\n";
            var csv = string.Join("\n", TimeSeries.Select(tuple => $"{(float)tuple.Item1 / (float)Stopwatch.Frequency},{tuple.Item1},{tuple.Item2},{tuple.Item3},{tuple.Item4},{tuple.Item5},{tuple.Item6},{tuple.Item7},{tuple.Item3 / 1000000F}"));

            var content = Encoding.UTF8.GetBytes(header + csv);

            await log.WriteAsync(content, 0, content.Length);

            log.Close();

            Execution.SetResult(true);
        }
    }

    public class CheckpointController
    {
        NamedPipeClientStream IpcClient;

        public CheckpointController(string filename)
        {
            IpcClient = new NamedPipeClientStream(filename + ".sock");
            IpcClient.Connect();
        }

        private async Task<byte[]> IpcRequest(string command)
        {
            var message = Encoding.UTF8.GetBytes(command);

            await IpcClient.WriteAsync(message, 0, message.Length);

            byte[] buffer = new byte[1024];

            int bytesRead = await IpcClient.ReadAsync(buffer, 0, buffer.Length);

            byte[] frame = new byte[BitConverter.ToInt32(buffer, 0)];

            int cursor = 4;
            int frameCursor = 0;

            while (frameCursor < frame.Length)
            {
                int bytesLeft = bytesRead - cursor;
                int frameBytesLeft = frame.Length - frameCursor;

                if (frameBytesLeft <= bytesLeft)
                {
                    Buffer.BlockCopy(buffer, cursor, frame, frameCursor, frameBytesLeft);
                    frameCursor += frameBytesLeft;
                }
                else
                {
                    Buffer.BlockCopy(buffer, cursor, frame, frameCursor, bytesLeft);
                    frameCursor += bytesLeft;

                    bytesRead = await IpcClient.ReadAsync(buffer, 0, buffer.Length);
                    cursor = 0;
                }
            }

            return frame;
        }

        public async Task<object> Pause()
        {
            await IpcRequest("pause");

            return null;
        }

        public async Task<object> Resume()
        {
            await IpcRequest("resume");

            return null;
        }

        public async Task<long> Checkpoint()
        {
            try
            {
                var snapshot = await IpcRequest("checkpoint");

                Console.Write($" + Snap:{snapshot.Length}");
                //Console.WriteLine($"{Encoding.UTF8.GetString(snapshot)}");

                return snapshot.Length;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{this} FAILED to checkpoint - ({ex.GetType().Name}) {ex.Message}");
                //Console.WriteLine(ex);
                return 0;
            }
        }
    }

    public class Benchmark
    {
        public static void RunProcess(Configuration config, int serviceTime, int serviceRate, int heapBranches, int heapDepth, int nodeSize, int messageSize, int duration, int checkpointInterval)
        {
            var currentDirectory = Directory.GetCurrentDirectory();
            var workloadPath = Path.Combine(config.TempDataPath, "workload.inst.test.js");

            var testArgs = $"{workloadPath} {serviceTime} {heapBranches} {heapDepth} {nodeSize} {duration}";

            Console.WriteLine($"\nTest: ({duration} sec)---\nService = {serviceTime} : {serviceRate} ms\nHeap = {heapBranches} b ^ {heapDepth} d x {nodeSize} Bytes");

            var proc1 = new MonitoredProcess("node", testArgs, currentDirectory, 10);
            proc1.SetHeader($"serviceTime={serviceTime},serviceRate={serviceRate},heapBranches={heapBranches},heapDepth={heapDepth},nodeSize={nodeSize},messageSize={messageSize},checkpointInterval={checkpointInterval}");
            proc1.Start();

            Console.WriteLine($"PID = {proc1.Process.Id}");

            var cpController = new CheckpointController("workload.inst.test.js");

            var timer = new System.Timers.Timer() { Interval = serviceRate, AutoReset = false };
            timer.Elapsed += (sender, evt) =>
            {
                proc1.WriteRandomData(messageSize);
                if (!proc1.Process.HasExited) timer.Start();
            };
            timer.Start();

            var cpTimer = new System.Timers.Timer() { Interval = checkpointInterval, AutoReset = false };
            cpTimer.Elapsed += (sender, evt) =>
            {
                var snapshotSize = cpController.Checkpoint().Result;
                proc1.LastSnapshotSize = snapshotSize;
                if (!proc1.Process.HasExited) cpTimer.Start();
            };
            cpTimer.Start();

            proc1.Execution.Task.Wait();

            Console.WriteLine("--- End.");
        }

        public static void RunGoldenRun(Configuration config, int serviceTime, int serviceRate, int heapBranches, int heapDepth, int nodeSize, int messageSize, int duration)
        {
            var currentDirectory = Directory.GetCurrentDirectory();
            var workloadPath = Path.Combine(config.TempDataPath, "node_modules/oneos/test/workload.js");

            var testArgs = $"{workloadPath} {serviceTime} {heapBranches} {heapDepth} {nodeSize} {duration}";

            Console.WriteLine($"\nTest: ({duration} sec)---\nService = {serviceTime} : {serviceRate} ms\nHeap = {heapBranches} b ^ {heapDepth} d x {nodeSize} Bytes");

            var proc1 = new MonitoredProcess("node", testArgs, currentDirectory, 10);
            proc1.SetHeader($"serviceTime={serviceTime},serviceRate={serviceRate},heapBranches={heapBranches},heapDepth={heapDepth},nodeSize={nodeSize},messageSize={messageSize}");
            proc1.Start();

            Console.WriteLine($"PID = {proc1.Process.Id}");

            var timer = new System.Timers.Timer() { Interval = serviceRate, AutoReset = false };
            timer.Elapsed += (sender, evt) =>
            {
                proc1.WriteRandomData(messageSize);
                if (!proc1.Process.HasExited) timer.Start();
            };
            timer.Start();

            proc1.Execution.Task.Wait();

            Console.WriteLine("--- End.");
        }

        public static void ExperimentSingleProcess(Configuration config)
        {
            for (var i = 1; i <= 10; i++)
            {
                //RunGoldenRun(config, 15, 20, 4, 4, 1024, 1024, 20);
                RunProcess(config, 15, 20, 4, 4, 1024, 65536, 20, 16 + 2*i);
            }

            /*var currentDirectory = Directory.GetCurrentDirectory();

            //var workloadPath = Path.Combine(config.TempDataPath, "node_modules/oneos/test/workload.js");
            var workloadPath = Path.Combine(config.TempDataPath, "workload.inst.test.js");
            for (var i = 4; i <= 4; i++)
            {
                var serviceTime = 100 * i;
                var serviceRate = 500;
                var heapBranches = 2;
                var heapDepth = 2;
                var nodeSize = 1024;
                var messageSize = 1000;
                var duration = 20;
                var testArgs = $"{workloadPath} {serviceTime} {heapBranches} {heapDepth} {nodeSize} {duration}";

                var checkpointInterval = 1000;

                Console.WriteLine($"\nTest {i} ({duration} sec)---\nService = {serviceTime} : {serviceRate} ms\nHeap = {heapBranches} b ^ {heapDepth} d x {nodeSize} Bytes");

                var proc1 = new MonitoredProcess("node", testArgs, currentDirectory, 10);
                proc1.SetHeader($"serviceTime={serviceTime},serviceRate={serviceRate},heapBranches={heapBranches},heapDepth={heapDepth},nodeSize={nodeSize}");
                proc1.Start();

                Console.WriteLine($"PID = {proc1.Process.Id}");

                var cpController = new CheckpointController("workload.inst.test.js");

                var timer = new System.Timers.Timer() { Interval = serviceRate, AutoReset = false };
                timer.Elapsed += (sender, evt) =>
                {
                    proc1.WriteRandomData(messageSize);
                    if (!proc1.Process.HasExited) timer.Start();
                };
                timer.Start();

                var cpTimer = new System.Timers.Timer() { Interval = checkpointInterval, AutoReset = false };
                cpTimer.Elapsed += (sender, evt) =>
                {
                    cpController.Checkpoint().Wait();
                    if (!proc1.Process.HasExited) cpTimer.Start();
                };
                cpTimer.Start();

                proc1.Execution.Task.Wait();

                Console.WriteLine("--- End.");
            }*/
        }

        public static void Run()
        {
            var config = Configuration.LoadConfig(Configuration.DefaultOneOSPath);
            var dummy = new Runtime.Runtime(config);

            ExperimentSingleProcess(config);
        }
    }
}
