using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Text;
using System.Linq;
using System.Threading.Tasks;

using Newtonsoft.Json.Linq;

using OneOS.Common;

namespace OneOS.Runtime
{
    public class Synchronizer : RpcAgent
    {
        private class PeerStatus
        {
            public bool IsAlive;
            public DateTime LastChecked;
            public DateTime LastHeard;

            public PeerStatus()
            {
                IsAlive = false;
                LastChecked = DateTime.Now - TimeSpan.FromMilliseconds(HeartbeatTimeoutInterval.TotalMilliseconds) + TimeSpan.FromMilliseconds(3000 * Random.NextDouble());
                LastHeard = LastChecked - HeartbeatTimeoutInterval;
            }
        }

        private static TimeSpan HeartbeatTimeoutInterval = TimeSpan.FromMilliseconds(15000.0);
        private static Random Random;

        Runtime Runtime;

        public event Action<string> OnPeerJoined;   // we use the C# events as this message should act like an "interrupt" and not as a regular message
        public event Action<string> OnPeerDropped;  // we use the C# events as this message should act like an "interrupt" and not as a regular message

        public bool IsStable { get; private set; }
        List<string> AllRuntimes { get => Runtime.AllRuntimes.OrderBy(item => item).ToList(); }
        List<string> Peers { get => Runtime.Peers.Keys.ToList(); }
        ConcurrentDictionary<string, PeerStatus> PeerStatusMap;

        //DateTime HeartbeatTimeout;

        public bool IsLeader { get => AllRuntimes[0] == Runtime.URI; }

        public Synchronizer(Runtime runtime) : base(runtime)
        {
            URI = runtime.URI + "/sync";
            Runtime = runtime;
            Random = new Random();
            IsStable = false;
            //HeartbeatTimeout = DateTime.Now;

            PeerStatusMap = new ConcurrentDictionary<string, PeerStatus>();

            foreach (var peerUri in Peers)
            {
                PeerStatusMap[peerUri] = new PeerStatus();
            }
        }

