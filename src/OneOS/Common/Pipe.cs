using System;
using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Threading;
using System.Collections;
using System.Text;

namespace OneOS.Common
{
    public abstract class Pipe
    {
    }

    public class OutputPipe : Pipe
    {
        public static List<OutputPipe> All = new List<OutputPipe>();  // Only used for Debugging purposes

        public class Sink
        {
            public string AgentURI { get; private set; }
            TcpAgent.ClientSideSocket Socket;
            public StreamControl Monitor;
            Queue<byte[]> Queue;
            Queue<byte[]> FailedQueue;
            CancellationTokenSource Cts;    // This is the Sink's own Cts, used for sink migration scenarios
            TaskCompletionSource<TcpAgent.ClientSideSocket> SocketUpdate;
            /*bool ReceiveAckEnabled;
            Queue<byte[]> PendingAckQueue;  // Used for reliable delivery*/

            public long QueueLength { get; private set; }

            public long BytesOut { get; private set; }
            public long FramesOut { get => Monitor.NumFrames; }

            public Sink(string agentUri, TcpAgent.ClientSideSocket socket)
            {
                AgentURI = agentUri;
                Socket = socket;
                Monitor = new StreamControl();
                Queue = new Queue<byte[]>();
                FailedQueue = new Queue<byte[]>();
                //ReceiveAckEnabled = false;
            }

            public double ThroughputMB { get => Monitor.ThroughputMB; }
            public double MinRate { get => Monitor.MinRate; }
            public double MaxRate { get => Monitor.MaxRate; }
            
            public void SetMinRate(double rate)
            {
                Monitor.SetTarget(rate);
            }

            public void SetMaxRate(double rate)
            {
                Monitor.SetLimit(rate);
            }

            public void SetRatesAndReset(double minRate, double maxRate)
            {
                Monitor.SetTarget(minRate);
                Monitor.SetLimit(maxRate);
                Monitor.Reset();
            }

            internal void UpdateSocket(TcpAgent.ClientSideSocket socket)
            {
                Cts.Cancel();

                var oldSocket = Socket;
                oldSocket.Stop();

                Socket = socket;
                BytesOut = 0;

                // before we resume reguar loop (by setting the SocketUpdate result),
                // we need to first re-send any failed messages
                // TODO: If the downstream fails again during this time, we will lose the messages.
                Task.Run(async () =>
                {
                    while (FailedQueue.Count > 0)
                    {
                        byte[] payload = FailedQueue.Dequeue();

                        await Socket.Stream.WriteAsync(payload, 0, payload.Length);
                        BytesOut += payload.Length;

                        Monitor.Update(payload.Length);
                        await Monitor.Delay();
                    }

                    Console.WriteLine($"{this} Socket Updated for Sink {AgentURI}");
                    SocketUpdate.SetResult(socket);
                });
            }

            /*public void EnableReceiveAck()
            {
                PendingAckQueue = new Queue<byte[]>();
                ReceiveAckEnabled = true;
            }*/

            /*public void AcknowledgeReception(string watermark)
            {
                *//*while (PendingAckQueue.Count > 0)
                {
                    var payload = PendingAckQueue.Dequeue();
                    if (watermark == Helpers.Checksum(payload, "MD5"))
                    {
                        break;
                    }
                }*//*
            }*/

            public void Enqueue(byte[] payload)
            {
                lock (Queue)
                {
                    Queue.Enqueue(payload);
                    QueueLength += payload.Length;
                }
            }

            public async Task Dequeue()
            {
                byte[] payload;
                lock (Queue)
                {
                    payload = Queue.Dequeue();
                    QueueLength -= payload.Length;
                }

                try
                {
                    await Socket.Stream.WriteAsync(payload, 0, payload.Length, Cts.Token);
                    BytesOut += payload.Length;

                    Monitor.Update(payload.Length);
                    await Monitor.Delay();
                }
                catch (IOException ex)
                {
                    FailedQueue.Enqueue(payload);
                    throw new ConnectionError(ex.Message);
                }
                catch (OperationCanceledException ex)
                {
                    FailedQueue.Enqueue(payload);
                    throw new ConnectionError(ex.Message);
                }
                catch (Exception ex)
                {
                    throw ex;
                }

                // If this Sink expects acknowledgment, push the message to pending queue
                /*if (ReceiveAckEnabled)
                {
                    lock (PendingAckQueue)
                    {
                        PendingAckQueue.Enqueue(payload);
                    }
                }*/
            }

