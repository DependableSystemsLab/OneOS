using System;
using System.Collections.Generic;
using System.Text;
using System.Net;
using System.Threading.Tasks;
using System.IO;

using OneOS.Common;
using OneOS.Runtime;

namespace OneOS.Client
{
    // A Terminal is simply a client-side "terminal" that sends and receives user I/O.
    // A terminal establishes a connection with the server-side shell, and the shell
    // talks to the runtimes
    public class Terminal : RpcAgent
    {
        private static Random Random = new Random();
        private TcpAgent.ClientSideSocket Socket;
        private string ShellUri;
        public IPEndPoint EntryAddress;

        public Terminal(IPEndPoint entryAddress) : base(null)
        {
            // TODO: change the following to something other than random
            byte[] sessionKey = new byte[4];
            Random.NextBytes(sessionKey);
            URI = "terminal-" + BitConverter.ToString(sessionKey).Replace("-", string.Empty);

            EntryAddress = entryAddress;
        }

        // Connects to the OneOS Runtime synchronously
        public void Connect(IPEndPoint peerAddress)
        {
            // Establish TCP connection with one of the Runtimes
            Socket = new TcpAgent.ClientSideSocket(peerAddress);
            Socket.Connected.Wait();

            //Console.WriteLine($"Connected to {peerAddress}");

            // Server now expects a login message directed at SessionManager
            Console.Write("Username: ");
            string username = Console.ReadLine();

            Console.Write("Password: ");
            string password = Helpers.ReadSecret();

            
            bool connected = false;
            string domain = "?";
            while (!connected)
            {
                var request = RuntimeMessage.Create(RuntimeMessage.RuntimeMessageType.ClientConnectionRequest, URI, username, password);
                Socket.StreamWrite(request.Serialize()).Wait();

                var responsePayload = Socket.StreamRead().Result;

                if (responsePayload.Length > 0)
                {
                    var response = RuntimeMessage.FromBytes(responsePayload);
                    if (response.Arguments[0] == "Redirect")
                    {
                        // args: "Redirect", peerUri, peerAddress
                        Socket.Stop();
                        //Console.WriteLine($"Reconnecting to {response.Arguments[2]}");
                        Socket = new TcpAgent.ClientSideSocket(response.Arguments[2]);
                        Socket.Connected.Wait();
                    }
                    else if (response.Arguments[0] == "OK")
                    {
                        //Console.WriteLine($"Connected to {Socket.RemoteEndPoint}");
                        connected = true;
                        ShellUri = response.Arguments[1];
                        domain = response.Arguments[2];
                    }
                    else if (response.Arguments[0] == "NoUser")
                    {
                        Console.WriteLine("User does not exist");
                        Console.Write("Username: ");
                        username = Console.ReadLine();

                        Console.Write("Password: ");
                        password = Helpers.ReadSecret();
                    }
                    else if (response.Arguments[0] == "WrongPassword")
                    {
                        Console.WriteLine("Incorrect password");

                        Console.Write("Password: ");
                        password = Helpers.ReadSecret();
                    }
                }
                else
                {
                    RaiseError(new ConnectionError("Failed to connect because cluster did not respond"));
                    break;
                }
            }

            Console.WriteLine($"Connected to {domain} over TCP {Socket}");

            if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            {
                Socket.Listen(PrintShellOutputWindows);
            }
            else
            {
                Socket.Listen(PrintShellOutputUnix);
            }
        }

        public void Reconnect(IPEndPoint peerAddress)
        {
            if (Socket != null)
            {
                Socket.Stop();
            }

            Connect(peerAddress);
        }

        private void PrintShellOutputUnix(byte[] payload)
        {
            var message = Message.FromBytes(payload);
            var output = Encoding.UTF8.GetString(message.Payload);
            var lineCount = output.Split('\n').Length;

            int x = Console.CursorLeft;
            int y = Console.CursorTop;

            if (y + lineCount >= Console.BufferHeight)
            {
                Console.Clear();
                y = 0;
            }

            //Console.MoveBufferArea(0, y, Console.WindowWidth, 1, 0, y + lineCount);
            Console.SetCursorPosition(0, y);
            Console.WriteLine(output);
            Console.SetCursorPosition(x, y + lineCount);
        }

        private void PrintShellOutputWindows(byte[] payload)
        {
            var message = Message.FromBytes(payload);
            var output = Encoding.UTF8.GetString(message.Payload);
            var lineCount = output.Split('\n').Length;

            int x = Console.CursorLeft;
            int y = Console.CursorTop;

            if (y + lineCount >= Console.BufferHeight)
            {
                int halfHeight = Console.BufferHeight / 2;
                Console.MoveBufferArea(0, halfHeight, Console.BufferWidth, halfHeight, 0, 0);
                y = y - halfHeight;
            }

            Console.MoveBufferArea(0, y, Console.WindowWidth, 1, 0, y + lineCount);
            Console.SetCursorPosition(0, y);
            Console.WriteLine(output);
            Console.SetCursorPosition(x, y + lineCount);
        }

        protected override void OnBegin()
        {
            Connect(EntryAddress);
        }

        protected override void OnTick()
        {
            Console.Write("> ");
            string input = Console.ReadLine();

            if (input == "exit")
            {
                Socket.Stop();
                Stop();
            }
            else if (input == "clear")
            {
                Console.Clear();
            }
            else
            {
                try
                {
                    var message = CreateMessage(ShellUri, Encoding.UTF8.GetBytes(input));
                    Socket.Send(message.Serialize()).Wait();
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is IOException)
                    {
                        Console.WriteLine($"\nConnection to {ShellUri} lost! Reconnecting...\n");
                        Reconnect(EntryAddress);
                    }
                }
                
            }
        }
    }
}
