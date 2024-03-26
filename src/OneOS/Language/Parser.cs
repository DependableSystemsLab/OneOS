using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

using OneOS.Common;
using Newtonsoft.Json.Linq;

namespace OneOS.Language
{
    public class Parser
    {
        private static Dictionary<string, int> OperatorPrecedence = new Dictionary<string, int>()
        {
            { "<-", 1 },
            { "->", 1 },
            { "=", 2 },
            { "+=", 2 },
            { "-=", 2 },
            { "*=", 2 },
            { "/=", 2 },
            { "||", 3 },
            { "&&", 5 },
            { "|", 7 },
            { "&", 11 },
            { "<", 13 },
            { ">", 13 },
            { "<=", 13 },
            { ">=", 13 },
            { "==", 13 },
            { "!=", 13 },
            { "+", 17 },
            { "-", 17 },
            { "*", 19 },
            { "/", 19 },
            { "%", 19 },
            { "^", 23 },
        };
        private static string[] Comparators = new string[] { "<", ">", "<=", ">=", "==", "!=" };

        TokenStream Input;
        LexicalContext Context;

        public Parser(string code)
        {
            Input = new TokenStream(code);
            Context = new LexicalContext();
        }

        private void SkipKeyword(string val)
        {
            var token = Input.Peek();
            if (token.IsKeyword && token.Value == val) Input.Next();
            else Input.Croak($"Expecting keyword '{val}' but got '{token.Value}'");
        }

        private void SkipPunctuation(string val)
        {
            var token = Input.Peek();
            if (token.IsPunctuation && token.Value == val) Input.Next();
            else Input.Croak($"Expecting punctuation '{val}' but got '{token.Value}'");
        }

        private void SkipOperator(params string[] vals)
        {
            var token = Input.Peek();
            if (token.IsOperator && vals.Contains(token.Value)) Input.Next();
            else Input.Croak($"Expecting one of the operators in [{string.Join(", ", vals)}] but got '{token.Value}'");
        }

        private void SkipComments()
        {
            var token = Input.Peek();
            while (token != null && token.IsComment)
            {
                Input.Next();
                token = Input.Peek();
            }
        }

        private Token ParseOperator(params string[] vals)
        {
            var token = Input.Peek();
            if (token.IsOperator && vals.Contains(token.Value)) return Input.Next();
            else
            {
                Input.Croak($"Expecting one of the operators in [{string.Join(", ", vals)}] but got '{token.Value}'");
                return null;
            }
        }

        private List<T> WhileDelimited<T>(string start, string stop, string separator, Func<T> parser)
        {
            var nodes = new List<T>();
            bool first = true;
            var token = Input.Peek();

            SkipPunctuation(start);

            while (!Input.Eof())
            {
                SkipComments();

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == stop) break;
                if (first) first = false; else SkipPunctuation(separator);

                SkipComments();
                token = Input.Peek();
                if (token.IsPunctuation && token.Value == stop) break;

                nodes.Add(parser());
            }

            SkipPunctuation(stop);

            return nodes;
        }

        private List<AstNode> WhileDelimited(string start, string stop, string separator, Func<AstNode> parser) => WhileDelimited<AstNode>(start, stop, separator, parser);

        private List<AstNode.VariableDeclarator> ParseParameters()
        {
            var token = Input.Peek();
            List<AstNode.VariableDeclarator> pars = WhileDelimited("(", ")", ",", () =>
            {
                token = Input.Peek();
                AstNode.VariableDeclarator declarator = null;
                if (token != null && token.IsIdentifier)
                {
                    var varName = Input.Next();
                    declarator = new AstNode.VariableDeclarator(new AstNode.Identifier(varName.Value));
                }
                else
                {
                    Input.Croak($"Parameter expects an Identifier");
                    return null;
                }

                // maybe there is an intialization
                token = Input.Peek();
                if (token != null && token.IsOperator && token.Value == "=")
                {
                    Input.Next();
                    var init = ParseAtom();
                    declarator.SetInitialValue(init);
                }

                return declarator;
            });

            return pars;
        }