        protected override void OnTick()
        {
            if (IsLeader)
            {
                var lastStateStable = IsStable;
                var livePeers = 0;
                var now = DateTime.Now;

                foreach (var peerUri in Peers)
                {
                    var peerStatus = PeerStatusMap[peerUri];
                    if (peerStatus.IsAlive) livePeers++;

                    // check if heartbeat timed out
                    if (now >= peerStatus.LastHeard + HeartbeatTimeoutInterval && now >= peerStatus.LastChecked + HeartbeatTimeoutInterval)
                    {
                        peerStatus.LastChecked = DateTime.Now;

                        RequestWithTimeout((int)HeartbeatTimeoutInterval.TotalMilliseconds, peerUri + "/sync", "MarkPeerAsLive", Runtime.URI)
                            .ContinueWith(prev =>
                            {
                                bool isAlive = prev.Status == TaskStatus.RanToCompletion;

                                if (isAlive)
                                {
                                    UpdatePeerHeartbeat(peerUri);
                                }

                                if (peerStatus.IsAlive != isAlive)
                                {
                                    peerStatus.IsAlive = isAlive;

                                    if (isAlive)
                                    {
                                        Console.WriteLine($"{this} {peerUri} is live");
                                        OnPeerJoined?.Invoke(peerUri);

                                        // When a node joins late or recovers,
                                        // we let it know that the rest of the network is stable
                                        if (IsStable)
                                        {
                                            Request(peerUri + "/sync", "UpdateState", 1, IsStable);
                                        }
                                    }
                                    else
                                    {
                                        Console.WriteLine($"{this} {peerUri} is dead");
                                        OnPeerDropped?.Invoke(peerUri);
                                    }
                                }
                            });
                    }
                }

                if (livePeers >= AllRuntimes.Count / 2 + 1)
                {
                    if (!lastStateStable)
                    {
                        IsStable = true;
                        Console.WriteLine($"{this} Global state stabilized, notifying peers");

                        foreach (var peerUri in Peers.Where(item => PeerStatusMap[item].IsAlive))
                        {
                            Request(peerUri + "/sync", "UpdateState", 1, IsStable);
                        }
                    }
                }
                else
                {
                    if (lastStateStable)
                    {
                        IsStable = false;
                        Console.WriteLine($"{this} Global state unstable, notifying peers");

                        foreach (var peerUri in Peers.Where(item => PeerStatusMap[item].IsAlive))
                        {
                            Request(peerUri + "/sync", "UpdateState", 1, IsStable);
                        }
                    }
                }
            }


            // if this runtime is supposed to be the leader, then notify all others that it's alive
            /*if (AllRuntimes[0] == Runtime.URI && DateTime.Now >= HeartbeatTimeout)
            {
                HeartbeatTimeout = DateTime.Now + TimeSpan.FromMilliseconds(2500);

                //Console.WriteLine($"{this} {Clock} ticks passed, issuing heartbeat");

                var tasks = Peers.Select(peerUri =>
                    RequestWithTimeout(5000, peerUri + "/sync", "MarkPeerAsLive", Runtime.URI)
                        .ContinueWith(prev =>
                        {
                            bool isAlive = prev.Status == TaskStatus.RanToCompletion;
                            if (PeerStatusMap[peerUri] != isAlive)
                            {
                                PeerStatusMap[peerUri] = isAlive;

                                if (isAlive)
                                {
                                    Console.WriteLine($"{this} {peerUri} is live");
                                    OnPeerJoined?.Invoke(peerUri);

                                    // When a node joins late or recovers,
                                    // we let it know that the rest of the network is stable
                                    if (IsStable)
                                    {
                                        Request(peerUri + "/sync", "UpdateState", 1, IsStable);
                                    }
                                }
                                else
                                {
                                    Console.WriteLine($"{this} {peerUri} is dead");
                                    OnPeerDropped?.Invoke(peerUri);
                                }
                            }
                            return (peerUri, isAlive);
                        })).ToList();

                Task.WhenAll(tasks).ContinueWith(prev =>
                {
                    var alive = prev.Result.Where(item => item.isAlive).ToList();
                    
                    var lastStateStable = IsStable;

                    if (alive.Count >= Peers.Count / 2 + 1)
                    {
                        if (!lastStateStable)
                        {
                            IsStable = true;
                            Console.WriteLine($"{this} Global state stabilized, notifying peers");

                            alive.ForEach(item =>
                            {
                                Request(item.peerUri + "/sync", "UpdateState", 1, IsStable);
                            });
                        }
                    }
                    else
                    {
                        if (lastStateStable)
                        {
                            IsStable = false;
                            Console.WriteLine($"{this} Global state unstable, notifying peers");

                            alive.ForEach(item =>
                            {
                                Request(item.peerUri + "/sync", "UpdateState", 1, IsStable);
                            });
                        }
                    }
                });

                *//*foreach (var peerUri in Peers)
                {
                    var syncUri = peerUri + "/sync";

                    RequestWithTimeout(6000, syncUri, "MarkPeerAsLive", Runtime.URI)
                        .ContinueWith(prev =>
                        {
                            bool isAlive = prev.Status == TaskStatus.RanToCompletion;

                            *//*if (prev.Status == TaskStatus.RanToCompletion)
                            {
                                Console.WriteLine($"{this} {syncUri} responded, marking alive");

                                isAlive = true;
                            }
                            else if (prev.IsFaulted)
                            {
                                Console.WriteLine($"{this} {syncUri} failed to respond, marking dead");

                                isAlive = false;
                            }
                            else
                            {
                                Console.WriteLine($"{this} failed to talk to {syncUri} for unknown reasons, marking dead");

                                isAlive = false;
                            }*//*

                            if (PeerStatusMap[peerUri] != isAlive)
                            {
                                PeerStatusMap[peerUri] = isAlive;

                                if (isAlive)
                                {
                                    Console.WriteLine($"{this} {peerUri} is live");
                                    OnPeerJoined?.Invoke(peerUri);
                                }
                                else
                                {
                                    Console.WriteLine($"{this} {peerUri} is dead");
                                    OnPeerDropped?.Invoke(peerUri);
                                }
                            }
                        });
                }*//*
            }*/

        }

        public void UpdatePeerHeartbeat(string peerUri)
        {
            PeerStatusMap[peerUri].LastHeard = DateTime.Now;
        }

        [RpcMethod]
        public string MarkPeerAsLive(string peerUri)
        {
            if (!PeerStatusMap[peerUri].IsAlive)
            {
                PeerStatusMap[peerUri].IsAlive = true;

                //OnPeerJoined?.Invoke(peerUri);
            }

            return Runtime.URI;
        }

        [RpcMethod]
        public string UpdateState(long version, object state)
        {
            
            IsStable = (bool)state;

            Console.WriteLine($"{this} Leader messaged: Global state stable = {(bool)state}");

            return Runtime.URI;
        }
    }
}
