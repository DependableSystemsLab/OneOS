using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.IO;

using OneOS.Common;
using OneOS.Language;
using OneOSObject = OneOS.Language.Object;

namespace OneOS.Runtime
{
    public class Scheduler : Agent
    {
        private struct ModelAgent
        {
            public long CPU;
            public long Memory;
            public long Disk;
        }

        private struct ModelPipe
        {
            public long Bandwidth;
        }

        private class ModelRuntime
        {
            public string URI { get; private set; }
            public long CPU;
            public long Memory;
            public long Disk;
            public Dictionary<string, long> Bandwidth;
            public Dictionary<string, double> Latency;
            public Dictionary<string, ModelAgent> Agents;
            public List<ModelPipe> OutgoingPipes;
            public List<ModelPipe> IncomingPipes;

            public ModelRuntime(string uri)
            {
                URI = uri;
                Bandwidth = new Dictionary<string, long>();
                Latency = new Dictionary<string, double>();
                Agents = new Dictionary<string, ModelAgent>();
                OutgoingPipes = new List<ModelPipe>();
                IncomingPipes = new List<ModelPipe>();

                Bandwidth[uri] = long.MaxValue;
                Latency[uri] = 0.0;
            }

            // score based on co-tenancy, cpu usage, memory capacity, disk capacity
            public double Score()
            {
                // exponential decay function inversely proportional to agent count
                var score = Math.Exp(-Agents.Count / 2);

                // multiplication factor proportional to resource capacity
                // each resource scaled to arbitrary constant
                score = score * (CPU / 2500.0) * (Memory / 2000.0) * (Disk / 8000.0);

                Console.WriteLine($"  Runtime score of {URI} is {score}");

                return score;
            }

            public void AddAgent(string uri, long cpu, long memory, long disk)
            {
                Agents.Add(uri, new ModelAgent()
                {
                    CPU = cpu,
                    Memory = memory,
                    Disk = disk
                });

                CPU -= cpu;
                Memory -= memory;
                Disk -= disk;
            }

            public void RemoveAgent(string uri)
            {
                var agent = Agents[uri];

                CPU += agent.CPU;
                Memory += agent.Memory;
                Disk += agent.Disk;

                Agents.Remove(uri);
            }

            public void AddOutgoingPipe(string sink, long bandwidth)
            {
                OutgoingPipes.Add(new ModelPipe() { Bandwidth = bandwidth });

                Bandwidth[sink] -= bandwidth;
            }

            public void AddIncomingPipe(string source, long bandwidth)
            {
                IncomingPipes.Add(new ModelPipe() { Bandwidth = bandwidth });

                Bandwidth[source] -= bandwidth;
            }
        }

        public class Schedule
        {
            public Dictionary<string, Registry.AgentInfo> Agents;
            public Dictionary<string, Registry.PipeInfo> Pipes;

            public Schedule()
            {
                Agents = new Dictionary<string, Registry.AgentInfo>();
                Pipes = new Dictionary<string, Registry.PipeInfo>();
            }
        }

        //private Dictionary<(string, string), long> LinkTable;    // bandwidth between peers (in KB/s)
        private Dictionary<string, Dictionary<string, (long, double)>> LinkTable;    // bandwidth between peers (in KB/s), latency
        private Dictionary<string, (int, long, long, long)> RuntimeTable;   // capacity of peers (cores, clockspeed MHz, memory MB, disk MB)
        private Dictionary<string, List<RuntimeTag>> RuntimeTagTable;           // user-defined runtime tags

        private Runtime Runtime;      // reference to Runtime is needed to look up global state
        private Helpers.RandomTextGen RandomText;

        public Scheduler(Agent parent, Runtime runtime) : base(parent)
        {
            URI = $"{parent.URI}/scheduler";
            LinkTable = new Dictionary<string, Dictionary<string, (long, double)>>();
            RuntimeTable = new Dictionary<string, (int, long, long, long)>();
            RuntimeTagTable = new Dictionary<string, List<RuntimeTag>>();
            Runtime = runtime;
            RandomText = new Helpers.RandomTextGen("abcdefghijklmnopqrstuvwxyz");
        }

        private string GenerateAgentURI(string username, string binaryPath, string codePath)
        {
            string codeName = Path.GetFileName(codePath);
            return $"{username}.{Runtime.Domain}/agents/{binaryPath}/{codeName}/{RandomText.Next()}";
        }

        public void UpdateLinkInfo (string source, string sink, long bandwidth, double latency)
        {
            if (!LinkTable.ContainsKey(source)) LinkTable[source] = new Dictionary<string, (long, double)>();
            LinkTable[source][sink] = (bandwidth, latency);

            Console.WriteLine($"{this} Updated Link Info for {source} -> {sink} : {Math.Round((double)bandwidth, 3)} KB/s, {Math.Round(latency, 3)} ms");
        }

        public void UpdateRuntimeInfo (string host, int cores, long clockSpeed, long memory, long disk, List<string> tags)
        {
            RuntimeTable[host] = (cores, clockSpeed, memory, disk);
            RuntimeTagTable[host] = tags.Select(item => RuntimeTag.Parse(item)).ToList();

            // create "special tags"
            RuntimeTagTable[host].Add(new RuntimeTag("cores", cores, typeof(int)));
            RuntimeTagTable[host].Add(new RuntimeTag("memory", (int)memory, typeof(int)));
            RuntimeTagTable[host].Add(new RuntimeTag("disk", (int)disk, typeof(int)));

            Console.WriteLine($"{this} Updated Runtime Info for {host}: {cores} x {clockSpeed} MHz, RAM {memory} MB, Disk {disk} MB, Tags: [{string.Join(", ", tags)}]");
        }

