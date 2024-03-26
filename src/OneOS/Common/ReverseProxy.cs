using System;
using System.Collections.Generic;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace OneOS.Common
{
    /* This is a reverse proxy used for servers listening on ports globally */
    public class ReverseProxy
    {
        public const int BufferSize = 131072;
        public const int ReadDelay = 100;   // If no bytes are read, try after this many ms

        public int Port { get; private set; }
        private TcpListener Listener;
        protected CancellationTokenSource Cts;    // CTS to use for graceful termination signal
        protected Task Task;                      // The main Task representing the "processing loop"
        protected IPEndPoint TargetServer;
        List<(TcpClient, TcpClient, CancellationTokenSource)> Clients;

        public bool CloseOnEmptyRead;

        public ReverseProxy(int port, IPEndPoint target)
        {
            Port = port;
            Listener = new TcpListener(IPAddress.Any, Port);
            Task = null;
            TargetServer = target;
            Clients = new List<(TcpClient, TcpClient, CancellationTokenSource)>();
            CloseOnEmptyRead = true;
        }

        private async Task BridgeConnection(TcpClient client)
        {
            var id = Helpers.RandomText.Next();

            var clientCts = new CancellationTokenSource();

            Console.WriteLine($"New client {id} connected, connecting to {TargetServer}");
            var proxyClient = new TcpClient(AddressFamily.InterNetwork);

            await proxyClient.ConnectAsync(TargetServer.Address, TargetServer.Port);

            var clientStream = client.GetStream();
            var proxyStream = proxyClient.GetStream();

            Console.WriteLine($"Bridge for {id} established");

            var tuple = (client, proxyClient, clientCts);

            var t1 = Task.Run(async () =>
            {
                /*while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    await clientStream.CopyToAsync(proxyStream);

                    Console.WriteLine($"client wrote to server");

                    await Task.Yield();
                }*/

                byte[] buffer = new byte[BufferSize];
                int bytesRead = 0;

                try
                {
                    // continuously read
                    while (true)
                    {
                        if (clientCts.IsCancellationRequested) break;

                        //Console.WriteLine($"{id} Reading from Client...");

                        bytesRead = await clientStream.ReadAsync(buffer, 0, buffer.Length, clientCts.Token);

                        if (bytesRead > 0)
                        {
                            await proxyStream.WriteAsync(buffer, 0, bytesRead);

                            //Console.WriteLine($"{id} Delivered {bytesRead} from Client to Server:\n-----\n{Encoding.UTF8.GetString(buffer, 0, bytesRead)}\n-----");

                            await Task.Yield();
                        }
                        else if (CloseOnEmptyRead)
                        {
                            break;
                        }
                        else
                        {
                            await Task.Delay(ReadDelay);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"{id} UNEXPECTED EXCEPTION");
                    Console.WriteLine(ex);
                    Console.WriteLine(ex.InnerException);
                }

                if (!clientCts.IsCancellationRequested)
                {
                    clientCts.Cancel();
                }
            });

            var t2 = Task.Run(async () =>
            {
                /*while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    await proxyStream.CopyToAsync(clientStream);

                    Console.WriteLine($"server wrote to client");

                    await Task.Yield();
                }*/

                byte[] buffer = new byte[BufferSize];
                int bytesRead = 0;

                try
                {
                    // continuously read
                    while (true)
                    {
                        if (clientCts.IsCancellationRequested) break;

                        //Console.WriteLine($"{id} Reading from Server...");

                        bytesRead = await proxyStream.ReadAsync(buffer, 0, buffer.Length, clientCts.Token);

                        if (bytesRead > 0)
                        {
                            await clientStream.WriteAsync(buffer, 0, bytesRead);

                            //Console.WriteLine($"{id} Delivered {bytesRead} from Server to Client:\n-----\n{Encoding.UTF8.GetString(buffer, 0, bytesRead)}\n-----");

                            await Task.Yield();
                        }
                        else if (CloseOnEmptyRead)
                        {
                            break;
                        }
                        else
                        {
                            await Task.Delay(ReadDelay);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"{id} UNEXPECTED EXCEPTION");
                    Console.WriteLine(ex);
                    Console.WriteLine(ex.InnerException);
                }

                if (!clientCts.IsCancellationRequested)
                {
                    clientCts.Cancel();
                }
            });

            Task.WhenAll(t1, t2).ContinueWith(_ =>
            {
                clientStream.Close();
                proxyStream.Close();
                
                client.Close();
                proxyClient.Close();

                lock (Clients)
                {
                    Clients.Remove(tuple);
                }

                Console.WriteLine($"{id} Client removed");
            });

            Clients.Add(tuple);
        }

        public async Task Start()
        {
            if (Task == null)
            {
                Cts = new CancellationTokenSource();

                Listener.Start(1000);
                Console.WriteLine($"Reverse Proxy from :{Port} -> {TargetServer} Started");

                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    if (Listener.Pending())
                    {
                        var client = Listener.AcceptTcpClient();

                        await BridgeConnection(client);
                    }

                    await Task.Delay(100);
                }
            }
            else
            {
                throw new OperationError($"Reverse Proxy on {Port} already started");
            }
        }

        public Task Stop()
        {
            Cts?.Cancel();
            foreach (var tuple in Clients)
            {
                tuple.Item3.Cancel();
            }
            return Task;
        }
    }
}
