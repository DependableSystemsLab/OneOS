using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

using OneOS.Common;

namespace OneOS.Runtime
{
    public class RuntimeMessage : IMessage
    {
        public enum RuntimeMessageType
        {
            PeerConnectionRequest = 1,
            PeerConnectionResponse = 2,
            ClientConnectionRequest = 3,
            ClientConnectionResponse = 4,
            FileStreamConnectionRequest = 5,
            FileStreamConnectionResponse = 6,
            AgentLinkRequest = 7,
            AgentLinkResponse = 8,
            AgentTunnelRequest = 9,
            AgentTunnelResponse = 10,
            ConnectionProfileRequest = 11,
            ConnectionProfileResponse = 12
        }

        public RuntimeMessageType Type { get; private set; }
        public List<string> Arguments { get; private set; }

        public RuntimeMessage(RuntimeMessageType type, params string[] args)
        {
            Type = type;
            Arguments = args.ToList();
        }

        public static RuntimeMessage Create(RuntimeMessageType type, params string[] args)
        {
            var message = new RuntimeMessage(type, args);
            return message;
        }

        public static RuntimeMessage FromBytes(byte[] buffer)
        {
            var tokens = Encoding.UTF8.GetString(buffer).Split(';');
            var message = new RuntimeMessage((RuntimeMessageType)Int32.Parse(tokens[0]), tokens.Skip(1).ToArray());

            return message;
        }

        public byte[] Serialize()
        {
            string[] args = (new string[] { ((int)Type).ToString() }).Concat(Arguments).ToArray();
            byte[] payload = Encoding.UTF8.GetBytes(string.Join(";", args));

            return payload;
        }
    }
}