        public AstNode Parse()
        {
            var program = new AstNode.Program();

            while (!Input.Eof())
            {
                SkipComments();
                if (Input.Eof()) break;

                var expr = ParseExpression();
                program.Body.Add(expr);
                if (!Input.Eof()) SkipPunctuation(";");
            }

            return program;
        }

        public List<AstNode> ParseBlock()
        {
            return WhileDelimited("{", "}", ";", () => ParseExpression());
        }

        private AstNode ParseExpression()
        {
            return TryParseBinaryExpression(ParseAtom(), 0);
            //var expr = TryParseBinaryExpression(ParseAtom(), 0);
            //return TryParseSequenceExpression(expr);
        }

        private AstNode ParseAtom()
        {
            return TryParseComplexAtom(() =>
            {
                SkipComments();
                var token = Input.Peek();

                if (token.IsInteger) return ParseLiteralInteger();
                else if (token.IsDecimal) return ParseLiteralDecimal();
                else if (token.IsString) return ParseLiteralString();
                else if (token.IsKeyword)
                {
                    if (token.Value == "null") return ParseLiteralNull();
                    else if (token.Value == "true" || token.Value == "false") return ParseLiteralBoolean();
                    else if (token.Value == "let" || token.Value == "const") return ParseVariableDeclaration();
                    else if (token.Value == "return") return ParseReturnStatement();
                    else if (token.Value == "if") return ParseIfStatement();
                    else if (token.Value == "agent") return ParseAgentDeclaration();
                    else if (token.Value == "graph") return ParseGraphDeclaration();
                    else if (token.Value == "node") return ParseNodeDeclaration();
                    else if (token.Value == "edge") return ParseEdgeDeclaration();
                    else if (token.Value == "spawn") return ParseSpawnStatement();
                    else if (token.Value == "policy") return ParsePolicyDeclaration();
                }
                else if (token.IsIdentifier) return ParseIdentifier();
                else if (token.IsPunctuation)
                {
                    if (token.Value == "(") return ParseExpressionStatement();
                    else if (token.Value == "[") return ParseArrayExpression();
                    else if (token.Value == "{") return ParseObjectExpression();
                }
                else if (token.IsOperator)
                {
                    if (token.Value == "#") return ParseTagExpression();
                    else if (token.Value == "@") return ParseChannelExpression();
                }

                Input.Croak($"Unexpected token '{token.Value}'");
                return null;
            });
        }

        private AstNode TryParseBinaryExpression(AstNode lhs, int thisPrecedence)
        {
            var token = Input.Peek();
            if (token != null && token.IsOperator)
            {
                int thatPrecedence = OperatorPrecedence[token.Value];
                if (thatPrecedence > thisPrecedence)
                {
                    Input.Next();
                    /*var rhs = TryParseBinaryExpression(ParseAtom(), thatPrecedence);*/

                    if (OperatorPrecedence[token.Value] == 2)
                    {
                        var rhs = TryParseBinaryExpression(ParseAtom(), thatPrecedence);

                        var assign = new AstNode.AssignmentExpression(token.Value, lhs, rhs);
                        return TryParseBinaryExpression(assign, thisPrecedence);
                    }
                    else if (OperatorPrecedence[token.Value] == 1)
                    {
                        // if lhs is a channel expression, we should not parse rhs before
                        AstNode rhs;
                        var nextToken = Input.Peek();
                        if (nextToken.IsPunctuation && nextToken.Value == "{")
                        {
                            rhs = ParseBlockStatement();
                        }
                        else
                        {
                            rhs = TryParseBinaryExpression(ParseAtom(), thatPrecedence);
                        }

                        if (token.Value == "<-")
                        {
                            if (lhs.Type != AstNode.NodeType.ChannelExpression)
                            {
                                Input.Croak($"Expected ChannelExpression while parsing PublishExpression, but got {lhs.Type}");
                            }

                            var pub = new AstNode.PublishExpression((AstNode.ChannelExpression)lhs, rhs);
                            return TryParseBinaryExpression(pub, thisPrecedence);
                        }
                        else if (token.Value == "->")
                        {
                            if (lhs.Type != AstNode.NodeType.ChannelExpression)
                            {
                                Input.Croak($"Expected ChannelExpression while parsing SubscribeExpression, but got {lhs.Type}");
                            }

                            var pub = new AstNode.SubscribeExpression((AstNode.ChannelExpression)lhs, rhs);
                            return TryParseBinaryExpression(pub, thisPrecedence);
                        }
                        else
                        {
                            Input.Croak($"Unexpected operator {token.Value}");
                        }
                    }
                    else
                    {
                        var rhs = TryParseBinaryExpression(ParseAtom(), thatPrecedence);

                        var binary = new AstNode.BinaryExpression(token.Value, lhs, rhs);
                        return TryParseBinaryExpression(binary, thisPrecedence);
                    }
                }
            }

            return lhs;
        }

