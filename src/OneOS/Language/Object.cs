using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json.Linq;

using OneOS.Common;
using static OneOS.Language.Graph.Edge;
using static OneOS.Language.AstNode;

namespace OneOS.Language
{
    public class Object
    {
        public enum WireType
        {
            Null = 0,
            Binary = 1,
            Boolean = 2,
            Integer = 3,
            Decimal = 4,
            String = 5,
            Array = 6,
            Dictionary = 7,
            Function = 8,
            Message = 9
        }
        private static Type[] LiteralTypes = new Type[]
        {
            typeof(bool),
            typeof(int),
            typeof(uint),
            typeof(long),
            typeof(ulong),
            typeof(float),
            typeof(double),
            typeof(decimal),
            typeof(char),
            typeof(string)
        };

        public static readonly Object Null = new Object(null);
        public static readonly Object<bool> False = new Object<bool>(false);
        public static readonly Object<bool> True = new Object<bool>(true);

        public virtual object Value { get; protected set; }
        public virtual Type Type { get => Value.GetType(); }
        public virtual bool IsLiteralType { get => LiteralTypes.Contains(Type); }

        public Object(object value)
        {
            Value = value;
        }

        public override string ToString()
        {
            if (Value == null) return "null";
            if (IsLiteralType) return Value.ToString();
            //if (typeof(IList<>).IsAssignableFrom(Type)) return string.Join("\n", ((IList)Value).Select(item => item.ToString()));
            //if (typeof(IEnumerable<>).IsAssignableFrom(Type)) return string.Join("\n", ((IEnumerable<Object>)Value).Select(item => item.ToString()));
            if (Type.IsSubclassOf(typeof(Dictionary<string, Object>)) || Type == typeof(Dictionary<string, Object>)) return string.Join("\n", ((Dictionary<string, Object>)Value).Select(item => item.Key + ": " + item.Value.ToString()));

            return Value.ToString();
        }

        public virtual JToken ToJson()
        {
            if (IsLiteralType) return new JValue(Value);
            else
            {
                var json = new JObject();
                json["type"] = Type.Name;
                return json;
            }
        }

        public static Object FromJson(JToken json)
        {
            switch (json.Type)
            {
                case JTokenType.Null:
                    return Null;
                case JTokenType.Boolean:
                    return json.ToObject<bool>() ? True : False;
                case JTokenType.Integer:
                    return new Object<int>(json.ToObject<int>());
                case JTokenType.Float:
                    return new Object<decimal>(json.ToObject<decimal>());
                case JTokenType.String:
                    return new Object<string>(json.ToObject<string>());
                case JTokenType.Array:
                    return new Array(((JArray)json).Select(item => Object.FromJson(item)).ToList());
                case JTokenType.Object:
                    break;
                default:
                    throw new ParseError($"Cannot parse Object from given JSON: {json}");
            }

            // json is an object
            var obj = (JObject)json;
            switch (obj["type"].ToObject<string>())
            {
                case "dict":
                    return Dict.FromJson(obj);
                case "function":
                    return SerializableFunction.FromJson(obj);
                case "graph":
                    return Graph.FromJson(obj);
                case "graph.node":
                    return Graph.Node.FromJson(obj);
                case "graph.edge":
                    return Graph.Edge.FromJson(obj);
                case "policy":
                    return Policy.FromJson(obj);
                default:
                    throw new ParseError($"Cannot parse Object from given JSON: {json}");
            }
        }

        public void Update(object value)
        {
            Value = value;
        }

        public void Update(Object obj)
        {
            Value = obj.Value;
        }

        public static bool operator true(Object obj)
        {
            if (obj.Type == typeof(bool)) return (bool)obj.Value;

            throw new EvaluationError($"Cannot evaluate true/false for object type {obj.Type.Name}");
        }

        public static bool operator false(Object obj)
        {
            if (obj.Type == typeof(bool)) return !(bool)obj.Value;

            throw new EvaluationError($"Cannot evaluate true/false for object type {obj.Type.Name}");
        }

