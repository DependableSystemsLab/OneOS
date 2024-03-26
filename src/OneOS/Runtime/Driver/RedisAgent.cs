using System;
using System.Collections.Generic;
using System.Text;

using StackExchange.Redis;

using OneOS.Common;
using System.Net;
using System.Threading.Tasks;

namespace OneOS.Runtime.Driver
{
    public class RedisAgent : RpcAgent
    {
        private ConnectionMultiplexer Redis;
        private IDatabase DB;
        public IPEndPoint EndPoint;

        public RedisAgent(Runtime runtime, string address, int port) : base(runtime)
        {
            Console.WriteLine($"Trying to connnect to redis server at {address} : {port}");
            EndPoint = new IPEndPoint(IPAddress.Parse(address), port);
            Redis = ConnectionMultiplexer.Connect(new ConfigurationOptions
            {
                EndPoints = { EndPoint },
                ConnectRetry = 3,
                ConnectTimeout = 5000,
                AbortOnConnectFail = false
            });

            Redis.ConnectionFailed += (obj, evt) =>
            {
                Console.WriteLine($"Failed to connect [{evt.Exception.Message}]");
            };
        }

        public RedisAgent(Runtime runtime, string endpoint) : base(runtime)
        {
            Console.WriteLine($"Trying to connnect to redis server at {endpoint}");
            var addresses = Dns.GetHostAddresses(endpoint.Split(':')[0]);
            EndPoint = new IPEndPoint(addresses[0], int.Parse(endpoint.Split(':')[1]));
            Redis = ConnectionMultiplexer.Connect(new ConfigurationOptions
            {
                EndPoints = { endpoint },
                ConnectRetry = 3,
                ConnectTimeout = 5000,
                AbortOnConnectFail = false
            });

            Redis.ConnectionFailed += (obj, evt) =>
            {
                Console.WriteLine($"Failed to connect [{evt.Exception.Message}]");
            };
        }

        public async Task<bool> Set(string key, string val)
        {
            await DB.StringSetAsync(key, val);

            return true;
        }

        public async Task<string> Get(string key)
        {
            string result = await DB.StringGetAsync(key);

            return result;
        }

        protected override void OnBegin()
        {
            if (Redis.IsConnected)
            {
                DB = Redis.GetDatabase();
                var elapsed = DB.PingAsync().Result;
                Console.WriteLine($"Ping Success {elapsed.TotalMilliseconds} ms");
            }
        }
    }
}
