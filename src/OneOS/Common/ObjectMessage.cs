using System;
using System.Collections.Generic;
using System.Text;
using System.IO;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Bson;

namespace OneOS.Common
{
    // A generic message to carry serializable OneOS objects
    public class ObjectMessage<T> : IMessage
    {
        public T Payload { get; private set; }
        public ObjectMessage(T payload)
        {
            Payload = payload;
        }

        public byte[] Serialize()
        {
            var stream = new MemoryStream();
            using (BsonWriter writer = new BsonWriter(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                serializer.Serialize(writer, Payload);
            }
            var result = stream.ToArray();
            return result;
        }

        public static ObjectMessage<T> FromBytes(byte[] buffer)
        {
            var stream = new MemoryStream(buffer);
            T result;

            using (BsonReader reader = new BsonReader(stream))
            {
                JsonSerializer serializer = new JsonSerializer();
                result = serializer.Deserialize<T>(reader);
            }

            return new ObjectMessage<T>(result);
        }
    }
}
