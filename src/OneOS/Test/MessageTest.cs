using System;
using System.Collections.Generic;
using System.Text;

using Newtonsoft.Json.Linq;

using OneOS.Common;

namespace OneOS.Test
{
    public class MessageTest
    {
        private static void RpcRequestTest()
        {
            var random = new Helpers.RandomTextGen();

            var txId = random.Next();
            var client = random.Next();
            var server = random.Next();
            var method = random.Next();
            var args = new List<JToken>() { JToken.FromObject(random.Next()), JToken.FromObject(random.Next()) };

            var message = RpcRequestMessage.Create(txId, client, server, method, args);

            var payload = message.Serialize();

            var parsed = (RpcRequestMessage)RpcMessage.FromBytes(payload);

            Helpers.Assert(txId == parsed.TransactionId, "Transaction ID mismatch");
            Helpers.Assert(client == parsed.Client, "Client URI mismatch");
            Helpers.Assert(server == parsed.Server, "Server URI mismatch");
            Helpers.Assert(method == parsed.Method, "Method mismatch");
            Helpers.Assert(args[0].ToObject<string>() == parsed.Arguments[0].ToObject<string>() && args[1].ToObject<string>() == parsed.Arguments[1].ToObject<string>(), "Arguments mismatch");

            Console.WriteLine("RpcRequestMessage Serialization/Deserialization Test: PASS");
        }

        private static void RpcResponseTest()
        {
            var random = new Helpers.RandomTextGen();

            var txId = random.Next();
            var client = random.Next();
            var server = random.Next();
            var hasError = true;
            var result = JToken.FromObject(random.Next());

            var message = RpcResponseMessage.Create(txId, client, server, hasError, result);

            var payload = message.Serialize();

            var parsed = (RpcResponseMessage)RpcMessage.FromBytes(payload);

            Helpers.Assert(txId == parsed.TransactionId, "Transaction ID mismatch");
            Helpers.Assert(client == parsed.Client, "Client URI mismatch");
            Helpers.Assert(server == parsed.Server, "Server URI mismatch");
            Helpers.Assert(hasError == parsed.HasError, "HasError mismatch");
            Helpers.Assert(result.ToObject<string>() == parsed.Result.ToObject<string>(), "Result mismatch");

            Console.WriteLine("RpcResponseMessage Serialization/Deserialization Test: PASS");
        }

        public static void Run()
        {
            RpcRequestTest();
            RpcResponseTest();
        }
    }
}
