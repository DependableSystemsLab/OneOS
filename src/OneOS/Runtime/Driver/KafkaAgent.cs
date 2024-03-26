using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Threading.Tasks;
using Confluent.Kafka;

using OneOS.Common;
using OneOS.Runtime;


namespace OneOS.Runtime.Driver
{
    public class KafkaAgent : RpcAgent
    {
        private const int MaxConsumeBatchSize = 20000; // Defines up to how many messages we want to consume in 1 agent tick

        public string BootstrapServer { get; private set; }

        public Dictionary<string, List<string>> Subscribers { get; private set; }
        public Dictionary<string, List<TcpFileStream>> SubscriberStreams { get; private set; }
        private IConsumer<Ignore, string> Consumer;
        private IProducer<Null, string> Producer;

        private int ConsumeBatchSize;

        public KafkaAgent(Runtime runtime, string bootstrapServer) : base(runtime)
        {
            URI = runtime.URI + "/io/kafka/" + Helpers.RandomText.Next();

            BootstrapServer = bootstrapServer;
            Subscribers = new Dictionary<string, List<string>>();
            SubscriberStreams = new Dictionary<string, List<TcpFileStream>>();

            ConsumeBatchSize = MaxConsumeBatchSize;

            var cConf = new ConsumerConfig
            {
                GroupId = "test-consumer-group",
                ClientId = runtime.URI.Replace('/', '-').Replace('.', '_'),
                BootstrapServers = BootstrapServer,
                AutoOffsetReset = AutoOffsetReset.Latest,
                EnableAutoCommit = false
            };

            var pConf = new ProducerConfig
            {
                BootstrapServers = BootstrapServer
            };

            Consumer = new ConsumerBuilder<Ignore, string>(cConf).Build();
            Producer = new ProducerBuilder<Null, string>(pConf).Build();
        }

        public void SetBatchSize(int batchSize)
        {
            ConsumeBatchSize = batchSize;
        }

        public bool Subscribe(string topic, string agentUri)
        {
            if (!Subscribers.ContainsKey(topic))
            {
                Subscribers[topic] = new List<string>();
                Consumer.Subscribe(topic);
            }

            if (Subscribers[topic].Contains(agentUri))
            {
                return false;
            }
            else
            {
                Subscribers[topic].Add(agentUri);
                return true;
            }
        }

        public bool Subscribe(string topic, TcpFileStream readerPipe)
        {
            if (!SubscriberStreams.ContainsKey(topic))
            {
                try
                {
                    SubscriberStreams[topic] = new List<TcpFileStream>();
                    Consumer.Subscribe(topic);

                    // Seek to end of the stream (ignoring old messages)
                    Consumer.Consume(TimeSpan.FromSeconds(5));
                    //Consumer.Assign(Consumer.Assignment);
                    var tp = Consumer.Assignment.Find(item => item.Topic == topic);
                    //Consumer.Seek(new TopicPartitionOffset(tp, Offset.End));

                    Console.WriteLine($"{this} Subscribed to {topic}, at Offset {Consumer.Position(tp)}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
            }

            if (SubscriberStreams[topic].Contains(readerPipe))
            {
                return false;
            }
            else
            {
                SubscriberStreams[topic].Add(readerPipe);

                return true;
            }
        }

        public async Task Publish(string topic, string message)
        {
            var dr = await Producer.ProduceAsync(topic, new Message<Null, string> { Value = message });
            Console.WriteLine($"Delivered message '{dr.Message.Value}' at: '{dr.TopicPartitionOffset}'.");
        }

        protected override void OnTick()
        {
            var count = 0;

            while (count < ConsumeBatchSize)
            {
                try
                {
                    var cr = Consumer.Consume(TimeSpan.Zero);

                    if (cr == null) break;

                    count++;

                    if (Subscribers.ContainsKey(cr.Topic))
                    {
                        var evt = new ObjectMessage<List<string>>(new List<string>() { cr.Topic, cr.Message.Value });

                        foreach (var agentUri in Subscribers[cr.Topic])
                        {
                            var message = CreateMessage(agentUri, evt.Serialize());
                            Outbox.Write(message);
                        }
                    }

                    if (SubscriberStreams.ContainsKey(cr.Topic))
                    {
                        var data = Encoding.UTF8.GetBytes(cr.Message.Value);
                        foreach (var stream in SubscriberStreams[cr.Topic])
                        {
                            stream.WriteAsync(data, 0, data.Length);
                        }
                    }

                    //Console.WriteLine($"Consumed message '{cr.Message.Value}' at: '{cr.TopicPartitionOffset}'.");
                }
                catch (ConsumeException ex)
                {
                    Console.WriteLine(ex.Message);
                }
            }

            //Console.WriteLine($"{this} read {count} messages at {Clock}");
        }
    }
}
