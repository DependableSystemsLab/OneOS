using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using Newtonsoft.Json.Linq;
using OneOS.Common;
using Newtonsoft.Json;

namespace OneOS.Language
{
    public abstract class AstNode
    {
        public enum NodeType
        {
            LiteralNull,
            LiteralBoolean,
            LiteralInteger,
            LiteralDecimal,
            LiteralString,
            ArrayExpression,
            ObjectExpression,
            Identifier,
            MemberExpression,
            CallExpression,
            UnaryExpression,
            BinaryExpression,
            LogicalExpression,
            TertiaryExpression,
            VariableDeclaration,
            VariableDeclarator,
            AssignmentExpression,
            FunctionExpression,
            ReturnStatement,
            BlockStatement,
            ExpressionStatement,
            SequenceExpression,
            IfStatement,
            WhileStatement,
            ForStatement,
            SpawnStatement,
            AgentDeclaration,
            AgentActionDeclaration,
            ChannelExpression,
            SubscribeExpression,
            PublishExpression,
            GraphDeclaration,
            NodeDeclaration,
            EdgeDeclaration,
            PolicyDeclaration,
            PolicyDirective,
            TagExpression,
            Program
        }

        public NodeType Type { get; private set; }

        public AstNode(NodeType type)
        {
            Type = type;
        }

        public abstract string ToCode(int indent = 0);
        public virtual JObject ToJson()
        {
            var json = new JObject();
            json["type"] = Type.ToString();
            return json;
        }

        public static AstNode Parse(string code)
        {
            var parser = new Parser(code);
            return parser.Parse();
        }

        public static AstNode FromJson(JObject json)
        {
            var type = (NodeType)Enum.Parse(typeof(NodeType), json["type"].ToObject<string>());

            switch (type)
            {
                case NodeType.Identifier:
                    return Identifier.FromJson(json);
                case NodeType.LiteralBoolean:
                    return LiteralBoolean.FromJson(json);
                case NodeType.LiteralInteger:
                    return LiteralInteger.FromJson(json);
                case NodeType.LiteralDecimal:
                    return LiteralDecimal.FromJson(json);
                case NodeType.LiteralString:
                    return LiteralString.FromJson(json);
                case NodeType.MemberExpression:
                    return MemberExpression.FromJson(json);
                case NodeType.BinaryExpression:
                    return BinaryExpression.FromJson(json);
                case NodeType.FunctionExpression:
                    return FunctionExpression.FromJson(json);
                case NodeType.Program:
                    return Program.FromJson(json);
            }

            throw new ParseError($"Cannot parse AST Node from given JSON: {json}");
        }

        public abstract class Literal : AstNode
        {
            public Literal(NodeType type) : base(type) { }
        }

        public class Program : AstNode
        {
            public List<AstNode> Body;
            public Program() : base(NodeType.Program)
            {
                Body = new List<AstNode>();
            }

