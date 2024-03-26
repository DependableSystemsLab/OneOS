using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace OneOS.Common
{
    public static class Helpers
    {
        internal enum Charset
        {
            AlphaNumeric,
            Alphabet,
            AlphabetLower,
            AlphabetUpper,
            Numeric,
            LowerNumeric,
            UpperNumeric,
            Special
        }
        private static Dictionary<Charset, string> CharsetMap = new Dictionary<Charset, string>()
        {
            { Charset.AlphaNumeric, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
            { Charset.Alphabet, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" },
            { Charset.AlphabetLower, "abcdefghijklmnopqrstuvwxyz" },
            { Charset.AlphabetUpper, "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
            { Charset.Numeric, "0123456789" },
            { Charset.LowerNumeric, "abcdefghijklmnopqrstuvwxyz0123456789" },
            { Charset.UpperNumeric, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
            { Charset.Special, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.?!@#$%^&*()-+_=[]{}<>~" }
        };

        public readonly static RandomTextGen RandomText = new RandomTextGen();
        private static Random Random = new Random();
        private static MD5 MD5 = MD5.Create();
        private static SHA256 SHA256 = SHA256.Create();

        public static void Assert(bool expression, string ifFalse = "Assertion Failed")
        {
            if (expression) return;
            throw new AssertionError(ifFalse);
        }

        public class RandomTextGen
        {
            private Random Random;
            private string Charset;
            public RandomTextGen()
            {
                Random = new Random();
                Charset = CharsetMap[Helpers.Charset.AlphabetUpper];
            }
            public RandomTextGen(string charset)
            {
                Random = new Random();
                Charset = charset;
            }

            internal RandomTextGen(Charset charset)
            {
                Random = new Random();
                Charset = CharsetMap[charset];
            }

            public string Next(int length = 6)
            {
                string word = "";
                for (var i = 0; i < length; i++)
                {
                    word += Charset[Random.Next(0, Charset.Length)];
                }
                return word;
            }
        }

        public static T PickRandom<T>(this IList<T> list)
        {
            var index = Random.Next(0, list.Count);
            return list[index];
        }

        // picks "num" unique elements 
        public static IList<T> PickRandom<T>(this IList<T> list, int num)
        {
            if (num <= list.Count)
            {
                var pool = list.ToList();
                var selected = new List<T>();
                var count = 0;
                while (count < num)
                {
                    var index = Random.Next(0, pool.Count);
                    selected.Add(pool[index]);
                    pool.RemoveAt(index);
                    count++;
                }

                return selected;
            }
            else
            {
                throw new ArgumentException($"Cannot pick more elements than there are in the list");
            }
        }

        public static string ResolvePath(params string[] paths)
        {
            var abspath = Path.Combine(paths);
            abspath = Path.GetFullPath(abspath);    // this resolves '..' etc
            if (Path.DirectorySeparatorChar != '/') abspath = abspath.Replace('\\', '/');

            var root = Path.GetPathRoot(abspath);
            var resolved = "/" + abspath.Substring(root.Length);
            //Console.WriteLine($"Resolved to {resolved}");

            return resolved;
        }

        public static string Checksum(byte[] payload, string algorithm)
        {
            if (algorithm.ToUpper() == "SHA256" || algorithm.ToUpper() == "SHA2")
            {
                return BitConverter.ToString(SHA256.ComputeHash(payload)).Replace("-", string.Empty);
            }

            return BitConverter.ToString(MD5.ComputeHash(payload)).Replace("-", string.Empty);
        }

        public static string Checksum(FileStream stream, string algorithm)
        {
            if (algorithm.ToUpper() == "SHA256" || algorithm.ToUpper() == "SHA2")
            {
                return BitConverter.ToString(SHA256.ComputeHash(stream)).Replace("-", string.Empty);
            }

            return BitConverter.ToString(MD5.ComputeHash(stream)).Replace("-", string.Empty);
        }

        public static UInt16 GetNRI(string uri)
        {
            return BitConverter.ToUInt16(MD5.ComputeHash(Encoding.UTF8.GetBytes(uri)), 0);
        }

        // convert a byte array containing text file content to a string,
        // handling the BOM (Byte order mark) appropriately
        // (we do not use Encoding.UTF8.GetString because it will include the BOM
        public static string ReadBytesAsTextFile(byte[] data)
        {
            return new StreamReader(new MemoryStream(data)).ReadToEnd();
        }

        public static void PrintPlatformInformation()
        {
            int availableWorkerThreads, availableCompletionPortThreads;
            int maxWorkerThreads, maxCompletionPortThreads;

            ThreadPool.GetAvailableThreads(out availableWorkerThreads, out availableCompletionPortThreads);
            ThreadPool.GetMaxThreads(out maxWorkerThreads, out maxCompletionPortThreads);

            Console.WriteLine($"Architecture:    \t{RuntimeInformation.OSArchitecture}");
            Console.WriteLine($"OS Platform:     \t{Environment.OSVersion}");
            Console.WriteLine($"Operating System:\t{RuntimeInformation.OSDescription}");
            Console.WriteLine($"Dotnet:          \t{RuntimeInformation.FrameworkDescription}");
            Console.WriteLine($"Stopwatch (precision clock) frequency:\t{Stopwatch.Frequency} Ticks per second{(Stopwatch.IsHighResolution ? " (HighRes)" : "")}");

            Console.WriteLine($"Available worker threads:             \t{availableWorkerThreads} / {maxWorkerThreads}");
            Console.WriteLine($"Available completion port threads:    \t{availableCompletionPortThreads} / {maxCompletionPortThreads}");
        }

        internal static string ReadSecret(Charset permittedCharset = Charset.Special)
        {
            string charset = CharsetMap[permittedCharset];
            string secret = "";
            string buf = "";
            ConsoleKeyInfo c;
            do
            {
                c = Console.ReadKey(true);
                if (charset.IndexOf(c.KeyChar) > -1)
                {
                    secret += c.KeyChar;
                }
                else
                {
                    buf += c.KeyChar;
                }
            }
            while (c.KeyChar != '\r');
            Console.Write(Environment.NewLine);

            return secret;
        }
    }
}
