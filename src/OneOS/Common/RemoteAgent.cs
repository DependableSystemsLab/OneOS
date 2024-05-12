using OneOS.Runtime;
using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Common
{
    public class RemoteAgent : Agent
    {
        public enum ConnectionStatus
        {
            Initialized,
            Connected,
            Dropped
        }

        private TcpAgent.ClientSideSocket _activeSocket;
        private TcpAgent.ServerSideSocket _passiveSocket;
        internal RemoteAgent Gateway;
        private ConnectionStatus _status;
        public Registry.AgentInfo AgentInfo { get; private set; }
        public bool IsGuaranteedMessageDelivery { get; private set; }

        internal TcpAgent.ClientSideSocket ActiveSocket { get => Gateway != null ? Gateway.ActiveSocket : _activeSocket; }
        internal TcpAgent.ServerSideSocket PassiveSocket { get => Gateway != null ? Gateway.PassiveSocket : _passiveSocket; }
        internal ConnectionStatus Status { get => Gateway != null ? Gateway.Status : _status; }

        private MessageQueue SendFailedQueue;
        public event Action OnConnected;

        public bool IsReachable { get => ActiveSocket != null && PassiveSocket != null; }

        public RemoteAgent(Agent parent, string uri, bool guaranteeDelivery = true) : base(parent)
        {
            URI = uri;
            SendFailedQueue = new MessageQueue(this, "in", QueueDirection.Inbox);
            _status = ConnectionStatus.Initialized;
            IsGuaranteedMessageDelivery = guaranteeDelivery;

            /*OnConnected += () =>
            {
                //Console.WriteLine($"{this} Gateway Connected");
                SendFailedMessages();
            };*/
        }

        public RemoteAgent(Agent parent, string uri, RemoteAgent gateway, bool guaranteeDelivery = true) : base(parent)
        {
            URI = uri;
            Gateway = gateway;
            SendFailedQueue = new MessageQueue(this, "in", QueueDirection.Inbox);
            IsGuaranteedMessageDelivery = guaranteeDelivery;

            if (IsGuaranteedMessageDelivery)
            {
                OnConnected += () =>
                {
                    //Console.WriteLine($"{this} Gateway Connected");
                    SendFailedMessages();
                };

                Gateway.OnConnected += OnConnected;
            }
        }

        public RemoteAgent(Agent parent, Registry.AgentInfo agentInfo, RemoteAgent gateway, bool guaranteeDelivery = true) : base(parent)
        {
            URI = agentInfo.URI;
            AgentInfo = agentInfo;
            Gateway = gateway;
            SendFailedQueue = new MessageQueue(this, "in", QueueDirection.Inbox);
            IsGuaranteedMessageDelivery = guaranteeDelivery;

            if (IsGuaranteedMessageDelivery)
            {
                OnConnected += () =>
                {
                    //Console.WriteLine($"{this} Gateway Connected");
                    SendFailedMessages();
                };

                Gateway.OnConnected += OnConnected;
            }
        }

        public override string ToString()
        {
            return $"[(Remote) {URI} on {Parent?.URI}]\t";
        }

        public void UpdateGateway(RemoteAgent gateway)
        {
            if (Gateway != null)
            {
                Gateway.OnConnected -= OnConnected;
            }

            Gateway = gateway;
            Gateway.OnConnected += OnConnected;

            Console.WriteLine($"{this} Gateway changed to {gateway.URI}");
        }

        public void SetActiveSocket(TcpAgent.ClientSideSocket socket)
        {
            _activeSocket = socket;

            if (_activeSocket != null && _passiveSocket != null)
            {
                _status = ConnectionStatus.Connected;
                //Console.WriteLine($"{this} Connected");
                if (IsGuaranteedMessageDelivery)
                {
                    SendFailedMessages();
                }
                OnConnected?.Invoke();
            }
        }
        public void SetPassiveSocket(TcpAgent.ServerSideSocket socket)
        {
            _passiveSocket = socket;

            if (_activeSocket != null && _passiveSocket != null)
            {
                _status = ConnectionStatus.Connected;
                //Console.WriteLine($"{this} Connected");
                if (IsGuaranteedMessageDelivery)
                {
                    SendFailedMessages();
                }
                OnConnected?.Invoke();
            }
        }

        public void DropSockets()
        {
            _activeSocket?.Stop();
            _passiveSocket?.Stop();

            _status = ConnectionStatus.Dropped;

            _activeSocket = null;
            _passiveSocket = null;
        }

        private void SendFailedMessages()
        {
            while (SendFailedQueue.Count > 0)
            {
                var failed = SendFailedQueue.Read();

                Console.WriteLine($"{this} Re-sending previously failed message on {failed.Channel}");

                ActiveSocket.Send(failed.Serialize());
            }
        }

        protected override void OnMessage(Message message)
        {
            // TODO: handle cases where ActiveSocket is not ready yet
            if (ActiveSocket != null)
            {
                //SendFailedMessages();
                ActiveSocket.Send(message.Serialize());
            }
            else
            {
                Console.WriteLine($"{this} Failed to relay message on {message.Channel}");
                if (IsGuaranteedMessageDelivery)
                {
                    SendFailedQueue.Write(message);
                }   
            }
        }
    }
}
