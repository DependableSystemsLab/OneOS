using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using OneOS.Common;

namespace OneOS.Runtime.Kernel
{
    public class SessionManager : RpcAgent
    {
        private Runtime Runtime;
        private Dictionary<string, string> Users { get => Runtime.Registry.Users; }  // Updated by Runtime using Registry
        private Helpers.RandomTextGen RandomTextGen;
        private static SHA256 SHA256 = SHA256.Create();

        public SessionManager(Runtime runtime) : base(runtime)
        {
            Runtime = runtime;
            URI = "kernels." + runtime.Domain + "/SessionManager";
            RandomTextGen = new Helpers.RandomTextGen(Helpers.Charset.AlphaNumeric);
        }

        internal static string HashPassword(string password)
        {
            var rand = new Helpers.RandomTextGen(Helpers.Charset.AlphaNumeric);
            var salt = rand.Next(20);
            var payload = Encoding.UTF8.GetBytes(password + salt);
            var hash = Convert.ToBase64String(SHA256.ComputeHash(payload));
            return salt + hash;
        }

        internal static bool CheckPassword(string password, string saltedHash)
        {
            var salt = string.Join("", saltedHash.Take(20));
            var payload = Encoding.UTF8.GetBytes(password + salt);
            var hash = Convert.ToBase64String(SHA256.ComputeHash(payload));
            return (salt + hash == saltedHash);
        }

        private string ShellUri(string username)
        {
            return $"{username}.{Runtime.Domain}/shell";
        }

        [RpcMethod]
        public async Task<object> CreateUser(string username)
        {
            if (Users.ContainsKey(username))
            {
                throw new OperationError($"User {username} already exists");
            }

            Users.Add(username, RandomTextGen.Next(10));
            Runtime.Registry.CreateDirectory($"/home/{username}");
            Runtime.Registry.CreateDirectory($"/home/{username}/Desktop");

            await Runtime.SyncRegistry();

            return username;
        }

        [RpcMethod]
        public async Task<object> UpdatePassword(string username, string password)
        {
            if (!Users.ContainsKey(username))
            {
                throw new OperationError($"User {username} does not exist");
            }

            Users[username] = HashPassword(password);

            await Runtime.SyncRegistry();

            return username;
        }

        [RpcMethod]
        public async Task<object> GetShell(string username, string password)
        {
            if (Users.ContainsKey(username) && CheckPassword(password, Users[username]))
            {
                if (!Runtime.Registry.Agents.ContainsKey(ShellUri(username)))
                {
                    var env = new Dictionary<string, string>() { { "CHECKPOINT_INTERVAL", "0" } };
                    await Request("kernels." + Runtime.Domain + "/RegistryManager", "SpawnAs", ShellUri(username), username, "OneOSKernel", env, "UserShell", username, "interpreter");
                }

                return ShellUri(username);
            }
            else
            {
                if (Users.ContainsKey(username))
                {
                    throw new InvalidPasswordError("Incorrect password");
                }
                else
                {
                    throw new InvalidUserError("User does not exist");
                }
            }
        }

        [RpcMethod]
        public async Task<object> LogIn(string username, string password)
        {
            if (Users.ContainsKey(username) && CheckPassword(password, Users[username]))
            {
                if (!Runtime.Registry.Agents.ContainsKey(ShellUri(username)))
                {
                    var env = new Dictionary<string, string>();
                    await Request("kernels." + Runtime.Domain + "/RegistryManager", "SpawnAs", ShellUri(username), username, "OneOSKernel", env, "UserShell", username, "interpreter");
                }

                var session = RandomTextGen.Next(20);

                // save the session globally to enable checking session locally
                Runtime.Registry.AddSession(session, username);
                // TODO: implement session expiry mechanism

                await Runtime.SyncRegistry();

                return session;
            }
            else
            {
                if (Users.ContainsKey(username))
                {
                    throw new InvalidPasswordError("Incorrect password");
                }
                else
                {
                    throw new InvalidUserError("User does not exist");
                }
            }
        }
    }
}
