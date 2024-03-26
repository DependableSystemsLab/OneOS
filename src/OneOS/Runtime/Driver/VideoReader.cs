using System;
using System.Collections.Generic;
using System.Text;

using OneOS.Common;

namespace OneOS.Runtime.Driver
{
    public class VideoReader : RpcAgent
    {
        protected Dictionary<string, TcpFileStream> Consumers;

        public VideoReader(Agent parent, string name) : base(parent)
        {
            Consumers = new Dictionary<string, TcpFileStream>();
        }

        public void AddConsumer(string clientUri, TcpFileStream stream)
        {
            Consumers.Add(clientUri, stream);
        }
    }
}
