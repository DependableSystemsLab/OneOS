using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Timers;
using System.Threading;
using System.Linq;
using OneOS.Common;
using OneOS.Runtime.Driver;
using System.Net;
using System.Threading.Tasks;

namespace OneOS.Runtime
{
    public class AgentMonitor
    {
        protected struct Measurement
        {
            public long TotalTicks;      // in CPU ticks since agent start
            public long CPUTicks;       // CPU Cycles spent since last measurement
            public float CPU;            // CPU usage (in percent)
            public long Memory;         // Memory usage (in bytes)
            public long BytesIn;        // Bytes received since last measurement
            public long BytesOut;       // Bytes sent since last measurement
            public long MessagesIn;     // Messages received since last measurement
            public long MessagesOut;    // Messages sent since last measurement
            public float RateIn;         // Input rate
            public float RateOut;        // Output rate

            public float Timestamp { get => (float)TotalTicks / (float)Stopwatch.Frequency; }
            public double RateInMB { get => Math.Round(TicksPerMB * RateIn, 3); }
            public double RateOutMB { get => Math.Round(TicksPerMB * RateOut, 3); }

            public string CSVLine { get => $"{Timestamp},{TotalTicks},{CPUTicks},{CPU},{Memory},{Memory / 1000000F},{BytesIn},{BytesOut},{MessagesIn},{MessagesOut},{RateInMB},{RateOutMB}"; }
        }

        private static long TickResolution = Stopwatch.Frequency / 10000000;
        private static long TicksPerMB = Stopwatch.Frequency / 1000000;

        string LogDirectory;
        List<ProcessAgent> Agents;
        int SamplingInterval;
        Dictionary<string, List<Measurement>> TimeSeries;    // timestamp, cpu, mem, bytesIn, bytesOut, cpuPercent, rateIn, rateOut
        Dictionary<string, (long[], float[])> Scratchpad;  // temp data used during monitor -- startedAt, numsamples, lastCpuTime, lastBytesIn, lastBytesOut

        CancellationTokenSource Cts;
        System.Timers.Timer Timer;
        //System.Timers.Timer PublishTimer;
        Dictionary<string, TcpFileStream> ReadStreams;
        Dictionary<ProcessAgent, List<TcpFileStream>> ReaderMap;

        public AgentMonitor(string logDirectory, int samplingInterval)
        {
            LogDirectory = logDirectory;
            SamplingInterval = samplingInterval;
            Agents = new List<ProcessAgent>();
            TimeSeries = new Dictionary<string, List<Measurement>>();
            Scratchpad = new Dictionary<string, (long[], float[])>();
            ReadStreams = new Dictionary<string, TcpFileStream>();
            ReaderMap = new Dictionary<ProcessAgent, List<TcpFileStream>>();
        }

        public void WatchAgent(ProcessAgent agent)
        {
            TimeSeries.Add(agent.URI, new List<Measurement>());
            Scratchpad.Add(agent.URI, (new long[] { Stopwatch.GetTimestamp(), 0, 0, 0, 0, 0, 0 }, new float[] { 0, 0 }));
            var startedAt = DateTime.Now;
            lock (Agents)
            {
                Agents.Add(agent);
            }
#if DEBUG
            agent.Process.Exited += (sender, evt) =>
            {
                SaveProcessLog(agent, startedAt);
            };
#endif
        }

        public void Start()
        {
            var lastSampledAt = Stopwatch.GetTimestamp();

            Cts = new CancellationTokenSource();
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
                    lastSampledAt += timeDiff;

                    var timeWeight = (float)Math.Min(timeDiff, Stopwatch.Frequency) / Stopwatch.Frequency;

                    lock (Agents)
                    {
                        foreach (var agent in Agents)
                        {
                            if (agent.Status == ProcessAgent.ProcessStatus.Running || agent.Status == ProcessAgent.ProcessStatus.Paused)
                            {
                                var proc = agent.Process;
                                var scratchLong = Scratchpad[agent.URI].Item1;
                                var scratchFloat = Scratchpad[agent.URI].Item2;
                                var series = TimeSeries[agent.URI];

                                try
                                {
                                    proc.Refresh();

                                    if (!proc.HasExited)
                                    {
                                        scratchLong[1]++;

                                        var procTime = proc.TotalProcessorTime.Ticks - scratchLong[2];
                                        var cpuPercent = ((float)procTime) * TickResolution / ((float)timeDiff);
                                        var memUsed = proc.WorkingSet64;
                                        var bytesIn = agent.BytesIn - scratchLong[3];
                                        var bytesOut = agent.BytesOut - scratchLong[4];
                                        var messagesIn = agent.MessagesIn - scratchLong[5];
                                        var messagesOut = agent.MessagesOut - scratchLong[6];
                                        // var rateIn = (bytesIn + (Stopwatch.Frequency - timeDiff) * scratchFloat[0]) / Stopwatch.Frequency;
                                        // var rateOut = (bytesOut + (Stopwatch.Frequency - timeDiff) * scratchFloat[1]) / Stopwatch.Frequency;
                                        //var rateIn = scratchFloat[0] + (bytesIn - timeDiff * scratchFloat[0]) / Stopwatch.Frequency;
                                        //var rateOut = scratchFloat[1] + (bytesOut - timeDiff * scratchFloat[1]) / Stopwatch.Frequency;
                                        var rateIn = scratchFloat[0] + timeWeight * ((float)bytesIn / timeDiff - scratchFloat[0]);
                                        var rateOut = scratchFloat[1] + timeWeight * ((float)bytesOut / timeDiff - scratchFloat[1]);

                                        //series.Add((lastSampledAt - scratchLong[0], procTime, memUsed, bytesIn, bytesOut, cpuPercent, rateIn, rateOut));
                                        var stat = new Measurement()
                                        {
                                            TotalTicks = lastSampledAt - scratchLong[0],
                                            CPUTicks = procTime,
                                            CPU = cpuPercent,
                                            Memory = memUsed,
                                            BytesIn = bytesIn,
                                            BytesOut = bytesOut,
                                            MessagesIn = messagesIn,
                                            MessagesOut = messagesOut,
                                            RateIn = rateIn,
                                            RateOut = rateOut
                                        };
                                        series.Add(stat);

                                        scratchLong[2] += procTime;
                                        scratchLong[3] += bytesIn;
                                        scratchLong[4] += bytesOut;
                                        scratchLong[5] += messagesIn;
                                        scratchLong[6] += messagesOut;
                                        scratchFloat[0] = rateIn;
                                        scratchFloat[1] = rateOut;

                                        if (ReaderMap.ContainsKey(agent))
                                        {
                                            foreach (var pipe in ReaderMap[agent])
                                            {
                                                pipe.Send(Encoding.UTF8.GetBytes(stat.CSVLine));
                                            }
                                        }
                                    }
                                }
                                catch (InvalidOperationException ex)
                                {
                                    Console.WriteLine($"[AgentMonitor]: {ex.Message}");
                                }
                            }
                        }
                    }
                }
                if (!Cts.IsCancellationRequested) Timer.Start();
            };

