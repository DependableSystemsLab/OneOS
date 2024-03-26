using System;
using System.Collections.Generic;
using System.Text;

using OneOS.Common;
using OneOS.Language;

namespace OneOS.Runtime.Kernel
{
    public class UserShell : Agent
    {
        public string Username { get; private set; }
        private Dictionary<string, string> Environment;
        private Interpreter Interpreter;

        public UserShell(Runtime runtime, string username) : base(runtime)
        {
            Username = username;
            URI = $"{username}.{runtime.Domain}/shell";
            Environment = new Dictionary<string, string>()
            {
                { "CWD", $"/home/{Username}" },
                { "USER", Username },
                { "CHECKPOINT_INTERVAL", "0" },
                { "DOMAIN", runtime.Domain },
                { "HOST_ADDRESS", runtime.LocalAddress }
            };
            Interpreter = new Interpreter(this, runtime, username, Environment);
        }

        protected override void OnMessage(Message message)
        {
            // Unlike other agents, UserShell handles messages synchronously
            Console.WriteLine($"{this} {message.Author} >>> {Encoding.UTF8.GetString(message.Payload)}");
            try
            {
                var code = Encoding.UTF8.GetString(message.Payload);
                var result = Interpreter.Evaluate(code, true).Result;

                var output = CreateMessage(URI + ":stdout", Encoding.UTF8.GetBytes(result.ToString() + "\n"));
                Outbox.Write(output);
            }
            catch (AggregateException ex)
            {
                var output = CreateMessage(URI + ":stdout", Encoding.UTF8.GetBytes(ex.InnerException.ToString() + "\n"));
                Outbox.Write(output);
            }
            catch (Exception ex)
            {
                var output = CreateMessage(URI + ":stdout", Encoding.UTF8.GetBytes(ex.ToString() + "\n"));
                Outbox.Write(output);
            }
        }
    }
}