            public override string ToCode(int indent = 0)
            {
                return string.Join(";\n", Body.Select(expr => expr.ToCode(indent)));
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["body"] = JArray.FromObject(Body.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static Program FromJson(JObject json)
            {
                var node = new Program();
                foreach (var item in (JArray)json["body"])
                {
                    node.Body.Add(AstNode.FromJson((JObject)item));
                }
                return node;
            }
        }

        public class LiteralNull : Literal
        {
            public LiteralNull() : base(NodeType.LiteralNull) { }

            public override string ToCode(int indent = 0)
            {
                return "null";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                return json;
            }

            public new static LiteralNull FromJson(JObject json)
            {
                var node = new LiteralNull();
                return node;
            }
        }

        public class LiteralBoolean : Literal
        {
            public bool Value { get; private set; }
            public LiteralBoolean(string val) : base(NodeType.LiteralBoolean)
            {
                Value = bool.Parse(val);
            }

            public LiteralBoolean(bool val) : base(NodeType.LiteralBoolean)
            {
                Value = val;
            }

            public override string ToCode(int indent = 0)
            {
                return Value.ToString();
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["value"] = Value;
                return json;
            }

            public new static LiteralBoolean FromJson(JObject json)
            {
                return new LiteralBoolean(json["value"].ToObject<bool>());
            }
        }

        public class LiteralInteger : Literal
        {
            public int Value { get; private set; }
            public LiteralInteger(string val) : base(NodeType.LiteralInteger)
            {
                Value = int.Parse(val);
            }

            public LiteralInteger(int val) : base(NodeType.LiteralInteger)
            {
                Value = val;
            }

            public override string ToCode(int indent = 0)
            {
                return Value.ToString();
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["value"] = Value;
                return json;
            }

            public new static LiteralInteger FromJson(JObject json)
            {
                return new LiteralInteger(json["value"].ToObject<int>());
            }
        }

        public class LiteralDecimal : Literal
        {
            public decimal Value { get; private set; }
            public LiteralDecimal(string val) : base(NodeType.LiteralDecimal)
            {
                Value = decimal.Parse(val);
            }

            public LiteralDecimal(decimal val) : base(NodeType.LiteralDecimal)
            {
                Value = val;
            }

            public override string ToCode(int indent = 0)
            {
                return Value.ToString();
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["value"] = Value;
                return json;
            }

            public new static LiteralDecimal FromJson(JObject json)
            {
                return new LiteralDecimal(json["value"].ToObject<decimal>());
            }
        }

        public class LiteralString : Literal
        {
            public string Value { get; private set; }
            public LiteralString(string val) : base(NodeType.LiteralString)
            {
                Value = val;
            }

            public override string ToCode(int indent = 0)
            {
                return $"\"{Value}\"";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["value"] = Value;
                return json;
            }

            public new static LiteralString FromJson(JObject json)
            {
                return new LiteralString(json["value"].ToObject<string>());
            }
        }

        public class ArrayExpression : AstNode
        {
            public List<AstNode> Elements { get; private set; }
            public ArrayExpression(List<AstNode> elems): base(NodeType.ArrayExpression)
            {
                Elements = elems;
            }

            public override string ToCode(int indent = 0)
            {
                return $"[ {string.Join(", ", Elements.Select(item => item.ToCode(indent + 2)))} ]";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["elements"] = JArray.FromObject(Elements.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static ArrayExpression FromJson(JObject json)
            {
                var elems = ((JArray)json["elements"]).Select(item => AstNode.FromJson((JObject)item)).ToList();
                var node = new ArrayExpression(elems);
                return node;
            }
        }

        public class ObjectExpression : AstNode
        {
            public List<(string, AstNode)> KeyValuePairs { get; private set; }
            public ObjectExpression(List<(string, AstNode)> props) : base(NodeType.ObjectExpression)
            {
                KeyValuePairs = props;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{{ {string.Join(", ", KeyValuePairs.Select(prop => $"\"{prop.Item1}\" : {prop.Item2.ToCode(indent + 2)}" ))} }}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["properties"] = JArray.FromObject(KeyValuePairs.Select(prop => new JArray(prop.Item1, prop.Item2.ToJson())).ToList());
                return json;
            }

            public new static ObjectExpression FromJson(JObject json)
            {
                var props = ((JArray)json["properties"]).Select(item => (((JArray)item)[0].ToObject<string>(), AstNode.FromJson((JObject)((JArray)item)[1])) ).ToList();
                var node = new ObjectExpression(props);
                return node;
            }
        }

        public class Identifier : AstNode
        {
            public string Name { get; private set; }
            public Identifier(string val) : base(NodeType.Identifier)
            {
                Name = val;
            }

            public override string ToCode(int indent = 0)
            {
                return Name;
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["name"] = Name;
                return json;
            }

            public new static Identifier FromJson(JObject json)
            {
                return new Identifier(json["name"].ToObject<string>());
            }
        }

        public class BinaryExpression : AstNode
        {
            public string Operator { get; private set; }
            public AstNode Left { get; private set; }
            public AstNode Right { get; private set; }

            public BinaryExpression(string op, AstNode left, AstNode right) : base(NodeType.BinaryExpression)
            {
                Operator = op;
                Left = left;
                Right = right;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Left.ToCode(indent + 2)} {Operator} {Right.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["operator"] = Operator;
                json["left"] = Left.ToJson();
                json["right"] = Right.ToJson();

                return json;
            }

            public new static BinaryExpression FromJson(JObject json)
            {
                var op = json["operator"].ToObject<string>();
                var left = AstNode.FromJson((JObject)json["left"]);
                var right = AstNode.FromJson((JObject)json["right"]);
                return new BinaryExpression(op, left, right);
            }
        }

        public class AssignmentExpression : AstNode
        {
            public string Operator { get; private set; }
            public AstNode Left { get; private set; }
            public AstNode Right { get; private set; }

            public AssignmentExpression(string op, AstNode left, AstNode right) : base(NodeType.AssignmentExpression)
            {
                Operator = op;
                Left = left;
                Right = right;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Left.ToCode(indent + 2)} {Operator} {Right.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["operator"] = Operator;
                json["left"] = Left.ToJson();
                json["right"] = Right.ToJson();

                return json;
            }

            public new static AssignmentExpression FromJson(JObject json)
            {
                var op = json["operator"].ToObject<string>();
                var left = AstNode.FromJson((JObject)json["left"]);
                var right = AstNode.FromJson((JObject)json["right"]);
                return new AssignmentExpression(op, left, right);
            }
        }

        public class VariableDeclaration : AstNode
        {
            public string Kind { get; private set; }
            public List<VariableDeclarator> Declarations { get; private set; }

            public VariableDeclaration(string kind) : base(NodeType.VariableDeclaration)
            {
                Kind = kind;
                Declarations = new List<VariableDeclarator>();
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Kind} {string.Join(", ", Declarations.Select(item => item.ToCode(indent + 2)))}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["kind"] = Kind;
                json["declarations"] = JArray.FromObject(Declarations.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static VariableDeclaration FromJson(JObject json)
            {
                var kind = json["kind"].ToObject<string>();
                var declarations = ((JArray)json["declarations"]).Select(item => VariableDeclarator.FromJson((JObject)item)).ToList();
                return new VariableDeclaration(kind) { Declarations = declarations };
            }
        }

        public class VariableDeclarator : AstNode
        {
            public AstNode Assignee { get; private set; }
            public AstNode InitialValue { get; private set; }

            public VariableDeclarator(AstNode assignee, AstNode initial = null) : base(NodeType.VariableDeclarator)
            {
                Assignee = assignee;
                InitialValue = initial;
            }

            public void SetInitialValue(AstNode initial)
            {
                InitialValue = initial;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Assignee.ToCode(indent + 2)}{(InitialValue == null ? "" : $" = {InitialValue.ToCode(indent + 2)}" )}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();

                json["assignee"] = Assignee.ToJson();
                json["initial"] = InitialValue?.ToJson();

                return json;
            }

            public new static VariableDeclarator FromJson(JObject json)
            {
                var assignee = AstNode.FromJson((JObject)json["assignee"]);
                AstNode initial = null;
                if (json["initial"].Type != JTokenType.Null)
                {
                    initial = AstNode.FromJson((JObject)json["initial"]);
                }

                return new VariableDeclarator(assignee, initial);
            }
        }

        public class MemberExpression : AstNode
        {
            public AstNode Object { get; private set; }
            public AstNode Property { get; private set; }
            public bool IsComputed { get; private set; }

            public MemberExpression(AstNode obj, AstNode property, bool isComputed) : base(NodeType.MemberExpression)
            {
                Object = obj;
                Property = property;
                IsComputed = isComputed;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Object.ToCode(indent + 2)}.{(IsComputed ? $"[{Property.ToCode(indent + 2)}]" : Property.ToCode(indent + 2))}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["object"] = Object.ToJson();
                json["property"] = Property.ToJson();
                json["isComputed"] = IsComputed;
                return json;
            }

            public new static MemberExpression FromJson(JObject json)
            {
                var obj = AstNode.FromJson((JObject)json["object"]);
                var property = AstNode.FromJson((JObject)json["property"]);
                var isComputed = json["isComputed"].ToObject<bool>();
                return new MemberExpression(obj, property, isComputed);
            }
        }

        public class CallExpression : AstNode
        {
            public AstNode Callee { get; private set; }
            public List<AstNode> Arguments { get; private set; }

            public CallExpression(AstNode callee, List<AstNode> arguments) : base(NodeType.CallExpression)
            {
                Callee = callee;
                Arguments = arguments;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Callee.ToCode(indent + 2)}({string.Join(", ", Arguments.Select(item => item.ToCode(indent + 2)))})";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["callee"] = Callee.ToJson();
                json["arguments"] = JArray.FromObject(Arguments.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static CallExpression FromJson(JObject json)
            {
                var callee = AstNode.FromJson((JObject)json["callee"]);
                var arguments = ((JArray)json["arguments"]).Select(item => AstNode.FromJson((JObject)item)).ToList();
                return new CallExpression(callee, arguments);
            }
        }

        public class FunctionExpression : AstNode
        {
            public List<VariableDeclarator> Parameters { get; private set; }
            public AstNode Body { get; private set; }

            public FunctionExpression(List<VariableDeclarator> pars, AstNode body) : base(NodeType.FunctionExpression)
            {
                Parameters = pars;
                Body = body;
            }

            public override string ToCode(int indent = 0)
            {
                return $"({string.Join(", ", Parameters.Select(item => item.ToCode(indent + 2)))}) => {Body.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["params"] = JArray.FromObject(Parameters.Select(item => item.ToJson()).ToList());
                json["body"] = Body.ToJson();
                return json;
            }

            public new static FunctionExpression FromJson(JObject json)
            {
                var pars = ((JArray)json["params"]).Select(item => VariableDeclarator.FromJson((JObject)item)).ToList();
                var body = AstNode.FromJson((JObject)json["body"]);

                return new FunctionExpression(pars, body);
            }
        }

        public class ReturnStatement : AstNode
        {
            public AstNode Argument { get; private set; }
            public ReturnStatement(AstNode expr) : base(NodeType.ReturnStatement)
            {
                Argument = expr;
            }

            public override string ToCode(int indent = 0)
            {
                return $"return {Argument.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["argument"] = Argument.ToJson();
                return json;
            }

            public new static ReturnStatement FromJson(JObject json)
            {
                var arg = AstNode.FromJson((JObject)json["argument"]);
                return new ReturnStatement(arg);
            }
        }

        public class BlockStatement : AstNode
        {
            public List<AstNode> Body { get; private set; }
            public BlockStatement(List<AstNode> body) : base(NodeType.BlockStatement)
            {
                Body = body;
            }
            public BlockStatement() : base(NodeType.BlockStatement)
            {
                Body = new List<AstNode>();
            }

            public void AddExpression(AstNode expr)
            {
                Body.Add(expr);
            }

            public override string ToCode(int indent = 0)
            {
                return $"{{\n{string.Join(";\n", Body.Select(item => new string(' ', 2 + indent) + item.ToCode(indent + 2)))};\n{new string(' ', indent)}}}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["body"] = JArray.FromObject(Body.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static BlockStatement FromJson(JObject json)
            {
                var node = new BlockStatement();
                foreach (var item in (JArray)json["body"])
                {
                    node.Body.Add(AstNode.FromJson((JObject)item));
                }
                return node;
            }
        }

        public class ExpressionStatement : AstNode
        {
            public AstNode Expression { get; private set; }
            public ExpressionStatement(AstNode expr) : base(NodeType.ExpressionStatement)
            {
                Expression = expr;
            }

            public override string ToCode(int indent = 0)
            {
                return $"({Expression.ToCode(indent + 2)})";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["expression"] = Expression.ToJson();
                return json;
            }

            public new static ExpressionStatement FromJson(JObject json)
            {
                var expr = AstNode.FromJson((JObject)json["expression"]);
                return new ExpressionStatement(expr);
            }
        }

        public class SequenceExpression : AstNode
        {
            public List<AstNode> Expressions { get; private set; }
            public SequenceExpression() : base(NodeType.SequenceExpression)
            {
                Expressions = new List<AstNode>();
            }

            public void AddExpression(AstNode expr)
            {
                Expressions.Add(expr);
            }

            public override string ToCode(int indent = 0)
            {
                return string.Join(", ", Expressions.Select(expr => expr.ToCode(indent + 2)));
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["expressions"] = JArray.FromObject(Expressions.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static SequenceExpression FromJson(JObject json)
            {
                var node = new SequenceExpression();
                foreach (var item in (JArray)json["expressions"])
                {
                    node.AddExpression(AstNode.FromJson((JObject)item));
                }
                return node;
            }
        }

        public class IfStatement : AstNode
        {
            public AstNode Predicate { get; set; }
            public AstNode Consequent { get; set; }
            public AstNode Alternate { get; set; }

            public IfStatement() : base(NodeType.IfStatement) { }

            public override string ToCode(int indent)
            {
                return $"if ({Predicate.ToCode(indent + 2)})\n{new string(' ', indent)}{Consequent.ToCode(indent)}{(Alternate != null ? $"\n{new string(' ', indent)}else " + Alternate.ToCode(indent + 2) : "")}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["predicate"] = Predicate.ToJson();
                json["consequent"] = Consequent.ToJson();
                json["alternate"] = Alternate?.ToJson();

                return json;
            }

            public new static IfStatement FromJson(JObject json)
            {
                var predicate = AstNode.FromJson((JObject)json["predicate"]);
                var consequent = AstNode.FromJson((JObject)json["consequent"]);

                AstNode alternate = null;
                if (json["alternate"].Type != JTokenType.Null)
                {
                    alternate = AstNode.FromJson((JObject)json["alternate"]);
                }

                return new IfStatement()
                {
                    Predicate = predicate,
                    Consequent = consequent,
                    Alternate = alternate
                };
            }
        }

        public class AgentDeclaration : AstNode
        {
            public Identifier Name { get; private set; }
            public List<VariableDeclarator> Parameters { get; private set; }
            public List<AstNode> Body { get; private set; }

            public List<AgentActionDeclaration> Actions { get; private set; }
            public List<AstNode> OnEnter { get; set; }
            public List<AstNode> OnExit { get; set; }
            public List<AstNode> OnTick { get; set; }

            public AgentDeclaration(Identifier name, List<VariableDeclarator> pars) : base(NodeType.AgentDeclaration)
            {
                Name = name;
                Parameters = pars;
                Body = new List<AstNode>();
                Actions = new List<AgentActionDeclaration>();
            }

            public override string ToCode(int indent = 0)
            {
                return $"agent {Name.ToCode(indent)} ({string.Join(", ", Parameters.Select(item => item.ToCode(indent + 2)))}) {{\n{string.Join(";\n", Body.Select(expr => new string(' ', 2 + indent) + expr.ToCode(indent + 2)))};\n\n{string.Join(";\n\n", Actions.Select(expr => new string(' ', 2 + indent) + expr.ToCode(indent + 2)))};\n\n{new string(' ', 2 + indent)}enter {{\n{string.Join(";\n", OnEnter.Select(expr => new string(' ', 4 + indent) + expr.ToCode(indent + 4)))};\n{new string(' ', 2 + indent)}}}\n\n{new string(' ', 2 + indent)}tick {{\n{string.Join(";\n", OnTick.Select(expr => new string(' ', 4 + indent) + expr.ToCode(indent + 4)))};\n{new string(' ', 2 + indent)}}}\n\n{new string(' ', 2 + indent)}exit {{\n{string.Join(";\n", OnExit.Select(expr => new string(' ', 4 + indent) + expr.ToCode(indent + 4)))};\n{new string(' ', 2 + indent)}}}\n\n}}";
            }
        }

        public class AgentActionDeclaration : AstNode
        {
            public string Modifier { get; private set; }
            public Identifier Name { get; private set; }
            public List<VariableDeclarator> Parameters { get; private set; }
            public List<AstNode> Body { get; set; }
            public AgentActionDeclaration(string modifier, Identifier name, List<VariableDeclarator> pars) : base(NodeType.AgentActionDeclaration)
            {
                Modifier = modifier;
                Name = name;
                Parameters = pars;
                Body = new List<AstNode>();
            }

            public override string ToCode(int indent = 0)
            {
                return $"{(Modifier != null ? Modifier + " " : "")}action {Name.ToCode(indent + 2)} ({string.Join(", ", Parameters.Select(item => item.ToCode(indent + 2)))}) {{\n{string.Join(";\n", Body.Select(expr => new string(' ', 2 + indent) + expr.ToCode(indent + 2)))};\n{new string(' ', indent)}}}";
            }
        }

        public class ChannelExpression : AstNode
        {
            public AstNode Channel { get; private set; }
            
            public ChannelExpression(AstNode channel) : base(NodeType.ChannelExpression)
            {
                Channel = channel;
            }

            public override string ToCode(int indent = 0)
            {
                return $"@{Channel.ToCode(indent + 2)}";
            }
        }

        public class PublishExpression : AstNode
        {
            public ChannelExpression Channel { get; private set; }
            public AstNode Message { get; private set; }

            public PublishExpression(ChannelExpression channel, AstNode message) : base(NodeType.PublishExpression)
            {
                Channel = channel;
                Message = message;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Channel.ToCode(indent + 2)} <- {Message.ToCode(indent + 2)}";
            }
        }

        public class SubscribeExpression : AstNode
        {
            public ChannelExpression Channel { get; private set; }
            public AstNode Handler { get; private set; }

            public SubscribeExpression(ChannelExpression channel, AstNode handler) : base(NodeType.SubscribeExpression)
            {
                Channel = channel;
                Handler = handler;
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Channel.ToCode(indent + 2)} -> {Handler.ToCode(indent + 2)}";
            }
        }

        public class GraphDeclaration : AstNode
        {
            public Identifier Id { get; private set; }
            public List<VariableDeclarator> Parameters { get; private set; }
            public List<NodeDeclaration> Nodes { get; private set; }
            public List<EdgeDeclaration> Edges { get; private set; }
            public List<AstNode> Initialize { get; private set; }

            public GraphDeclaration(Identifier id, List<VariableDeclarator> pars) : base(NodeType.GraphDeclaration)
            {
                Id = id;
                Parameters = pars;
                Nodes = new List<NodeDeclaration>();
                Edges = new List<EdgeDeclaration>();
                Initialize = new List<AstNode>();
            }

            public void AddNode(NodeDeclaration node)
            {
                Nodes.Add(node);
            }

            public void AddEdge(EdgeDeclaration edge)
            {
                Edges.Add(edge);
            }

            public void SetInitialize(List<AstNode> init)
            {
                Initialize = init;
            }

            public override string ToCode(int indent = 0)
            {
                return $"graph {Id.ToCode(indent + 2)} ({string.Join(", ", Parameters.Select(item => item.ToCode(indent + 2)))}) {{\n{new string(' ', indent)}init {{\n{string.Join(";\n", Initialize.Select(expr => new string(' ', indent + 2) + expr.ToCode(indent + 2)))};\n{new string(' ', indent)}}}\n{string.Join(";\n", Nodes.Select(expr => new string(' ', indent) + expr.ToCode(indent + 2)))};\n{string.Join(";\n", Edges.Select(expr => new string(' ', indent) + expr.ToCode(indent + 2)))};\n}}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["id"] = Id.ToJson();
                json["params"] = JArray.FromObject(Parameters.Select(item => item.ToJson()).ToList());
                json["nodes"] = JArray.FromObject(Nodes.Select(item => item.ToJson()).ToList());
                json["edges"] = JArray.FromObject(Edges.Select(item => item.ToJson()).ToList());
                json["init"] = JArray.FromObject(Initialize.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static GraphDeclaration FromJson(JObject json)
            {
                var id = Identifier.FromJson((JObject)json["id"]);
                var pars = ((JArray)json["params"]).Select(item => VariableDeclarator.FromJson((JObject)item)).ToList();
                var graph = new GraphDeclaration(id, pars);

                foreach (var item in (JArray)json["nodes"])
                {
                    graph.AddNode(NodeDeclaration.FromJson((JObject)item));
                }

                foreach (var item in (JArray)json["edges"])
                {
                    graph.AddEdge(EdgeDeclaration.FromJson((JObject)item));
                }

                var init = ((JArray)json["init"]).Select(item => AstNode.FromJson((JObject)item)).ToList();
                graph.SetInitialize(init);

                return graph;
            }
        }

        public class NodeDeclaration : AstNode
        {
            public Identifier Id { get; private set; }
            public AstNode Initializer { get; private set; }
            public NodeDeclaration(Identifier id, AstNode initial) : base(NodeType.NodeDeclaration)
            {
                Id = id;
                Initializer = initial;
            }

            public override string ToCode(int indent = 0)
            {
                return $"node {Id.ToCode(indent + 2)}: {Initializer.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["id"] = Id.ToJson();
                json["init"] = Initializer.ToJson();
                return json;
            }

            public new static NodeDeclaration FromJson(JObject json)
            {
                var id = Identifier.FromJson((JObject)json["id"]);
                var init = AstNode.FromJson((JObject)json["init"]);
                return new NodeDeclaration(id, init);
            }
        }

        public class EdgeDeclaration : AstNode
        {
            public Identifier Id { get; private set; }
            public AstNode Source { get; private set; }
            public AstNode Sink { get; private set; }
            public string Operator { get; private set; }

            public EdgeDeclaration(Identifier id, AstNode source, AstNode sink, string op): base(NodeType.EdgeDeclaration)
            {
                Id = id;
                Source = source;
                Sink = sink;
                Operator = op;
            }

            public override string ToCode(int indent = 0)
            {
                return $"edge {Id.ToCode(indent + 2)}: {Source.ToCode(indent + 2)} -> {Sink.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["id"] = Id.ToJson();
                json["source"] = Source.ToJson();
                json["sink"] = Sink.ToJson();
                json["operator"] = Operator;
                return json;
            }

            public new static EdgeDeclaration FromJson(JObject json)
            {
                var id = Identifier.FromJson((JObject)json["id"]);
                var source = AstNode.FromJson((JObject)json["source"]);
                var sink = AstNode.FromJson((JObject)json["sink"]);
                var op = json["operator"].ToObject<string>();
                return new EdgeDeclaration(id, source, sink, op);
            }
        }

        public class PolicyDeclaration : AstNode
        {
            public Identifier Id { get; private set; }
            public List<VariableDeclarator> Parameters { get; private set; }
            public Identifier GraphId { get; private set; }
            public List<PolicyDirective> Directives { get; private set; }

            public PolicyDeclaration(Identifier id, List<VariableDeclarator> pars, Identifier graph) : base(NodeType.PolicyDeclaration)
            {
                Id = id;
                Parameters = pars;
                GraphId = graph;
                Directives = new List<PolicyDirective>();
            }

            public void AddDirective(PolicyDirective directive)
            {
                Directives.Add(directive);
            }

            public override string ToCode(int indent = 0)
            {
                return $"policy {Id.ToCode(indent + 2)} ({string.Join(", ", Parameters.Select(item => item.ToCode(indent + 2)))}) for {GraphId.ToCode(indent + 2)} {{\n{string.Join(";\n", Directives.Select(item => new string(' ', indent) + item.ToCode(indent + 2)))};\n}}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["id"] = Id.ToJson();
                json["params"] = JArray.FromObject(Parameters.Select(item => item.ToJson()).ToList());
                json["graphId"] = GraphId.ToJson();
                json["directives"] = JArray.FromObject(Directives.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static PolicyDeclaration FromJson(JObject json)
            {
                var id = Identifier.FromJson((JObject)json["id"]);
                var pars = ((JArray)json["params"]).Select(item => VariableDeclarator.FromJson((JObject)item)).ToList();
                var graphId = Identifier.FromJson((JObject)json["graphId"]);
                var policy = new PolicyDeclaration(id, pars, graphId);
                
                foreach (var item in (JArray)json["directives"])
                {
                    policy.AddDirective(PolicyDirective.FromJson((JObject)item));
                }

                return policy;
            }
        }

        public class PolicyDirective : AstNode
        {
            public Identifier Name { get; private set; }
            public List<AstNode> Arguments { get; private set; }
            public List<Identifier> Operands { get; private set; }

            public PolicyDirective(Identifier name, List<AstNode> args) : base(NodeType.PolicyDirective)
            {
                Name = name;
                Arguments = args;
                Operands = new List<Identifier>();
            }

            public void AddOperand (Identifier operand)
            {
                Operands.Add(operand);
            }

            public override string ToCode(int indent = 0)
            {
                return $"{Name.ToCode(indent + 2)} ({string.Join(", ", Arguments.Select(item => item.ToCode(indent + 2)))}) {string.Join(", ", Operands.Select(item => item.ToCode(indent + 2)))}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["name"] = Name.ToJson();
                json["arguments"] = JArray.FromObject(Arguments.Select(item => item.ToJson()).ToList());
                json["operands"] = JArray.FromObject(Operands.Select(item => item.ToJson()).ToList());
                return json;
            }

            public new static PolicyDirective FromJson(JObject json)
            {
                var name = Identifier.FromJson((JObject)json["name"]);
                var args = ((JArray)json["arguments"]).Select(item => AstNode.FromJson((JObject)item)).ToList();
                var directive = new PolicyDirective(name, args);
                
                foreach (var item in (JArray)json["operands"])
                {
                    directive.AddOperand(Identifier.FromJson((JObject)item));
                }

                return directive;
            }
        }

        public class TagExpression : AstNode
        {
            public Identifier Name { get; private set; }
            public string Operator { get; private set; }
            public Literal Value { get; private set; }

            public bool IsComparable { get => Operator != null && Value != null; }

            public TagExpression(Identifier id, string op = null, Literal val = null) : base(NodeType.TagExpression)
            {
                Name = id;
                Operator = op;
                Value = val;
            }

            public override string ToCode(int indent = 0)
            {
                if (IsComparable) return $"#{Name.ToCode(indent + 2)} {Operator} {Value.ToCode(indent + 2)}";
                else return $"#{Name.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["name"] = Name.ToJson();
                json["operator"] = Operator;
                json["value"] = Value.ToJson();
                return json;
            }

            public new static TagExpression FromJson(JObject json)
            {
                var id = Identifier.FromJson((JObject)json["name"]);
                var op = json["operator"].ToObject<string>();
                var val = AstNode.FromJson((JObject)json["value"]);
                return new TagExpression(id, op, (Literal)val);
            }
        }

        public class SpawnStatement : AstNode
        {
            public AstNode Initializer { get; private set; }
            public CallExpression Policy { get; private set; }

            public SpawnStatement(AstNode initializer): base(NodeType.SpawnStatement)
            {
                Initializer = initializer;
            }

            public void SetPolicy (CallExpression expr)
            {
                Policy = expr;
            }

            public override string ToCode(int indent = 0)
            {
                return $"spawn {Initializer.ToCode(indent + 2)}";
            }

            public override JObject ToJson()
            {
                var json = base.ToJson();
                json["init"] = Initializer.ToJson();
                json["policy"] = Policy.ToJson();
                return json;
            }

            public new static SpawnStatement FromJson(JObject json)
            {
                var init = AstNode.FromJson((JObject)json["init"]);
                var spawn = new SpawnStatement(init);

                var policy = CallExpression.FromJson((JObject)json["policy"]);
                spawn.SetPolicy(policy);

                return spawn;
            }
        }
    }
}