        private AstNode TryParseComplexAtom(Func<AstNode> parseAtom)
        {
            var atom = parseAtom();
            var token = Input.Peek();
            if (token != null && token.IsPunctuation && token.Value == "(")
            {
                return TryParseComplexAtom(() => ParseCallExpression(atom));
            }
            else if (token != null && token.IsPunctuation && (token.Value == "." || token.Value == "["))
            {
                return TryParseComplexAtom(() => ParseMemberExpression(atom));
            }   
            else if (token != null && token.IsOperator && (token.Value == "=>"))
            {
                return ParseFunctionExpression(atom);
            }
            /*else if (token != null && token.IsOperator && (token.Value == "<-"))
            {
                return ParsePublishExpression((AstNode.ChannelExpression)atom);
            }
            else if (token != null && token.IsOperator && (token.Value == "->"))
            {
                return ParseSubscribeExpression((AstNode.ChannelExpression)atom);
            }*/

            return atom;
        }

        private AstNode TryParseSequenceExpression(AstNode curExpr)
        {
            var token = Input.Peek();
            if (token != null && token.IsPunctuation && token.Value == ",")
            {
                AstNode.SequenceExpression sequence;
                if (curExpr is AstNode.SequenceExpression)
                {
                    sequence = (AstNode.SequenceExpression)curExpr;
                }
                else
                {
                    sequence = new AstNode.SequenceExpression();
                    sequence.AddExpression(curExpr);
                }

                SkipPunctuation(",");
                sequence.AddExpression(ParseExpression());

                return TryParseSequenceExpression(sequence);
            }

            return curExpr;
        }

        private AstNode.LiteralNull ParseLiteralNull()
        {
            SkipKeyword("null");
            return new AstNode.LiteralNull();
        }

        private AstNode.LiteralBoolean ParseLiteralBoolean() => new AstNode.LiteralBoolean(Input.Next().Value);
        private AstNode.LiteralInteger ParseLiteralInteger() => new AstNode.LiteralInteger(Input.Next().Value);
        private AstNode.LiteralDecimal ParseLiteralDecimal() => new AstNode.LiteralDecimal(Input.Next().Value);
        private AstNode.LiteralString ParseLiteralString() => new AstNode.LiteralString(Input.Next().Value);
        private AstNode.Identifier ParseIdentifier() => new AstNode.Identifier(Input.Next().Value);
        private AstNode.ArrayExpression ParseArrayExpression()
        {
            var elems = WhileDelimited("[", "]", ",", () => ParseAtom());
            return new AstNode.ArrayExpression(elems);
        }

        private AstNode.ObjectExpression ParseObjectExpression()
        {
            var props = WhileDelimited("{", "}", ",", () =>
            {
                var key = ParseLiteralString();

                SkipPunctuation(":");

                var val = ParseExpression();

                return (key.Value, val);
            });

            return new AstNode.ObjectExpression(props);
        }

