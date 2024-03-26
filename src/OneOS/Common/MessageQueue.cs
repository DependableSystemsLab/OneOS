using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Common
{
    public enum QueueDirection
    {
        Inbox,
        Outbox
    }
    public class MessageQueue
    {
        public Agent Owner { get; set; }
        public string Name { get; set; }

        private ConcurrentQueue<Message> Queue;
        private QueueDirection Direction;

        public string URI { get => Owner.URI + ":" + Name; }
        public int Count => Queue.Count;
        public int MessagesRead { get; private set; }
        public int MessagesWritten { get; private set; }
        public MessageQueue(Agent owner, string name, QueueDirection direction)
        {
            Owner = owner;
            Name = name;
            Queue = new ConcurrentQueue<Message>();
            Direction = direction;
            MessagesRead = 0;
            MessagesWritten = 0;
        }

        public Message Read()
        {
            Message message = null;

            Queue.TryDequeue(out message);
            if (message != null) MessagesRead++;

            return message;
        }

        public void Write(Message message)
        {
            Queue.Enqueue(message);
            MessagesWritten++;
        }
    }
}