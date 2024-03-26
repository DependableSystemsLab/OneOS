using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Linq;

using OneOS.Common;
using OneOS.Runtime.Driver;

namespace OneOS.Runtime
{
    public class IOManager : RpcAgent
    {
        private static Dictionary<string, Func<Runtime, string[], Agent>> DriverInitializers = new Dictionary<string, Func<Runtime, string[], Agent>>
        {
            { "ffmpeg", (runtime, args) => new Driver.FfmpegReader(runtime, args[0], args[1]) }
        };

        Runtime Runtime;
        int Port;
        List<IOConfiguration> IOConfigs;
        private Dictionary<string, Agent> IOAgents;                 // Agents representing local IO resources
        Dictionary<string, TcpFileStream> IOStreams;

        public IOManager(Runtime runtime, int port, List<IOConfiguration> ioConfigs) : base(runtime)
        {
            Runtime = runtime;
            Port = port;
            IOConfigs = ioConfigs;
            URI = Runtime.URI + "/io";
            IOAgents = new Dictionary<string, Agent>();
            IOStreams = new Dictionary<string, TcpFileStream>();
        }

        internal async Task ConnectIOStream(string key, TcpAgent.ServerSideSocket socket)
        {
            var pipe = IOStreams[key];
            if (pipe.Connected) throw new OperationError($"IOStream {key} is already connected");

            //Console.WriteLine($"Connecting {pipe.Mode} IOStream {key}");
            await pipe.ConnectClientSide(socket);
        }

        [RpcMethod]
        public string CreateVideoInputStream(string localName, string clientUri)
        {
            var readerPipe = new TcpFileStream(TcpFileStream.OpenMode.Read);
            IOStreams[readerPipe.Key] = readerPipe;

            if (!IOAgents.ContainsKey(localName))
            {
                var config = IOConfigs.Find(item => item.Name == localName);
                if (config == null)
                {
                    throw new OperationError($"{this} Unable to load device '{localName}' because it is not found in the configurations");
                }

                if (DriverInitializers.ContainsKey(config.Driver))
                {
                    var initArgs = (new string[] { config.Name }).Concat(config.Arguments).ToArray();
                    var agent = DriverInitializers[config.Driver](Runtime, initArgs);
                    IOAgents.Add(config.Name, agent);
                    agent.Start();
                }
                else
                {
                    throw new OperationError($"{this} Unable to load device '{config.Name}' due to invalid driver '{config.Driver}'");
                }
            }

            var video = (VideoReader)IOAgents[localName];

            Task.Run(async () =>
            {
                await readerPipe.WaitForConnection();

                video.AddConsumer(clientUri, readerPipe);
            });

            string hostName = Dns.GetHostName();

            return hostName + ":" + Port.ToString() + ":" + readerPipe.Key;
        }

        [RpcMethod]
        public string CreateKafkaInputStream(string kafkaServer, string topic, long batchSize, string clientUri)
        {
            var readerPipe = new TcpFileStream(TcpFileStream.OpenMode.Read);
            IOStreams[readerPipe.Key] = readerPipe;

            KafkaAgent agent = null;
            if (!IOAgents.ContainsKey("kafka/" + topic))
            {
                agent = new KafkaAgent(Runtime, kafkaServer);
                agent.SetBatchSize(Convert.ToInt32(batchSize));
                IOAgents.Add("kafka/" + topic, agent);
                agent.Start();
            }
            else
            {
                agent = (KafkaAgent)IOAgents["kafka/" + topic];
            }

            Task.Run(async () =>
            {
                await readerPipe.WaitForConnection();

                agent.Subscribe(topic, readerPipe);
            });

            string hostName = Dns.GetHostName();

            return hostName + ":" + Port.ToString() + ":" + readerPipe.Key;
        }
    }
}
