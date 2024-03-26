using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.IO.Pipes;
using System.Threading.Tasks;
using System.Net;

using OneOS.Common;
using System.Linq;

namespace OneOS.Runtime
{
    public class StorageAgent : RpcAgent
    {
        private const int StreamBufferSize = 131072;

        Runtime Runtime;
        string MountPath;
        int Port;
        Dictionary<string, TcpFileStream> FileStreams;
        Dictionary<(string, string), List<Action>> AgentLifecycleListeners;

        public StorageAgent(Runtime runtime, string mountPath, int port) : base(runtime)
        {
            Runtime = runtime;
            URI = Runtime.URI + "/storage";
            MountPath = mountPath;
            Port = port;
            FileStreams = new Dictionary<string, TcpFileStream>();
            AgentLifecycleListeners = new Dictionary<(string, string), List<Action>>();
        }

        internal async Task ConnectFileStream(string key, TcpAgent.ServerSideSocket socket)
        {
            var pipe = FileStreams[key];
            if (pipe.Connected) throw new OperationError($"FileStream {key} is already connected");

            Console.WriteLine($"Connecting {pipe.Mode} FileStream {key}");
            await pipe.ConnectClientSide(socket);
        }

        [RpcMethod]
        public string GetLocalAbsolutePath(string relativePath)
        {
            if (relativePath[0] != '/') relativePath = "/" + relativePath;
            var cleanPath = Helpers.ResolvePath(relativePath);
            var localPath = MountPath + cleanPath;
            return localPath;
        }

        [RpcMethod]
        public string Checksum(string relativePath, string algorithm = "SHA256")
        {
            var stream = File.OpenRead(GetLocalAbsolutePath(relativePath));
            return Helpers.Checksum(stream, algorithm);
        }

        [RpcMethod]
        public long GetFileInfo(string relativePath)
        {
            var info = new FileInfo(GetLocalAbsolutePath(relativePath));

            return info.Length;
        }

        [RpcMethod]
        public byte[] ReadFile(string relativePath)
        {
            return File.ReadAllBytes(GetLocalAbsolutePath(relativePath));
        }

        [RpcMethod]
        public string ReadTextFile(string relativePath)
        {
            return File.ReadAllText(GetLocalAbsolutePath(relativePath));
        }

        [RpcMethod]
        public string WriteFile(string relativePath, byte[] content)
        {
            File.WriteAllBytes(GetLocalAbsolutePath(relativePath), content);
            return relativePath;
        }

        [RpcMethod]
        public string WriteTextFile(string relativePath, string content)
        {
            File.WriteAllText(GetLocalAbsolutePath(relativePath), content);
            return relativePath;
        }

        [RpcMethod]
        public string AppendTextFile(string relativePath, string content)
        {
            File.AppendAllText(GetLocalAbsolutePath(relativePath), content);
            return relativePath;
        }

        [RpcMethod]
        public string CreateReadStream(string relativePath, string clientUri, string absoluteVirtualPath)
        {
            var readerPipe = new TcpFileStream(TcpFileStream.OpenMode.Read);
            FileStreams[readerPipe.Key] = readerPipe;

            var stream = File.OpenRead(GetLocalAbsolutePath(relativePath));
            byte[] buffer = new byte[StreamBufferSize];

            Task.Run(async () =>
            {
                await readerPipe.WaitForConnection();

                // TODO: Remove this listener after all the checksum are generated
                //      we're only using this to manually and lazily enter checksums
                /*AgentLifecycleListeners.Add(("end", clientUri), async () =>
                {
                    Console.WriteLine($"{this} Updating file info for {absoluteVirtualPath}");

                    // after writing the file, notify RegistryManager
                    // to update the checksum and the size
                    var content = File.ReadAllBytes(GetLocalAbsolutePath(relativePath));
                    var checksum = Helpers.Checksum(content, "SHA256");

                    await Request(Runtime.RegistryManagerUri, "UpdateFileInfo", absoluteVirtualPath, content.Length, checksum);
                });*/

                while (true)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;
                    await readerPipe.WriteAsync(buffer, 0, bytesRead);
                }

                stream.Close();
                readerPipe.Close();

                Console.WriteLine($"{this} ReadStream {absoluteVirtualPath} closed...");
            });

            string hostName = Dns.GetHostName();

            return hostName + ":" + Port.ToString() + ":" + readerPipe.Key;
        }

