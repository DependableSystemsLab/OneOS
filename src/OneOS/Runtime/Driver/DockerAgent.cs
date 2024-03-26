using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;

namespace OneOS.Runtime.Driver
{
    public class DockerAgent : ProcessAgent
    {
        private string OriginalImagePath;
        private string OriginalArgs;
        private VirtualRuntime VirtualRuntime;

        public DockerAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string filePath, string args) : base(runtime, uri, username, environ, "docker", "run " + filePath + " " + args)
        {
            OriginalImagePath = filePath;
            OriginalArgs = args;
            VirtualRuntime = new VirtualRuntime(runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));

            LoadImage();
        }

        private void LoadImage()
        {
            try
            {
                //Console.WriteLine($"docker load -i {instrumentPath} {OriginalSourceCode} {instPath} {URI}");

                var dockerLoad = new Process();
                var startInfo = new ProcessStartInfo("docker", $"load -i {OriginalImagePath}");
                startInfo.UseShellExecute = false;
                startInfo.WorkingDirectory = Runtime.TempDataPath;
                startInfo.RedirectStandardInput = false;
                startInfo.RedirectStandardOutput = true;
                startInfo.RedirectStandardError = false;
                dockerLoad.StartInfo = startInfo;
                dockerLoad.Start();
                dockerLoad.WaitForExit(5000);

                var consoleOut = dockerLoad.StandardOutput.ReadToEnd();
                // assume that consoleOut is something like: Loaded image: hello-world:latest
                var imageName = consoleOut.Split(' ').Last().Trim();

                Info.Arguments = $"run -i {imageName} {OriginalArgs}";

                Console.WriteLine($"{this} Loaded Docker Image {OriginalImagePath} as {imageName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while loading docker image: {ex}");
            }
        }

        public override async Task<object> Pause()
        {
            Process.Suspend();

            return await base.Pause();
        }

        public override async Task<object> Resume()
        {
            Process.Resume();

            return await base.Resume();
        }
    }
}
