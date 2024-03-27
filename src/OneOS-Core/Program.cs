#define LOG_1
using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Diagnostics;

using OneOS.Runtime;
using OneOS.Common;
using OneOS.Client;
using OneOS.Language;
using OneOS.Test;
using OneOS.Runtime.Driver;

namespace OneOS_Core
{
    public class Program
    {
        static void Main(string[] args)
        {
            // tokenize args
            var arguments = new List<string>();
            var options = new Dictionary<string, string>();
            foreach (var arg in args)
            {
                if (arg[0] == '-')
                {
                    var tokens = arg.Split('=');
                    options.Add(string.Concat(tokens[0].Skip(1)), tokens[1]);
                }
                else
                {
                    arguments.Add(arg);
                }
            }

            // check if mount path option is provided
            string mountPath = options.ContainsKey("mount") ? options["mount"] : Configuration.DefaultOneOSPath;

            // if no argument, show help
            if (arguments.Count == 0)
            {
                var helpText = @"Enter a command after ""oneos"".

    Example:  oneos host -mount=/home/user/.oneos


Available commands:

-----

host
    Start the OneOS Runtime service on this machine, joining the OneOS cluster
    specified in the configuration file.

    Usage Example:
        oneos host -mount=/home/user/.oneos

    Options:
    
    -mount=$MountPath

        Specify the base directory that the OneOS Runtime uses to host various
        files including the configuration file. If the configuration file does
        not exist, it will prompt the user to go through the setup process.

        Default value: $HOME/.oneos

-----

(shell | sh | terminal | term) [HostAddress]
    Start the OneOS Terminal and connect to a random peer specified in the
    configuration file on this device, or to the host at the address
    specified by the optional HostAddress argument.

    Usage Example:
        oneos sh 192.168.0.42:5000

    Options:
    
    -mount=$MountPath

        Specify the base directory that the OneOS Runtime uses to host various
        files including the configuration file. If the configuration file does
        not exist, it will prompt the user to go through the setup process.
        This option will be ignored if the HostAddress argument is specified.

        Default value: $HOME/.oneos

-----

config
    Start the interactive setup for the OneOS Runtime on this machine. It will
    create a new configuration if run for the first time, otherwise it will
    update the existing configuration.

    Usage Example:
        oneos config -mount=/home/user/.oneos

    Options:
    
    -mount=$MountPath

        Specify the base directory that the OneOS Runtime uses to host various
        files including the configuration file. If the configuration file does
        not exist, it will prompt the user to go through the setup process.

        Default value: $HOME/.oneos

-----
";
                Console.WriteLine(helpText);
            }
            else
            {
                // if first argument is "host", start the Runtime
                if (arguments[0] == "host")
                {
                    var config = Configuration.LoadConfig(mountPath);

                    Console.WriteLine($"Starting OneOS Runtime v{Runtime.Version}");
#if LOG_1
                    Console.WriteLine(config);
#endif
                    var runtime = new Runtime(config);
                    var task = runtime.Start();

                    while (true)
                    {
                        string input = Console.ReadLine();
                        if (input == "q")
                        {
                            runtime.Stop();
                            break;
                        };
                    }

                    task.Wait();
                }
                else if (arguments[0] == "sh" || arguments[0] == "shell" || arguments[0] == "term" || arguments[0] == "terminal")
                {
                    // if entry address is not given, pick from one of the peers
                    var config = Configuration.LoadConfig(mountPath);
                    var random = new Random();
                    var peerAddress = arguments.Count > 1 ? IPEndPoint.Parse(arguments[1]) : (config.Peers.Count > 0 ? config.Peers.Values.ToList()[random.Next(0, config.Peers.Count)] : IPEndPoint.Parse($"127.0.0.1:{config.Port}"));

                    Console.WriteLine($"Starting OneOS Terminal");
                    var terminal = new Terminal(peerAddress);
                    var task = terminal.Start();

                    task.Wait();
                }
                // if first argument is "config", run the interactive setup
                else if (arguments[0] == "config")
                {
                    Console.WriteLine($"Running OneOS Configuration Setup");
                    Configuration.CreateOrUpdateConfig(mountPath);
                }
                // if first argument is "cluster", start OneOS test cluster
                else if (arguments[0] == "cluster")
                {
                    Helpers.PrintPlatformInformation();

                    Console.WriteLine($"Starting OneOS Test Cluster");

                    var config_0 = Configuration.LoadConfig(Path.Combine(mountPath, "test_0"));
                    var config_1 = Configuration.LoadConfig(Path.Combine(mountPath, "test_1"));
                    var config_2 = Configuration.LoadConfig(Path.Combine(mountPath, "test_2"));
                    var config_3 = Configuration.LoadConfig(Path.Combine(mountPath, "test_3"));
                    var config_4 = Configuration.LoadConfig(Path.Combine(mountPath, "test_4"));

                    Console.WriteLine(config_0);
                    Console.WriteLine(config_1);
                    Console.WriteLine(config_2);
                    Console.WriteLine(config_3);
                    Console.WriteLine(config_4);

                    var runtime_0 = new Runtime(config_0);
                    var runtime_1 = new Runtime(config_1);
                    var runtime_2 = new Runtime(config_2);
                    var runtime_3 = new Runtime(config_3);
                    var runtime_4 = new Runtime(config_4);

                    var pool = new List<Runtime>() { runtime_0, runtime_1, runtime_2, runtime_3, runtime_4 };
                    var configs = new List<Configuration>() { config_0, config_1, config_2, config_3, config_4 };

                    var task_0 = runtime_0.Start();
                    var task_1 = runtime_1.Start();
                    var task_2 = runtime_2.Start();
                    var task_3 = runtime_3.Start();
                    var task_4 = runtime_4.Start();

                    var thisProc = Process.GetCurrentProcess();
                    int poolWorkerThreads, poolMaxWorkerThreads, poolCompletionPortThreads, poolMaxCompletionPortThreads;

                    while (true)
                    {
                        string input = Console.ReadLine();
                        var tokens = input.Split(" ");
                        if (tokens[0] == "q")
                        {
                            runtime_0.Stop();
                            runtime_1.Stop();
                            runtime_2.Stop();
                            runtime_3.Stop();
                            runtime_4.Stop();
                            break;
                        }
                        else if (tokens[0] == "k")
                        {
                            var index = int.Parse(tokens[1]);
                            var selected = pool[index];
                            selected.Stop();

                            //Task.Delay(5000).Wait();

                            //selected.Start();
                        }
                        else if (tokens[0] == "r")
                        {
                            var index = int.Parse(tokens[1]);
                            var selected = new Runtime(configs[index]);
                            pool[index] = selected;
                            selected.Start();

                            //Task.Delay(5000).Wait();

                            //selected.Start();
                        }
                        else if (tokens[0] == "getSink")
                        {
                            var pipeIndex = int.Parse(tokens[1]);
                            var sinkIndex = int.Parse(tokens[2]);
                            var sink = OutputPipe.All[pipeIndex].GetSink(sinkIndex);
                            Console.WriteLine(sink.AgentURI);
                        }
                        else if (tokens[0] == "limitSink")
                        {
                            var pipeIndex = int.Parse(tokens[1]);
                            var sinkIndex = int.Parse(tokens[2]);
                            var sink = OutputPipe.All[pipeIndex].GetSink(sinkIndex);
                            var limit = double.Parse(tokens[3]);
                            sink.Monitor.ForcedLimit = limit;
                            Console.WriteLine($"Limiting {sink.AgentURI} to {limit}");
                        }
                        else
                        {
                            ThreadPool.GetAvailableThreads(out poolWorkerThreads, out poolCompletionPortThreads);
                            ThreadPool.GetMaxThreads(out poolMaxWorkerThreads, out poolMaxCompletionPortThreads);
                            Console.WriteLine($"----- Using {thisProc.Threads.Count} Threads, {poolWorkerThreads} / {poolMaxWorkerThreads} Worker Pool, {poolCompletionPortThreads} / {poolMaxCompletionPortThreads} IO Pool, {ThreadPool.CompletedWorkItemCount} Completed, {ThreadPool.PendingWorkItemCount} Pending -----");
                        }
                    }

                    //Task.WaitAll(task_0, task_1, task_2, task_3, task_4);
                    Task.WaitAll(task_0, task_1, task_2, task_3, task_4);
                }
                else if (arguments[0] == "test")
                {
                    Helpers.PrintPlatformInformation();

                    if (arguments.Count < 2)
                    {
                        Console.WriteLine($"Specify the test to run\n  e.g., oneos test tcp");
                        return;
                    }

                    if (arguments[1] == "tcp")
                    {
                        TcpTest.Run();
                    }
                    else if (arguments[1] == "ffmpeg")
                    {
                        var config = Configuration.LoadConfig(mountPath);
                        var dummy = new Runtime(config);
                        var ffmpeg = new FfmpegReader(dummy, "video", "/dev/video0");

                        var task = ffmpeg.Start();

                        task.Wait();
                    }
                    else if (arguments[1] == "kafka")
                    {
                        var bootstrapServer = arguments[2];

                        var config = Configuration.LoadConfig(mountPath);
                        var dummy = new Runtime(config);
                        var kafka = new KafkaAgent(dummy, bootstrapServer);

                        var task = kafka.Start();
                        kafka.Subscribe("ad-events", dummy.URI);

                        while (true)
                        {
                            string input = Console.ReadLine();
                            if (input == "q")
                            {
                                break;
                            }

                            try
                            {
                                kafka.Publish("test-topic", input);
                            }
                            catch (AggregateException ex)
                            {
                                if (ex.InnerException is ParseError || ex.InnerException is EvaluationError)
                                {
                                    Console.WriteLine(ex.InnerException.Message);
                                }
                                else throw ex;
                            }
                        }

                        task.Wait();
                    }
                    else if (arguments[1] == "redis")
                    {
                        var bootstrapServer = arguments[2];

                        var config = Configuration.LoadConfig(mountPath);
                        var dummy = new Runtime(config);
                        var redis = new RedisAgent(dummy, bootstrapServer);

                        var task = redis.Start();

                        Task.Run(async () =>
                        {
                            while (true)
                            {
                                string input = Console.ReadLine();
                                var tokens = input.Split(' ');
                                if (input == "q")
                                {
                                    break;
                                }
                                else if (tokens[0] == "get")
                                {
                                    var result = await redis.Get(tokens[1]);
                                    Console.WriteLine(result);
                                }
                                else if (tokens[0] == "set")
                                {
                                    var result = await redis.Set(tokens[1], tokens[2]);
                                    Console.WriteLine(result);
                                }
                            }
                        });

                        task.Wait();
                    }
                    else if (arguments[1] == "weighted-random")
                    {
                        var weightedSet = new WeightedRandomSet<string>();
                        weightedSet.Set("A", 3.0);  // 16.39%
                        weightedSet.Set("B", 4.2);  // 22.95%
                        weightedSet.Set("C", 9.4);  // 51.37%
                        weightedSet.Set("D", 1.7);  //  9.29%
                        weightedSet.Set("E", 0.00017);  //  9.29%

                        var picked = new Dictionary<string, int>();
                        picked["A"] = 0;
                        picked["B"] = 0;
                        picked["C"] = 0;
                        picked["D"] = 0;
                        picked["E"] = 0;

                        for (var i = 0; i < 100000; i++)
                        {
                            var draw = weightedSet.Draw();
                            picked[draw] += 1;
                        }

                        Console.WriteLine($"A = {Math.Round((double)picked["A"] / 1000, 2)} %\t({picked["A"]})");
                        Console.WriteLine($"B = {Math.Round((double)picked["B"] / 1000, 2)} %\t({picked["B"]})");
                        Console.WriteLine($"C = {Math.Round((double)picked["C"] / 1000, 2)} %\t({picked["C"]})");
                        Console.WriteLine($"D = {Math.Round((double)picked["D"] / 1000, 2)} %\t({picked["D"]})");
                        Console.WriteLine($"E = {Math.Round((double)picked["E"] / 1000, 2)} %\t({picked["E"]})");
                    }
                    else
                    {
                        Console.WriteLine($"Test '{arguments[1]}' does not exist");
                    }
                    
                    //MessageTest.Run();
                    //Benchmark.Run();
                    //PipeTest.Run();
                }
                else if (arguments[0] == "debug")
                {
                    var config = Configuration.LoadConfig(mountPath);
                    var dummy = new Runtime(config);

                    if (arguments.Count > 1)
                    {
                        var environ = new Dictionary<string, string>()
                        {
                            { "USER", "root" },
                            { "CWD", "/home/root" }
                        };
                        var scriptAgent = new OneOSScriptAgent(dummy, "oneos-debug", "root", environ, arguments[1], string.Join(" ", arguments.Skip(2)));
                        var running = true;
                        scriptAgent.OnExit += (sender, evt) =>
                        {
                            //running = false;
                        };
                        scriptAgent.Start();

                        while (running)
                        {
                            Thread.Sleep(200);
                        }
                    }
                    else
                    {
                        var interpreter = new Interpreter(dummy, dummy, "root", new Dictionary<string, OneOS.Language.Object>() {
                            { "testVar", new Object<string>("Test Variable") },
                            { "testObj", new Dict(new Dictionary<string, OneOS.Language.Object>()
                            {
                                { "x", new Object<int>(42) },
                                { "y", new Object<int>(24) },
                            }) },
                            { "testFunc", new Function((ctx, args) => args.Aggregate(new OneOS.Language.Object(0), (acc, item) => acc + item)) }
                        });

                        Console.WriteLine($"OneOS-DSL Debug Environment Started");

                        while (true)
                        {
                            string input = Console.ReadLine();
                            try
                            {
                                string result = interpreter.Evaluate(input).Result.ToString();
                                Console.WriteLine(result);
                            }
                            catch (AggregateException ex)
                            {
                                if (ex.InnerException is ParseError || ex.InnerException is EvaluationError)
                                {
                                    Console.WriteLine(ex.InnerException.Message);
                                }
                                else throw ex;
                            }
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"Unknown command {arguments[0]}");
                }
            }
        }
    }
}