        private AstNode.VariableDeclaration ParseVariableDeclaration()
        {
            var kind = Input.Next();

            var node = new AstNode.VariableDeclaration(kind.Value);
            
            while (!Input.Eof())
            {
                var token = Input.Peek();
                
                AstNode.VariableDeclarator declarator = null;
                if (token.IsIdentifier)
                {
                    var id = Input.Next();
                    declarator = new AstNode.VariableDeclarator(new AstNode.Identifier(id.Value));
                }
                /*else if (token.IsPunctuation && token.Value == "[")
                {
                    // TODO: handle ArrayPattern
                }
                else if (token.IsPunctuation && token.Value == "{")
                {
                    // TODO: handle ObjectPattern
                }*/
                else
                {
                    Input.Croak($"VariableDeclaration expects an Identifier, ArrayPattern, or ObjectPattern");
                    return null;
                }

                node.Declarations.Add(declarator);

                // maybe there is an intialization
                token = Input.Peek();
                if (token == null)
                {
                    break;
                }
                else if (token.IsOperator && token.Value == "=")
                {
                    Input.Next();
                    var init = ParseExpression();
                    declarator.SetInitialValue(init);
                }

                token = Input.Peek();
                if (token != null && token.IsPunctuation && token.Value == ",")
                {
                    Input.Next();
                    continue;
                }
                else
                {
                    break;
                }
            }

            return node;
        }

        private AstNode.MemberExpression ParseMemberExpression(AstNode obj)
        {
            var token = Input.Peek();
            if (token != null && token.IsPunctuation && token.Value == ".")
            {
                SkipPunctuation(".");

                var prop = ParseIdentifier();
                return new AstNode.MemberExpression(obj, prop, false);
            }
            else if (token != null && token.IsPunctuation && token.Value == "[")
            {
                SkipPunctuation("[");

                var prop = ParseExpression();

                SkipPunctuation("]");
                return new AstNode.MemberExpression(obj, prop, true);
            }

            Input.Croak($"Expecting '.' or '[' while parsing MemberExpression");

            return null;
        }

        private AstNode.CallExpression ParseCallExpression(AstNode callee)
        {
            var args = WhileDelimited("(", ")", ",", () => ParseExpression());

            return new AstNode.CallExpression(callee, args);
        }

        private AstNode.FunctionExpression ParseFunctionExpression(AstNode args)
        {
            var token = Input.Peek();

            if (token != null && token.IsOperator && token.Value == "=>")
            {
                List<AstNode.VariableDeclarator> pars = new List<AstNode.VariableDeclarator>();
                
                // validate that 'args' have the function parameters pattern
                if (args is AstNode.Identifier)
                {
                    pars.Add(new AstNode.VariableDeclarator(args));
                }
                else if (args is AstNode.ExpressionStatement){
                    var expr = (AstNode.ExpressionStatement)args;
                    if (expr.Expression is AstNode.Identifier)
                    {
                        pars.Add(new AstNode.VariableDeclarator(expr.Expression));
                    }
                    else if (expr.Expression is AstNode.AssignmentExpression)
                    {
                        var assign = (AstNode.AssignmentExpression)expr.Expression;
                        if (assign.Left is AstNode.Identifier)
                        {
                            pars.Add(new AstNode.VariableDeclarator(assign.Left, assign.Right));
                        }
                        else
                        {
                            Input.Croak($"Invalid parameter for FunctionExpression");
                            return null;
                        }
                    }
                    else if (expr.Expression is AstNode.SequenceExpression)
                    {
                        var sequence = (AstNode.SequenceExpression)expr.Expression;
                        foreach (var item in sequence.Expressions)
                        {
                            if (item is AstNode.Identifier)
                            {
                                pars.Add(new AstNode.VariableDeclarator(item));
                            }
                            else if (item is AstNode.AssignmentExpression)
                            {
                                var assign = (AstNode.AssignmentExpression)item;
                                if (assign.Left is AstNode.Identifier)
                                {
                                    pars.Add(new AstNode.VariableDeclarator(assign.Left, assign.Right));
                                }
                                else
                                {
                                    Input.Croak($"Invalid parameter for FunctionExpression");
                                    return null;
                                }
                            }
                            else
                            {
                                Input.Croak($"Invalid parameter for FunctionExpression");
                                return null;
                            }
                        }
                    }
                }
                else
                {
                    Input.Croak($"A '=>' cannot follow {args.Type}");
                    return null;
                }

                SkipOperator("=>");

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "{")
                {
                    return new AstNode.FunctionExpression(pars, ParseBlockStatement());
                }
                else
                {
                    return new AstNode.FunctionExpression(pars, ParseExpression());
                }
            }

