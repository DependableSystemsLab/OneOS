using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Linq;

using OneOS.Common;
using OneOS.Language;

namespace OneOS.Runtime.Driver
{
    public class OneOSScriptAgent : RpcAgent
    {
        private Runtime Runtime;
        public string User { get; private set; }
        protected Dictionary<string, string> Environment;
        private string ScriptPath;
        private string Arguments;

        private string Code;

        private VirtualRuntime VirtualRuntime;
        private EvaluationContext Context;
        private Interpreter Interpreter;
        public event EventHandler OnExit;

        private string UserShellOutbox { get => $"{User}.{Runtime.Domain}/shell:stdout"; }

        public OneOSScriptAgent(Runtime runtime, string uri, string username, Dictionary<string, string> environ, string scriptPath, string args) : base(runtime)
        {
            URI = uri;
            Runtime = runtime;
            User = username;
            ScriptPath = scriptPath;
            Arguments = args;

            VirtualRuntime = new VirtualRuntime(Runtime, this, new RequestDelegate((agentUri, method, methodArgs) => Request(agentUri, method, methodArgs)));
            Environment = environ;
            Context = new EvaluationContext();
            Interpreter = new Interpreter(this, Runtime, User, Context);

            LoadEnvironment();
            LoadBuiltInAPI();
            LoadScript();
        }

        private void LoadScript()
        {
            Code = File.ReadAllText(ScriptPath, Encoding.UTF8);
        }

        protected override void OnBegin()
        {
            Interpreter.Evaluate(Code).ContinueWith(prev =>
            {
                if (prev.Status == System.Threading.Tasks.TaskStatus.RanToCompletion)
                {
                    Console.WriteLine(prev.Result);
                    //Console.WriteLine(prev.Result.ToJson());
                }
                else
                {
                    Console.WriteLine($"Error executing OneOS script {ScriptPath} ({prev.Exception.InnerException.GetType().Name})");
                    Console.WriteLine(prev.Exception.InnerException);
                    PrintToUserShell(prev.Exception.InnerException.Message);
                }

                Console.WriteLine($"{this} Invoking OnExit handler");

                // TODO: Notify Runtime about the exit event.
                // This is important, as any downstream processes will
                // keep their inputs open unless the upstream process closes it
                OnExit?.Invoke(this, new EventArgs());
            });
        }

        protected override void OnEnd()
        {
            // TODO: Notify Runtime about the exit event.
            // This is important, as any downstream processes will
            // keep their inputs open unless the upstream process closes it
            OnExit?.Invoke(this, new EventArgs());
        }

        private void PrintToUserShell(string output)
        {
            var payload = Encoding.UTF8.GetBytes(output);
            Console.WriteLine(output);

            // by default -- set the channel to user shell outbox (i.e., pipe stdout to user shell)
            var message = CreateMessage(UserShellOutbox, payload);
            Outbox.Write(message);
        }

        private void LoadEnvironment()
        {
            Context["ENV"] = Dict.FromDictionary(Environment);
        }

        private void LoadBuiltInAPI()
        {
            Context["print"] = new Function((ctx, args) =>
            {
                var arguments = string.Join("\t", args.Select(obj => obj.Value.ToString()));

                PrintToUserShell(arguments);

                return OneOS.Language.Object.Null;
            });

            // This function returns a Graph Node
            // (to be called inside a graph declaration)
            Context["process"] = new Function((ctx, args) =>
            {
                string binary = (string)args[0].Value;
                string arguments = (string)args[1].Value;
                var tokens = arguments.Split();

                var cwd = Environment["CWD"];
                var abspath = Helpers.ResolvePath(cwd, tokens[0]);
                var resolvedArgs = abspath + " " + string.Join(" ", tokens.Skip(1));

                var graphNode = new Graph.Node(binary, resolvedArgs);

                // check if any options were provided
                if (args.Length > 2)
                {
                    if (args[2].Type == typeof(string))
                    {
                        var options = new Dictionary<string, Language.Object>()
                        {
                            { "inputFormat", args[2] },
                            { "outputFormat", args[2] }
                        };

                        graphNode.Options = new Dict(options);
                    }
                    else if (args[2] is Dict)
                    {
                        graphNode.Options = (Dict)args[2];
                    }
                    else
                    {
                        throw new ArgumentException("'process' expects either a String or Dict as the third argument");
                    }
                }

                Console.WriteLine($"{this} created process node: {graphNode.ToJson()}");

                return graphNode;
            });

            // This function returns a Graph Node
            // (to be called inside a graph declaration)
            var lambda = new Dict(new Dictionary<string, Language.Object>());
            lambda["filter"] = new Function((ctx, args) =>
            {
                SerializableFunction func = (SerializableFunction)args[0];

                var graphNode = new Graph.Node(Graph.Node.LambdaType.Filter, func);

                return graphNode;
            });
            lambda["map"] = new Function((ctx, args) =>
            {
                SerializableFunction func = (SerializableFunction)args[0];

                var graphNode = new Graph.Node(Graph.Node.LambdaType.Map, func);

                return graphNode;
            });
            lambda["reduce"] = new Function((ctx, args) =>
            {
                SerializableFunction func = (SerializableFunction)args[0];

                var graphNode = new Graph.Node(Graph.Node.LambdaType.Reduce, func);

                return graphNode;
            });

            Context["lambda"] = lambda;

            Context["test_spawn"] = new AsyncFunction(async (ctx, args) =>
            {
                var graph = (Graph)args[0];
                Policy policy = null;
                if (args.Length > 1)
                {
                    policy = (Policy)args[1];
                }

                var environ = ((Dict)ctx["ENV"]).Value.ToDictionary(item => item.Key, item => (string)item.Value.Value);

                Console.WriteLine(graph.ToJson().ToString());

                // Send a serialized version of an "inactive" graph
                // receive a mapping of URIs to nodes to "activate" graph
                var result = await Request($"kernels.{Runtime.Domain}/RegistryManager", "TestSpawnGraph", User, environ, graph.ToJson(), policy?.ToJson());

                PrintToUserShell(result.ToString());

                return new Language.Object(result);
            });
        }
    }
}
