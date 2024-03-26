using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Linq;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Bson;

namespace OneOS.Common
{
    public class RpcMessage : IMessage
    {
        public enum MessageType
        {
            Request,
            Response
        }
        
        public MessageType Type { get; protected set; }
        public string TransactionId { get; protected set; }
        public string Client { get; protected set; }
        public string Server { get; protected set; }

        public static RpcMessage FromBytes(byte[] payload)
        {
            MessageType type = (MessageType)BitConverter.ToInt32(payload, 0);
            var header = new byte[BitConverter.ToInt32(payload, 4)];
            Buffer.BlockCopy(payload, 8, header, 0, header.Length);
            var tokens = Encoding.UTF8.GetString(header).Split('\t');
            var transactionId = tokens[0];
            var client = tokens[1];
            var server = tokens[2];

            if (type == MessageType.Request)
            {
                var method = Encoding.ASCII.GetString(payload, 12 + header.Length, BitConverter.ToInt32(payload, 8 + header.Length));
                
                var buffer = new byte[BitConverter.ToInt32(payload, 12 + header.Length + method.Length)];
                Buffer.BlockCopy(payload, 16 + header.Length + method.Length, buffer, 0, buffer.Length);

                var stream = new MemoryStream(buffer);
                List<JToken> args;

                using (BsonReader reader = new BsonReader(stream))
                {
                    reader.ReadRootValueAsArray = true;
                    JsonSerializer serializer = new JsonSerializer();
                    var jargs = serializer.Deserialize<JArray>(reader);
                    args = jargs.ToList();
                }

                var message = RpcRequestMessage.Create(transactionId, client, server, method, args);

                return message;

            }
            else if (type == MessageType.Response)
            {
                bool hasError = BitConverter.ToBoolean(payload, 8 + header.Length);

                var buffer = new byte[BitConverter.ToInt32(payload, 9 + header.Length)];
                Buffer.BlockCopy(payload, 13 + header.Length, buffer, 0, buffer.Length);
                var stream = new MemoryStream(buffer);
                JToken result;

                using (BsonReader reader = new BsonReader(stream))
                {
                    reader.ReadRootValueAsArray = true;
                    JsonSerializer serializer = new JsonSerializer();
                    var jargs = serializer.Deserialize<JArray>(reader);
                    result = jargs[0];
                }

                var message = RpcResponseMessage.Create(transactionId, client, server, hasError, result);

                return message;
            }
            else
            {
                throw new MessageFormatError($"Invalid RpcMessage format - type must be Request=0 or Response=1");
            }
        }

        public virtual byte[] Serialize()
        {
            // byte 1~4: message type
            // byte 5~8: header length
            // byte 9 ~ 9 + header length: header
            var header = Encoding.UTF8.GetBytes(string.Join("\t", new string[] { TransactionId, Client, Server }));
            var payload = new byte[8 + header.Length];
            Buffer.BlockCopy(BitConverter.GetBytes((int)Type), 0, payload, 0, 4);
            Buffer.BlockCopy(BitConverter.GetBytes(header.Length), 0, payload, 4, 4);
            Buffer.BlockCopy(header, 0, payload, 8, header.Length);
            return payload;
        }
    }

    public class RpcRequestMessage : RpcMessage
    {
        public string Method { get; protected set; }
        public List<JToken> Arguments { get; protected set; }   // TODO: Support objects
        public JArray JsonArguments
        {
            get
            {
                return new JArray(Arguments.Select(arg => JToken.FromObject(arg)));
            }
        }

        public static RpcRequestMessage Create(string transactionId, string clientUri, string serverUri, string method, List<JToken> args)
        {
            return new RpcRequestMessage()
            {
                Type = MessageType.Request,
                TransactionId = transactionId,
                Client = clientUri,
                Server = serverUri,
                Method = method,
                Arguments = args
            };
        }

        public static RpcRequestMessage Create(string transactionId, string clientUri, string serverUri, string method, params object[] args)
        {
            return Create(transactionId, clientUri, serverUri, method, args.Select(arg => arg != null ? JToken.FromObject(arg) : JToken.Parse("null")).ToList());
        }

        public RpcResponseMessage CreateResponse(bool hasError, JToken result)
        {
            return RpcResponseMessage.Create(TransactionId, Client, Server, hasError, result);
        }

        public RpcResponseMessage CreateResponse(bool hasError, object result)
        {
            return CreateResponse(hasError, JToken.FromObject(result));
        }

        public RpcResponseMessage CreateErrorResponse(Exception ex)
        {
            var jsonError = new JObject();
            jsonError["type"] = ex.GetType().Name;
            jsonError["message"] = ex.Message + "\n" + ex.StackTrace;

            return CreateResponse(true, jsonError);
        }

        public override byte[] Serialize()
        {
            // byte header.length: header
            // byte +4: method string length
            // byte method.length: method string
            // byte +4: arguments length
            // byte arguments.length: arguments bson
            var header = base.Serialize();

            var method = Encoding.ASCII.GetBytes(Method);

            var stream = new MemoryStream();
            using (BsonWriter writer = new BsonWriter(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                serializer.Serialize(writer, JsonArguments);
            }
            var args = stream.ToArray();

            var payload = new byte[header.Length + 8 + method.Length + args.Length];
            Buffer.BlockCopy(header, 0, payload, 0, header.Length);
            Buffer.BlockCopy(BitConverter.GetBytes(method.Length), 0, payload, header.Length, 4);
            Buffer.BlockCopy(method, 0, payload, header.Length + 4, method.Length);
            Buffer.BlockCopy(BitConverter.GetBytes(args.Length), 0, payload, header.Length + 4 + method.Length, 4);
            Buffer.BlockCopy(args, 0, payload, header.Length + 8 + method.Length, args.Length);

            return payload;
        }
    }

    public class RpcResponseMessage : RpcMessage
    {
        public bool HasError { get; protected set; }
        public JToken Result { get; protected set; }

        public static RpcResponseMessage Create(string transactionId, string clientUri, string serverUri, bool hasError, JToken result)
        {
            return new RpcResponseMessage()
            {
                Type = MessageType.Response,
                TransactionId = transactionId,
                Client = clientUri,
                Server = serverUri,
                HasError = hasError,
                Result = result
            };
        }

        public override byte[] Serialize()
        {
            // byte header.length: header
            // byte +1: hasError boolean
            // byte +4: result.length
            // byte result.length: result bson
            var header = base.Serialize();

            var stream = new MemoryStream();
            using (BsonWriter writer = new BsonWriter(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                serializer.Serialize(writer, new JArray() { Result });
            }
            var result = stream.ToArray();

            var payload = new byte[header.Length + 5 + result.Length];
            Buffer.BlockCopy(header, 0, payload, 0, header.Length);
            Buffer.BlockCopy(BitConverter.GetBytes(HasError), 0, payload, header.Length, 1);
            Buffer.BlockCopy(BitConverter.GetBytes(result.Length), 0, payload, header.Length + 1, 4);
            Buffer.BlockCopy(result, 0, payload, header.Length + 5, result.Length);

            return payload;
        }
    }
}
