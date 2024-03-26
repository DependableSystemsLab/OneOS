using Confluent.Kafka;
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Text;

namespace OneOS.Common
{
    internal class MessageSequencer<T>
    {
        Func<T, long> SequenceGetter;
        Action<T> OnDequeue;
        long NextIndex;
        ConcurrentDictionary<long, T> Queue;

        public MessageSequencer(Func<T, long> sequenceGetter, long firstIndex, Action<T> onDequeue)
        {
            SequenceGetter = sequenceGetter;
            NextIndex = firstIndex;
            OnDequeue = onDequeue;
            Queue = new ConcurrentDictionary<long, T>();
        }

        public void Enqueue(T message)
        {
            var index = SequenceGetter(message);
            if (NextIndex == index)
            {
                OnDequeue(message);
                NextIndex++;
            }
            else
            {
                Queue.TryAdd(index, message);
            }
            CheckQueue();
        }

        private void CheckQueue()
        {
            if (Queue.ContainsKey(NextIndex))
            {
                T message = default;
                Queue.TryRemove(NextIndex, out message);
                if (message != null)
                {
                    OnDequeue(message);
                    NextIndex++;
                }
                CheckQueue();
            }
        }
    }
}
