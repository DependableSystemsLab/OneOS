using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Linq;
using System.Diagnostics;
using System.Net;

using OneOS.Common;

namespace OneOS.Test
{
    public class TcpTest
    {
        private static async Task StartClient(int clientIndex, int totalBytes, int rateLimitInMB, object consoleLock, int cursorOffset = 0, bool useChecksum = true)
        {
            var md5Client = MD5.Create();

            var Random = new Random();
            var bytesSent = 0;
            var chunksSent = 0;

            var limiter = new StreamControl(rateLimitInMB);
            limiter.Reset();

            var endpoint = new IPEndPoint(IPAddress.Parse("127.0.0.1"), int.Parse("3000"));

            var client = new TcpAgent.ClientSideSocket(endpoint);
            //var client = new TcpAgent.ClientSideSocket("127.0.0.1:3000");
            await client.Connected;

            Console.WriteLine($"[Client {clientIndex}] Connection established");

            await Task.Run(async () =>
            {
                try
                {
                    while (bytesSent < totalBytes)
                    {
                        byte[] payload = new byte[Random.Next(1000, 100000)];
                        Random.NextBytes(payload);

                        if (useChecksum)
                        {
                            byte[] hash = md5Client.ComputeHash(payload);
                            payload = payload.Concat(hash).ToArray();
                        }

                        await client.Send(payload);

                        lock (consoleLock)
                        {
                            Console.SetCursorPosition(0, cursorOffset);
                            Console.Write(new string(' ', Console.WindowWidth));
                            Console.SetCursorPosition(0, cursorOffset);
                            Console.Write($"{chunksSent}\tClient {clientIndex} Sent {payload.Length} bytes - {Math.Round(limiter.ThroughputMB, 2)} MB/s");
                        }

                        limiter.Update(payload.Length);
                        await limiter.Delay();

                        bytesSent += payload.Length;
                        chunksSent++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }

            });

            lock (consoleLock)
            {
                Console.SetCursorPosition(0, cursorOffset + 4 + (clientIndex * 2));
                client.Stop().Wait();
            }   
        }

        public async static Task ThroughputTest(int totalBytes, int rateLimitInMB, bool useChecksum = true)
        {
            Console.WriteLine("--- Starting Test [TCP Throughput Control] ---");
            Console.WriteLine($"  Total Bytes = {totalBytes/1000000} MB,  Rate Limit = {rateLimitInMB} MB/s");
            var cursorOffset = Console.CursorTop;
            var consoleLock = new object();

            var listener = new TcpAgent(null, 3000);
            listener.SetConnectionHandler(socket =>
            {
                var md5Server = MD5.Create();
                var limiter = new StreamControl(rateLimitInMB);
                limiter.Reset();

                var chunksReceived = 0;

                /*var message = await socket.StreamRead();
                Console.WriteLine($"Server-side Read {message.Length} bytes - {Math.Round(10 * limiter.Throughput, 2)} MB/s");*/

                //var response = Message.FromBytes(message);
                /*await socket.StreamWrite(message);
                Console.WriteLine($"Server-side Echo {message.Length} bytes");*/

                socket.Listen(async message =>
                {
                    lock (consoleLock)
                    {
                        Console.SetCursorPosition(0, cursorOffset + 3);
                        Console.Write(new string(' ', Console.WindowWidth));
                        Console.SetCursorPosition(0, cursorOffset + 3);
                        Console.Write($"{chunksReceived}\tServer-side Read {message.Length} bytes - {limiter.ThroughputMB} MB/s");
                    }
                    limiter.Update(message.Length);

                    if (useChecksum)
                    {
                        var hashReceived = message.Skip(message.Length - 16).ToArray();
                        var hashComputed = md5Server.ComputeHash(message.Take(message.Length - 16).ToArray());

                        if (!hashReceived.SequenceEqual(hashComputed))
                        {
                            Console.WriteLine($"{chunksReceived} Hash mismatch! {BitConverter.ToString(hashReceived)} {BitConverter.ToString(hashComputed)}");
                            Console.WriteLine($"Received {message.Length} bytes including hash");
                            throw new Exception("HASH ERROR");
                        }
                    }

                    chunksReceived++;

                    await limiter.Delay();

                    /*socket.Send(message);
                    Console.WriteLine($"Server-side Echo {message.Length} bytes");*/
                });
            });
            listener.Start();

            var task = StartClient(1, totalBytes, rateLimitInMB, consoleLock, cursorOffset + 5, useChecksum);

            var started = DateTime.Now;
            var timer = new Timer(obj =>
            {
                lock (consoleLock)
                {
                    Console.SetCursorPosition(0, cursorOffset + 7);
                    Console.Write($"{Math.Round((DateTime.Now - started).TotalSeconds, 3)} seconds elapsed");
                }
            }, null, TimeSpan.Zero, TimeSpan.FromSeconds(1));

            await task;

            lock (consoleLock)
            {
                Console.SetCursorPosition(0, cursorOffset + 10);
                listener.Stop().Wait();
                timer.Dispose();
            }

            lock (consoleLock)
            {
                Console.WriteLine("--- Finished Test [TCP Throughput Control] ---");
            }
        }

        public async static Task MultiClientTest(int clientCount, int totalBytesPerClient, int rateLimitInMB, bool useChecksum = true)
        {
            Console.WriteLine("--- Starting Test [TCP Multiple Clients] ---");
            Console.WriteLine($"  Total Bytes / Client = {totalBytesPerClient / 1000000} MB,  Rate Limit = {rateLimitInMB} MB/s");
            var cursorOffset = Console.CursorTop + clientCount;
            var consoleLock = new object();
            var totalChunksReceived = 0;

            var limiter = new StreamControl(rateLimitInMB);
            limiter.Reset();

            var listener = new TcpAgent(null, 3000);
            listener.SetConnectionHandler(socket =>
            {
                var md5Server = MD5.Create();

                var chunksReceived = 0;

                socket.Listen(async message =>
                {
                    lock (consoleLock)
                    {
                        Console.SetCursorPosition(0, cursorOffset + 3);
                        Console.Write(new string(' ', Console.WindowWidth));
                        Console.SetCursorPosition(0, cursorOffset + 3);
                        Console.Write($"{chunksReceived} / {totalChunksReceived} \tServer-side Read {message.Length} bytes - {limiter.ThroughputMB} MB/s");
                    }
                    limiter.Update(message.Length);

                    if (useChecksum)
                    {
                        var hashReceived = message.Skip(message.Length - 16).ToArray();
                        var hashComputed = md5Server.ComputeHash(message.Take(message.Length - 16).ToArray());

                        if (!hashReceived.SequenceEqual(hashComputed))
                        {
                            Console.WriteLine($"{chunksReceived} Hash mismatch! {BitConverter.ToString(hashReceived)} {BitConverter.ToString(hashComputed)}");
                            Console.WriteLine($"Received {message.Length} bytes including hash");
                            throw new Exception("HASH ERROR");
                        }
                    }

                    chunksReceived++;
                    totalChunksReceived++;

                    //await limiter.Delay();
                });
            });
            listener.Start();

            List<Task> clients = new List<Task>();
            for (var i = 0; i < clientCount; i++)
            {
                clients.Add(StartClient(i, totalBytesPerClient, rateLimitInMB, consoleLock, cursorOffset + 5 + (2 * i), useChecksum));
            }

            var started = DateTime.Now;
            var timer = new Timer(obj =>
            {
                lock (consoleLock)
                {
                    Console.SetCursorPosition(0, cursorOffset + 5 + 2 * clientCount);
                    Console.Write($"{Math.Round((DateTime.Now - started).TotalSeconds, 3)} seconds elapsed");
                }
            }, null, TimeSpan.Zero, TimeSpan.FromSeconds(1));

            await Task.WhenAll(clients);

            lock (consoleLock)
            {
                Console.SetCursorPosition(0, cursorOffset + 10 + 2 * clientCount);
                listener.Stop().Wait();
                timer.Dispose();
            }

            lock (consoleLock)
            {
                Console.WriteLine("--- Finished Test [TCP Multiple Clients] ---");
            }
        }

        public static void Run()
        {
            //ThroughputTest(512000000, 2).Wait();
            //Console.WriteLine("\n");
            //ThroughputTest(512000000, 3).Wait();

            //ThroughputTest(512000000, 4, false).Wait();

            //ThroughputTest(512000000, 5).Wait();

            //MultiClientTest(2, 512000000, 1).Wait();

            MultiClientTest(3, 512000000, 10).Wait();
        }
    }
}
