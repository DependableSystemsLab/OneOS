using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Text;

using OneOS.Common;

namespace OneOS.Runtime
{
    public class Router : Agent
    {
        private Runtime Runtime;
        private ConcurrentDictionary<string, MessageQueue> Inboxes;
        private ConcurrentDictionary<string, MessageQueue> Outboxes;
        private ConcurrentDictionary<string, MessageQueue> Errboxes;
        private ConcurrentDictionary<string, List<Action<Message>>> Handlers;
        private ConcurrentDictionary<string, List<string>> Subscribers;
        private ConcurrentDictionary<string, List<string>> RedirectRules;
        //private ConcurrentDictionary<string, List<string>> RewriteRules;

        public Router(Runtime runtime) : base(runtime)
        {
            Runtime = runtime;
            URI = $"{runtime.URI}/router";
            Inboxes = new ConcurrentDictionary<string, MessageQueue>();
            Outboxes = new ConcurrentDictionary<string, MessageQueue>();
            Errboxes = new ConcurrentDictionary<string, MessageQueue>();
            Handlers = new ConcurrentDictionary<string, List<Action<Message>>>();
            Subscribers = new ConcurrentDictionary<string, List<string>>();
            RedirectRules = new ConcurrentDictionary<string, List<string>>();
            //RewriteRules = new ConcurrentDictionary<string, List<string>>();

            AddAgent(runtime);
        }

        public void AddAgent(Agent agent)
        {
            Inboxes.TryAdd(agent.URI, agent.Inbox);
            Outboxes.TryAdd(agent.URI, agent.Outbox);
            Errboxes.TryAdd(agent.URI, agent.Errbox);
        }

        public void RemoveAgent(Agent agent)
        {
            MessageQueue _;
            Inboxes.TryRemove(agent.URI, out _);
            Outboxes.TryRemove(agent.URI, out _);
            Errboxes.TryRemove(agent.URI, out _);
        }

        public void AddAgentAndAllDescendants(Agent agent)
        {
            Inboxes.TryAdd(agent.URI, agent.Inbox);
            Outboxes.TryAdd(agent.URI, agent.Outbox);
            Errboxes.TryAdd(agent.URI, agent.Errbox);
            foreach (var child in agent.Children)
            {
                AddAgentAndAllDescendants(child);
            }
        }

        public void ReplaceAgentAndAllDescendants(Agent agent)
        {
            Inboxes[agent.URI] = agent.Inbox;
            Outboxes[agent.URI] = agent.Outbox;
            Errboxes[agent.URI] = agent.Errbox;
            foreach (var child in agent.Children)
            {
                ReplaceAgentAndAllDescendants(child);
            }
        }

        public void AddHandler(string channel, Action<Message> action)
        {
            if (!Handlers.ContainsKey(channel))
            {
                Handlers[channel] = new List<Action<Message>>();
            }
            Handlers[channel].Add(action);
        }

        public void RemoveHandler(string channel, Action<Message> action)
        {
            if (!Handlers.ContainsKey(channel))
            {
                Handlers[channel].Remove(action);
            }
        }

        public void RemoveHandlers(string channel)
        {
            if (Handlers.ContainsKey(channel))
            {
                List<Action<Message>> _;
                Handlers.TryRemove(channel, out _);
            }
        }

        public void AddSubscriber(string channel, string agentUri)
        {
            if (!Subscribers.ContainsKey(channel)) Subscribers[channel] = new List<string>();
            if (Subscribers[channel].Contains(agentUri))
            {
                throw new OperationError($"{this} {agentUri} already subscribed to {channel}");
            }
            Subscribers[channel].Add(agentUri);
        }

        // Add subscriber without throwing exception if the subscription exists
        public bool TryAddSubscriber(string channel, string agentUri)
        {
            if (!Subscribers.ContainsKey(channel)) Subscribers[channel] = new List<string>();
            if (Subscribers[channel].Contains(agentUri))
            {
                return false;
            }
            Subscribers[channel].Add(agentUri);
            return true;
        }

        public void RemoveSubscriber(string channel, string agentUri)
        {
            if (Subscribers.ContainsKey(channel)) Subscribers[channel].Remove(agentUri);
        }

        // Redirect rules redirect message from output of an agent
        // to the input of another agent
        public void AddRedirectRule(string outChannel, string inChannel)
        {
            if (!RedirectRules.ContainsKey(outChannel)) RedirectRules[outChannel] = new List<string>();
            if (RedirectRules[outChannel].Contains(inChannel)) throw new OperationError($"Router already has the redirect rule {outChannel} | {inChannel}");
            RedirectRules[outChannel].Add(inChannel);
            //Console.WriteLine($"Added redirect rule from {outChannel} to {inChannel}");
        }

