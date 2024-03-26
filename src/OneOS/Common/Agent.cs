using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace OneOS.Common
{
    public class Agent
    {
        public Agent Parent { get; private set; }   // Every Agent has a Parent, except the Runtime
        public List<Agent> Children { get; private set; }
        public MessageQueue Inbox;  // Every Agent has an Inbox
        public MessageQueue Outbox; // Every Agent has an Outbox
        public MessageQueue Errbox; // Every Agent has an Errbox
        public string URI { get; protected set; }
        public UInt16 NRI { get => Helpers.GetNRI(URI); }   // Numeric Resource Identifier (non-unique, alias for quick lookup using UInt16)

        protected CancellationTokenSource Cts;    // CTS to use for graceful termination signal
        protected Task Task;                      // The main Task representing the "processing loop"
        protected Task ChildrenTask;              // Task representing running children
        public int Clock { get; protected set; }    // A counter to keep track of number of loops

        protected static TimeSpan AsyncDelay = TimeSpan.FromMilliseconds(1); // A delay to use for slowing down the loop #DEBUG

        public Agent(Agent parent = null)
        {
            Parent = parent;
            if (parent != null) parent.Children.Add(this);

            Children = new List<Agent>();
            Inbox = new MessageQueue(this, "in", QueueDirection.Inbox);
            Outbox = new MessageQueue(this, "out", QueueDirection.Outbox);
            Errbox = new MessageQueue(this, "err", QueueDirection.Outbox);
        }

        public override string ToString()
        {
            return $"[{URI}]\t";
        }

        public virtual Task Start()
        {
            // Create CTS
            Cts = new CancellationTokenSource();
            Clock = 0;

            // Start main Task
            var tcs = new TaskCompletionSource<object>();
            Task = tcs.Task;
            var thread = new Thread(async () =>
            {
                //Console.WriteLine($"{this} Started");

                try
                {
                    OnBegin();

                    // Start all child agents that have been initialized
                    ChildrenTask = Task.WhenAll(Children.Select(child => child.Start()));

                    // Start the "processing loop"
                    while (true)
                    {
                        if (Cts.IsCancellationRequested) break;

#if LOG_1
                    Console.WriteLine($"{this} {Clock} Ticks - IN: {Inbox.Count}, OUT: {Outbox.Count}");
#endif

                        // Read queued up messages from Inbox
                        var message = Inbox.Read();
                        while (message != null)
                        {
                            if (Cts.IsCancellationRequested) break;

                            OnMessage(message);
                            message = Inbox.Read();
                        }

                        if (Cts.IsCancellationRequested) break;

                        // Perform an action on tick
                        OnTick();

                        Clock++;

#if DEBUG
                        await Task.Delay(AsyncDelay);   // #DEBUG
                        //await Task.Yield();
#else
                    // Yield at the end of the iteration
                    await Task.Yield();
#endif
                    }

                    // Wait for child tasks to finish
                    await ChildrenTask;

                    OnEnd();
                }
                catch (Exception ex)
                {
                    RaiseError(ex);
                }

                //Console.WriteLine($"{this} Exited");
                tcs.SetResult(null);
            });

            thread.Start();

            /*Task = Task.Run(async () =>
            {
                //Console.WriteLine($"{this} Started");

                try
                {
                    OnBegin();

                    // Start all child agents that have been initialized
                    ChildrenTask = Task.WhenAll(Children.Select(child => child.Start()));

                    // Start the "processing loop"
                    while (true)
                    {
                        if (Cts.IsCancellationRequested) break;

#if LOG_1
                    Console.WriteLine($"{this} {Clock} Ticks - IN: {Inbox.Count}, OUT: {Outbox.Count}");
#endif

                        // Read queued up messages from Inbox
                        var message = Inbox.Read();
                        while (message != null)
                        {
                            if (Cts.IsCancellationRequested) break;

                            OnMessage(message);
                            message = Inbox.Read();
                        }

                        if (Cts.IsCancellationRequested) break;

                        // Perform an action on tick
                        OnTick();

                        Clock++;

#if DEBUG
                        await Task.Delay(AsyncDelay);   // #DEBUG
#else
                    // Yield at the end of the iteration
                    await Task.Yield();
#endif
                    }

                    // Wait for child tasks to finish
                    await ChildrenTask;

                    OnEnd();
                }
                catch (Exception ex)
                {
                    RaiseError(ex);
                }

                //Console.WriteLine($"{this} Exited");
            });*/

            return Task;
        }

        public virtual Task Stop()
        {
            //Console.WriteLine($"{this} Stopping ...");

            // Send stop signal to all the children
            Children.ForEach(child => child.Stop());

            Cts?.Cancel();

            return Task;
        }

        // This function must be synchronous because it is invoked in the main loop, which is already asynchronous
        protected virtual void OnTick()
        {
            // to be overridden
        }

        protected virtual void OnBegin()
        {
            // to be overridden
        }

        protected virtual void OnEnd()
        {
            // to be overridden
        }

        protected virtual void OnMessage(Message message)
        {
            // to be overridden
        }

        public Message CreateMessage(string channel, byte[] payload)
        {
            return Message.Create(URI, channel, Outbox.MessagesWritten, payload);
        }

        public void RaiseError(Exception ex)
        {
            Console.WriteLine($"{this}: {ex}");
            /*Errbox.Write(OneOSErrorMessage.Create(URI, "stderr", Errbox.MessagesWritten,
                        new OneOSError($"{this} ERROR: {ex.Message}", ex)));*/
        }
    }
}
