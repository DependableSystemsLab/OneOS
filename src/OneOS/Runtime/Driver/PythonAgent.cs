using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace OneOS.Runtime.Driver
{
    public class PythonAgent : ProcessAgent
    {
        private VirtualRuntime VirtualRuntime;

        public PythonAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string filePath, string args) : base(runtime, uri, username, environ, "python", "-u " + filePath + " " + args)
        {
            VirtualRuntime = new VirtualRuntime(runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));
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