        private Dictionary<string, ModelRuntime> BuildNetworkModel()
        {
            var networkModel = RuntimeTable.ToDictionary(item => item.Key, item => new ModelRuntime(item.Key)
            {
                CPU = item.Value.Item1 * item.Value.Item2,
                Memory = item.Value.Item3,
                Disk = item.Value.Item4
            });
            foreach (var source in LinkTable.Keys)
            {
                foreach (var sink in LinkTable[source])
                {
                    networkModel[source].Bandwidth[sink.Key] = sink.Value.Item1;
                    networkModel[source].Latency[sink.Key] = sink.Value.Item2;
                }
            }

            foreach (var item in Runtime.Registry.Agents)
            {
                var runtime = networkModel[item.Value.Runtime];

                runtime.AddAgent(item.Key, 500, 100, 100);  // arbitrary numbers
            }

            foreach (var item in Runtime.Registry.Pipes)
            {
                var sourceRuntimeUri = Runtime.Registry.Agents[item.Value.Source].Runtime;
                var sinkRuntimeUri = Runtime.Registry.Agents[item.Value.Sink].Runtime;

                networkModel[sourceRuntimeUri].Bandwidth[sinkRuntimeUri] -= 1000; // arbitrary number
                networkModel[sinkRuntimeUri].Bandwidth[sourceRuntimeUri] -= 1000; // arbitrary number
            }

            return networkModel;
        }

        public string PrintNetworkModel()
        {
            var networkModel = BuildNetworkModel();
            return string.Join("\n", networkModel.OrderBy(item => item.Key).Select(item => $"{item.Key} : CPU {item.Value.CPU} / {RuntimeTable[item.Key].Item1 * RuntimeTable[item.Key].Item2} ({RuntimeTable[item.Key].Item2} MHz x {RuntimeTable[item.Key].Item1}), RAM {item.Value.Memory} / {RuntimeTable[item.Key].Item3} MB, Disk {item.Value.Disk} / {RuntimeTable[item.Key].Item4} MB, Hosting {item.Value.Agents.Count} agents\n{string.Join("\n", item.Value.Bandwidth.Keys.Where(key => key != item.Key).Select(key => $"    -> {key}: Bandwidth {item.Value.Bandwidth[key]} KB/s, Latency {item.Value.Latency[key]} ms"))}\n"));
        }

        internal List<Dictionary<string, object>> GetNetworkModel()
        {
            var list = new List<Dictionary<string, object>>();

            foreach (var item in RuntimeTable)
            {
                list.Add(new Dictionary<string, object>()
                {
                    { "uri", item.Key },
                    { "status", Runtime.ActiveRuntimes.Contains(item.Key) ? "Alive" : "Dead" },
                    { "agents", Runtime.Registry.Agents.Count(agent => agent.Value.Runtime == item.Key) },
                    { "cores", item.Value.Item1 },
                    { "clockSpeed", item.Value.Item2 },
                    { "memoryMB", item.Value.Item3 },
                    { "diskMB", item.Value.Item4 }
                });
            }

            return list;
        }

        internal static bool ValidateGraph(Graph graph)
        {
            foreach (var item in graph.Edges)
            {
                var edge = item.Value;
                var sourceFormat = "raw";
                var sinkFormat = "raw";

                if (edge.Source.Options != null && edge.Source.Options.ContainsKey("outputFormat"))
                {
                    sourceFormat = (string)edge.Source.Options["outputFormat"].Value;
                }

                if (edge.Sink.Options != null && edge.Sink.Options.ContainsKey("inputFormat"))
                {
                    sinkFormat = (string)edge.Sink.Options["inputFormat"].Value;
                }

                if (sourceFormat != sinkFormat)
                {
                    throw new EvaluationError($"App Graph Composition Error: In edge '{item.Key}', the output format of source node ({sourceFormat}) does not match the input format of sink node ({sinkFormat})");
                }
            }

            return true;
        }

        private bool ValidatePolicy(Graph graph, Policy policy)
        {
            if (policy == null) return true;

            var pDirectives = policy.Directives.Where(item => item.Name == "place");
            var oDirectives = policy.Directives.Where(item => item.Name == "order_by");
            var minRateDirectives = policy.Directives.Where(item => item.Name == "min_rate");
            var maxRateDirectives = policy.Directives.Where(item => item.Name == "max_rate");
            var minLatDirectives = policy.Directives.Where(item => item.Name == "min_latency");
            var maxLatDirectives = policy.Directives.Where(item => item.Name == "max_latency");
            var cDirectives = policy.Directives.Where(item => item.Name == "checkpoint");
            var aDirectives = policy.Directives.Where(item => item.Name == "always");
            var consoleDirectives = policy.Directives.Where(item => item.Name == "console");

            foreach (var item in graph.Nodes)
            {
                // Check if node is in more than one place directive
                if (pDirectives.Count(dir => dir.Operands.Contains(item.Key)) > 1)
                {
                    throw new EvaluationError($"App Graph Policy Error: More than one 'place' directive declared for node '{item.Key}'");
                }
            }

            foreach (var item in graph.Edges)
            {
                var minRate = minRateDirectives.Where(dir => dir.Operands.Contains(item.Key));
                var maxRate = maxRateDirectives.Where(dir => dir.Operands.Contains(item.Key));

                if (minRate.Count() > 1)
                {
                    throw new EvaluationError($"App Graph Policy Error: More than one 'min_rate' directive declared for node '{item.Key}'");
                }
                if (maxRate.Count() > 1)
                {
                    throw new EvaluationError($"App Graph Policy Error: More than one 'max_rate' directive declared for node '{item.Key}'");
                }

                if (minRate.Count() == 1 && maxRate.Count() == 1)
                {
                    var prog = AstNode.Parse(minRate.First().Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];
                    var ctx = new EvaluationContext(null);
                    Object<decimal> minRateValue = (Object<decimal>)EvaluateDirective(expr, ctx);

                    prog = AstNode.Parse(maxRate.First().Arguments);
                    expr = ((AstNode.Program)prog).Body[0];
                    ctx = new EvaluationContext(null);
                    Object<decimal> maxRateValue = (Object<decimal>)EvaluateDirective(expr, ctx);

                    if (minRateValue > maxRateValue)
                    {
                        throw new EvaluationError($"App Graph Policy Error: 'min_rate' is larger than 'max_rate' for edge '{item.Key}'");
                    }
                }
            }
            
            return true;
        }