        [RpcMethod]
        public string RestoreReadStream(string relativePath, long startAt, string clientUri, string absoluteVirtualPath)
        {
            var readerPipe = new TcpFileStream(TcpFileStream.OpenMode.Read);
            FileStreams[readerPipe.Key] = readerPipe;

            var stream = File.OpenRead(GetLocalAbsolutePath(relativePath));
            stream.Seek(startAt, SeekOrigin.Begin);
            byte[] buffer = new byte[StreamBufferSize];

            Task.Run(async () =>
            {
                await readerPipe.WaitForConnection();

                // TODO: Remove this listener after all the checksum are generated
                //      we're only using this to manually and lazily enter checksums
                /*AgentLifecycleListeners.Add(("end", clientUri), async () =>
                {
                    Console.WriteLine($"{this} Updating file info for {absoluteVirtualPath}");

                    // after writing the file, notify RegistryManager
                    // to update the checksum and the size
                    var content = File.ReadAllBytes(GetLocalAbsolutePath(relativePath));
                    var checksum = Helpers.Checksum(content, "SHA256");

                    await Request(Runtime.RegistryManagerUri, "UpdateFileInfo", absoluteVirtualPath, content.Length, checksum);
                });*/

                while (true)
                {
                    int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;
                    await readerPipe.WriteAsync(buffer, 0, bytesRead);
                }

                stream.Close();
                readerPipe.Close();

                Console.WriteLine($"{this} ReadStream {absoluteVirtualPath} closed...");
            });

            string hostName = Dns.GetHostName();

            return hostName + ":" + Port.ToString() + ":" + readerPipe.Key;
        }

        [RpcMethod]
        public string CreateWriteStream(string relativePath, string clientUri, string absoluteVirtualPath)
        {
            var writerPipe = new TcpFileStream(TcpFileStream.OpenMode.Write);
            FileStreams[writerPipe.Key] = writerPipe;

            //var stream = File.OpenWrite(GetLocalAbsolutePath(relativePath));
            var stream = new FileStream(GetLocalAbsolutePath(relativePath), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite);
            byte[] buffer = new byte[StreamBufferSize];

            Task.Run(async () =>
            {
                await writerPipe.WaitForConnection();

                // This file stream resides on a different machine from the
                // one the client process is running on. So to reliably detect
                // termination of the client process, we listen for the global
                // lifecycle event emitted by the OneOS network
                if (!AgentLifecycleListeners.ContainsKey(("end", clientUri)))
                {
                    AgentLifecycleListeners.Add(("end", clientUri), new List<Action>());
                }
                AgentLifecycleListeners[("end", clientUri)].Add(async () =>
                {
                    Console.WriteLine($"{this} WriteStream {absoluteVirtualPath} closed...");

                    writerPipe.Close();
                    stream.Flush();
                    stream.Close();

                    Console.WriteLine($"{this} Updating file info for {absoluteVirtualPath}");

                    // after writing the file, notify RegistryManager
                    // to update the checksum and the size
                    // must set the FileShare.ReadWrite flag, otherwise we cannot open the file (i.e., cannot use File.OpenRead)
                    var content = new FileStream(GetLocalAbsolutePath(relativePath), FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    var checksum = Helpers.Checksum(content, "SHA256");

                    await Request(Runtime.RegistryManagerUri, "UpdateFileInfo", absoluteVirtualPath, content.Length, checksum);
                });

                while (true)
                {
                    int bytesRead = await writerPipe.ReadAsync(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;
                    await stream.WriteAsync(buffer, 0, bytesRead);
                }
            });

            string hostName = Dns.GetHostName();

            return hostName + ":" + Port.ToString() + ":" + writerPipe.Key;
        }

        protected override void OnMessage(Message message)
        {
            //Console.WriteLine($"{this} Received {message.Payload.Length} bytes, pushing to process");
            if (message.Channel == $"events.{Runtime.Domain}/agent-lifecycle")
            {
                var evt = ObjectMessage<Dictionary<string, string>>.FromBytes(message.Payload);

                var evtType = evt.Payload["type"];
                var evtAgent = evt.Payload["agent"];

                Console.WriteLine($"{this} Received Lifecycle event -  {evtType} {evtAgent}");

                if (AgentLifecycleListeners.ContainsKey((evtType, evtAgent)))
                {
                    foreach (var action in AgentLifecycleListeners[(evtType, evtAgent)])
                    {
                        action.Invoke();
                    }

                    if (evtType == "end")
                    {
                        AgentLifecycleListeners.Remove((evtType, evtAgent));
                    }
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

        // Called by the client to obtain the remote endpoint of the file stream
        // after calling CreateWriteStream.
        // Note: the Socket returned by this static method is NOT managed
        //       by the Connection Manager, so it must be disposed manually.
        public static async Task<TcpAgent.ClientSideSocket> GetWriteStream(string accessKey)
        {
            var tokens = accessKey.Split(':');
            var socket = new TcpAgent.ClientSideSocket($"{tokens[0]}:{tokens[1]}");
            await socket.Connected;

            var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.FileStreamConnectionRequest, "fs", tokens.Last());
            await socket.StreamWrite(request.Serialize());

            // read the "READY" flag
            await socket.StreamRead();

            return socket;
        }
    }
}
