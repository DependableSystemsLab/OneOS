using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace OneOS.Common
{
    public class TcpAgent : Agent
    {
        private TcpListener Listener;
        private int Port;

        private Action<ServerSideSocket> OnConnected;

        public List<ClientSideSocket> ActiveConnections;
        public List<ServerSideSocket> PassiveConnections;

        public TcpAgent(Agent parent, int port) : base(parent)
        {
            URI = $"{parent?.URI}/listener";
            Port = port;
            Listener = new TcpListener(IPAddress.Any, Port);
            //Listener = new TcpListener(IPAddress.IPv6Any, Port);

            ActiveConnections = new List<ClientSideSocket>();
            PassiveConnections = new List<ServerSideSocket>();
        }

        public void SetConnectionHandler(Action<ServerSideSocket> onConnected)
        {
            OnConnected = onConnected;
        }

        protected override void OnBegin()
        {
            Listener.Start(1000);
            Console.WriteLine($"{this} TcpAgent Listening on {Listener.LocalEndpoint.ToString()} in {Listener.LocalEndpoint.AddressFamily}");
        }

        protected override void OnTick()
        {
            if (Listener.Pending())
            {
                var socket = new ServerSideSocket(Listener.AcceptTcpClient());
                //socket.Listen();

                //Console.WriteLine($"{this} Accepted new client from {socket.RemoteEndPoint.ToString()}");

                PassiveConnections.Add(socket);

                socket.OnEnded += (ex) =>
                {
                    lock (PassiveConnections)
                    {
                        PassiveConnections.Remove(socket);

                        if (ex != null)
                        {
                            Console.WriteLine($"{this} ServerSocket closed with exception {ex?.GetType()}, removed from PassiveConnections ({PassiveConnections.Count})");
                        }
                    }
                };

                OnConnected?.Invoke(socket);
            }
        }

        protected override void OnEnd()
        {
            // Close all sockets
            var sockets = new List<TcpSocket>();
            
            lock (ActiveConnections)
            {
                sockets = sockets.Concat(ActiveConnections).ToList();
            }
            lock (PassiveConnections)
            {
                sockets = sockets.Concat(PassiveConnections).ToList();
            }

            var closing = sockets.Select(item => item.Stop()).ToArray();
            
            Task.WaitAll(closing);

            Console.WriteLine($"{this} All Sockets Gracefully Closed");

            Listener.Stop();
        }

        public ClientSideSocket ConnectTo(string address)
        {
            var socket = new ClientSideSocket(address);
            //socket.Listen();

            ActiveConnections.Add(socket);

            socket.OnEnded += (ex) =>
            {
                lock (ActiveConnections)
                {
                    ActiveConnections.Remove(socket);
                    
                    if (ex != null)
                    {
                        Console.WriteLine($"{this} ClientSocket to {address} closed with exception {ex?.GetType()}, removed from ActiveConnections ({ActiveConnections.Count})");
                    }
                }
            };

            return socket;
        }

        public ClientSideSocket ConnectTo(IPEndPoint endpoint)
        {
            //Console.WriteLine($"{this} Connecting to {endpoint}...");
            var socket = new ClientSideSocket(endpoint);
            //socket.Listen();

            ActiveConnections.Add(socket);

            socket.OnEnded += (ex) =>
            {
                lock (ActiveConnections)
                {
                    ActiveConnections.Remove(socket);
                    if (ex != null)
                    {
                        Console.WriteLine($"{this} ClientSocket to {endpoint.ToString()} closed with exception {ex?.GetType()}, removed from ActiveConnections ({ActiveConnections.Count})");
                    }
                }
            };

            //Console.WriteLine($"{this} awaiting connection to {endpoint}...");

            return socket;
        }

        public class TcpSocket : Socket
        {
            protected TcpClient TcpClient;
            public EndPoint RemoteEndPoint { get { return TcpClient.Client.RemoteEndPoint; } }

            //public string DebugName;
            //public event Action OnStopped;

            public override string ToString()
            {
                //return DebugName;
                return $"{GetType().Name} {TcpClient.Client.LocalEndPoint} -> {TcpClient.Client.RemoteEndPoint}";
            }

            public override Task Stop()
            {
                //Console.WriteLine($"Stopping {this}");
                base.Stop();
                TcpClient.Close();
                //if (Task == null) Task = Task.CompletedTask;

                //OnStopped?.Invoke();

                return Task;
            }
        }

        // This is the socket created by the listener
        // it cannot reconnect upon failure
        public class ServerSideSocket : TcpSocket
        {
            public ServerSideSocket(TcpClient tcpClient)
            {
                TcpClient = tcpClient;
                Stream = TcpClient.GetStream();

                //DebugName = $"{GetType().Name} {TcpClient.Client.LocalEndPoint} -> {TcpClient.Client.RemoteEndPoint}";
            }
        }

        // This is the socket created by the client
        // it initiates connection
        // it can attempt to reconnect upon failure
        public class ClientSideSocket : TcpSocket
        {
            public Task Connected { get; private set; }
            public ClientSideSocket(string address)
            {
                var uri = new Uri($"oneos://{address}");
                TcpClient = new TcpClient(AddressFamily.InterNetwork);
                Connected = TcpClient.ConnectAsyncWithRetries(uri.Host, uri.Port, 5).ContinueWith(task =>
                {
                    if (task.Status == TaskStatus.RanToCompletion)
                    {
                        Stream = TcpClient.GetStream();
                    }
                    else
                    {
                        Console.WriteLine($"{this} Error while connecting to {address}\n{task.Exception}");

                        throw task.Exception.GetBaseException();
                    }

                    //DebugName = $"{GetType().Name} {TcpClient.Client.LocalEndPoint} -> {TcpClient.Client.RemoteEndPoint}";
                });
            }

            public ClientSideSocket(IPEndPoint endpoint)
            {
                //Console.WriteLine($"Attempting to connect to {endpoint}  at  [{endpoint.Address.ToString()}] [{endpoint.Port}]");

                /*var host = Dns.GetHostEntry(endpoint.Address.ToString());
                foreach (var address in host.AddressList)
                {
                    Console.WriteLine($"{address.ToString()} in {address.AddressFamily.ToString()}");
                }*/

                // Enforce IPv4 for ensuring it works on Linux
                // (Some Linux distros convert IPv4 to an IPv6 mapping, while
                //  the listener only binds to an IPv4 interface)
                TcpClient = new TcpClient(AddressFamily.InterNetwork);
                Connected = TcpClient.ConnectAsyncWithRetries(endpoint.Address, endpoint.Port, 5).ContinueWith(task =>
                {
                    if (task.Status == TaskStatus.RanToCompletion)
                    {
                        Stream = TcpClient.GetStream();
                    }
                    else
                    {
                        Console.WriteLine($"Error while connecting to {endpoint}\n{task.Exception}");
                        
                        throw task.Exception.GetBaseException();
                    }

                    //Console.WriteLine($"Connected to {endpoint} in {TcpClient.Client.RemoteEndPoint.AddressFamily}");

                    /*var ip = (IPEndPoint)TcpClient.Client.RemoteEndPoint;
                    if (ip.AddressFamily == AddressFamily.InterNetwork)
                    {
                        Console.WriteLine($"Connected to {endpoint} in IPv4");
                    }
                    else if (ip.AddressFamily == AddressFamily.InterNetwork)
                    {
                        Console.WriteLine($"Connected to {endpoint} in IPv6");
                    }*/
                    
                    //DebugName = $"{GetType().Name} {TcpClient.Client.LocalEndPoint} -> {TcpClient.Client.RemoteEndPoint}";
                });
            }
        }
    }

    public static class TcpClientExtension
    {
        public static async Task ConnectAsyncWithRetries(this TcpClient client, string host, int port, int retries = 0)
        {
            int count = 0;
            Exception finalException = null;

            while (count <= retries)
            {
                try
                {
                    await client.ConnectAsync(host, port);
                    return;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Connection to {host} : {port} failed... retries left: #{count} / {retries}");
                    finalException = ex;
                }

                count++;

                await Task.Delay(2000);
            }

            throw finalException;
        }

        public static async Task ConnectAsyncWithRetries(this TcpClient client, IPAddress address, int port, int retries = 0)
        {
            int count = 0;
            Exception finalException = null;

            while (count <= retries)
            {
                try
                {
                    await client.ConnectAsync(address, port);
                    return;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Connection to {address} : {port} failed... retries left: #{count} / {retries}");
                    finalException = ex;
                }

                count++;

                await Task.Delay(2000);
            }

            throw finalException;
        }
    }
}
