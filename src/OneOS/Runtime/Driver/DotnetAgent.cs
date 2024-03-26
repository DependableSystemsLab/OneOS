using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Runtime.Driver
{
    public class DotnetAgent : ProcessAgent
    {
        private VirtualRuntime VirtualRuntime;

        public DotnetAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string filePath, string args) : base(runtime, uri, username, environ, "dotnet", filePath + " " + args)
        {
            VirtualRuntime = new VirtualRuntime(runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));
        }
    }
}
