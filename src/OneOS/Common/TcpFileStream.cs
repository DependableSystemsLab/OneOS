using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Threading.Tasks;

namespace OneOS.Common
{
    /* This is a dedicated TCP pipe used for things like file read/write stream between processes.
     * We use this direct pipe so that the messages don't need to travel through the agent-router
     * handling cycle (marshalling + routing overhead) */
    public class TcpFileStream
    {
        public enum OpenMode
        {
            Read,
            Write
        }

        private TaskCompletionSource<object> Tcs;
        private TcpAgent.ServerSideSocket Socket;
        public string Key { get; private set; }
        public bool Connected { get; private set; }
        public OpenMode Mode { get; private set; }

        public TcpFileStream(OpenMode mode)
        {
            Key = Helpers.RandomText.Next(8);   // this is the "secret" key that the client-side must send to connect
            Connected = false;
            Tcs = new TaskCompletionSource<object>();
            Mode = mode;
        }

        public Task WaitForConnection()
        {
            return Tcs.Task;
        }

        internal async Task ConnectClientSide(TcpAgent.ServerSideSocket socket)
        {
            Socket = socket;

            // Important to signal to the client-side socket
            // So that the client-side can begin writing.
            // We need to write to client first, otherwise we will deadlock
            if (Mode == OpenMode.Write)
            {
                await socket.StreamWrite(Encoding.UTF8.GetBytes("Ready"));
            }

            Console.WriteLine($"TcpDataStream {Key} connected via {socket}");

            Tcs.SetResult(true);
            Connected = true;
        }

        public void Write(byte[] buffer, int offset, int count)
        {
            Socket.Stream.Write(buffer, offset, count);
        }

        public Task WriteAsync(byte[] buffer, int offset, int count)
        {
            return Socket.Stream.WriteAsync(buffer, offset, count);
        }

        // Send is used when we want segments in the TCP stream (e.g., Video)
        public Task Send(byte[] payload)
        {
            return Socket.Send(payload);
        }

        public int Read(byte[] buffer, int offset, int count)
        {
            return Socket.Stream.Read(buffer, offset, count);
        }

        public Task<int> ReadAsync(byte[] buffer, int offset, int count)
        {
            return Socket.Stream.ReadAsync(buffer, offset, count);
        }

        public void Close()
        {
            Socket.Stream.Flush();
            Socket.Stop();
        }
    }
}
