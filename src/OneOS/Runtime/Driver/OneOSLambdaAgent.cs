using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using System.Threading.Tasks;
using Confluent.Kafka;
using OneOS.Common;
using OneOS.Language;

namespace OneOS.Runtime.Driver
{
    public class OneOSLambdaAgent : RpcAgent
    {
        private Runtime Runtime;
        public string User { get; private set; }
        protected Dictionary<string, string> Environment;
        private VirtualRuntime VirtualRuntime;
        private EvaluationContext Context;
        private Interpreter Interpreter;
        public event EventHandler OnExit;
        public Graph.Node.LambdaType LambdaType;
        //private SerializableFunction Lambda;
        private Function Lambda;
        private Language.Object LambdaState;

        internal int BytesIn { get; private set; }
        internal int BytesOut { get; private set; }
        //private StreamControl OutputController;
        internal Dictionary<string, InputPipe> DirectInputPipes;
        internal Dictionary<string, OutputPipe> DirectOutputPipes;

        public OneOSLambdaAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string binary, string args) : base(runtime)
        {
            URI = uri;
            Runtime = runtime;
            User = username;
            Environment = environ;
            VirtualRuntime = new VirtualRuntime(Runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));
            Context = new EvaluationContext();
            Interpreter = new Interpreter(this, Runtime, User, Context);
            //OutputController = new StreamControl();
            DirectInputPipes = new Dictionary<string, InputPipe>();
            DirectOutputPipes = new Dictionary<string, OutputPipe>();

