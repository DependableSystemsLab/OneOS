using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.IO.Pipes;
using System.Threading.Tasks;

namespace OneOS.Test
{
    public class PipeTest
    {
        public static void ManyToManyTest()
        {

            var server1 = new NamedPipeServerStream("file1.sock", PipeDirection.Out, 2);

            var t1 = Task.Run(async () =>
            {
                while (true){
                    await server1.WaitForConnectionAsync();

                    Console.WriteLine($"Client connected");

                    var payload = Encoding.UTF8.GetBytes("Hello");

                    server1.Write(payload, 0, payload.Length);

                    server1.Disconnect();
                }
            });

            var server2 = new NamedPipeServerStream("file2.sock", PipeDirection.Out, 2);

            var t2 = Task.Run(async () =>
            {
                while (true)
                {
                    await server2.WaitForConnectionAsync();

                    Console.WriteLine($"Client connected");

                    var payload = Encoding.UTF8.GetBytes("Hello World");

                    server2.Write(payload, 0, payload.Length);

                    server2.Disconnect();
                }
            });

            var client1 = new NamedPipeClientStream("file1.sock");

            var t3 = Task.Run(async () =>
            {
                client1.Connect();

                byte[] buffer = new byte[100];

                int bytesRead = await client1.ReadAsync(buffer, 0, buffer.Length);
                Console.WriteLine("Client 1 " + Encoding.UTF8.GetString(buffer));
                
                client1.Close();
            });

            var client2 = new NamedPipeClientStream("file1.sock");

            var t4 = Task.Run(async () =>
            {
                client2.Connect();

                byte[] buffer = new byte[100];

                int bytesRead = await client2.ReadAsync(buffer, 0, buffer.Length);
                Console.WriteLine("Client 2 " + Encoding.UTF8.GetString(buffer));

                client2.Close();
            });

            Task.WaitAll(t1, t2, t3, t4);
        }

        public static void Run()
        {
            ManyToManyTest();
        }
    }
}
