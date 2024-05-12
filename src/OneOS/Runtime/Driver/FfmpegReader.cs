using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

using OneOS.Common;

namespace OneOS.Runtime.Driver
{
    public class FfmpegReader : VideoReader
    {
        private static Dictionary<PlatformID, Func<string, string>> ArgumentMapping = new Dictionary<PlatformID, Func<string, string>>() {
            { PlatformID.Win32NT, sourceDevice => $" -f dshow -framerate 30 -video_size 640x480 -i video=\"{sourceDevice}\" -an -b:v 300k -r 15 -f image2pipe -vcodec mjpeg pipe:1" },
            { PlatformID.Unix, sourceDevice => $" -f v4l2 -framerate 15 -video_size 640x480 -i {sourceDevice} -an -b:v 300k -r 15 -f image2pipe -vcodec mjpeg pipe:1" },
            { PlatformID.MacOSX, sourceDevice => $" -f avfoundation -framerate 30 -video_size 640x480 -pix_fmt uyvy422 -i {sourceDevice} -an -b:v 300k -r 15 -f image2pipe -vcodec mjpeg pipe:1" }
        };

        //private static readonly byte[] PNG_START = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        //private static readonly byte[] PNG_END = { 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 };

        //private const int FrameSize = 230400;
        private const int BufferSize = 460800;

        protected Runtime Runtime;
        protected ProcessStartInfo Info;
        internal Process Process;
        string LocalSourcePath;
        //readonly List<byte[]> StderrBuffer;

        public FfmpegReader(Runtime runtime, string name, string localSourcePath) : base(runtime, name)
        {
            Runtime = runtime;
            URI = Runtime.URI + "/ffmpeg/" + name;
            LocalSourcePath = localSourcePath;
            //StderrBuffer = new List<byte[]>();

            Info = new ProcessStartInfo();
            Info.UseShellExecute = false;
            Info.WorkingDirectory = Runtime.TempDataPath;
            Info.RedirectStandardInput = true;
            Info.RedirectStandardOutput = true;
            Info.RedirectStandardError = true;
            Info.FileName = "ffmpeg";

            if (ArgumentMapping.ContainsKey(Environment.OSVersion.Platform))
            {
                Info.Arguments = ArgumentMapping[Environment.OSVersion.Platform](LocalSourcePath);
            }
            else
            {
                throw new PlatformNotSupportedException($"FfmpegReader Agent is not supported on {Environment.OSVersion.Platform}");
            }

            //Info.Arguments = $" -f v4l2 -framerate 15 -video_size 640x480 -i {LocalSourcePath} -an -b 300k -r 15 -f image2pipe pipe:1";
            //Info.Arguments = $" -f v4l2 -framerate 15 -video_size 320x240 -i {LocalSourcePath} -an -b 300k -r 15 -c:v png -f image2pipe pipe:1";
            //Info.Arguments = $" -f v4l2 -framerate 15 -video_size 320x240 -i {LocalSourcePath} -c:v libx264 -preset medium -profile:v high -level 4.2 -pix_fmt yuv420p -b:v 300k -an -f mpegts pipe:1";
            //Info.Arguments = $" -f v4l2 -framerate 15 -video_size 320x240 -i {LocalSourcePath} -c:v libvpx -g 1 -b:v 300k -crf 10 -an -f webm pipe:1";

            Process = new Process();
            Process.StartInfo = Info;
            Process.EnableRaisingEvents = true;

            Process.Exited += new EventHandler(OnProcessExit);
        }

        private void OnProcessExit(object sender, EventArgs evt)
        {
            Console.WriteLine($"{this} Process {Process.Id} Exited with Exit code {Process.ExitCode} at {Process.ExitTime}");

            if (Process.ExitCode != 0)
            {
                var errorMessage = Process.StandardError.ReadToEnd();
                Console.WriteLine($"{this} Process {Process.Id} Error:\n{errorMessage}");
            }

            Stop();
        }