            Input.Croak($"FunctionExpression was expecting a '=>' after the parameters");
            return null;
        }

        private AstNode.ReturnStatement ParseReturnStatement()
        {
            SkipKeyword("return");

            return new AstNode.ReturnStatement(ParseExpression());
        }

        private AstNode.ExpressionStatement ParseExpressionStatement()
        {
            SkipPunctuation("(");

            var expr = TryParseSequenceExpression(ParseExpression());

            SkipPunctuation(")");

            return new AstNode.ExpressionStatement(expr);
        }

        private AstNode.BlockStatement ParseBlockStatement()
        {
            var body = WhileDelimited("{", "}", ";", () => ParseExpression());
            return new AstNode.BlockStatement(body);
        }

        private AstNode.IfStatement ParseIfStatement()
        {
            var node = new AstNode.IfStatement();

            SkipKeyword("if");
            SkipPunctuation("(");

            node.Predicate = ParseExpression();

            SkipPunctuation(")");

            var token = Input.Peek();

            if (token.IsPunctuation && token.Value == "{")
            {
                node.Consequent = ParseBlockStatement();
            }
            else
            {
                node.Consequent = ParseExpression();
                SkipPunctuation(";");
            }

            // see if it has an else
            token = Input.Peek();

            if (token.IsKeyword && token.Value == "else")
            {
                SkipKeyword("else");

                token = Input.Peek();

                if (token.IsPunctuation && token.Value == "{")
                {
                    node.Alternate = ParseBlockStatement();
                }
                else
                {
                    node.Alternate = ParseExpression();
                    SkipPunctuation(";");
                }
            }

            return node;
        }

        private AstNode.AgentActionDeclaration ParseAgentActionDeclaration(string modifier = null)
        {
            SkipKeyword("action");
            
            var name = ParseIdentifier();

            var pars = ParseParameters();

            var action = new AstNode.AgentActionDeclaration(modifier, name, pars);

            action.Body = ParseBlock();

            return action;
        }

        private AstNode.AgentDeclaration ParseAgentDeclaration()
        {
            SkipKeyword("agent");

            var name = ParseIdentifier();

            var pars = ParseParameters();

            var agent = new AstNode.AgentDeclaration(name, pars);

            var token = Input.Peek();
            
            SkipPunctuation("{");
            
            while (!Input.Eof())
            {
                SkipComments();
                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;

                if (token.IsKeyword && token.Value == "enter")
                {
                    SkipKeyword("enter");
                    agent.OnEnter = ParseBlock();
                }
                else if (token.IsKeyword && token.Value == "exit")
                {
                    SkipKeyword("exit");
                    agent.OnExit = ParseBlock();
                }
                else if (token.IsKeyword && token.Value == "tick")
                {
                    SkipKeyword("tick");
                    agent.OnTick = ParseBlock();
                }
                else if (token.IsKeyword && token.Value == "public")
                {
                    SkipKeyword("public");
                    agent.Actions.Add(ParseAgentActionDeclaration("public"));
                }
                else if (token.IsKeyword && token.Value == "action")
                {
                    agent.Actions.Add(ParseAgentActionDeclaration());
                }
                else
                {
                    agent.Body.Add(ParseExpression());
                }

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;
                else if (token.IsPunctuation && token.Value == ";") SkipPunctuation(";");
            }
            SkipPunctuation("}");

            return agent;
        }

        private AstNode.ChannelExpression ParseChannelExpression()
        {
            SkipOperator("@");

            var token = Input.Peek();
            if (token.IsKeyword && (token.Value == "in" || token.Value == "out"))
            {
                var keyword = token.Value;
                SkipKeyword(keyword);

                return new AstNode.ChannelExpression(new AstNode.Identifier(keyword));
            }
            else
            {
                return new AstNode.ChannelExpression(ParseAtom());
            }
        }

        /*private AstNode.PublishExpression ParsePublishExpression(AstNode.ChannelExpression channel)
        {
            SkipOperator("<-");

            var message = ParseExpression();

            return new AstNode.PublishExpression(channel, message);
        }

        private AstNode.SubscribeExpression ParseSubscribeExpression(AstNode.ChannelExpression channel)
        {
            SkipOperator("->");

            var handler = ParseExpression();

            return new AstNode.SubscribeExpression(channel, handler);
        }*/

        private AstNode.GraphDeclaration ParseGraphDeclaration()
        {
            SkipKeyword("graph");

            var id = ParseIdentifier();

            var token = Input.Peek();
            List<AstNode.VariableDeclarator> pars = WhileDelimited("(", ")", ",", () =>
            {
                token = Input.Peek();
                AstNode.VariableDeclarator declarator = null;
                if (token != null && token.IsIdentifier)
                {
                    var varName = Input.Next();
                    declarator = new AstNode.VariableDeclarator(new AstNode.Identifier(varName.Value));
                }
                else
                {
                    Input.Croak($"Graph Parameter expects an Identifier");
                    return null;
                }

                // maybe there is an intialization
                token = Input.Peek();
                if (token != null && token.IsOperator && token.Value == "=")
                {
                    Input.Next();
                    var init = ParseAtom();
                    declarator.SetInitialValue(init);
                }

                return declarator;
            });

            var graph = new AstNode.GraphDeclaration(id, pars);

            SkipPunctuation("{");

            token = Input.Peek();
            while (!Input.Eof())
            {
                SkipComments();

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;

                if (token.IsIdentifier && token.Value == "init")
                {
                    Input.Next();
                    var block = ParseBlock();
                    graph.SetInitialize(block);
                }
                else if (token.IsKeyword && token.Value == "node")
                {
                    graph.AddNode(ParseNodeDeclaration());
                }
                else if (token.IsKeyword && token.Value == "edge")
                {
                    graph.AddEdge(ParseEdgeDeclaration());
                }
                else
                {
                    Input.Croak($"GraphDeclaration can only contain nodes, edges, and init");
                }

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;
                else if (token.IsPunctuation && token.Value == ";") SkipPunctuation(";");
            }

            SkipPunctuation("}");

            return graph;
        }

        private AstNode.NodeDeclaration ParseNodeDeclaration()
        {
            SkipKeyword("node");
            
            var id = ParseIdentifier();

            SkipPunctuation(":");

            var init = ParseAtom();

            return new AstNode.NodeDeclaration(id, init);
        }

        private AstNode.EdgeDeclaration ParseEdgeDeclaration()
        {
            SkipKeyword("edge");

            var id = ParseIdentifier();

            SkipPunctuation(":");

            var source = ParseAtom();
            
            var op = ParseOperator("->", "-/>", "-*>");

            var sink = ParseAtom();

            return new AstNode.EdgeDeclaration(id, source, sink, op.Value);
        }

        private AstNode.SpawnStatement ParseSpawnStatement()
        {
            SkipKeyword("spawn");

            var spawn = new AstNode.SpawnStatement(ParseExpression());

            var token = Input.Peek();
            if (token.IsKeyword && token.Value == "with")
            {
                SkipKeyword("with");

                var policy = (AstNode.CallExpression)ParseExpression();
                spawn.SetPolicy(policy);
            }

            return spawn;
        }

        private AstNode.PolicyDeclaration ParsePolicyDeclaration()
        {
            SkipKeyword("policy");

            var id = ParseIdentifier();

            var token = Input.Peek();
            List<AstNode.VariableDeclarator> pars = WhileDelimited("(", ")", ",", () =>
            {
                token = Input.Peek();
                AstNode.VariableDeclarator declarator = null;
                if (token != null && token.IsIdentifier)
                {
                    var varName = Input.Next();
                    declarator = new AstNode.VariableDeclarator(new AstNode.Identifier(varName.Value));
                }
                else
                {
                    Input.Croak($"Policy Parameter expects an Identifier");
                    return null;
                }

                // maybe there is an intialization
                token = Input.Peek();
                if (token != null && token.IsOperator && token.Value == "=")
                {
                    Input.Next();
                    var init = ParseAtom();
                    declarator.SetInitialValue(init);
                }

                return declarator;
            });

            SkipKeyword("for");

            var graphId = ParseIdentifier();

            var policy = new AstNode.PolicyDeclaration(id, pars, graphId);

            SkipPunctuation("{");

            var validDirectives = new string[] { "place", "order_by", "min_latency", "max_latency", "min_rate", "max_rate", "checkpoint", "always", "console" };
            token = Input.Peek();
            while (!Input.Eof())
            {
                SkipComments();

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;

                if (token.IsIdentifier && validDirectives.Contains(token.Value))
                {
                    policy.AddDirective(ParsePolicyDirective());
                }
                else
                {
                    Input.Croak($"PolicyDeclaration can only contain the following policy directives: [ {string.Join(", ", validDirectives)} ]");
                }

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == "}") break;
                else if (token.IsPunctuation && token.Value == ";") SkipPunctuation(";");
            }

            SkipPunctuation("}");

            return policy;
        }

        private AstNode.PolicyDirective ParsePolicyDirective()
        {
            var name = ParseIdentifier();

            var args = WhileDelimited("(", ")", ",", () => ParseExpression());

            var directive = new AstNode.PolicyDirective(name, args);

            var token = Input.Peek();
            while (!Input.Eof())
            {
                token = Input.Peek();
                if (token.IsPunctuation && token.Value == ";") break;

                if (token.IsIdentifier)
                {
                    directive.AddOperand(ParseIdentifier());
                }
                else
                {
                    Input.Croak($"PolicyDirective operands should be Identifiers");
                }

                token = Input.Peek();
                if (token.IsPunctuation && token.Value == ";") break;
                else if (token.IsPunctuation && token.Value == ",") SkipPunctuation(",");
            }

            SkipPunctuation(";");

            return directive;
        }

        private AstNode.TagExpression ParseTagExpression()
        {
            SkipOperator("#");

            var id = ParseIdentifier();

            string op = null;
            AstNode.Literal val = null;

            var token = Input.Peek();
            if (!Input.Eof() && token.IsOperator && Comparators.Contains(token.Value))
            {
                op = token.Value;
                Input.Next();

                token = Input.Peek();
                if (token.IsInteger || token.IsDecimal || token.IsIdentifier || token.IsString)
                {
                    var next = ParseAtom();
                    if (next is AstNode.Literal)
                    {
                        val = (AstNode.Literal)next;
                    }
                    else
                    {
                        throw new ParseError($"TagExpression expects a literal value. Parsed {next.ToCode(0)}, whose type is {next.Type}");
                    }
                }
                else
                {
                    throw new ParseError($"TagExpression expects a literal value. Given value is {token.Value}, whose type is {token.Type}");
                }
            }

            return new AstNode.TagExpression(id, op, val);
        }
    }
}