        public Schedule ScheduleGraph(string username, Dictionary<string, string> env, Graph graph, Policy policy = null)
        {
            // First validate the graph and policy
            ValidateGraph(graph);
            ValidatePolicy(graph, policy);

            // First construct a model of the network
            var networkModel = BuildNetworkModel();

            Console.WriteLine($"Network model:\n{string.Join("\n", networkModel.Select(item => $"{item.Key} : {item.Value.CPU} MHz, {item.Value.Memory} MB, {item.Value.Disk} MB\n{string.Join("\n", item.Value.Bandwidth.Select(elem => $"    -> {elem.Key}: {Math.Round((double)elem.Value / 1000, 3)} MB/s, {Math.Round(item.Value.Latency[elem.Key], 3)} ms"))}"))}");

            // Build name and id mappings, parallelize node and edge ids
            var nameMap = graph.Nodes.ToDictionary(item => item.Value.Id, item => item.Key); // reverse map for finding assigned node names by internal Id
            var sortedNodes = graph.GetSortedNodes();   // sorted node list, before parallelization
            var spawnList = new List<string>();
            foreach (var id in sortedNodes)
            {
                if (graph.IsParallelNode(nameMap[id]))
                {
                    for (var i = 0; i < networkModel.Count; i++)
                    {
                        var uid = $"{id}-{i}";
                        spawnList.Add(uid);
                        nameMap[uid] = nameMap[id];
                    }
                }
                else
                {
                    spawnList.Add(id);
                }
            }

            Console.WriteLine($"Spawn list is:\n{string.Join(", ", spawnList.Select(uid => $"{nameMap[uid]} ({uid})"))}");

            var mapping = new Dictionary<string, string>();
            var placementConstraints = new Dictionary<string, Func<string, string, double>>();    // key: nodeName, val: Func<runtimeUri> => true/false
            var configurators = new Dictionary<string, Action<string, Registry.AgentInfo>>();
            var pipeConfigurators = new Dictionary<string, Action<string, Registry.PipeInfo>>();

            // Check if there is a given policy
            if (policy != null)
            {
                var pDirectives = policy.Directives.Where(item => item.Name == "place");
                var oDirectives = policy.Directives.Where(item => item.Name == "order_by");
                var minRateDirectives = policy.Directives.Where(item => item.Name == "min_rate");
                var maxRateDirectives = policy.Directives.Where(item => item.Name == "max_rate");
                var minLatDirectives = policy.Directives.Where(item => item.Name == "min_latency");
                var maxLatDirectives = policy.Directives.Where(item => item.Name == "max_latency");
                var cDirectives = policy.Directives.Where(item => item.Name == "checkpoint");
                var aDirectives = policy.Directives.Where(item => item.Name == "always");
                var consoleDirectives = policy.Directives.Where(item => item.Name == "console");

                // handle placement directives first as they're the hardest constraints
                foreach (var item in pDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    var prog = AstNode.Parse(item.Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];

                    Console.WriteLine(expr.ToCode(0));

                    var selector = new Func<string, double>(uri =>
                    {
                        var ctx = new EvaluationContext(null);
                        ctx["tags"] = new Array<RuntimeTag>(RuntimeTagTable[uri]);
                        Object<bool> result = (Object<bool>)EvaluateDirective(expr, ctx);

                        return result.Value ? 1.0 : 0.0;
                    });

                    foreach (var op in item.Operands)
                    {
                        // there could be multiple constraints defined on the same node
                        if (placementConstraints.ContainsKey(op))
                        {
                            var existingSelector = placementConstraints[op];
                            placementConstraints[op] = (uid, runtimeUri) => existingSelector(uid, runtimeUri) * selector(runtimeUri);
                        }
                        else
                        {
                            placementConstraints[op] = (uid, runtimeUri) => selector(runtimeUri);
                        }
                    }
                }

                foreach (var item in oDirectives)
                {
                    var pipeConfigurator = new Action<Registry.PipeInfo>(pipeInfo =>
                    {
                        pipeInfo.OrderBy = item.Arguments;
                    });

                    foreach (var op in item.Operands)
                    {
                        var edge = graph.Edges[op];
                        var pipeGroup = graph.URI + "." + op;

                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            var existingAction = pipeConfigurators[pipeGroup];
                            pipeConfigurators[pipeGroup] = (uid, pipeInfo) =>
                            {
                                existingAction(uid, pipeInfo);
                                pipeConfigurator(pipeInfo);
                            };
                        }
                        else
                        {
                            pipeConfigurators[pipeGroup] = (pipeKey, pipeInfo) => pipeConfigurator(pipeInfo);
                        }
                    }
                }

                // handle max_latency directives next
                foreach (var item in maxLatDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    var prog = AstNode.Parse(item.Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];

                    var sourceSelector = new Func<string, double>(source =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        var outgoingEdges = networkModel[source].Latency
                            .Where(elem => (decimal)elem.Value <= result.Value)
                            .Aggregate(0.0, (acc, elem) => acc + (elem.Value > 0.0 ? Decimal.ToDouble(result.Value / (decimal)elem.Value) : 0.01));

                        Console.WriteLine($"{this} Outgoing Link score of {source} is {outgoingEdges}");

                        /*var outgoingEdges = LinkTable[source].Values
                            .Where(tuple => (decimal)tuple.Item1 / 1000 >= result.Value)
                            .Aggregate(0.0, (acc, tuple) => acc + Decimal.ToDouble((decimal)tuple.Item1 / 1000 / result.Value));*/

                        // source "goodness" is determined by:
                        // number of outgoing edges matching the criteria
                        // quality of edges matching the criteria

                        return outgoingEdges;
                    });

                    /*var sourceConfigurator = new Action<Registry.AgentInfo>(agentInfo =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        agentInfo.OutputRate = Decimal.ToSingle(result.Value) + (float)0.5;
                    });*/

                    foreach (var op in item.Operands)
                    {
                        var edge = graph.Edges[op];
                        var source = nameMap[edge.Source.Id];
                        var sink = nameMap[edge.Sink.Id];

                        // we place nodes in topological order, so by the time sinkSelector
                        // is invoked, the source has been selected -- i.e., source is assigned in "mapping[]".
                        var sinkSelector = new Func<string, string, double>((uid, sinkRuntime) =>
                        {
                            var ctx = new EvaluationContext(null);
                            Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                            string sourceRuntime = null;
                            // check if node is parallel node
                            if (edge.Kind == Graph.Edge.EdgeType.Split)
                            {
                                sourceRuntime = mapping[edge.Source.Id];
                            }
                            else if (edge.Kind == Graph.Edge.EdgeType.Merge)
                            {
                                sourceRuntime = mapping[$"{edge.Source.Id}-0"];
                            }
                            else if (graph.IsParallelNode(nameMap[uid]))
                            {
                                var partition = uid.Split('-')[1];
                                sourceRuntime = mapping[$"{edge.Source.Id}-{partition}"];
                            }
                            else
                            {
                                sourceRuntime = mapping[edge.Source.Id];
                            }

                            // allow, but discourage placing source and sink in the same node
                            // the below line must precede the last return statement, otherwise
                            // it would throw a key does not exist error
                            if (sourceRuntime == sinkRuntime) return 1.0;

                            //return Decimal.ToDouble(((decimal)LinkTable[sourceRuntime][sinkRuntime].Item1) / 1000 / result.Value);
                            return Decimal.ToDouble(result.Value / ((decimal)networkModel[sinkRuntime].Latency[sourceRuntime]));
                        });

                        if (placementConstraints.ContainsKey(source))
                        {
                            var existingSelector = placementConstraints[source];
                            placementConstraints[source] = (uid, runtimeUri) => existingSelector(uid, runtimeUri) * sourceSelector(runtimeUri);
                        }
                        else
                        {
                            placementConstraints[source] = (uid, runtimeUri) => sourceSelector(runtimeUri);
                        }

                        if (placementConstraints.ContainsKey(sink))
                        {
                            var existingSelector = placementConstraints[sink];
                            placementConstraints[sink] = (uid, runtimeUri) => existingSelector(uid, runtimeUri) * sinkSelector(uid, runtimeUri);
                        }
                        else
                        {
                            placementConstraints[sink] = sinkSelector;
                        }
                    }
                }