            // pipeCts is the Cts of the outer OutputPipe, signalling an external "stop" such as agent termination
            public async Task Start(CancellationToken pipeCts)
            {
                Cts = new CancellationTokenSource();
                SocketUpdate = new TaskCompletionSource<TcpAgent.ClientSideSocket>();

                while (true)
                {
                    try
                    {
                        if (pipeCts.IsCancellationRequested) break;

                        while (QueueLength > 0)
                        {
                            await Dequeue();
                        }

                        await Task.Yield();
                    }
                    catch (ConnectionError ex)
                    {
                        // ConnectionError is thrown if the downstream agent drops.
                        // We keep the loop alive since we anticipate the downstream agent to be migrated,
                        // and a new socket assigned.
                        Console.WriteLine($"{this} IOException in Sink {AgentURI} -- awaiting Socket Update");
                        await SocketUpdate.Task;

                        Cts = new CancellationTokenSource();
                        SocketUpdate = new TaskCompletionSource<TcpAgent.ClientSideSocket>();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Exception in Sink {AgentURI}");
                        Console.WriteLine(ex);
                        throw ex;
                    }
                }

                Console.WriteLine($"{this} Exited the Send Loop for Sink {AgentURI}");
            }

            public Task Stop()
            {
                return Socket.Stop();
            }
        }

        public enum RoutingPolicy
        {
            Fixed,  // select the first sink -- this is for a basic pipe that only has a single sink
            Random, // select a random sink to send -- for fair load-balancing
            RoundRobin, // classical round-robin -- for fair load-balancing
            Adaptive    // select sink based on load-level -- for meeting net throughput - requires a parameter
        }

        public long BytesOut { get => Sinks.Aggregate((long)0, (acc, item) => acc + item.BytesOut); }
        public long FramesOut { get => Sinks.Aggregate((long)0, (acc, item) => acc + item.FramesOut); }
        public long BytesPending { get => Sinks.Aggregate((long)0, (acc, item) => acc + item.QueueLength); }
        double MinRate;
        double MaxRate;
        StreamControl InputMonitor;
        //bool EnableReceiveAck;  // Used for reliable delivery when checkpointing

        public readonly List<Sink> Sinks;
        CancellationTokenSource Cts;
        Task Task;
        double OutputRate { get => Sinks.Aggregate(0.0, (acc, item) => acc + item.ThroughputMB); }

        Func<int> SelectNext;
        Random Random;
        int Next;       // Used for RoundRobin routing
        WeightedRandomSet<int> WeightedSinks;    // Used for Adaptive routing
        private static int RebalanceInterval = 500;

        public OutputPipe()
        {
            All.Add(this);
            Sinks = new List<Sink>();
            SelectNext = SelectRandom;
            InputMonitor = new StreamControl();
            MinRate = 0.0;
            MaxRate = 9999.0;
            //EnableReceiveAck = false;
            Random = new Random();
        }

        public OutputPipe(double minRate, double maxRate)
        {
            All.Add(this);
            Sinks = new List<Sink>();
            SelectNext = SelectRandom;
            InputMonitor = new StreamControl();
            MinRate = minRate;
            MaxRate = maxRate;
            //EnableReceiveAck = false;
            Random = new Random();
        }

        public OutputPipe(double minRate, double maxRate, RoutingPolicy policy)
        {
            All.Add(this);
            Sinks = new List<Sink>();
            SetRoutingPolicy(policy);
            InputMonitor = new StreamControl();
            MinRate = minRate;
            MaxRate = maxRate;
            //EnableReceiveAck = false;
            Random = new Random();
        }

        public OutputPipe(RoutingPolicy policy)
        {
            All.Add(this);
            Sinks = new List<Sink>();
            SetRoutingPolicy(policy);
            InputMonitor = new StreamControl();
            MinRate = 0.0;
            MaxRate = 9999.0;
            //EnableReceiveAck = false;
            Random = new Random();
        }

        public void SetRoutingPolicy(RoutingPolicy policy)
        {
            if (policy == RoutingPolicy.Adaptive)
            {
                SelectNext = SelectAdaptive;
                WeightedSinks = new WeightedRandomSet<int>();
            }
            else if (policy == RoutingPolicy.RoundRobin)
            {
                Next = -1;
                SelectNext = SelectRoundRobin;
            }
            else if (policy == RoutingPolicy.Fixed)
            {
                SelectNext = SelectFirst;
            }
            else
            {
                SelectNext = SelectRandom;
            }
        }

