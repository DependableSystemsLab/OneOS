using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Linq;
using System.IO;
using System.Runtime.InteropServices;

using OneOS.Common;

namespace OneOS.Runtime
{
    public class LanguageManager : RpcAgent
    {
        private Runtime Runtime;
        private List<VMConfiguration> VMConfigs;

        public LanguageManager(Runtime runtime, List<VMConfiguration> vms) : base(runtime)
        {
            Runtime = runtime;
            URI = runtime.URI + "/language";
            VMConfigs = vms;
        }


        [RpcMethod]
        public Task<object> ExecuteNPMCommand(string username, bool outputToShell, string args)
        {
            var outputChannel = $"{username}.{Runtime.Domain}/shell:stdout";
            var redirectOutput = outputToShell && Runtime.IsLeader;

            var tcs = new TaskCompletionSource<object>();

            Console.WriteLine($"Executing NPM on {Runtime.URI} - npm {args}");
            
            var startInfo = new ProcessStartInfo();
            startInfo.UseShellExecute = false;
            startInfo.WorkingDirectory = Runtime.TempDataPath;
            startInfo.RedirectStandardInput = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                startInfo.FileName = "cmd";
                startInfo.Arguments = "/c npm" + (args.Length > 0 ? $" {args}" : "");
            }
            else
            {
                startInfo.FileName = "npm";
                startInfo.Arguments = (args.Length > 0 ? $" {args}" : "");
            }

            var npm = new Process();
            npm.StartInfo = startInfo;
            npm.EnableRaisingEvents = true;
            npm.Exited += (sender, evt) =>
            {
                string output;
                if (npm.ExitCode != 0)
                {
                    output = npm.StandardError.ReadToEnd();
                }
                else
                {
                    output = npm.StandardOutput.ReadToEnd();
                }

                tcs.SetResult(output);

                if (redirectOutput)
                {
                    var message = CreateMessage(outputChannel, Encoding.UTF8.GetBytes(output));
                    Outbox.Write(message);
                }
            };

            npm.Start();

            if (redirectOutput)
            {
                Task.Run(async () =>
                {
                    byte[] buffer = new byte[65536];
                    while (true)
                    {
                        int bytesRead = await npm.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                        if (bytesRead > 0)
                        {
                            var payload = buffer.Take(bytesRead).ToArray();
                            var message = CreateMessage(outputChannel, payload);
                            Outbox.Write(message);
                        }
                    }
                });
            }

            return tcs.Task;
        }
    }
}