                // handle min_rate directives next
                foreach (var item in minRateDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    var prog = AstNode.Parse(item.Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];

                    Console.WriteLine(expr.ToCode(0));
                    var sourceSelector = new Func<string, double>(source =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        var outgoingEdges = networkModel[source].Bandwidth
                            .Where(elem => (decimal)elem.Value / 1000 >= result.Value)
                            .Aggregate(0.0, (acc, elem) => acc + Decimal.ToDouble((decimal)elem.Value / 1000 / result.Value));

                        Console.WriteLine($"{this} Outgoing Link score of {source} is {outgoingEdges}");

                        /*var outgoingEdges = LinkTable[source].Values
                            .Where(tuple => (decimal)tuple.Item1 / 1000 >= result.Value)
                            .Aggregate(0.0, (acc, tuple) => acc + Decimal.ToDouble((decimal)tuple.Item1 / 1000 / result.Value));*/

                        // source "goodness" is determined by:
                        // number of outgoing edges matching the criteria
                        // quality of edges matching the criteria

                        return outgoingEdges;
                    });

                    /*var sourceConfigurator = new Action<Registry.AgentInfo>(agentInfo =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        agentInfo.OutputRate = Decimal.ToSingle(result.Value) + (float)0.5;
                    });*/

                    var pipeConfigurator = new Action<Registry.PipeInfo>(pipeInfo =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        pipeInfo.MinRate = Decimal.ToSingle(result.Value);
                    });