            GenerateLambdaFunction(binary, args);
            LoadEnvironment();
        }

        private void GenerateLambdaFunction(string lambdaType, string code)
        {
            var innerFunction = SerializableFunction.FromCode(code);
            innerFunction.Activate(Interpreter);

            if (lambdaType == "lambda.filter")
            {
                LambdaType = Graph.Node.LambdaType.Filter;
                Lambda = new Function((ctx, args) =>
                {
                    var payload = (ByteArray)args[0];
                    var check = (Object<bool>)innerFunction.Invoke(ctx, payload);
                    if (check.Value)
                    {
                        SendOutput(payload.Value);
                    }
                    return null;
                });
            }
            else if (lambdaType == "lambda.map")
            {
                LambdaType = Graph.Node.LambdaType.Map;
                Lambda = new Function((ctx, args) =>
                {
                    var payload = (ByteArray)args[0];
                    var result = innerFunction.Invoke(ctx, payload);

                    // TODO: Serialize the object properly
                    var serialized = Encoding.UTF8.GetBytes(result.ToString());
                    SendOutput(serialized);

                    return null;
                });
            }
            else if (lambdaType == "lambda.reduce")
            {
                LambdaType = Graph.Node.LambdaType.Reduce;
                Lambda = new Function((ctx, args) =>
                {
                    var payload = (ByteArray)args[0];
                    LambdaState = innerFunction.Invoke(ctx, LambdaState, payload);

                    // TODO: Serialize the object properly
                    var serialized = Encoding.UTF8.GetBytes(LambdaState.ToString());
                    SendOutput(serialized);

                    return null;
                });
            }
        }

        private void LoadEnvironment()
        {
            Context["ENV"] = Dict.FromDictionary(Environment);
        }

        private void SendOutput(byte[] payload)
        {
            var output = CreateMessage($"{URI}:stdout", payload);
            Outbox.Write(output);

            foreach (var item in DirectOutputPipes)
            {
                // await item.Value.Send(payload);
                item.Value.Write(payload);
                //await item.Value.Stream.WriteAsync(payload, 0, payload.Length);
            }

            BytesOut += payload.Length;
        }

        private void ProcessMessage(byte[] payload)
        {
            BytesIn += payload.Length;

            //var result = Lambda.Invoke(Context, new Language.ByteArray(payload));

            Lambda.Invoke(Context, new Language.ByteArray(payload));

            // TODO: Serialize the object properly
            //var serialized = Encoding.UTF8.GetBytes(result.ToString());

            /*var output = CreateMessage($"{URI}:stdout", serialized);
            Outbox.Write(output);

            foreach (var item in DirectOutputPipes)
            {
                // await item.Value.Send(payload);
                item.Value.Write(serialized, 0, serialized.Length);
                //await item.Value.Stream.WriteAsync(payload, 0, payload.Length);
            }

            BytesOut += serialized.Length;*/
        }

        protected override void OnMessage(Message message)
        {
            //Console.WriteLine($"{this} Received {message.Payload.Length} bytes, pushing to process");
            if (message.Channel == $"{URI}:stdin")
            {
                ProcessMessage(message.Payload);
            }
            else if (message.Channel == $"{URI}:upstream")
            {
                var tokens = Encoding.UTF8.GetString(message.Payload).Split(',');
                if (tokens[0] == "checkpoint")
                {
                    // The lambda function does not need to checkpoint; simply relay the stream downstream
                    var notification = CreateMessage(URI + ":downstream", Encoding.UTF8.GetBytes($"checkpoint"));
                    Outbox.Write(notification);
                }
                else
                {
                    Console.WriteLine($"{this} Received invalid message from upstream");
                }
            }
            else if (message.Channel == URI)
            {
                // Use RPC Message format for control messages
                base.OnMessage(message);
            }
            else
            {
                Console.WriteLine($"{this} Unexpected message received on channel {message.Channel}");
            }
        }

        protected override void OnEnd()
        {
            Console.WriteLine($"{this} Finished at {DateTime.Now}, IN: {BytesIn}, OUT: {BytesOut}");
        }

        internal void AddDirectInputPipe(string upstream, string pipeGroup, TcpAgent.ServerSideSocket socket)
        {
            if (!DirectInputPipes.ContainsKey(pipeGroup))
            {
                DirectInputPipes.Add(pipeGroup, new InputPipe());
            }

            var source = DirectInputPipes[pipeGroup].AddSource(upstream, socket);

            Queue<byte[]> queue = new Queue<byte[]>();

            // This can and should be left as asynchronous
            // because it is receiving messages directly from the network
            socket.ListenRaw(payload =>
            {
                ProcessMessage(payload);
            });

            Console.WriteLine($"{this} Added Direct Input {pipeGroup}");
        }

        internal void RemoveDirectInputPipe(string pipeGroup)
        {
            DirectInputPipes[pipeGroup].Stop();
            DirectInputPipes.Remove(pipeGroup);
        }

        internal void AddDirectOutputPipe(string downstream, string pipeGroup, TcpAgent.ClientSideSocket socket)
        {
            if (!DirectOutputPipes.ContainsKey(pipeGroup))
            {
                DirectOutputPipes.Add(pipeGroup, new OutputPipe());
            }

            DirectOutputPipes[pipeGroup].AddSink(downstream, socket);

            Console.WriteLine($"{this} Added Direct Output {pipeGroup}");
        }

        internal void RemoveDirectOutputPipe(string pipeGroup)
        {
            DirectOutputPipes[pipeGroup].Stop();
            DirectOutputPipes.Remove(pipeGroup);
        }

        public Dictionary<string, long> GetDirectOutputPipesStatus()
        {
            var dict = new Dictionary<string, long>();
            foreach (var item in DirectOutputPipes)
            {
                foreach (var sink in item.Value.Sinks)
                {
                    dict.Add(item.Key + ":" + sink.AgentURI, sink.BytesOut);
                }
            }
            return dict;
        }

        [RpcMethod]
        public async Task<object> CloseUpstream(string pipeGroup, string upstream, long bytesOut)
        {
            Console.WriteLine($"{this} Pipe {pipeGroup} - Upstream {upstream} was closed! Current DirectInputs = {DirectInputPipes.Count}, need to receive all pending messages");

            var inputPipe = DirectInputPipes[pipeGroup];
            var task = inputPipe.StopSourceAfterReceiving(upstream, bytesOut).ContinueWith(prev =>
            {
                if (inputPipe.IsEmpty)
                {
                    DirectInputPipes.Remove(pipeGroup);
                }
            });
            await task;

            /*var closeTasks = new List<Task>();
            foreach (var item in DirectInputPipes)
            {
                var task = item.Value.StopSourceAfterReceiving(upstream, bytesOut).ContinueWith(prev =>
                {
                    if (item.Value.IsEmpty)
                    {
                        DirectInputPipes.Remove(item.Key);
                    }
                });
                closeTasks.Add(task);
            }

            await Task.WhenAll(closeTasks);*/

            Console.WriteLine($"{this} Pipe {pipeGroup} - Upstream {upstream} was closed! Current DirectInputs = {DirectInputPipes.Count}");

            if (DirectInputPipes.Count == 0)
            {
                Console.WriteLine($"{this} No more upstream sources!");
                OnExit?.Invoke(this, new EventArgs());
            }

            return URI;
        }
    }
}