        private int SelectFirst()
        {
            return 0;
        }

        private int SelectRandom()
        {
            return Random.Next(Sinks.Count);
        }

        private int SelectRoundRobin()
        {
            Next = (Next + 1) % Sinks.Count;
            return Next;
        }

        private int SelectAdaptive()
        {
            return WeightedSinks.Draw();
        }

        // Used when using Adaptive routing
        // Should not be called when MinRate is set to 0
        private void Rebalance()
        {
            if (InputMonitor.ThroughputMB < MinRate)
            {
                Console.WriteLine($"Input = {InputMonitor.ThroughputMB} MB/s less than MinRate {MinRate}, resetting weights... (Output = {OutputRate} MB/s)\n");
                WeightedSinks.ResetAll();
            }
            else
            {
                var slowLinks = Sinks.Where(item => item.QueueLength > item.MinRate * 2000 * RebalanceInterval).Select((sink, index) => (index, sink)).ToDictionary(item => item.index, item => Math.Exp(-(double)item.sink.QueueLength / (item.sink.MinRate * 1000 * RebalanceInterval)));
                //var slowLinks = Sinks.Where(item => item.ThroughputMB < item.MinRate).Select((sink, index) => (index, sink)).ToDictionary(item => item.index, item => item.sink.ThroughputMB / item.sink.MinRate);
                var offload = slowLinks.Aggregate(0.0, (acc, item) => acc + (1 - item.Value)) / (Sinks.Count - slowLinks.Count);
                var weights = Sinks.Select((sink, index) => (index, sink)).ToDictionary(item => item.index, item =>
                {
                    if (slowLinks.ContainsKey(item.index))
                    {
                        //item.sink.SetMinRate(slowLinks[item.index] * MinRate / Sinks.Count);
                        return slowLinks[item.index];
                    }
                    else
                    {
                        //item.sink.SetMinRate(MinRate / Sinks.Count);
                        item.sink.SetMaxRate(MaxRate / Sinks.Count * (1 + offload));
                        return 1.0 + offload;
                    }
                });
                Console.WriteLine($"In = {Math.Round(InputMonitor.ThroughputMB,3)} MB/s, Out = {Math.Round(OutputRate, 3)} MB/s\t{string.Join(",\t", weights.Select(item => item.Key + " : " + item.Value + " : " + Sinks[item.Key].QueueLength + " : " + Math.Round(Sinks[item.Key].ThroughputMB, 3) + " MB/s"))}\n");
                WeightedSinks.SetWeights(weights);
            }
        }

        public void AddSink(string downstream, TcpAgent.ClientSideSocket socket)
        {
            var sink = new Sink(downstream, socket);
            lock (Sinks)
            {
                Sinks.Add(sink);

                // re-allocate the rate limits
                foreach (var item in Sinks)
                {
                    item.SetRatesAndReset(MinRate / Sinks.Count, MaxRate / Sinks.Count);
                }
            }

            Next = -1;
            if (SelectNext == SelectAdaptive)
            {
                WeightedSinks.Set(Sinks.IndexOf(sink), 1.0);
            }
        }

        public void UpdateSink(string downstream, TcpAgent.ClientSideSocket socket)
        {
            lock (Sinks)
            {
                Console.WriteLine($"{this} Updating Sink {downstream}");
                var sink = Sinks.Find(item => item.AgentURI == downstream);
                if (sink == null) throw new OperationError($"{this} Sink {downstream} does not exist for this pipe");

                sink.UpdateSocket(socket);
                Console.WriteLine($"{this} Updated Sink {downstream} (Queue Length = {sink.QueueLength})");
            }
        }

