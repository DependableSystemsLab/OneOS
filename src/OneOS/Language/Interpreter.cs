using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using System.IO;
using System.Reflection;

using OneOS.Common;
using Newtonsoft.Json.Linq;

namespace OneOS.Language
{
    public class Interpreter : RpcAgent
    {
        // We use an Exception to cut the control-flow and return from a function
        internal class FunctionReturn : Exception
        {
            public Object Result;
            public FunctionReturn(Object result) { Result = result; }
        }

        public Runtime.Runtime Runtime { get; private set; }
        private Runtime.VirtualRuntime VirtualRuntime;
        public EvaluationContext Context { get; private set; }
        public string User { get; private set; }

        private Interpreter() : base(null)
        {

        }

        public Interpreter(Agent parent, Runtime.Runtime runtime, string username, EvaluationContext context) : base(parent)
        {
            URI = parent.URI + "/interpreter";
            Runtime = runtime;
            User = username;
            Context = context;
            VirtualRuntime = new Runtime.VirtualRuntime(Runtime, this, new RequestDelegate((uri, method, args) => Request(uri, method, args)));
        }

        public Interpreter(Agent parent, Runtime.Runtime runtime, string username, IEnumerable<KeyValuePair<string, Object>> dict) : base(parent)
        {
            URI = parent.URI + "/interpreter";
            Runtime = runtime;
            User = username;
            var context = new EvaluationContext();
            foreach (var item in dict)
            {
                context[item.Key] = item.Value;
            }
            Context = context;
            VirtualRuntime = new Runtime.VirtualRuntime(Runtime, this, new RequestDelegate((uri, method, args) => Request(uri, method, args)));
        }

        // Creates a lightweight interpreter that can only interpret lambda functions
        public static Interpreter CreateLightweightInterpreter()
        {
            var interp = new Interpreter()
            {
                Context = new EvaluationContext(null)
            };
            return interp;
        }

        public Interpreter(Agent parent, Runtime.Runtime runtime, string username, Dictionary<string, string> environment) : base(parent)
        {
            URI = parent.URI + "/interpreter";
            Runtime = runtime;
            User = username;
            VirtualRuntime = new Runtime.VirtualRuntime(Runtime, this, new RequestDelegate((uri, method, args) => Request(uri, method, args)));

            // TODO: Define these built-in API at the appropriate place
            var context = new EvaluationContext();
            context["ENV"] = Dict.FromDictionary(environment);
            /*context["$USER"] = new Object<string>(username);
            context["$CWD"] = new Object<string>("/home/" + username);*/
            context["whoami"] = new Function((ctx, args) => ((Dict)context["ENV"])["USER"]);
            context["pwd"] = new Function((ctx, args) => ((Dict)context["ENV"])["CWD"]);
            context["echo"] = new Function((ctx, args) => new Object<string>(string.Join(" ", args.Select(item => item.ToString()))));

            // User related
            context["useradd"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the username");
                }

                var result = await Request(Runtime.SessionManagerUri, "CreateUser", (string)args[0].Value);
                return new Object(result);
            });
            context["passwd"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 2)
                {
                    return new Object("You must provide the username and password");
                }