            Timer.Start();

            // Timer to publish to any client watching the resources
            /*PublishTimer = new System.Timers.Timer() { Interval = SamplingInterval, AutoReset = false };

            PublishTimer.Elapsed += (sender, evt) =>
            {
                if (Cts.IsCancellationRequested)
                {
                    PublishTimer.Dispose();
                }
                else
                {
                    lock (Agents)
                    {
                        foreach (var agent in Agents)
                        {
                            var stat = TimeSeries[agent.URI].Last();
                            foreach (var pipe in ReaderMap[agent])
                            {
                                pipe.Send(Encoding.UTF8.GetBytes(stat.CSVLine));
                            }
                        }
                    }
                }
                if (!Cts.IsCancellationRequested) PublishTimer.Start();
            };

            PublishTimer.Start();*/
        }

        public void Stop()
        {
            Cts.Cancel();
        }

        public async void SaveProcessLog(ProcessAgent agent, DateTime startedAt)
        {
            var filename = Path.GetFileName(agent.Process.StartInfo.Arguments.Split(' ')[0]);
            var logname = startedAt.ToString("yyyyMMdd-HHmmss-") + filename;
            var log = new FileStream(Path.Combine(LogDirectory, logname + ".csv"), FileMode.Append);

            var header = $"file={filename},uri={agent.URI},startedAt={startedAt}\n";
            header += "Timestamp,Ticks,CpuTicks,CpuUsage,MemUsed,MemUsedInMB,BytesIn,BytesOut,MessagesIn,MessagesOut,RateIn,RateOut\n";
            //var csv = string.Join("\n", TimeSeries[agent.URI].Select(tuple => $"{(float)tuple.Item1 / (float)Stopwatch.Frequency},{tuple.Item1},{tuple.Item2},{tuple.Item3},{tuple.Item4},{tuple.Item5},{Math.Round(10 * tuple.Item7, 3)},{Math.Round(10 * tuple.Item8, 3)},{tuple.Item6},{tuple.Item3 / 1000000F}"));
            //var csv = string.Join("\n", TimeSeries[agent.URI].Select(item => $"{item.Timestamp},{item.TotalTicks},{item.CPUTicks},{item.CPU},{item.Memory},{item.Memory/1000000F},{item.BytesIn},{item.BytesOut},{item.MessagesIn},{item.MessagesOut},{item.RateInMB},{item.RateOutMB}"));
            var csv = string.Join("\n", TimeSeries[agent.URI].Select(item => item.CSVLine));

            var content = Encoding.UTF8.GetBytes(header + csv);

            await log.WriteAsync(content, 0, content.Length);
            
            log.Close();

            // save error log
            if (agent.StderrBuffer.Count > 0)
            {
                var errLog = new FileStream(Path.Combine(LogDirectory, logname + ".error.log"), FileMode.Append);
                foreach (var line in agent.StderrBuffer)
                {
                    await errLog.WriteAsync(line, 0, line.Length);
                }
                errLog.Close();
            }

            lock (Agents)
            {
                Agents.Remove(agent);
            }
        }

        internal async Task ConnectReadStream(string key, TcpAgent.ServerSideSocket socket)
        {
            var pipe = ReadStreams[key];
            if (pipe.Connected) throw new OperationError($"ReadStream {key} is already connected");

            //Console.WriteLine($"Connecting {pipe.Mode} IOStream {key}");
            await pipe.ConnectClientSide(socket);
        }

        public string CreateMonitorReadStream(string agentUri, string clientUri)
        {
            var agent = Agents.Find(item => item.URI == agentUri);
            if (agent == null)
            {
                throw new OperationError($"Agent {agentUri} is not on this Runtime");
            }

            var readerPipe = new TcpFileStream(TcpFileStream.OpenMode.Read);
            ReadStreams[readerPipe.Key] = readerPipe;

            Task.Run(async () =>
            {
                await readerPipe.WaitForConnection();

                // locally add a reader
                if (!ReaderMap.ContainsKey(agent))
                {
                    ReaderMap.Add(agent, new List<TcpFileStream>());
                }
                ReaderMap[agent].Add(readerPipe);
            });

            return readerPipe.Key;
        }
    }
}
