using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using System.Reflection;

using Newtonsoft.Json.Linq;

namespace OneOS.Common
{
    public class RpcAgent : Agent
    {
        protected Helpers.RandomTextGen RandomText;
        private ConcurrentDictionary<string, TaskCompletionSource<object>> PendingRequests;
        public Dictionary<string, MethodInfo> RemoteMethods { get; private set; }

        public RpcAgent (Agent parent) : base(parent)
        {
            RandomText = new Helpers.RandomTextGen("abcdefghijklmnopqrstuvwxyz");
            PendingRequests = new ConcurrentDictionary<string, TaskCompletionSource<object>>();
            RemoteMethods = new Dictionary<string, MethodInfo>();
            GetType().GetMethods().Where(method => method.GetCustomAttributes(typeof(RpcMethodAttribute), true).Length > 0)
                .Aggregate(RemoteMethods, (methods, rawMethod) =>
                {
                    methods[rawMethod.Name] = rawMethod;
                    return methods;
                });
        }

        protected Task<object> Request(string agentUri, string method, params object[] arguments)
        {
            var requestId = URI + "/q/" + RandomText.Next(8);
            var request = RpcRequestMessage.Create(requestId, URI, agentUri, method, arguments);

            var message = CreateMessage(agentUri, request.Serialize());

            // Create a "callback" TCS to resolve after receiving the response
            var tcs = new TaskCompletionSource<object>();
            PendingRequests[requestId] = tcs;

            tcs.Task.ContinueWith(data =>
            {
                TaskCompletionSource<object> removed;
                PendingRequests.TryRemove(requestId, out removed);
            });

            // Send the message
            Outbox.Write(message);

            return tcs.Task;
        }

        protected Task<object> RequestWithTimeout(int timeout, string agentUri, string method, params object[] arguments)
        {
            var requestId = URI + "/q/" + RandomText.Next(8);
            var request = RpcRequestMessage.Create(requestId, URI, agentUri, method, arguments);

            var message = CreateMessage(agentUri, request.Serialize());

            // Create a "callback" TCS to resolve after receiving the response
            var tcs = new TaskCompletionSource<object>();
            PendingRequests[requestId] = tcs;

            var timer = new Timer(obj =>
            {
                Console.WriteLine($"{this} RPC Request {agentUri}.{method} timed out");
                tcs.TrySetException(new TimeoutError($"RPC Request {agentUri}.{method} timed out"));
            }, null, timeout, Timeout.Infinite);

            tcs.Task.ContinueWith(prev =>
            {
                timer.Dispose();
                TaskCompletionSource<object> removed;
                PendingRequests.TryRemove(requestId, out removed);
            });

            // Send the message
            Outbox.Write(message);

            return tcs.Task;
        }

        protected override void OnMessage(Message message)
        {
            //Console.WriteLine($"{this} received message from {message.Author}");

            // Parse the message
            var rpcMessage = RpcMessage.FromBytes(message.Payload);
            
            if (rpcMessage.Type == RpcMessage.MessageType.Request)
            {
                // cast to request
                var request = (RpcRequestMessage)rpcMessage;
                RpcResponseMessage response;

                if (RemoteMethods.ContainsKey(request.Method))
                {
                    try
                    {
                        var args = request.Arguments.Select(arg => arg.ToObject<object>());
                        // TODO: Update RpcMessage to convert JToken to native objects
                        // For now, we'll do it here
                        args = args.Select(arg => arg is JArray ? ((JArray)arg).ToObject<object[]>() : arg);
                        //Console.WriteLine($"{string.Join(", ", args.Select(item => item.ToString()))}");
                        var returned = RemoteMethods[request.Method].Invoke(this, args.ToArray());

                        if (returned is Task)
                        {
                            // WARNING: code is asynchronous here
                            // The reason it is asynchronous is so that the agent can
                            // process multiple RPC requests that may be sequentially related
                            // e.g., A -> this -> B -> this -> A
                            // TODO: revise whether it's appropriate to keep it asynchronous
                            var task = (Task<object>)returned;
                            task.ContinueWith(prev =>
                            {
                                if (task.Status == TaskStatus.RanToCompletion)
                                {
                                    response = request.CreateResponse(false, task.Result);
                                }
                                else
                                {
                                    response = request.CreateErrorResponse(task.Exception.InnerException);
                                }
                                var returnMessage = CreateMessage(message.Author, response.Serialize());
                                // Send the message
                                Outbox.Write(returnMessage);
                            });
                            return;
                        }
                        else
                        {
                            //Console.WriteLine($"{URI} got {returned.GetType().Name} as a result when calling {request.Method}");
                            response = request.CreateResponse(false, returned);
                        }
                    }
                    catch (AggregateException ex)
                    {
                        Console.WriteLine(ex);
                        response = request.CreateErrorResponse(ex.InnerException);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(ex);
                        response = request.CreateErrorResponse(ex);
                    }
                }
                else
                {
                    response = request.CreateErrorResponse(new OperationError($"{URI} does not have a remote method named {request.Method}"));
                }

                var responseMessage = CreateMessage(message.Author, response.Serialize());
                // Send the message
                Outbox.Write(responseMessage);
            }
            else if (rpcMessage.Type == RpcMessage.MessageType.Response)
            {
                // cast to response
                var response = (RpcResponseMessage)rpcMessage;

                if (PendingRequests.ContainsKey(response.TransactionId))
                {
                    if (response.HasError)
                    {
                        var jsonError = response.Result.ToObject<JObject>();
                        PendingRequests[response.TransactionId].TrySetException(RpcError.FromResponse(jsonError["type"].ToObject<string>(), jsonError["message"].ToObject<string>()));
                    }
                    else
                    {
                        PendingRequests[response.TransactionId].TrySetResult(response.Result.ToObject<object>());
                    }
                }
                else
                {
                    // Instead of throwing the exception, print it for now -- this can happen if some requests time out
                    Console.WriteLine($"RpcResponse received for an unknown Transaction ID ({rpcMessage.TransactionId} {rpcMessage.Client} -> {rpcMessage.Server})");
                    //throw new OperationError($"RpcResponse received for an unknown Transaction ID ({rpcMessage.TransactionId} {rpcMessage.Client} -> {rpcMessage.Server})");
                }
            }
            else
            {
                throw new MessageFormatError($"Invalid RpcMessage format - type must be Request=0 or Response=1");
            }
        }

        public delegate Task<object> RequestDelegate(string agentUri, string method, params object[] arguments);
    }
}