                var result = await Request(Runtime.SessionManagerUri, "UpdatePassword", (string)args[0].Value, (string)args[1].Value);
                return new Object(result);
            });

            // FileSystem related
            context["cd"] = new Function((ctx, args) =>
            {
                if (args.Length == 0)
                {
                    ((Dict)context["ENV"])["CWD"].Update("/home/" + username);
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);
                    var isDirectory = runtime.Registry.IsDirectory(abspath);

                    if (isDirectory) ((Dict)context["ENV"])["CWD"].Update(abspath);
                    else return new Object<string>($"{(string)args[0].Value} is not a directory");
                }

                return ((Dict)context["ENV"])["CWD"];
            });
            context["ls"] = new Function((ctx, args) =>
            {
                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;

                if (args.Length == 0)
                {
                    return new Object<string>(runtime.Registry.PrintDirectory(cwd));
                }
                else
                {
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);
                    return new Object<string>(runtime.Registry.PrintDirectory(abspath));
                }
            });
            context["mkdir"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the directory name");
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);

                    try
                    {
                        var directoryPath = await Request(Runtime.RegistryManagerUri, "CreateDirectory", abspath);
                        return new Object(directoryPath);
                    }
                    catch (Exception ex)
                    {
                        return new Object(ex.Message);
                    }
                }
            });
            context["touch"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the file name");
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);

                    try
                    {
                        var filePath = await VirtualRuntime.TouchFile(abspath);
                        return new Object(filePath);
                    }
                    catch (Exception ex)
                    {
                        return new Object(ex.Message);
                    }
                }
            });
            //TODO: cp, mv
            context["cat"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the file name");
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);

                    var content = await VirtualRuntime.ReadTextFile(abspath);
                    return new Object(content);
                }
            });
            context["rm"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the file name");
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);

                    var content = await VirtualRuntime.RemoveFile(abspath);
                    return new Object(content);
                }
            });
            context["checksum"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the file name");
                }
                else
                {
                    var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                    var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);
                    var algo = args.Length > 1 ? (string)args[1].Value : "SHA256";

                    var locations = runtime.Registry.ListFileLocations(abspath, Runtime.URI);
                    var copyHolder = locations.Keys.ToList().PickRandom();
                    var copyPath = locations[copyHolder];

                    Console.WriteLine($"Reading {copyPath} from {copyHolder}");
                    var content = await Request(copyHolder + "/storage", "Checksum", copyPath, algo);
                    return new Object(content);
                }
            });

            // Process related
            context["ps"] = new Function((ctx, args) => new Object<string>(runtime.Registry.PrintAllAgents()));

            Func<string, string, Object[], Task<Object>> spawn = async (language, binary, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the file name");
                }

                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);
                var arguments = string.Join(" ", args.Skip(1).Select(obj => obj.Value.ToString()));

                /*var environ = new Dictionary<string, string>()
                {
                    { "$CWD", (string)((Dict)context["ENV"])["$CWD"].Value },
                    { "$USER", (string)((Dict)context["ENV"])["$USER"].Value }
                };*/

                var environ = ((Dict)context["ENV"]).Value.ToDictionary(item => item.Key, item => (string)item.Value.Value);

                var agentUri = await Request(Runtime.RegistryManagerUri, "Spawn", username, language, environ, binary, abspath + " " + arguments);
                return new Object(agentUri);
            };
            context["node"] = new AsyncFunction((ctx, args) => spawn("JavaScript", "node", args));
            context["osh"] = new AsyncFunction((ctx, args) => spawn("OneOS", "osh", args));
            context["python"] = new AsyncFunction((ctx, args) => spawn("Python", "python", args));
            context["java"] = new AsyncFunction((ctx, args) => spawn("Java", "java", args));
            context["ruby"] = new AsyncFunction((ctx, args) => spawn("Ruby", "ruby", args));
            context["dotnet"] = new AsyncFunction((ctx, args) => spawn("CSharp", "dotnet", args));
            context["docker"] = new AsyncFunction((ctx, args) => spawn("Docker", "docker", args));

            /*context["spawn"] = new AsyncFunction((ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object<Task<Object>>(Task.FromResult(new Object("You must provide the file name")));
                }

                var cwd = (string)context["$CWD"].Value;
                var abspath = Helpers.ResolvePath(cwd, (string)args[0].Value);
                var arguments = string.Join(" ", args.Skip(1).Select(obj => obj.Value.ToString()));

                var task = Task.Run(async () =>
                {
                    var agentUri = await Request($"kernels.{runtime.Domain}/RegistryManager", "Spawn", username, "JavaScript", "node", abspath + " " + arguments);
                    return new Object(agentUri);
                });

                return new Object<Task<Object>>(task);
            });
            context["spawnAs"] = new AsyncFunction((ctx, args) =>
            {
                if (args.Length < 2)
                {
                    return new Object<Task<Object>>(Task.FromResult(new Object("You must provide the file name and the URI to assign")));
                }

                var cwd = (string)context["$CWD"].Value;
                var abspath = Helpers.ResolvePath(cwd, (string)args[1].Value);
                var arguments = string.Join(" ", args.Skip(2).Select(obj => obj.Value.ToString()));

                var uriToAssign = (string)args[0].Value;

                var task = Task.Run(async () =>
                {
                    var agentUri = await Request($"kernels.{runtime.Domain}/RegistryManager", "SpawnAs", uriToAssign, username, "JavaScript", "node", abspath + " " + arguments);
                    return new Object(agentUri);
                });

                return new Object<Task<Object>>(task);
            });*/
            context["kill"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the agent URI");
                }

                string agentUri;
                if (!Runtime.Registry.TryGetURIFromNRI((string)args[0].Value, out agentUri) && agentUri == null)
                {
                    return new Object("Could not get the agent with the given PID -- try using URI instead of PID");
                }

                var result = await Request(Runtime.RegistryManagerUri, "Kill", username, agentUri);
                return new Object(agentUri);
            });
            context["spawnPipeline"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 2)
                {
                    return new Object("There should be at least 2 agents in a pipeline");
                }

                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                var resolvedCommands = args.Select(arg => {
                    var expr = (string)arg.Value;
                    var tokens = expr.Split(' ');
                    var abspath = Helpers.ResolvePath(cwd, tokens[0]);
                    return abspath + " " + string.Join(" ", tokens.Skip(1));
                }).ToArray();

                /*var environ = new Dictionary<string, string>()
                {
                    { "$CWD", (string)context["$CWD"].Value },
                    { "$USER", (string)context["$USER"].Value }
                };*/
                var environ = ((Dict)context["ENV"]).Value.ToDictionary(item => item.Key, item => (string)item.Value.Value);

                var pipes = await Request(Runtime.RegistryManagerUri, "SpawnPipeline", username, environ, resolvedCommands);
                return new Object(pipes);
            });
            context["pause"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the agent URI");
                }

                string agentUri;
                if (!Runtime.Registry.TryGetURIFromNRI((string)args[0].Value, out agentUri) && agentUri == null)
                {
                    return new Object("Could not get the agent with the given PID -- try using URI instead of PID");
                }

                var result = await Request($"{agentUri}", "Pause");
                return new Object(agentUri);
            });
            context["resume"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the agent URI");
                }

                string agentUri;
                if (!Runtime.Registry.TryGetURIFromNRI((string)args[0].Value, out agentUri) && agentUri == null)
                {
                    return new Object("Could not get the agent with the given PID -- try using URI instead of PID");
                }

                var result = await Request($"{agentUri}", "Resume");
                return new Object(agentUri);
            });
            context["checkpoint"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length == 0)
                {
                    return new Object("You must provide the agent URI");
                }

                string agentUri;
                if (!Runtime.Registry.TryGetURIFromNRI((string)args[0].Value, out agentUri) && agentUri == null)
                {
                    return new Object("Could not get the agent with the given PID -- try using URI instead of PID");
                }

                var result = await Request($"{agentUri}", "Checkpoint");
                return new Object(agentUri);
            });

            context["ss"] = new Function((ctx, args) => new Object<string>(runtime.Registry.PrintAllSockets()));
            context["ios"] = new Function((ctx, args) => new Object<string>(runtime.Registry.PrintAllIO()));

            context["wget"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 1)
                {
                    return new Object("You must provide a URL to get");
                }

                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;
                var webURL = (string)args[0].Value;
                var savePath = args.Length > 1 ? (string)args[1].Value : null;

                var result = await RequestRegistryManager("DownloadFile", cwd, webURL, savePath);

                return new Object(result);
            });

            context["tar"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 1)
                {
                    return new Object("You must provide path");
                }

                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;

                throw new NotImplementedException($"'tar' command is not available");
            });

            context["bash"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 1)
                {
                    return new Object("You must provide path");
                }

                var cwd = (string)((Dict)context["ENV"])["CWD"].Value;

                throw new NotImplementedException($"'bash' command is not available");
            });

            // npm in OneOS is a "privileged" command
            // that does not run in userspace, but rather at the middleware level.
            context["npm"] = new AsyncFunction(async (ctx, args) =>
            {
                var arguments = string.Join(" ", args.Select(obj => obj.Value.ToString()));
                var result = await Request(Runtime.RegistryManagerUri, "ExecuteNPMCommand", username, arguments);
                return new Object(result);
            });

            /*context["lget"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 2)
                {
                    return new Object("You must provide the path of the file local to the device the terminal is running on");
                }
            });*/

            // For OneOS Debugging
            context["pipe"] = new AsyncFunction(async (ctx, args) =>
            {
                if (args.Length < 2)
                {
                    return new Object("You must provide the source and sink agents");
                }

                var source = (string)args[0].Value;
                var sink = (string)args[1].Value;

                var pipeId = await Request(Runtime.RegistryManagerUri, "CreatePipe", source, sink);
                return new Object(pipeId);
            });

            // New OneOS Commands
            context["rs"] = new Function((ctx, args) => {
                var active = runtime.ActiveRuntimes;
                var detail = new List<string>();
                foreach (var key in Runtime.AllRuntimes)
                {
                    detail.Add($"{key}\t{(active.Contains(key) ? "Alive": "Dead")}");
                }

                return new Array<string>(detail);
            });

            context["system-stat"] = new AsyncFunction(async (ctx, args) =>
            {
                var status = await Request(Runtime.RegistryManagerUri, "PrintNetworkModel");
                return new Object(status);
            });

            Context = context;
        }

        private async Task<object> RequestRegistryManager(string method, params object[] args)
        {
            return await Request($"kernels.{Runtime.Domain}/RegistryManager", method, args);
        }

        private async Task<object> RequestSessionManager(string method, params object[] args)
        {
            return await Request($"kernels.{Runtime.Domain}/SessionManager", method, args);
        }

        public Task<Object> Evaluate(AstNode node, EvaluationContext context)
        {
            //Console.WriteLine($"\n\nEvaluating {node.ToCode()}, context = {context.ToString()}");

            try
            {
                switch (node.Type)
                {
                    case AstNode.NodeType.LiteralNull:
                        return Task.FromResult<Object>(Object.Null);
                    case AstNode.NodeType.LiteralBoolean:
                        return Task.FromResult<Object>(((AstNode.LiteralBoolean)node).Value ? Object.True : Object.False);
                    case AstNode.NodeType.LiteralInteger:
                        return Task.FromResult<Object>(new Object<int>(((AstNode.LiteralInteger)node).Value));
                    case AstNode.NodeType.LiteralDecimal:
                        return Task.FromResult<Object>(new Object<decimal>(((AstNode.LiteralDecimal)node).Value));
                    case AstNode.NodeType.LiteralString:
                        return Task.FromResult<Object>(new Object<string>(((AstNode.LiteralString)node).Value));
                    case AstNode.NodeType.Identifier:
                        return EvaluateIdentifier((AstNode.Identifier)node, context);
                    case AstNode.NodeType.ArrayExpression:
                        return EvaluateArrayExpression((AstNode.ArrayExpression)node, context);
                    case AstNode.NodeType.ObjectExpression:
                        return EvaluateObjectExpression((AstNode.ObjectExpression)node, context);
                    case AstNode.NodeType.MemberExpression:
                        return EvaluateMemberExpression((AstNode.MemberExpression)node, context);
                    case AstNode.NodeType.CallExpression:
                        return EvaluateCallExpression((AstNode.CallExpression)node, context);
                    case AstNode.NodeType.BinaryExpression:
                        return EvaluateBinaryExpression((AstNode.BinaryExpression)node, context);
                    case AstNode.NodeType.AssignmentExpression:
                        return EvaluateAssignmentExpression((AstNode.AssignmentExpression)node, context);
                    case AstNode.NodeType.VariableDeclaration:
                        return EvaluateVariableDeclaration((AstNode.VariableDeclaration)node, context);
                    case AstNode.NodeType.FunctionExpression:
                        return EvaluateFunctionExpression((AstNode.FunctionExpression)node, context);
                    case AstNode.NodeType.ReturnStatement:
                        return EvaluateReturnStatement((AstNode.ReturnStatement)node, context);
                    case AstNode.NodeType.BlockStatement:
                        return EvaluateBlockStatement((AstNode.BlockStatement)node, context);
                    case AstNode.NodeType.ExpressionStatement:
                        return EvaluateExpressionStatement((AstNode.ExpressionStatement)node, context);
                    case AstNode.NodeType.IfStatement:
                        return EvaluateIfStatement((AstNode.IfStatement)node, context);
                    case AstNode.NodeType.PublishExpression:
                        return EvaluatePublishExpression((AstNode.PublishExpression)node, context);
                    case AstNode.NodeType.AgentActionDeclaration:
                        return EvaluateAgentActionDeclaration((AstNode.AgentActionDeclaration)node, context);
                    case AstNode.NodeType.AgentDeclaration:
                        return EvaluateAgentDeclaration((AstNode.AgentDeclaration)node, context);
                    case AstNode.NodeType.GraphDeclaration:
                        return EvaluateGraphDeclaration((AstNode.GraphDeclaration)node, context);
                    case AstNode.NodeType.NodeDeclaration:
                        return EvaluateNodeDeclaration((AstNode.NodeDeclaration)node, context);
                    case AstNode.NodeType.EdgeDeclaration:
                        return EvaluateEdgeDeclaration((AstNode.EdgeDeclaration)node, context);
                    case AstNode.NodeType.SpawnStatement:
                        return EvaluateSpawnStatement((AstNode.SpawnStatement)node, context);
                    case AstNode.NodeType.PolicyDeclaration:
                        return EvaluatePolicyDeclaration((AstNode.PolicyDeclaration)node, context);
                    case AstNode.NodeType.Program:
                        return EvaluateProgram((AstNode.Program)node, context);
                }
            }
            catch (FunctionReturn ex)
            {
                return Task.FromResult(ex.Result);
            }
            catch (AggregateException ex)
            {
                if (ex.InnerException is FunctionReturn)
                {
                    return Task.FromResult(((FunctionReturn)ex.InnerException).Result);
                }
                else throw ex.InnerException;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error while evaluating {node.ToCode()}\n{ex}");
                throw ex;
            }

            Console.WriteLine($"Don't know how to evaluate {node.Type}");
            Console.WriteLine($"{node.ToCode(0)}");

            return Task.FromResult<Object>(Object.Null);
        }

        public Task<Object> Evaluate(string code)
        {
            return Evaluate(AstNode.Parse(code), Context);
        }

        public async Task<Object> Evaluate(string code, bool isHack)
        {
            // TODO: Implement new DSL interpreter

            // For now, simply hack the commands in
            var lines = code.Split('\n');
            foreach (var line in lines)
            {
                var expressions = line.Split('|').Select(expr => expr.Trim()).ToList();

                if (expressions.Count == 1)
                {
                    var expr = expressions[0];
                    var tokens = expr.Split(' ');

                    if (Context.ContainsKey(tokens[0]))
                    {
                        try
                        {
                            Console.WriteLine($"{this} Evaluating {line}");

                            var obj = Context[tokens[0]];
                            if (obj is Function)
                            {
                                var func = (Function)obj;
                                var result = func.Invoke(Context, tokens.Skip(1).Select(arg => new Object<string>(arg)).ToArray());
                                //return Task.FromResult(result);
                                return result;
                            }
                            /*else if (obj is AsyncFunction)
                            {
                                var func = (AsyncFunction)obj;
                                //var result = func.Invoke(Context, tokens.Skip(1).Select(arg => new Object<string>(arg)).ToArray());
                                var result = await func.Invoke(Context, tokens.Skip(1).Select(arg => new Object<string>(arg)).ToArray());
                                
                                return result;
                            }*/
                            else if (obj is AsyncFunction)
                            {
                                var func = (AsyncFunction)obj;
                                //var result = func.Invoke(Context, tokens.Skip(1).Select(arg => new Object<string>(arg)).ToArray());
                                var result = await func.Invoke(Context, tokens.Skip(1).Select(arg => new Object<string>(arg)).ToArray());

                                return result;
                            }
                            else
                            {
                                Console.WriteLine($"({obj.Type})\t{obj.Value}");
                                //return Task.FromResult(obj);
                                return obj;
                            }
                        }
                        catch (AggregateException ex)
                        {
                            Console.WriteLine($"{this} Error while Evaluating {line} {ex}");
                            //return Task.FromResult<Object>(new Object<string>($"{ex.InnerException.Message}"));
                            return new Object<string>($"{ex.InnerException.Message}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"{this} Error while Evaluating {line} {ex}");
                            //return Task.FromResult<Object>(new Object<string>($"{ex.Message}"));
                            return new Object<string>($"{ex.Message}");
                        }
                    }
                    else
                    {
                        //return Task.FromResult<Object>(new Object<string>($"Unknown command {tokens[0]}"));
                        return new Object<string>($"Unknown command {tokens[0]}");
                    }
                }
                else
                {
                    // call spawnPipeline
                    // TODO: this is a hack to provide backward compatibility with bash -- we should actually use a proper interpreter
                    var spawnPipeline = (AsyncFunction)Context["spawnPipeline"];
                    //var result = spawnPipeline.Invoke(Context, expressions.Select(expr => new Object<string>(expr)).ToArray());
                    var result = await spawnPipeline.Invoke(Context, expressions.Select(expr => new Object<string>(expr)).ToArray());
                    return result;
                }
            }

            //return Task.FromResult<Object>(Object.Null);
            return Object.Null;
        }

        private async Task<Object> EvaluateProgram(AstNode.Program program, EvaluationContext context)
        {
            Object result = Object.Null;
            foreach (var item in program.Body)
            {
                result = await Evaluate(item, context);
            }
            return result;
        }

        private Task<Object> EvaluateIdentifier(AstNode.Identifier identifier, EvaluationContext context)
        {
            Object result;
            var found = context.TryGet(identifier.Name, out result);
            if (found) return Task.FromResult<Object>(result);
            else throw new EvaluationError($"{identifier.Name} does not exist in the current context");
        }

        private async Task<Object> EvaluateArrayExpression(AstNode.ArrayExpression expr, EvaluationContext context)
        {
            var list = new List<Object>();
            foreach (var item in expr.Elements)
            {
                var elem = await Evaluate(item, context);
                list.Add(elem);
            }

            return new Array(list);
        }

        private async Task<Object> EvaluateObjectExpression(AstNode.ObjectExpression expr, EvaluationContext context)
        {
            var dict = new Dictionary<string, Object>();
            foreach (var item in expr.KeyValuePairs)
            {
                var prop = await Evaluate(item.Item2, context);
                dict.Add(item.Item1, prop);
            }

            return new Dict(dict);
        }

        private async Task<Object> EvaluateBinaryExpression(AstNode.BinaryExpression expr, EvaluationContext context)
        {
            var left = await Evaluate(expr.Left, context);
            var right = await Evaluate(expr.Right, context);

            switch (expr.Operator)
            {
                case "||": return left || right;
                case "&&": return left && right;
                case "<": return left < right;
                case ">": return left > right;
                case "<=": return left <= right;
                case ">=": return left >= right;
                case "==": return left.Value.Equals(right.Value) ? Object.True : Object.False;
                case "!=": return left.Value.Equals(right.Value) ? Object.False : Object.True;
                case "+": return left + right;
                case "-": return left - right;
                case "*": return left * right;
                case "/": return left / right;
            }
            
            throw new EvaluationError($"Cannot evaluate operator {expr.Operator}");
        }

        private async Task<Object> EvaluateAssignmentExpression(AstNode.AssignmentExpression expr, EvaluationContext context)
        {
            if (expr.Left is AstNode.Identifier)
            {
                var identifier = (AstNode.Identifier)expr.Left;
                var found = context.TryGetContainer(identifier.Name);
                if (found != null)
                {
                    var right = await Evaluate(expr.Right, context);

                    if (expr.Operator == "=")
                    {
                        found[identifier.Name] = right;
                    }
                    else if (expr.Operator == "+=")
                    {
                        found[identifier.Name] += right;
                    }
                    else if (expr.Operator == "-=")
                    {
                        found[identifier.Name] -= right;
                    }
                    else if (expr.Operator == "*=")
                    {
                        found[identifier.Name] *= right;
                    }
                    else if (expr.Operator == "/=")
                    {
                        found[identifier.Name] /= right;
                    }

                    return found[identifier.Name];
                }
                else throw new EvaluationError($"{identifier.Name} does not exist in the current context");
            }
            else throw new EvaluationError($"Cannot assign value to {expr.Left.ToCode(0)}");
        }

        private async Task<Object> EvaluateVariableDeclaration(AstNode.VariableDeclaration expr, EvaluationContext context)
        {
            foreach (var item in expr.Declarations)
            {
                if (item.Assignee is AstNode.Identifier)
                {
                    var id = (AstNode.Identifier)item.Assignee;
                    if (context.ContainsKey(id.Name)) throw new EvaluationError($"Name {id.Name} already declared in scope");

                    if (item.InitialValue != null)
                    {
                        context[id.Name] = await Evaluate(item.InitialValue, context);
                    }
                    else
                    {
                        context[id.Name] = Object.Null;
                    }
                }
                else
                {
                    throw new EvaluationError($"Cannot declare variable using {item.Type}");
                }
            }

            return Object.Null;
        }

        private async Task<Object> EvaluateMemberExpression(AstNode.MemberExpression expr, EvaluationContext context)
        {
            Object obj = await Evaluate(expr.Object, context);
            Object prop;
            if (expr.IsComputed)
            {
                prop = await Evaluate(expr.Property, context);
            }
            else
            {
                var id = (AstNode.Identifier)expr.Property;
                prop = new Object<string>(id.Name);
            }

            if (obj is Dict)
            {
                var dict = (Dict)obj;
                
                if (!(prop is Object<string>))
                {
                    throw new EvaluationError($"Cannot evaluate member of Dict when property is not a string");
                }
                var propName = (string)prop.Value;
                return dict.Value[propName];
            }
            else if (obj is Array)
            {
                var arr = (Array)obj;

                if (!(prop is Object<int>))
                {
                    throw new EvaluationError($"Cannot evaluate member of Array when property is not an int");
                }
                var propVal = (int)prop.Value;
                return arr.Value[propVal];
            }
            else if (obj is ByteArray)
            {
                var buffer = (ByteArray)obj;

                if (!(prop is Object<string>))
                {
                    throw new EvaluationError($"ByteArray does not have any property named '{prop.Value}'");
                }
                var propName = (string)prop.Value;
                return buffer[propName];
            }
            else
            {
                throw new EvaluationError($"Cannot evaluate member of type {obj.Type}");
            }
        }

        private async Task<Object> EvaluateCallExpression(AstNode.CallExpression expr, EvaluationContext context)
        {
            Object callee = await Evaluate(expr.Callee, context);
            Object[] args = new Object[expr.Arguments.Count];

            for (var i = 0; i < expr.Arguments.Count; i++)
            {
                var arg = await Evaluate(expr.Arguments[i], context);
                args[i] = arg;
            }

            if (callee is Function)
            {
                var func = (Function)callee;
                try
                {
                    return func.Invoke(context, args);
                }
                catch (FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is FunctionReturn)
                    {
                        return ((FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            }
            else if (callee is SerializableFunction)
            {
                var func = (SerializableFunction)callee;
                func.Activate(this);

                try
                {
                    return func.Invoke(context, args);
                }
                catch (FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is FunctionReturn)
                    {
                        return ((FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            }
            /*else if (callee is AsyncFunction)
            {
                var func = (AsyncFunction)callee;
                return await func.Invoke(context, args);
            }*/
            else if (callee is AsyncFunction)
            {
                var func = (AsyncFunction)callee;
                try
                {
                    return await func.Invoke(context, args);
                }
                catch (FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is FunctionReturn)
                    {
                        return ((FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            }
            else if (callee is AgentClass)
            {
                var agentClass = (AgentClass)callee;

                var agent = await agentClass.Instantiate(this, this, args);
                //agent.Start();    // No need to start as it will automatically start as a child of this interpreter

                var handle = new UserSpaceAgentHandle(agent);

                return handle;
            }
            else if (callee.Value is GraphDefinition)
            {
                var graphDefinition = (GraphDefinition)callee.Value;

                //Console.WriteLine($"Spawning {graphDefinition.Name}");

                var graph = new Graph(graphDefinition.Context.Spawn(), graphDefinition.Name);
                await graphDefinition.Initializer.Invoke(graph.Context, args);

                foreach (var item in graphDefinition.NodeInitializers)
                {
                    var obj = await item.Value.Invoke(graph.Context);
                    var node = (Graph.Node)obj;
                    graph.Context[item.Key] = obj;
                    graph.Nodes[item.Key] = node;
                }

                foreach (var item in graphDefinition.EdgeInitializers)
                {
                    var obj = await item.Value.Invoke(graph.Context);
                    var edge = (Graph.Edge)obj;
                    graph.Context[item.Key] = obj;
                    graph.Edges[item.Key] = edge;
                }

                return graph;
            }
            else if (callee.Value is PolicyDefinition)
            {
                var policyDef = (PolicyDefinition)callee.Value;

                var policy = new Policy(policyDef.Context.Spawn(), policyDef.Name, policyDef.GraphId);
                await policyDef.Initializer.Invoke(policy.Context.Spawn(), args);

                foreach (var item in policyDef.DirectiveInitializers)
                {
                    var dirObj = await item.Invoke(policy.Context);
                    var directive = (Policy.Directive)dirObj.Value;
                    policy.Directives.Add(directive);
                }

                return policy;
            }
            else
            {
                throw new EvaluationError($"Cannot call an object of type {callee.Type}");
            }
        }

        private async Task<Object> EvaluateFunctionExpression(AstNode.FunctionExpression expr, EvaluationContext context)
        {
            return new SerializableFunction(context, expr);

            /*return new Function((callingContext, args) =>
            {
                var scope = context.Spawn();
                
                for (var i = 0; i < expr.Parameters.Count; i ++)
                {
                    var param = expr.Parameters[i];
                    var id = (AstNode.Identifier)param.Assignee;
                    scope[id.Name] = i < args.Length ? args[i] : Object.Null;
                }

                try
                {
                    return Evaluate(expr.Body, scope).Result;
                }
                catch (FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is FunctionReturn)
                    {
                        return ((FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            });*/
        }

        private async Task<Object> EvaluateReturnStatement(AstNode.ReturnStatement expr, EvaluationContext context)
        {
            var result = await Evaluate(expr.Argument, context);
            throw new FunctionReturn(result);
        }

        private async Task<Object> EvaluateBlockStatement(AstNode.BlockStatement expr, EvaluationContext context)
        {
            Object lastResult = null;
            foreach (var node in expr.Body)
            {
                lastResult = await Evaluate(node, context);
            }
            return Object.Null;
        }

        private async Task<Object> EvaluateExpressionStatement(AstNode.ExpressionStatement expr, EvaluationContext context)
        {
            return await Evaluate(expr.Expression, context);
        }

        private async Task<Object> EvaluateIfStatement(AstNode.IfStatement expr, EvaluationContext context)
        {
            var predicate = await Evaluate(expr.Predicate, context);

            if (predicate == Object.True || (predicate.Type == typeof(bool) && (bool)predicate.Value))
            {
                return await Evaluate(expr.Consequent, context);
            }
            else
            {
                if (expr.Alternate != null)
                {
                    return await Evaluate(expr.Alternate, context);
                }
                else
                {
                    return Object.Null;
                }
                
            }
        }

        private async Task<Object> EvaluatePublishExpression(AstNode.PublishExpression expr, EvaluationContext context)
        {
            if (expr.Channel.Channel is AstNode.Identifier)
            {
                var channelId = (AstNode.Identifier)expr.Channel.Channel;
                if (channelId.Name == "out")
                {
                    var agent = (UserSpaceAgent)context.Owner;

                    var output = await Evaluate(expr.Message, context);

                    var payload = new ObjectMessage<JToken>(output.ToJson());

                    //var message = agent.CreateMessage(agent.URI + ":stdout", payload.Serialize());
                    var message = agent.CreateMessage(agent.UserShellOutbox, payload.Serialize());

                    agent.Outbox.Write(message);

                    Console.WriteLine($"{agent.UserShellOutbox} <- {payload.Payload.ToString()}");

                    return Object.True;
                }
                else if (channelId.Name == "in")
                {
                    throw new EvaluationError($"Cannot publish to the agent's own standard input channel");
                }
                else
                {
                    var channel = await Evaluate(channelId, context);
                    throw new EvaluationError($"NotImplemented -- Cannot publish to {channel}");
                }
            }
            else
            {
                throw new EvaluationError($"Cannot publish to a channel identified by {expr.Channel.Channel.Type}");
            }
        }

        private async Task<Object> EvaluateAgentActionDeclaration(AstNode.AgentActionDeclaration expr, EvaluationContext context)
        {
            return new AsyncFunction(async (callingContext, args) =>
            {
                var scope = context.Spawn(context.Owner);

                for (var i = 0; i < expr.Parameters.Count; i++)
                {
                    var param = expr.Parameters[i];
                    var id = (AstNode.Identifier)param.Assignee;
                    scope[id.Name] = i < args.Length ? args[i] : Object.Null;
                }

                try
                {
                    foreach (var line in expr.Body)
                    {
                        await Evaluate(line, scope);
                    }

                    return Object.Null;
                }
                catch (FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is FunctionReturn)
                    {
                        return ((FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            });
        }

        private async Task<Object> EvaluateAgentDeclaration(AstNode.AgentDeclaration expr, EvaluationContext context)
        {
            var agentClass = new AgentClass(context, expr);
            context[expr.Name.Name] = agentClass;
            return agentClass;
        }

        private async Task<Object> EvaluateGraphDeclaration(AstNode.GraphDeclaration expr, EvaluationContext context)
        {
            //Console.WriteLine(expr.ToCode());

            var graphDefinition = new GraphDefinition(context, expr.Id.Name);
            graphDefinition.Initializer = new AsyncFunction(async (callingContext, args) =>
            {
                for (var i = 0; i < expr.Parameters.Count; i++)
                {
                    var id = (AstNode.Identifier)expr.Parameters[i].Assignee;

                    // assing default value if args[i] is null
                    if (args[i] == Object.Null)
                    {
                        if (expr.Parameters[i].InitialValue != null)
                        {
                            callingContext[id.Name] = await Evaluate(expr.Parameters[i].InitialValue, context);
                        }
                        else
                        {
                            callingContext[id.Name] = Object.Null;
                        }
                    }
                    else
                    {
                        callingContext[id.Name] = args[i];
                    }
                }

                foreach (var item in expr.Initialize)
                {
                    await Evaluate(item, callingContext);
                }
                return Object.Null;
            });

            foreach (var item in expr.Nodes)
            {
                graphDefinition.NodeInitializers.Add(item.Id.Name, new AsyncFunction((callingContext, args) => Evaluate(item.Initializer, callingContext)));
            }

            foreach (var item in expr.Edges)
            {
                graphDefinition.EdgeInitializers.Add(item.Id.Name, new AsyncFunction(async (callingContext, args) =>
                {
                    var source = await Evaluate(item.Source, callingContext);
                    var sink = await Evaluate(item.Sink, callingContext);
                    Graph.Edge.EdgeType type;
                    if (item.Operator == "->")
                    {
                        type = Graph.Edge.EdgeType.Basic;
                    }
                    else if (item.Operator == "-/>")
                    {
                        type = Graph.Edge.EdgeType.Split;
                    }
                    else if (item.Operator == "-*>")
                    {
                        type = Graph.Edge.EdgeType.Merge;
                    }
                    else
                    {
                        throw new EvaluationError($"Invalid Edge type {item.Operator}");
                    }

                    var edge = new Graph.Edge((Graph.Node)source, (Graph.Node)sink, type);

                    return edge;
                }));
            }

            context[expr.Id.Name] = new Object<GraphDefinition>(graphDefinition);

            return context[expr.Id.Name];
        }

        private async Task<Object> EvaluateNodeDeclaration(AstNode.NodeDeclaration expr, EvaluationContext context)
        {
            return null;
        }

        private async Task<Object> EvaluateEdgeDeclaration(AstNode.EdgeDeclaration expr, EvaluationContext context)
        {
            return null;
        }

        private async Task<Object> EvaluateSpawnStatement(AstNode.SpawnStatement expr, EvaluationContext context)
        {
            if (expr.Initializer is AstNode.CallExpression)
            {
                var call = (AstNode.CallExpression)expr.Initializer;
                var callResult = await EvaluateCallExpression(call, context);
                if (callResult is Graph)
                {
                    var graph = (Graph)callResult;

                    Policy policy = null;

                    // check if a policy is provided
                    if (expr.Policy != null)
                    {
                        var policyResult = await EvaluateCallExpression(expr.Policy, context);
                        policy = (Policy)policyResult;

                        if (policy.GraphClass != graph.ClassName)
                        {
                            throw new EvaluationError($"Cannot spawn Graph {graph.ClassName} with Policy {policy.ClassName}, which is for Graph {policy.GraphClass}");
                        }
                    }

                    // Console.WriteLine($"{string.Join(", ", graph.GetSpawnOrder())}");

                    var environ = ((Dict)context["ENV"]).Value.ToDictionary(item => item.Key, item => (string)item.Value.Value);

                    Console.WriteLine(graph.ToJson().ToString());

                    // Send a serialized version of an "inactive" graph
                    // receive a mapping of URIs to nodes to "activate" graph
                    var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.ToJson(), policy?.ToJson());
                    /*if (policy != null)
                    {
                        var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.Serialize(), policy?.Serialize());
                    }
                    else
                    {
                        var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.Serialize());
                    }*/

                    return graph;
                }
                else if (callResult is UserSpaceAgentHandle)
                {
                    return callResult;
                }
                else
                {
                    throw new EvaluationError($"Cannot spawn an object of type '{callResult.Type}'");
                }

                /*var callee = await Evaluate(call.Callee, context);
                if (callee.Value is GraphDefinition)
                {
                    Object[] args = new Object[call.Arguments.Count];

                    for (var i = 0; i < call.Arguments.Count; i++)
                    {
                        var arg = await Evaluate(call.Arguments[i], context);
                        args[i] = arg;
                    }

                    var graphDefinition = (GraphDefinition)callee.Value;

                    //Console.WriteLine($"Spawning {graphDefinition.Name}");

                    var graph = new Graph(graphDefinition.Context.Spawn());
                    await graphDefinition.Initializer.Invoke(graph.Context, args);

                    foreach (var item in graphDefinition.NodeInitializers)
                    {
                        var obj = await item.Value.Invoke(graph.Context);
                        var node = (Graph.Node)obj;
                        graph.Context[item.Key] = obj;
                        graph.Nodes[item.Key] = node;
                    }

                    foreach (var item in graphDefinition.EdgeInitializers)
                    {
                        var obj = await item.Value.Invoke(graph.Context);
                        var edge = (Graph.Edge)obj;
                        graph.Context[item.Key] = obj;
                        graph.Edges[item.Key] = edge;
                    }

                    Policy policy = null;

                    // check if a policy is provided
                    if (expr.Policy != null)
                    {
                        var obj = await Evaluate(expr.Policy.Callee, context);
                        var policyDef = (PolicyDefinition)obj.Value;

                        if (policyDef.GraphId != graphDefinition.Name)
                        {
                            throw new EvaluationError($"Cannot spawn Graph {graphDefinition.Name} with Policy {policyDef.Name}, which is for Graph {policyDef.GraphId}");
                        }

                        policy = new Policy(policyDef.Context.Spawn());
                        await policyDef.Initializer.Invoke(policy.Context.Spawn());  // TODO: Add policy arguments

                        foreach (var item in policyDef.DirectiveInitializers)
                        {
                            var dirObj = await item.Invoke(policy.Context);
                            var directive = (Policy.Directive)dirObj.Value;
                            policy.Directives.Add(directive);
                        }
                    }

                    // Console.WriteLine($"{string.Join(", ", graph.GetSpawnOrder())}");

                    var environ = ((Dict)context["ENV"]).Value.ToDictionary(item => item.Key, item => (string)item.Value.Value);

                    Console.WriteLine(graph.ToJson().ToString());

                    // Send a serialized version of an "inactive" graph
                    // receive a mapping of URIs to nodes to "activate" graph
                    var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.ToJson(), policy?.ToJson());
                    *//*if (policy != null)
                    {
                        var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.Serialize(), policy?.Serialize());
                    }
                    else
                    {
                        var result = await RequestRegistryManager("SpawnGraph", User, environ, graph.Serialize());
                    }*//*

                    return graph;
                }
                else
                {
                    throw new EvaluationError($"Cannot spawn when operand callee is {callee.Type}");
                }*/
            }
            else
            {
                throw new EvaluationError($"Cannot spawn when operand is {expr.Initializer.Type}");
            }
        }

        private async Task<Object> EvaluatePolicyDeclaration(AstNode.PolicyDeclaration expr, EvaluationContext context)
        {
            Console.WriteLine(expr.ToCode(0));

            var policyDefinition = new PolicyDefinition(context, expr.Id.Name, expr.GraphId.Name);
            policyDefinition.Initializer = new AsyncFunction(async (callingContext, args) =>
            {
                for (var i = 0; i < expr.Parameters.Count; i++)
                {
                    var id = (AstNode.Identifier)expr.Parameters[i].Assignee;

                    // assing default value if args[i] is null
                    if (args[i] == Object.Null)
                    {
                        if (expr.Parameters[i].InitialValue != null)
                        {
                            callingContext[id.Name] = await Evaluate(expr.Parameters[i].InitialValue, context);
                        }
                        else
                        {
                            callingContext[id.Name] = Object.Null;
                        }
                    }
                    else
                    {
                        callingContext[id.Name] = args[i];
                    }
                }
                Console.WriteLine($"Initialized Policy");

                return Object.Null;
            });

            foreach (var item in expr.Directives)
            {
                policyDefinition.DirectiveInitializers.Add(new AsyncFunction((callingContext, args) =>
                {
                    var directive = new Policy.Directive(item.Name.Name,
                        string.Join(", ", item.Arguments.Select(arg => arg.ToCode())),
                        item.Operands.Select(op => op.ToCode(0)).ToList()
                        );

                    return Task.FromResult(new Object(directive));

                    /*var task = Task.Run(async () =>
                    {
                        // TODO: handle different policy directives
                        var directive = new Policy.Directive(item.Name.Name,
                            string.Join(", ", item.Arguments.Select(arg => arg.ToCode())),
                            item.Operands.Select(op => op.ToCode()).ToList()
                            );

                        return new Object<Policy.Directive>(directive);

                        *//*var directiveArgs = new List<Object>();
                        foreach (var elem in item.Arguments)
                        {
                            var arg = await Evaluate(elem, callingContext);
                            directiveArgs.Add(arg);
                        }

                        if (item.Name.Name == "place")
                        {
                            return new Function((ctx, _) =>
                            {
                                Console.WriteLine("Placement Directive");
                                return Object.Null;
                            });
                        }
                        else if (item.Name.Name == "min_rate")
                        {
                            return new Function((ctx, _) =>
                            {
                                Console.WriteLine("Minimum Rate Directive");
                                return Object.Null;
                            });
                        }
                        else if (item.Name.Name == "max_rate")
                        {
                            return new Function((ctx, _) =>
                            {
                                Console.WriteLine("Maximum Rate Directive");
                                return Object.Null;
                            });
                        }
                        else if (item.Name.Name == "checkpoint")
                        {
                            return new Function((ctx, _) =>
                            {
                                Console.WriteLine("Checkpoint Rate Directive");
                                return Object.Null;
                            });
                        }

                        return Object.Null;*//*
                    });

                    return new Object<Task<Object>>(task);*/
                }));
            }

            context[expr.Id.Name] = new Object<PolicyDefinition>(policyDefinition);

            return context[expr.Id.Name];
        }
    }
}