                    foreach (var op in item.Operands)
                    {
                        var edge = graph.Edges[op];
                        var source = nameMap[edge.Source.Id];
                        var sink = nameMap[edge.Sink.Id];

                        // we place nodes in topological order, so by the time sinkSelector
                        // is invoked, the source has been selected -- i.e., source is assigned in "mapping[]".
                        var sinkSelector = new Func<string, string, double>((uid, sinkRuntime) =>
                        {
                            var ctx = new EvaluationContext(null);
                            Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                            string sourceRuntime = null;
                            // check if node is parallel node
                            if (edge.Kind == Graph.Edge.EdgeType.Split)
                            {
                                sourceRuntime = mapping[edge.Source.Id];
                            }
                            else if (edge.Kind == Graph.Edge.EdgeType.Merge)
                            {
                                // TODO: Return a sum of bandwidth instead
                                sourceRuntime = mapping[$"{edge.Source.Id}-0"];
                            }
                            else if (graph.IsParallelNode(nameMap[uid]))
                            {
                                var partition = uid.Split('-')[1];
                                sourceRuntime = mapping[$"{edge.Source.Id}-{partition}"];
                            }
                            else
                            {
                                sourceRuntime = mapping[edge.Source.Id];
                            }

                            // allow, but discourage placing source and sink in the same node
                            // the below line must precede the last return statement, otherwise
                            // it would throw a key does not exist error
                            if (sourceRuntime == sinkRuntime) return 1.0;

                            //return Decimal.ToDouble(((decimal)LinkTable[sourceRuntime][sinkRuntime].Item1) / 1000 / result.Value);
                            return Decimal.ToDouble(((decimal)networkModel[sinkRuntime].Bandwidth[sourceRuntime]) / 1000 / result.Value);
                        });
                        
                        if (placementConstraints.ContainsKey(source))
                        {
                            var existingSelector = placementConstraints[source];
                            placementConstraints[source] = (uid, runtimeUri) => existingSelector(uid, runtimeUri) * sourceSelector(runtimeUri);
                        }
                        else
                        {
                            placementConstraints[source] = (uid, runtimeUri) => sourceSelector(runtimeUri);
                        }

                        if (placementConstraints.ContainsKey(sink))
                        {
                            var existingSelector = placementConstraints[sink];
                            placementConstraints[sink] = (uid, runtimeUri) => existingSelector(uid, runtimeUri) * sinkSelector(uid, runtimeUri);
                        }
                        else
                        {
                            placementConstraints[sink] = sinkSelector;
                        }

                        /*if (configurators.ContainsKey(source))
                        {
                            var existingAction = configurators[source];
                            configurators[source] = (uid, agentInfo) =>
                            {
                                existingAction(uid, agentInfo);
                                sourceConfigurator(agentInfo);
                            };
                        }
                        else
                        {
                            configurators[source] = (uid, agentInfo) => sourceConfigurator(agentInfo);
                        }*/
                        var pipeGroup = graph.URI + "." + op;
                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            var existingAction = pipeConfigurators[pipeGroup];
                            pipeConfigurators[pipeGroup] = (uid, pipeInfo) =>
                            {
                                existingAction(uid, pipeInfo);
                                pipeConfigurator(pipeInfo);
                            };
                        }
                        else
                        {
                            pipeConfigurators[pipeGroup] = (pipeKey, pipeInfo) => pipeConfigurator(pipeInfo);
                        }
                    }
                }

                foreach (var item in maxRateDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    var prog = AstNode.Parse(item.Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];

                    Console.WriteLine(expr.ToCode(0));
                    var sourceConfigurator = new Action<Registry.AgentInfo>(agentInfo =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        agentInfo.OutputRateLimit = Decimal.ToSingle(result.Value);
                    });
                    var pipeConfigurator = new Action<Registry.PipeInfo>(pipeInfo =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<decimal> result = (Object<decimal>)EvaluateDirective(expr, ctx);

                        pipeInfo.MaxRate = Decimal.ToSingle(result.Value);
                    });

                    foreach (var op in item.Operands)
                    {
                        var edge = graph.Edges[op];
                        var source = nameMap[edge.Source.Id];
                        var sink = nameMap[edge.Sink.Id];

                        if (configurators.ContainsKey(source))
                        {
                            var existingAction = configurators[source];
                            configurators[source] = (uid, agentInfo) =>
                            {
                                existingAction(uid, agentInfo);
                                sourceConfigurator(agentInfo);
                            };
                        }
                        else
                        {
                            configurators[source] = (uid, agentInfo) => sourceConfigurator(agentInfo);
                        }

                        var pipeGroup = graph.URI + "." + op;
                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            var existingAction = pipeConfigurators[pipeGroup];
                            pipeConfigurators[pipeGroup] = (uid, pipeInfo) =>
                            {
                                existingAction(uid, pipeInfo);
                                pipeConfigurator(pipeInfo);
                            };
                        }
                        else
                        {
                            pipeConfigurators[pipeGroup] = (pipeKey, pipeInfo) => pipeConfigurator(pipeInfo);
                        }
                    }
                }

                foreach (var item in cDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    var prog = AstNode.Parse(item.Arguments);
                    var expr = ((AstNode.Program)prog).Body[0];

                    Console.WriteLine(expr.ToCode(0));
                    var nodeConfigurator = new Action<string, Registry.AgentInfo>((uid, agentInfo) =>
                    {
                        var ctx = new EvaluationContext(null);
                        Object<int> result = (Object<int>)EvaluateDirective(expr, ctx);

                        // We set the checkpoint interval for the agent here,
                        // but how the checkpointing is triggered depends on the position in the stream.
                        // The trigger will be determined by the Runtime by looking at the upstream nodes.
                        agentInfo.CheckpointInterval = result.Value;
                    });

                    foreach (var op in item.Operands)
                    {
                        if (configurators.ContainsKey(op))
                        {
                            var existingAction = configurators[op];
                            configurators[op] = (uid, agentInfo) =>
                            {
                                existingAction(uid, agentInfo);
                                nodeConfigurator(uid, agentInfo);
                            };
                        }
                        else
                        {
                            configurators[op] = (uid, agentInfo) => nodeConfigurator(uid, agentInfo);
                        }
                    }
                }

                foreach (var item in aDirectives)
                {
                    foreach (var op in item.Operands)
                    {
                        var sourceConfigurator = new Action<string, Registry.AgentInfo>((uid, agentInfo) =>
                        {
                            Func<string, double> selector = null;
                            if (placementConstraints.ContainsKey(op))
                            {
                                selector = host => placementConstraints[op](uid, host) * networkModel[host].Score();
                            }
                            else
                            {
                                selector = host => networkModel[host].Score();
                            }
                            var eligible = RuntimeTable.Keys.Where(host => host != agentInfo.Runtime && selector(host) > 0.0).OrderBy(host => selector(host)).Reverse().ToList();

                            if (eligible.Count == 0) throw new SchedulingError($"{this} Cannot ensure that {op} is always available because no host can satisfy its contraints");

                            agentInfo.StandbyRuntime = eligible[0];
                        });

                        if (configurators.ContainsKey(op))
                        {
                            var existingAction = configurators[op];
                            configurators[op] = (uid, agentInfo) =>
                            {
                                existingAction(uid, agentInfo);
                                sourceConfigurator(uid, agentInfo);
                            };
                        }
                        else
                        {
                            configurators[op] = sourceConfigurator;
                        }
                    }
                }

                foreach (var item in consoleDirectives)
                {
                    // Using an internal parser to evaluate policy directives
                    // This is rather hacky; (TODO:) better to built selectors when interpreting a PolicyDeclaration
                    // and have them available in the Policy object.
                    
                    var configurator = new Action<Registry.AgentInfo>(agentInfo =>
                    {
                        agentInfo.OutputToShell = true;
                    });

                    foreach (var op in item.Operands)
                    {
                        if (configurators.ContainsKey(op))
                        {
                            var existingAction = configurators[op];
                            configurators[op] = (uid, agentInfo) =>
                            {
                                existingAction(uid, agentInfo);
                                configurator(agentInfo);
                            };
                        }
                        else
                        {
                            configurators[op] = (uid, agentInfo) => configurator(agentInfo);
                        }
                    }
                }
            }

            // do exhaustive DFS
            Func<List<string>, bool> search = null;
            search = nodes =>
            {
                if (nodes.Count == 0) return true;

                var uid = nodes[0];
                var nodeName = nameMap[uid];
                var node = graph.Nodes[nodeName];
                var outgoingEdges = graph.GetEdgesFrom(node);
                var incomingEdges = graph.GetEdgesTo(node);

                if (!configurators.ContainsKey(nodeName)) configurators[nodeName] = null;   // this line is not part of the dfs logic; just piggybacking on the search to initialize the configurator

                List<string> eligible;

                Console.WriteLine($"Trying to place {nodeName} ({uid})...");

                // check if node has placement constraints
                if (placementConstraints.ContainsKey(nodeName))
                {
                    var selector = placementConstraints[nodeName];
                    eligible = RuntimeTable.Keys.Where(host => selector(uid, host) > 0.0).OrderBy(host => selector(uid, host) * networkModel[host].Score()).Reverse().ToList();
                }
                else if (node.Kind == Graph.Node.NodeType.Lambda)
                {
                    // if it has incoming edges and if the edge is split or basic, place it on the upstream node
                    var incoming = incomingEdges.Where(item => item.Kind != Graph.Edge.EdgeType.Merge && mapping.ContainsKey(item.Source.Id)).ToList();
                    if (incoming.Count > 0)
                    {
                        eligible = incoming.Select(item => mapping[item.Source.Id]).Distinct().OrderBy(host => networkModel[host].Score()).ToList();
                    }
                    else
                    {
                        // pick random for now (TODO: place it towards the downstream)
                        eligible = networkModel.Keys.OrderBy(host => networkModel[host].Score()).ToList();
                    }
                }
                else
                {
                    var tokens = node.Arguments.Split(' ');
                    var abspath = tokens[0];
                    var locations = Runtime.Registry.ListFileLocations(abspath);
                    eligible = locations.Keys.OrderBy(host => networkModel[host].Score()).Reverse().ToList();
                }

                foreach (var selected in eligible)
                {
                    // place the current candidate node in the mapping
                    mapping[uid] = selected;

                    Console.WriteLine($"  Selected {selected} for {nodeName} for now");

                    networkModel[selected].AddAgent(uid, 500, 100, 100);

                    // subtract bandwidth for all possible outgoing edges
                    foreach (var edge in outgoingEdges)
                    {
                        foreach (var peer in networkModel[selected].Bandwidth.Keys.ToList())
                        {
                            networkModel[selected].Bandwidth[peer] -= 1000;
                        }
                    }

                    // subtract bandwidth for all incoming edges
                    foreach (var edge in incomingEdges)
                    {
                        string source = null;
                        if (edge.Kind == Graph.Edge.EdgeType.Split)
                        {
                            source = mapping[edge.Source.Id];
                        }
                        else if (edge.Kind == Graph.Edge.EdgeType.Merge)
                        {
                            source = mapping[$"{edge.Source.Id}-0"];
                        }
                        else if (graph.IsParallelNode(node))
                        {
                            var partition = uid.Split('-')[1];
                            source = mapping[$"{edge.Source.Id}-{partition}"];
                        }
                        else
                        {
                            source = mapping[edge.Source.Id];
                        }
                        if (selected != source) networkModel[selected].Bandwidth[source] -= 1000;
                    }

                    // search a schedule for downstream nodes
                    var found = search(nodes.Skip(1).ToList());

                    if (found) return true;

                    // if not found, revert the mapping
                    // place the current candidate node in the mapping
                    mapping.Remove(uid);

                    Console.WriteLine($"  Unselecting {selected} for {nodeName}...");

                    networkModel[selected].RemoveAgent(uid);

                    // increase bandwidth for all possible outgoing edges
                    foreach (var edge in outgoingEdges)
                    {
                        foreach (var peer in networkModel[selected].Bandwidth.Keys.ToList())
                        {
                            networkModel[selected].Bandwidth[peer] += 1000;
                        }
                    }

                    // increase bandwidth for all incoming edges
                    foreach (var edge in incomingEdges)
                    {
                        string source = null;
                        if (graph.IsParallelNode(node))
                        {
                            var partition = uid.Split('-')[1];
                            source = mapping[$"{edge.Source.Id}-{partition}"];
                        }
                        else
                        {
                            source = mapping[edge.Source.Id];
                        }
                        if (selected != source) networkModel[selected].Bandwidth[source] += 1000;
                    }
                }

                return false;
            };
            
            var scheduleFound = search(spawnList);

            if (!scheduleFound) throw new SchedulingError($"Could not find a schedule for the given graph after exhaustive search");

            Console.WriteLine($"{this} Found a schedule for the given graph:\n{string.Join("\n", spawnList.Select(uid => $"  {nameMap[uid]} ({uid}) on {mapping[uid]}"))}");

            // Create schedule
            var schedule = new Schedule();
            var agentMap = new Dictionary<string, Registry.AgentInfo>();
            spawnList.Reverse();
            foreach (var uid in spawnList)
            {
                var node = graph.Nodes[nameMap[uid]];
                var agentInfo = new Registry.AgentInfo();
                if (node.Kind == Graph.Node.NodeType.Process)
                {
                    agentInfo.URI = GenerateAgentURI(username, node.BinaryPath, node.Arguments.Split(' ')[0]);
                }
                else if (node.Kind == Graph.Node.NodeType.Lambda)
                {
                    agentInfo.URI = GenerateAgentURI(username, "lambda", nameMap[uid]);
                }
                else
                {
                    throw new SchedulingError($"Invalid Agent Type {node.Kind}");
                }
                agentInfo.User = username;
                agentInfo.Language = Registry.LanguageMap[node.BinaryPath];
                agentInfo.Environment = env;
                agentInfo.OutputToShell = false;
                agentInfo.BinaryPath = node.BinaryPath;
                agentInfo.Arguments = node.Arguments;
                agentInfo.Subscriptions = new List<string> { $"{agentInfo.URI}:stdin", $"{agentInfo.URI}:upstream" };
                agentInfo.CheckpointInterval = 0;
                agentInfo.OutputRateLimit = 9999;

                if (node.Options != null)
                {
                    Console.WriteLine($"{this} node has options: {node.Options.ToJson()}");
                    agentInfo.Options = node.Options.ToDictionary();
                }

                agentInfo.Runtime = mapping[uid];
                configurators[nameMap[uid]]?.Invoke(uid, agentInfo);

                agentMap[uid] = agentInfo;
                schedule.Agents.Add(agentInfo.URI, agentInfo);
            }

            foreach (var item in graph.Edges)
            {
                var edge = item.Value;
                var pipeGroup = graph.URI + "." + item.Key;

                if (edge.Kind == Graph.Edge.EdgeType.Split)
                {
                    for (var i = 0; i < networkModel.Count; i++)
                    {
                        var pipe = new Registry.PipeInfo(agentMap[edge.Source.Id].URI, agentMap[$"{edge.Sink.Id}-{i}"].URI, pipeGroup, "split");
                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            pipeConfigurators[pipeGroup](pipe.Key, pipe);
                        }
                        schedule.Pipes.Add(pipe.Key, pipe);
                    }
                }
                else if (edge.Kind == Graph.Edge.EdgeType.Merge)
                {
                    for (var i = 0; i < networkModel.Count; i++)
                    {
                        var pipe = new Registry.PipeInfo(agentMap[$"{edge.Source.Id}-{i}"].URI, agentMap[edge.Sink.Id].URI, pipeGroup, "merge");
                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            pipeConfigurators[pipeGroup](pipe.Key, pipe);
                        }
                        schedule.Pipes.Add(pipe.Key, pipe);
                    }
                }
                else if (edge.Kind == Graph.Edge.EdgeType.Basic && graph.IsParallelNode(edge.Source))
                {
                    for (var i = 0; i < networkModel.Count; i++)
                    {
                        var pipe = new Registry.PipeInfo(agentMap[$"{edge.Source.Id}-{i}"].URI, agentMap[$"{edge.Sink.Id}-{i}"].URI, pipeGroup, "basic");
                        if (pipeConfigurators.ContainsKey(pipeGroup))
                        {
                            pipeConfigurators[pipeGroup](pipe.Key, pipe);
                        }
                        schedule.Pipes.Add(pipe.Key, pipe);
                    }
                }
                else
                {
                    var pipe = new Registry.PipeInfo(agentMap[edge.Source.Id].URI, agentMap[edge.Sink.Id].URI, pipeGroup, "basic");
                    if (pipeConfigurators.ContainsKey(pipeGroup))
                    {
                        pipeConfigurators[pipeGroup](pipe.Key, pipe);
                    }
                    schedule.Pipes.Add(pipe.Key, pipe);
                }
            }

            /*foreach (var item in graph.GetSortedNodes())
            {
                var nodeName = nameMap[item];
                var node = graph.Nodes[nodeName];
                var outgoingEdges = graph.GetEdgesFrom(node);
                var incomingEdges = graph.GetEdgesTo(node);
                string selected = null;

                // check if node has placement constraints
                if (placementConstraints.ContainsKey(nodeName))
                {
                    var selector = placementConstraints[nodeName];
                    var eligible = RuntimeTable.Keys.Where(host => selector(host) > 0.0).OrderBy(host => selector(host) * networkModel[host].Score()).Reverse().ToList();

                    if (eligible.Count == 0) throw new SchedulingError($"Could not satisfy placement constraints for {nodeName}");

                    selected = eligible[0];

                    var goodness = selector(selected) * networkModel[selected].Score();

                    Console.WriteLine($"{this} Node '{nodeName}' has a placement constraint, placing on '{selected}' (goodness: {goodness}) out of {eligible.Count} eligible runtimes.");

                }
                else
                {
                    var tokens = node.Arguments.Split(' ');
                    var abspath = tokens[0];
                    var locations = Registry.ListFileLocations(abspath);
                    var eligible = locations.Keys.OrderBy(host => networkModel[host].Score()).Reverse().ToList();

                    if (eligible.Count == 0) throw new SchedulingError($"Could not satisfy placement constraints for {nodeName}");

                    selected = eligible[0];

                    var goodness = networkModel[selected].Score();

                    Console.WriteLine($"{this} Node '{nodeName}' does not have any placement constraints, placing on '{selected}' (goodness: {goodness}) out of {eligible.Count} eligible runtimes.");
                }

                mapping[node.Id] = selected;

                networkModel[selected].AddAgent(node.Id, 500, 100, 100);

                // subtract bandwidth for all possible outgoing edges
                foreach (var edge in outgoingEdges)
                {
                    foreach (var peer in networkModel[selected].Bandwidth.Keys.ToList())
                    {
                        networkModel[selected].Bandwidth[peer] -= 1000;
                    }
                }

                // subtract bandwidth for all incoming edges
                foreach (var edge in incomingEdges)
                {
                    var source = mapping[edge.Source.Id];
                    if (selected != source) networkModel[selected].Bandwidth[source] -= 1000;
                }

                if (!configurators.ContainsKey(nodeName)) configurators[nodeName] = null;
            }*/

            //return mapping.ToDictionary(item => item.Key, item => (item.Value, configurators[nameMap[item.Key]]));
            return schedule;
        }

        public OneOSObject EvaluateDirective(AstNode node, EvaluationContext context)
        {
            switch (node.Type)
            {
                case AstNode.NodeType.LiteralNull:
                    return OneOSObject.Null;
                case AstNode.NodeType.LiteralBoolean:
                    return ((AstNode.LiteralBoolean)node).Value ? OneOSObject.True : OneOSObject.False;
                case AstNode.NodeType.LiteralInteger:
                    return new Object<int>(((AstNode.LiteralInteger)node).Value);
                case AstNode.NodeType.LiteralDecimal:
                    return new Object<decimal>(((AstNode.LiteralDecimal)node).Value);
                case AstNode.NodeType.LiteralString:
                    return new Object<string>(((AstNode.LiteralString)node).Value);
                case AstNode.NodeType.BinaryExpression:
                    
                    var expr = (AstNode.BinaryExpression)node;
                    var left = EvaluateDirective(expr.Left, context);
                    var right = EvaluateDirective(expr.Right, context);

                    switch (expr.Operator)
                    {
                        case "||": return left || right;
                        case "&&": return left && right;
                        case ">": return left > right;
                        case "<": return left < right;
                        case ">=": return left >= right;
                        case "<=": return left <= right;
                        case "==": return left == right ? OneOSObject.True : OneOSObject.False;
                        case "!=": return left != right ? OneOSObject.True : OneOSObject.False;
                        case "+": return left + right;
                        case "-": return left - right;
                        case "*": return left * right;
                        case "/": return left / right;
                    }

                    throw new EvaluationError($"Cannot evaluate operator {expr.Operator}");
                case AstNode.NodeType.TagExpression:
                    var tagExpr = (AstNode.TagExpression)node;

                    var array = (Array<RuntimeTag>)context["tags"];
                    var tags = array.Value.Select(item => item.Value).ToList();

                    if (tagExpr.IsComparable)
                    {
                        var tag = tags.Find(item => item.Name == tagExpr.Name.Name);

                        if (tag == null)
                        {
                            return OneOSObject.False;
                        }

                        Type tagExprValueType = typeof(Nullable);
                        if (tagExpr.Value is AstNode.LiteralBoolean)
                        {
                            tagExprValueType = typeof(bool);
                        }
                        else if (tagExpr.Value is AstNode.LiteralInteger)
                        {
                            tagExprValueType = typeof(int);
                        }
                        else if (tagExpr.Value is AstNode.LiteralDecimal)
                        {
                            tagExprValueType = typeof(float);
                        }
                        else if (tagExpr.Value is AstNode.LiteralString)
                        {
                            tagExprValueType = typeof(string);
                        }

                        if (tagExprValueType == tag.Type)
                        {
                            AstNode.Literal runtimeTagValue = null;
                            if (tag.Type == typeof(int)) runtimeTagValue = new AstNode.LiteralInteger(tag.Value.ToString());
                            else if (tag.Type == typeof(float)) runtimeTagValue = new AstNode.LiteralDecimal(tag.Value.ToString());
                            else if (tag.Type == typeof(bool)) runtimeTagValue = new AstNode.LiteralBoolean(tag.Value.ToString());
                            else if (tag.Type == typeof(string)) runtimeTagValue = new AstNode.LiteralString(tag.Value.ToString());
                            else
                            {
                                Console.WriteLine($"{this} Tag Expression '{tagExpr.ToCode(0)}' has type '{tagExprValueType.Name}', which cannot be compared");
                            }

                            var binary = new AstNode.BinaryExpression(tagExpr.Operator, runtimeTagValue, tagExpr.Value);
                            return EvaluateDirective(binary, context);
                        }
                        else
                        {
                            Console.WriteLine($"{this} Tag Expression '{tagExpr.ToCode(0)}' expects type '{tagExprValueType.Name}' but Runtime Tag type is {tag.Type.Name}");
                            return OneOSObject.False;
                        }
                    }
                    else
                    {
                        return tags.Exists(tag => tag.Name == tagExpr.Name.Name) ? OneOSObject.True : OneOSObject.False;
                    }
            }

            Console.WriteLine($"Don't know how to evaluate {node.Type}");
            Console.WriteLine($"{node.ToCode()}");

            return OneOSObject.Null;
        }
    }
}