        /*public static Object operator ==(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return new Object<bool>((int)left.Value == (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<bool>((decimal)left.Value == (decimal)right.Value);
            else if (left.Type == typeof(string)) return new Object<bool>((string)left.Value == (string)right.Value);
            // else return new Object<bool>(left.Value == right.Value);

            throw new EvaluationError($"Cannot evaluate {left} == {right}");
        }

        public static Object operator !=(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return new Object<bool>((int)left.Value != (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<bool>((decimal)left.Value != (decimal)right.Value);
            else if (left.Type == typeof(string)) return new Object<bool>((string)left.Value != (string)right.Value);
            // else return new Object<bool>(left.Value == right.Value);

            throw new EvaluationError($"Cannot evaluate {left} != {right}");
        }*/

        public static Object operator |(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(bool)) return new Object<bool>((bool)left.Value || (bool)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} || {right}");
        }

        public static Object operator &(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(bool)) return new Object<bool>((bool)left.Value && (bool)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} && {right}");
        }

        public static Object operator <(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return (int)left.Value < (int)right.Value ? True : False;
            else if (left.Type == typeof(decimal)) return (decimal)left.Value < (decimal)right.Value ? True : False;

            throw new EvaluationError($"Cannot evaluate {left} < {right}");
        }

        public static Object operator >(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return (int)left.Value > (int)right.Value ? True : False;
            else if (left.Type == typeof(decimal)) return (decimal)left.Value > (decimal)right.Value ? True : False;

            throw new EvaluationError($"Cannot evaluate {left} > {right}");
        }

        public static Object operator <=(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return (int)left.Value <= (int)right.Value ? True : False;
            else if (left.Type == typeof(decimal)) return (decimal)left.Value <= (decimal)right.Value ? True : False;

            throw new EvaluationError($"Cannot evaluate {left} <= {right}");
        }

        public static Object operator >=(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");

            if (left.Type == typeof(int)) return (int)left.Value >= (int)right.Value ? True : False;
            else if (left.Type == typeof(decimal)) return (decimal)left.Value >= (decimal)right.Value ? True : False;

            throw new EvaluationError($"Cannot evaluate {left} >= {right}");
        }

        public static Object operator +(Object left, Object right)
        {
            if (left.Type != right.Type)
            {
                if (left.Type == typeof(string) || right.Type == typeof(string))
                {
                    return new Object<string>(left.Value.ToString() + right.Value.ToString());
                }
                else throw new EvaluationError($"Type mismatch when evaluating {left.Type} + {right.Type}");
            }

            if (left.Type == typeof(int)) return new Object<int>((int)left.Value + (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<decimal>((decimal)left.Value + (decimal)right.Value);
            else if (left.Type == typeof(string)) return new Object<string>((string)left.Value + (string)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} + {right}");
        }

        public static Object operator -(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} - {right.Type}");

            if (left.Type == typeof(int)) return new Object<int>((int)left.Value - (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<decimal>((decimal)left.Value - (decimal)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} - {right}");
        }

        public static Object operator *(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} * {right.Type}");

            if (left.Type == typeof(int)) return new Object<int>((int)left.Value * (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<decimal>((decimal)left.Value * (decimal)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} * {right}");
        }

        public static Object operator /(Object left, Object right)
        {
            if (left.Type != right.Type) throw new EvaluationError($"Type mismatch when evaluating {left.Type} / {right.Type}");

            if (left.Type == typeof(int)) return new Object<int>((int)left.Value / (int)right.Value);
            else if (left.Type == typeof(decimal)) return new Object<decimal>((decimal)left.Value / (decimal)right.Value);

            throw new EvaluationError($"Cannot evaluate {left} / {right}");
        }
    }

    public class Object<T> : Object
    {
        public new T Value { get => (T)base.Value; protected set => base.Value = value; }

        public Object(T value) : base(value)
        {

        }
    }

    public class ByteArray : Object<byte[]>
    {
        private static Dictionary<string, Func<ByteArray, Object>> PropertyGetters = new Dictionary<string, Func<ByteArray, Object>>()
        {
            { "length", (self) => new Object(self.Value.Length) }
        };

        private static Dictionary<string, Func<ByteArray, Object, Object>> PropertySetters = new Dictionary<string, Func<ByteArray, Object, Object>>()
        {
        };

        public ByteArray(byte[] bytes) : base(bytes)
        {
        }

        public Object this[string key]
        {
            get {
                if (!PropertyGetters.ContainsKey(key)) throw new EvaluationError($"ByteArray object does not have property '{key}'");
                return PropertyGetters[key](this);
            }
            set {
                if (!PropertyGetters.ContainsKey(key)) throw new EvaluationError($"ByteArray object does not have property '{key}'");
                PropertySetters[key](this, value);
            }
        }
    }

    public class Array<T> : Object<List<Object<T>>>
    {
        public Array(List<T> value) : base(value.Select(item => new Object<T>(item)).ToList()) { }

        public override string ToString()
        {
            return "[ " + string.Join("\n", Value) + " ]";
        }
    }

    public class Array : Object<List<Object>>
    {
        public Array(List<Object> value) : base(value) { }

        public override string ToString()
        {
            return "[\n" + string.Join(",\n", Value.Select(item => "  " + item.ToString())) + "\n]";
        }
    }

    public class Dict : Object<Dictionary<string, Object>>
    {
        public Dict(Dictionary<string, Object> value) : base(value) { }

        public static Dict FromDictionary<T>(Dictionary<string, T> nativeDict)
        {
            return new Dict(nativeDict.ToDictionary(item => item.Key, item => new Object(item.Value)));
        }

        public static Dict FromJObject(JObject json)
        {
            var val = new Dictionary<string, Object>();
            foreach (var item in json)
            {
                val[item.Key] = Object.FromJson(item.Value);
            }
            return new Dict(val);
        }

        public Object this[string key]
        {
            get => Value[key];
            set => Value[key] = value;
        }

        public override string ToString()
        {
            return "{\n" + string.Join(",\n", Value.Select(item => "  " + item.Key + ": " + item.Value.ToString())) + "\n}";
        }

        public Dictionary<string, object> ToDictionary()
        {
            return Value.ToDictionary(item => item.Key, item => item.Value.Value);
        }

        public bool ContainsKey(string key)
        {
            return Value.ContainsKey(key);
        }

        public override JToken ToJson()
        {
            var obj = base.ToJson();
            obj["type"] = "dict";

            var json = new JObject();
            foreach (var item in Value)
            {
                json[item.Key] = item.Value.ToJson();
            }
            obj["value"] = json;

            return obj;
        }

        public new static Dict FromJson(JToken json)
        {
            return FromJObject((JObject)json["value"]);
            /*var val = new Dictionary<string, Object>();
            foreach (var item in (JObject)json["value"])
            {
                val[item.Key] = Object.FromJson(item.Value);
            }
            return new Dict(val);*/
        }
    }

    public class Function : Object<FunctionDelegate>
    {
        public Function(FunctionDelegate value) : base(value) { }

        public Object Invoke(EvaluationContext context, params Object[] args)
        {
            return Value.Invoke(context, args);
        }
    }

    /*public class AsyncFunction : Object<AsyncFunctionDelegate>
    {
        public AsyncFunction(AsyncFunctionDelegate value) : base(value) { }

        public async Task<Object> Invoke(EvaluationContext context, params Object[] args)
        {
            return await Value.Invoke(context, args).Value;
        }
    }*/

    public class AsyncFunction : Object<AsyncFunctionDelegate>
    {
        public AsyncFunction(AsyncFunctionDelegate value) : base(value) { }

        public Task<Object> Invoke(EvaluationContext context, params Object[] args)
        {
            return Value.Invoke(context, args);
        }
    }

    public class SerializableFunction : Object<FunctionDelegate>
    {
        EvaluationContext Context;
        AstNode.FunctionExpression AstNode;

        Interpreter Interpreter; // This property is assigned just before the function is actually used

        public SerializableFunction(EvaluationContext context, AstNode.FunctionExpression expr) : base(null)
        {
            Context = context;
            AstNode = expr;
            Value = new FunctionDelegate((callingContext, args) =>
            {
                var scope = context.Spawn();

                for (var i = 0; i < expr.Parameters.Count; i++)
                {
                    var param = expr.Parameters[i];
                    var id = (AstNode.Identifier)param.Assignee;
                    scope[id.Name] = i < args.Length ? args[i] : Object.Null;
                }

                try
                {
                    return Interpreter.Evaluate(expr.Body, scope).Result;
                }
                catch (Interpreter.FunctionReturn ret)
                {
                    return ret.Result;
                }
                catch (AggregateException ex)
                {
                    if (ex.InnerException is Interpreter.FunctionReturn)
                    {
                        return ((Interpreter.FunctionReturn)ex.InnerException).Result;
                    }
                    else throw ex.InnerException;
                }
            });
        }

        public void Activate(Interpreter interpreter)
        {
            Interpreter = interpreter;
        }

        public Object Invoke(EvaluationContext context, params Object[] args)
        {
            return Value.Invoke(context, args);
        }

        public override JToken ToJson()
        {
            var obj = base.ToJson();
            obj["type"] = "function";

            var json = new JObject();
            //json["context"] = Context.ToJson();  // TODO: Deal with circular reference
            json["ast"] = AstNode.ToJson();

            obj["value"] = json;

            return obj;
        }

        public new static SerializableFunction FromJson(JToken json)
        {
            //var context = EvaluationContext.FromJson((JObject)json["value"]["context"]);
            var ast = Language.AstNode.FunctionExpression.FromJson((JObject)json["value"]["ast"]);

            //return new SerializableFunction(context, ast);
            return new SerializableFunction(new EvaluationContext(), ast);
        }

        public string ToCode()
        {
            return AstNode.ToCode();
        }

        public static SerializableFunction FromCode(string code)
        {
            var ast = ((AstNode.Program)Language.AstNode.Parse(code)).Body[0];

            return new SerializableFunction(new EvaluationContext(), (FunctionExpression)ast);
        }
    }

    public delegate Object FunctionDelegate(EvaluationContext context, params Object[] args);
    //public delegate Object<Task<Object>> AsyncFunctionDelegate(EvaluationContext context, params Object[] args);
    public delegate Task<Object> AsyncFunctionDelegate(EvaluationContext context, params Object[] args);

    public class AgentClass : Object
    {
        public EvaluationContext Context { get; private set; }
        public string Name;
        public AstNode.AgentDeclaration Declaration;
        public AgentClass(EvaluationContext context, AstNode.AgentDeclaration decl) : base(new object())
        {
            Context = context;
            Name = decl.Name.Name;
            Declaration = decl;
        }

        public async Task<UserSpaceAgent> Instantiate(Interpreter interpreter, Agent parent, params Object[] args)
        {
            var agent = new UserSpaceAgent(parent, interpreter.Runtime, interpreter.User, Context.Spawn(), Name);

            // inject arguments into context
            for (var i = 0; i < args.Length; i++)
            {
                var argName = (AstNode.Identifier)Declaration.Parameters[i].Assignee;
                agent.Context[argName.Name] = args[i];
            }

            // evaluate the agent body
            foreach (var item in Declaration.Body)
            {
                await interpreter.Evaluate(item, agent.Context);
            }

            // attach actions
            foreach (var item in Declaration.Actions)
            {
                var action = await interpreter.Evaluate(item, agent.Context);
                agent.Context[item.Name.Name] = action;
            }

            // attach handlers
            if (Declaration.OnEnter != null)
            {
                var handler = new AsyncFunction(async (ctx, _) =>
                {
                    foreach (var item in Declaration.OnEnter)
                    {
                        await interpreter.Evaluate(item, agent.Context);
                    }
                    return Object.Null;
                });
                agent.SetOnEnterHandler(handler);
            }

            if (Declaration.OnTick != null)
            {
                var handler = new AsyncFunction(async (ctx, _) =>
                {
                    foreach (var item in Declaration.OnTick)
                    {
                        await interpreter.Evaluate(item, agent.Context);
                    }
                    return Object.Null;
                });
                agent.SetOnTickHandler(handler);
            }

            if (Declaration.OnExit != null)
            {
                var handler = new AsyncFunction(async (ctx, _) =>
                {
                    foreach (var item in Declaration.OnExit)
                    {
                        await interpreter.Evaluate(item, agent.Context);
                    }
                    return Object.Null;
                });
                agent.SetOnExitHandler(handler);
            }

            Console.WriteLine($"{this} Adding {agent} to {interpreter.Runtime}'s Router");
            interpreter.Runtime.AddUserAgent(agent);

            return agent;
        }

        public override string ToString()
        {
            return $"[AgentClass {Name}]";
        }
    }

    public class GraphDefinition
    {
        public EvaluationContext Context { get; private set; }
        public string Name;
        public AsyncFunction Initializer;
        public Dictionary<string, AsyncFunction> NodeInitializers;
        public Dictionary<string, AsyncFunction> EdgeInitializers;
        public GraphDefinition(EvaluationContext declarationContext, string name)
        {
            Context = declarationContext;
            Name = name;
            NodeInitializers = new Dictionary<string, AsyncFunction>();
            EdgeInitializers = new Dictionary<string, AsyncFunction>();
        }
    }

    public class Graph : Object
    {
        public string URI { get; private set; }
        public string ClassName { get; private set; }
        public EvaluationContext Context { get; private set; }
        public Dictionary<string, Node> Nodes { get; private set; }
        public Dictionary<string, Edge> Edges { get; private set; }

        public Graph(EvaluationContext context, string className, string uri = null) : base(new object())
        {
            //Value = this;
            URI = uri == null ? "graph-" + Helpers.RandomText.Next() : uri;
            ClassName = className;
            Context = context;
            Nodes = new Dictionary<string, Node>();
            Edges = new Dictionary<string, Edge>();
        }

        public List<Edge> GetEdgesFrom(Node node)
        {
            return Edges.Values.Where(item => item.Source == node).ToList();
        }

        public List<Edge> GetEdgesTo(Node node)
        {
            return Edges.Values.Where(item => item.Sink == node).ToList();
        }

        public bool IsParallelNode(string name)
        {
            return IsParallelNode(Nodes[name]);
        }

        public bool IsParallelNode(Node node)
        {
            var edges = GetEdgesTo(node);
            if (edges.Count < 1) return false;

            bool isParallelUpstream = false;
            foreach (var edge in edges)
            {
                if (edge.Kind == EdgeType.Split) return true;
                else if (edge.Kind == EdgeType.Merge) return false;
                isParallelUpstream = isParallelUpstream || IsParallelNode(edge.Source);
            }

            return isParallelUpstream;
        }

        public List<string> GetSortedNodes()
        {
            var indegrees = Nodes.ToDictionary(item => item.Value.Id, item => 0);
            var downstreams = Nodes.ToDictionary(item => item.Value.Id, item => new List<string>());

            foreach (var edge in Edges.Values)
            {
                indegrees[edge.Sink.Id] += 1;
                downstreams[edge.Source.Id].Add(edge.Sink.Id);
            }

            var order = new List<string>();

            Action traverse = null;
            traverse = () =>
            {
                var frontier = indegrees.Where(item => item.Value == 0).ToList();

                foreach (var item in frontier)
                {
                    order.Add(item.Key);
                    indegrees.Remove(item.Key);

                    if (downstreams.ContainsKey(item.Key))
                    {
                        foreach (var neighbor in downstreams[item.Key])
                        {
                            indegrees[neighbor] -= 1;
                        }
                    }
                }

                if (order.Count != Nodes.Count) traverse();
            };

            traverse();

            return order;
        }

        // Returns a list of node IDs, starting from the most downstream
        // Uses topological sort to order the nodes in the DAG
        public List<string> GetSpawnOrder()
        {
            var order = GetSortedNodes();

            order.Reverse();

            var nodeMap = Nodes.ToDictionary(item => item.Value.Id, item => item.Value);
            Console.WriteLine($"Spawn order:\n  {string.Join(",\n  ", order.Select(id => nodeMap[id].BinaryPath + " " + nodeMap[id].Arguments))}");

            return order;
        }

        public override JToken ToJson()
        {
            var json = base.ToJson();
            json["type"] = "graph";

            var graph = new JObject();
            graph["uri"] = URI;
            graph["className"] = ClassName;
            graph["nodes"] = new JObject();
            graph["edges"] = new JObject();

            foreach (var item in Nodes)
            {
                graph["nodes"][item.Key] = item.Value.ToJson();
            }

            foreach (var item in Edges)
            {
                graph["edges"][item.Key] = item.Value.ToJson();
            }

            json["value"] = graph;

            return json;
        }

        public new static Graph FromJson(JToken json)
        {
            var graph = new Graph(null, json["value"]["className"].ToObject<string>(), json["value"]["uri"].ToObject<string>());
            var nodes = (JObject)json["value"]["nodes"];
            var edges = (JObject)json["value"]["edges"];

            var nodeMap = new Dictionary<string, Node>();

            foreach (var item in nodes)
            {
                var node = Node.FromJson((JObject)item.Value);
                node.Link(item.Value["value"]["uri"].ToObject<string>());

                graph.Nodes[item.Key] = node;
                nodeMap[node.Id] = node;
            }

            foreach (var item in edges)
            {
                var edge = new Edge(nodeMap[item.Value["value"]["source"].ToObject<string>()], nodeMap[item.Value["value"]["sink"].ToObject<string>()], (Edge.EdgeType)Enum.Parse(typeof(Edge.EdgeType), item.Value["value"]["kind"].ToObject<string>()));

                graph.Edges[item.Key] = edge;
            }

            return graph;
        }

        public class Node : Object
        {
            public enum NodeType
            {
                Process,
                Lambda
            }

            public enum LambdaType
            {
                Filter,
                Map,
                Reduce
            }

            public string URI { get; private set; }
            public string Id { get; private set; }  // Internal ID used before linking
            public NodeType Kind { get; private set; }
            public string BinaryPath { get; private set; }
            public string Arguments { get; private set; }
            public LambdaType LambdaKind { get; private set; }
            public SerializableFunction Lambda { get; private set; }
            public Dict Options { get; set; }

            public Node(string binaryPath, string args, string id = null) : base(new object())
            {
                //Value = this;
                Kind = NodeType.Process;
                BinaryPath = binaryPath;
                Arguments = args;
                Id = id != null ? id : Helpers.RandomText.Next(8);
            }

            public Node(LambdaType lambdaType, SerializableFunction lambda, string id = null) : base(new object())
            {
                //Value = this;
                Kind = NodeType.Lambda;
                BinaryPath = $"lambda.{lambdaType.ToString().ToLower()}";
                Arguments = lambda.ToCode();
                LambdaKind = lambdaType;
                Lambda = lambda;
                Id = id != null ? id : Helpers.RandomText.Next(8);
            }

            // By setting the URI, we "link" this graph object (within the interpreter)
            // with the running process
            public void Link (string uri)
            {
                URI = uri;
            }

            public override JToken ToJson()
            {
                var json = base.ToJson();
                json["type"] = "graph.node";

                var node = new JObject();
                node["uri"] = URI;
                node["id"] = Id;
                node["kind"] = Kind.ToString();

                if (Kind == NodeType.Process)
                {
                    node["binary"] = BinaryPath;
                    node["arguments"] = Arguments;
                }
                else if (Kind == NodeType.Lambda)
                {
                    node["lambdaType"] = LambdaKind.ToString();
                    node["lambda"] = Lambda.ToJson();
                }

                if (Options != null)
                {
                    node["options"] = Options.ToJson();
                }
                
                json["value"] = node;

                return json;
            }

            public new static Node FromJson(JToken json)
            {
                var val = (JObject)json["value"];
                var type = (NodeType)Enum.Parse(typeof(NodeType), val["kind"].ToObject<string>());

                Node node = null;
                
                if (type == NodeType.Process)
                {
                    node = new Node(val["binary"].ToObject<string>(), val["arguments"].ToObject<string>(), val["id"].ToObject<string>());
                }
                else if (type == NodeType.Lambda)
                {
                    var lambdaType = (LambdaType)Enum.Parse(typeof(LambdaType), val["lambdaType"].ToObject<string>());
                    var lambda = SerializableFunction.FromJson((JObject)val["lambda"]);
                    node = new Node(lambdaType, lambda, val["id"].ToObject<string>());
                }

                if (val.ContainsKey("options"))
                {
                    node.Options = Dict.FromJson((JObject)val["options"]);
                }

                return node;
            }
        }

        public class Edge : Object
        {
            public enum EdgeType
            {
                Basic,
                Split,
                Merge
            }

            public string URI { get; private set; }
            public Node Source { get; private set; }
            public Node Sink { get; private set; }
            public EdgeType Kind { get; private set; }

            public Edge(Node source, Node sink, EdgeType type) : base(new object())
            {
                //Value = this;
                Source = source;
                Sink = sink;
                Kind = type;
            }

            // By setting the URI, we "link" this graph object (within the interpreter)
            // with the running process
            public void Link(string uri)
            {
                URI = uri;
            }

            public override JToken ToJson()
            {
                var json = base.ToJson();
                json["type"] = "graph.edge";

                var edge = new JObject();
                edge["uri"] = URI;
                edge["kind"] = Kind.ToString();
                edge["source"] = Source.Id;
                edge["sink"] = Sink.Id;

                json["value"] = edge;
                return json;
            }
        }
    }

    public class PolicyDefinition
    {
        public EvaluationContext Context { get; private set; }
        public string Name;
        public string GraphId;
        public AsyncFunction Initializer;
        public List<AsyncFunction> DirectiveInitializers;
        public PolicyDefinition(EvaluationContext declarationContext, string name, string graphId)
        {
            Context = declarationContext;
            Name = name;
            GraphId = graphId;
            DirectiveInitializers = new List<AsyncFunction>();
        }
    }

    public class Policy : Object
    {
        public EvaluationContext Context { get; private set; }
        public string ClassName { get; private set; }
        public string GraphClass { get; private set; }
        public List<Directive> Directives { get; private set; }

        public Policy(EvaluationContext context, string className, string graphClass) : base(new object())
        {
            //Value = this;
            Context = context;
            ClassName = className;
            GraphClass = graphClass;
            Directives = new List<Directive>();
        }

        public override JToken ToJson()
        {
            var json = base.ToJson();
            json["type"] = "policy";
            
            var policy = new JObject();
            policy["className"] = ClassName;
            policy["graphClass"] = GraphClass;
            var directives = new JArray();

            foreach (var item in Directives)
            {
                var directive = new JObject();
                directive["name"] = item.Name;
                directive["arguments"] = item.Arguments;
                directive["operands"] = JArray.FromObject(item.Operands);

                directives.Add(directive);
            }
            policy["directives"] = directives;

            json["value"] = policy;

            return json;
        }

        public new static Policy FromJson(JToken json)
        {
            var val = json["value"];

            var policy = new Policy(null, val["className"].ToObject<string>(), val["graphClass"].ToObject<string>());
            var directives = (JArray)val["directives"];

            foreach (var item in directives)
            {
                var directive = new Directive(item["name"].ToObject<string>(), item["arguments"].ToObject<string>(), item["operands"].ToObject<List<string>>());
                policy.Directives.Add(directive);
            }

            return policy;
        }

        public class Directive : Object
        {
            public string Name { get; private set; }
            public string Arguments { get; private set; }   // The raw code before evaluation (to be evaluated by the scheduler)
            public List<string> Operands { get; private set; }

            public Directive(string name, string args, List<string> operands) : base(new object())
            {
                //Value = this;
                Name = name;
                Arguments = args;
                Operands = operands;
            }
        }
    }
}