        public void Start()
        {
            if (Task == null)
            {
                Cts = new CancellationTokenSource();
                InputMonitor.Reset();

                if (SelectNext == SelectAdaptive && MinRate > 0.0)
                {
                    Task = Task.WhenAll(Sinks.Select(sink => sink.Start(Cts.Token)));
                    /*Task = Task.WhenAll(Sinks.Select(sink => Task.Run(async () =>
                    {
                        while (true)
                        {
                            if (Cts.IsCancellationRequested) break;

                            while (sink.QueueLength > 0)
                            {
                                await sink.Dequeue();
                            }

                            await Task.Yield();
                        }

                        Console.WriteLine($"{this} Exited the Send Loop for Sink {sink.AgentURI}");
                    }, Cts.Token)));*/

                    var timer = new System.Timers.Timer() { Interval = RebalanceInterval, AutoReset = false };
                    timer.Elapsed += (sender, evt) =>
                    {
                        if (Cts.IsCancellationRequested)
                        {
                            timer.Dispose();
                        }
                        else
                        {
                            Rebalance();
                        }

                        if (!Cts.IsCancellationRequested) timer.Start();
                    };
                    timer.Start();
                }
                else
                {
                    Task = Task.WhenAll(Sinks.Select(sink => sink.Start(Cts.Token)));
                    /*Task = Task.WhenAll(Sinks.Select(sink => Task.Run(async () =>
                    {
                        while (true)
                        {
                            if (Cts.IsCancellationRequested) break;

                            while (sink.QueueLength > 0)
                            {
                                await sink.Dequeue();
                            }

                            await Task.Yield();
                        }

                        Console.WriteLine($"{this} Exited the Send Loop for Sink {sink.AgentURI}");
                    }, Cts.Token)));*/
                }
            }
            else
            {
                throw new OperationError("Cannot Start Pipe -- it already started");
            }
        }

        public void Write(byte[] buffer)
        {
            Sinks[SelectNext()].Enqueue(buffer);
            
            InputMonitor.Update(buffer.Length);
        }

        public async Task Stop()
        {
            Cts.Cancel();
            await Task;
            await Task.WhenAll(Sinks.Select(sink => sink.Stop()));
        }

        // Only used for debugging
        public Sink GetSink(int index)
        {
            return Sinks[index];
        }
    }

    public class InputPipe : Pipe
    {
        public class Source
        {
            public string AgentURI { get; private set; }
            TcpAgent.ServerSideSocket Socket;
            public StreamControl Monitor;

            public long BytesIn { get; private set; }
            public long FramesIn { get => Monitor.NumFrames; }

            public Source(string agentUri, TcpAgent.ServerSideSocket socket)
            {
                AgentURI = agentUri;
                Socket = socket;
                Monitor = new StreamControl();
            }

            public double ThroughputMB { get => Monitor.ThroughputMB; }

            public Task Stop()
            {
                return Socket.Stop();
            }

            public Task Listen(Action<byte[]> onMessage)
            {
                return Socket.ListenRaw(payload =>
                {
                    onMessage(payload);
                    BytesIn += payload.Length;
                    Monitor.Update(payload.Length);
                });
            }
        }

        Dictionary<string, Source> Sources;

        public bool IsEmpty { get => Sources.Count == 0; }

        public InputPipe()
        {
            Sources = new Dictionary<string, Source>();
        }

        public bool HasSource(string upstream)
        {
            return Sources.ContainsKey(upstream);
        }

        public Source AddSource(string upstream, TcpAgent.ServerSideSocket socket)
        {
            var source = new Source(upstream, socket);
            Sources.Add(upstream, source);
            return source;
        }

        public Source UpdateSource(string upstream, TcpAgent.ServerSideSocket socket)
        {
            var oldSource = Sources[upstream];

            var source = new Source(upstream, socket);
            Sources[upstream] = source;

            oldSource.Stop();

            return source;
        }

        public bool StopAndRemoveSource(string upstream)
        {
            if (Sources.ContainsKey(upstream))
            {
                Sources[upstream].Stop();
                Sources.Remove(upstream);
                return true;
            }

            return false;
        }

        public Task StopSourceAfterReceiving(string upstream, long bytesOut)
        {
            if (Sources.ContainsKey(upstream))
            {
                var source = Sources[upstream];
                return Task.Run(async () =>
                {
                    while (source.BytesIn < bytesOut)
                    {
                        Console.WriteLine($"Waiting to receive from {upstream} ... (Received {source.FramesIn} frames) {source.BytesIn} / {bytesOut}");
                        await Task.Delay(250);
                    }
                    await source.Stop();
                    Sources.Remove(upstream);
                });
            }

            throw new OperationError($"Source {upstream} does not exist for this InputPipe");
        }

        public Task Stop()
        {
            return Task.WhenAll(Sources.Values.Select(socket => socket.Stop()));
        }
    }
}