        public void RemoveRedirectRule(string outChannel, string inChannel)
        {
            RedirectRules[outChannel].Remove(inChannel);
        }

        /*// Rewrite rules rewrite the output channel of a message
        // to another output channel
        public void AddRewriteRule(string originalOutChannel, string newOutChannel)
        {
            if (!RewriteRules.ContainsKey(originalOutChannel)) RewriteRules[originalOutChannel] = new List<string>();
            if (RewriteRules[originalOutChannel].Contains(newOutChannel)) throw new OperationError($"Router already has the rewrite rule {originalOutChannel} -> {newOutChannel}");
            RewriteRules[originalOutChannel].Add(newOutChannel);
        }

        public void RemoveRewriteRule(string originalOutChannel, string newOutChannel)
        {
            RewriteRules[originalOutChannel].Remove(newOutChannel);
        }*/

        private void ProcessMessage(Message message, MessageQueue outBox)
        {
            // if message is remoteMessage and destination inbox is remoteAgent, we should not process the message
            bool isRemoteMessage = (outBox.Owner is RemoteAgent);

            // Handle message accordingly
            if (Handlers.ContainsKey(message.Channel))
            {
                // no need to clone messages to avoid sync problems,
                // because messages are read-only and immutable
                foreach (var handler in Handlers[message.Channel])
                {
                    handler(message);
                }
            }
            else
            {
                //Console.WriteLine($"[{URI}]: No action for {box.URI}, message content:\n{Encoding.UTF8.GetString(message.Payload)}");
            }

            // By default, messages will be delivered to the agent
            // identified by the channel -- i.e., if channel is agent URI
            // TODO: Revise the way we route these messages
            if (Inboxes.ContainsKey(message.Channel) && !(Inboxes[message.Channel].Owner is RemoteAgent && isRemoteMessage) )
            {
                //Console.WriteLine($"{this} Redirecting message from {message.Author} to {message.Channel}");
                Inboxes[message.Channel].Write(message);
            }
            /*else
            {
                Console.WriteLine($"[{URI}]: No Inbox for {message.Channel} was found, message content:\n{Encoding.UTF8.GetString(message.Payload)}");
            }*/

            if (Subscribers.ContainsKey(message.Channel))
            {
                foreach (var uri in Subscribers[message.Channel])
                {
                    if (!(Inboxes[uri].Owner is RemoteAgent && isRemoteMessage))
                    {
                        //Console.WriteLine($"{this} Redirecting message from {message.Author} to {message.Channel}");

                        // TODO: Determine whether to clone the message or not
                        Inboxes[uri].Write(message);
                    }
                }
            }
        }

        protected override void OnTick()
        {
            foreach (var item in Outboxes)
            {
                var box = item.Value;
                while (box.Count > 0)
                {
                    var message = box.Read();
                    if (message != null)
                    {
                        //if (box.Owner.URI == "root.jungabyte.com/shell")
                        /*if (message.Channel == "kernels." + Runtime.Domain + "/RegistryManager")
                        {
                            Console.WriteLine($"{this} Read Message from {box.URI} on channel {message.Channel}");
                        }*/

                        ProcessMessage(message, box);

                        // 2nd phase after applying redirect rules
                        if (RedirectRules.ContainsKey(message.Channel))
                        {
                            // TODO: Clone the message
                            foreach (var inChannel in RedirectRules[message.Channel])
                            {
                                var redirected = message.Clone();
                                redirected.SetChannel(inChannel);

                                //Console.WriteLine($"Redirecting Message from {box.URI} on channel {message.Channel} to {redirected.Channel}");

                                ProcessMessage(redirected, box);
                            }
                        }
                    }
                }
            }

            foreach (var item in Errboxes)
            {
                var box = item.Value;
                while (box.Count > 0)
                {
                    var message = box.Read();
                    if (message != null)
                    {
                        Runtime.Errbox.Write(message);
                    }
                }
            }
        }

        /*private class RedirectRule
        {
            public string OutChannel;
            public string InChannel;
            public bool Replicate;

            public RedirectRule(string outChannel, string inChannel, bool replicate = true)
            {
                OutChannel = outChannel;
                InChannel = inChannel;
                Replicate = replicate;
            }
        }*/
    }
}