        protected override void OnBegin()
        {
            Console.WriteLine($"{this} Starting ffmpeg {Info.Arguments}");
            Process.Start();

            Task.Run(async () =>
            {
                byte[] buffer = new byte[BufferSize];
                var count = 0;

                try
                {
                    while (true)
                    {
                        if (Cts.IsCancellationRequested) break;

                        //Console.WriteLine($"{this} {count}. {Process.StandardOutput.BaseStream.Length}");

                        int bytesRead = await Process.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                        //Console.WriteLine($"{this} {count++}. Read {bytesRead} bytes");
                        if (bytesRead > 0)
                        {
                            var payload = buffer.Take(bytesRead).ToArray();
                            //var message = CreateMessage($"{URI}:stdout", payload);
                            //Console.WriteLine($"{Outbox.URI} ({StdoutChannel}): {Encoding.UTF8.GetString(message.Payload)}");
                            //Console.WriteLine($"{this} {Outbox.URI}: {payload.Length} bytes");
                            //Outbox.Write(message);

                            // write to consumers
                            foreach (var item in Consumers)
                            {
                                /*try
                                {
                                    // Use Send because we want segments for video stream
                                    // Otherwise, frames will get fragmented over wifi due to MTU
                                    await item.Value.Send(payload);
                                    //await item.Value.WriteAsync(payload, 0, payload.Length);
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"{this} Consumer {item.Key} not reachable");
                                    Consumers.Remove(item.Key);
                                }*/

                                // Use Send because we want segments for video stream
                                // Otherwise, frames will get fragmented over wifi due to MTU
                                item.Value.WriteAsync(payload, 0, payload.Length).ContinueWith(prev =>
                                {
                                    Console.WriteLine($"{this} Consumer {item.Key} not reachable");
                                    Consumers.Remove(item.Key);
                                }, TaskContinuationOptions.OnlyOnFaulted);
                            }
                        }

                        await Task.Yield();
                    }
                    //Console.WriteLine($"{this} Agent.Cts Canceled");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }

            }, Cts.Token);

            /*Task.Run(async () =>
            {
                byte[] buffer = new byte[BufferSize];
                int bufferCursor = 0;
                int matchCursor = 0;
                byte[] frame = new byte[BufferSize];
                Buffer.BlockCopy(PNG_START, 0, frame, 0, PNG_START.Length);
                int frameCursor = PNG_START.Length;
                int frameStart = 0;
                bool isInFrame = false;

                while (true)
                {
                    if (Cts.IsCancellationRequested) break;

                    int bytesRead = await Process.StandardOutput.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                    Console.WriteLine($"{this} Read {bytesRead} bytes");
                    if (bytesRead > 0)
                    {
                        bufferCursor = 0;
                        while (bufferCursor < bytesRead)
                        {
                            if (!isInFrame)
                            {
                                // Look for the next PNG_START mark
                                if (buffer[bufferCursor] == PNG_START[matchCursor])
                                {
                                    matchCursor++;
                                    if (matchCursor == PNG_START.Length)
                                    {
                                        isInFrame = true;
                                        matchCursor = 0;
                                        frameStart = bufferCursor;

                                        Console.WriteLine($"{this} PNG Frame START at {frameStart}");
                                    }
                                }
                                else if (matchCursor > 0)
                                {
                                    matchCursor = 0;
                                }
                            }
                            else
                            {
                                // Look for the next PNG_END mark
                                if (buffer[bufferCursor] == PNG_END[matchCursor])
                                {
                                    matchCursor++;
                                    if (matchCursor == PNG_END.Length)
                                    {
                                        isInFrame = false;
                                        matchCursor = 0;

                                        var newBytes = bufferCursor - frameStart;
                                        Buffer.BlockCopy(buffer, frameStart, frame, frameCursor, newBytes);
                                        frameCursor += newBytes;

                                        Console.WriteLine($"{this} PNG Frame ENDED at {bufferCursor}, flushing frame of length {frameCursor}");

                                        var payload = frame.Take(frameCursor).ToArray();
                                        var message = CreateMessage($"{URI}:stdout", payload);
                                        //Console.WriteLine($"{Outbox.URI} ({StdoutChannel}): {Encoding.UTF8.GetString(message.Payload)}");
                                        Console.WriteLine($"{Outbox.URI}: {payload.Length} bytes");
                                        Outbox.Write(message);

                                        // write to consumers
                                        foreach (var item in Consumers)
                                        {
                                            try
                                            {
                                                await item.Value.WriteAsync(payload, 0, payload.Length);
                                            }
                                            catch (Exception ex)
                                            {
                                                Console.WriteLine($"{this} Consumer {item.Key} not reachable");
                                                Consumers.Remove(item.Key);
                                            }
                                        }

                                        frameCursor = 8;
                                    }
                                }
                                else if (matchCursor > 0)
                                {
                                    matchCursor = 0;
                                }
                            }

                            bufferCursor++;
                        }

                        if (isInFrame)
                        {
                            var newBytes = bufferCursor - frameStart;
                            Buffer.BlockCopy(buffer, frameStart, frame, frameCursor, newBytes);
                            frameCursor += newBytes;
                            frameStart = 0;
                        }
                    }
                }
                //Console.WriteLine($"{this} Agent.Cts Canceled");

            }, Cts.Token);*/

            // Exhaust the stderr buffer to make progress
            // * on Windows, it appears that stdout deadlocks
            //   if we do not also read from the stderr.
            Task.Run(async () =>
            {
                byte[] buffer = new byte[BufferSize];
                var count = 0;

                try
                {
                    while (true)
                    {
                        if (Cts.IsCancellationRequested) break;

                        //Console.WriteLine($"{this} {count}. {Process.StandardOutput.BaseStream.Length}");

                        int bytesRead = await Process.StandardError.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                        //Console.WriteLine($"{this} {count++}. Read {bytesRead} bytes");
                        while (bytesRead > 0)
                        {
                            //StderrBuffer.Add(buffer.Take(bytesRead).ToArray());

                            await Task.Yield();

                            if (Cts.IsCancellationRequested) break;

                            bytesRead = await Process.StandardError.BaseStream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                        }

                        // Use a large delay, assuming that errors are infrequent
                        await Task.Delay(100);

                        //await Task.Yield();
                    }
                    //Console.WriteLine($"{this} Agent.Cts Canceled");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }

            }, Cts.Token);
        }

        public override Task Stop()
        {
            // If the process is still running, this is a force kill.
            // A force kill should not emit the onExit handler
            if (!Process.HasExited)
            {
                Process.Kill();
            }

            return base.Stop();
        }
    }
}
