using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace OneOS.Common
{
    public class Socket
    {
        public const int BufferSize = 131072;
        public const int ReadDelay = 20;   // If no bytes are read, try after this many ms

        public Stream Stream { get; protected set; }
        protected CancellationTokenSource Cts;
        protected Task Task;
        public event Action<Exception> OnEnded;
        
        public Socket() { }

        public Socket(Stream stream)
        {
            Stream = stream;
        }

        public Task Listen(Action<byte[]> onMessage)
        {
            if (Task == null)
            {
                Cts = new CancellationTokenSource();

                Task = Task.Run(async () =>
                {
                    Exception exitException = null;

                    // The following variables are declared outside the try-catch block
                    // so that we can debug inside the catch block in case of exception
                    byte[] buffer = new byte[BufferSize];
                    int cursor = 0;
                    byte[] header = new byte[4];
                    int headerRead = 0;
                    byte[] frame = null;
                    int frameCursor = 0;
                    int bytesRead = 0;

                    try
                    {
                        // continuously read
                        while (true)
                        {
                            if (Cts.IsCancellationRequested) break;

                            //Console.WriteLine($"{this} Waiting to read");
                            bytesRead = await Stream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);
                            cursor = 0;

                            if (bytesRead > 0)
                            {
                                while (cursor < bytesRead)
                                {
                                    // if we don't have a frame set, we are reading a new frame
                                    while (frame == null)
                                    {
                                        header[headerRead] = buffer[cursor];
                                        headerRead++;
                                        cursor++;
                                        if (headerRead == 4)
                                        {
                                            frame = new byte[BitConverter.ToInt32(header, 0)];
                                            frameCursor = 0;
                                            headerRead = 0;
                                        }
                                        if (cursor >= bytesRead) goto EndOfLoop;
                                    }

                                    int frameBytesLeft = frame.Length - frameCursor;
                                    int bytesLeft = bytesRead - cursor;

                                    // if the bytes left in the frame are less than or equal to
                                    // bytes left to read in the current read, we can read the whole frame
                                    if (frameBytesLeft <= bytesLeft)
                                    {
                                        Buffer.BlockCopy(buffer, cursor, frame, frameCursor, frameBytesLeft);
                                        // flush the frame
                                        onMessage.Invoke(frame);

                                        cursor += frameBytesLeft;   // advance the cursor
                                        frame = null;               // clear the frame
                                    }
                                    else
                                    {
                                        // if the bytes left in the frame is larger than the remaining bytes,
                                        // read what is remaining and add to the frame
                                        Buffer.BlockCopy(buffer, cursor, frame, frameCursor, bytesLeft);
                                        cursor += bytesLeft;        // advance the cursor
                                        frameCursor += bytesLeft;   // advance the frame cursor
                                    }
                                }

                                EndOfLoop:
                                //cursor = 0;

                                await Task.Yield();
                            }
                            else
                            {
                                await Task.Delay(ReadDelay, Cts.Token);
                            }

                            //await Task.Yield();
                        }

                        //Console.WriteLine($"{this} Socket gracefully stopped");
                    }
                    catch (OperationCanceledException ex)
                    {
                        //Console.WriteLine($"Socket cancellation granted");
                        exitException = ex;
                    }
                    catch (IOException ex)
                    {
                        //Console.WriteLine($"Socket experienced UNEXPECTED IO EXCEPTION");
                        //Console.WriteLine(ex);
                        //Console.WriteLine(ex.InnerException);
                        //Console.WriteLine(ex.InnerException.InnerException);
                        exitException = ex;
                    }
                    catch (ObjectDisposedException ex)
                    {
                        //Console.WriteLine($"Socket disposed");
                        exitException = ex;
                    }
                    catch (OverflowException ex)
                    {
                        Console.WriteLine($"{this}: OverflowException");
                        Console.WriteLine(ex);
                        throw ex;
                    }
                    catch (ArgumentException ex)
                    {
                        Console.WriteLine($"{this}: ArgumentException (bufferSize = {BufferSize}, bytesRead = {bytesRead}, cursor = {cursor})");
                        Console.WriteLine(ex);
                        throw ex;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(ex);
                        throw ex;
                    }

                    OnEnded?.Invoke(Task.Status == TaskStatus.RanToCompletion ? null : exitException);
                    OnEnded = null;

                }, Cts.Token);

                return Task;
            }
            else
            {
                throw new OperationError("Cannot Start Socket -- it already started");
            }
        }

        // Used by Direct Agent Links that does not require message parsing (e.g., Process to Process)
        public Task ListenRaw(Action<byte[]> onMessage)
        {
            if (Task == null)
            {
                Cts = new CancellationTokenSource();

                Task = Task.Run(async () =>
                {
                    Exception exitException = null;

                    byte[] buffer = new byte[BufferSize];
                    int bytesRead = 0;

                    try
                    {
                        // continuously read
                        while (true)
                        {
                            if (Cts.IsCancellationRequested) break;

                            bytesRead = await Stream.ReadAsync(buffer, 0, buffer.Length, Cts.Token);

                            if (bytesRead > 0)
                            {
                                onMessage.Invoke(buffer.Take(bytesRead).ToArray());
                            }
                            else
                            {
                                await Task.Delay(50);
                            }

                            //await Task.Yield();
                        }
                    }
                    catch (OperationCanceledException ex)
                    {
                        //Console.WriteLine($"Socket cancellation granted");
                        Console.WriteLine($"{this.GetType().Name} was Canceled");
                        exitException = ex;
                    }
                    catch (IOException ex)
                    {
                        Console.WriteLine($"{this.GetType().Name} had an IOException");
                        Console.WriteLine(ex);
                        exitException = ex;
                    }
                    catch (ObjectDisposedException ex)
                    {
                        Console.WriteLine($"{this.GetType().Name} was Disposed"); 
                        Console.WriteLine(ex);
                        exitException = ex;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"{this.GetType().Name} UNEXPECTED EXCEPTION ({ex.GetType().Name})");
                        Console.WriteLine(ex);
                        Console.WriteLine(ex.InnerException);
                        throw ex;
                    }

                    OnEnded?.Invoke(Task.Status == TaskStatus.RanToCompletion ? null : exitException);
                    OnEnded = null;

                }, Cts.Token);

                return Task;
            }
            else
            {
                throw new OperationError("Cannot Start Socket -- it already started");
            }
        }

        public virtual Task Stop()
        {
            //Console.WriteLine($"Stopping {this}");
            Exception exitException = null;

            Cts?.Cancel();
            Stream.Close();
            if (Task == null) Task = Task.CompletedTask;
            else
            {
                try
                {
                    Task.Wait();
                    exitException = Task.Exception;
                }
                catch (Exception ex)
                {
                    exitException = ex;
                }
            }

            //Console.WriteLine($"\n--- Socket Stopped ---\n");

            OnEnded?.Invoke(Task.Status == TaskStatus.RanToCompletion ? null : exitException);

            return Task;
        }

        public async Task Send(byte[] payload)
        {
            // it is important that we combine the header and payload
            // into one block and send it in a single WriteAsync call.
            // If we send the header and payload separately, we run into
            // concurrency issues (multiple concurrent headers being sent one after another)
            byte[] block = new byte[payload.Length + 4];
            Buffer.BlockCopy(BitConverter.GetBytes(payload.Length), 0, block, 0, 4);
            Buffer.BlockCopy(payload, 0, block, 4, payload.Length);
            await Stream.WriteAsync(block, 0, block.Length);
        }

        // these functions are used only in exceptional cases (e.g., initial handshake)
        // most cases should use Send and Listen
        public async Task<byte[]> StreamRead()
        {
            byte[] buffer = new byte[BufferSize];
            int bytesRead = await Stream.ReadAsync(buffer, 0, buffer.Length);
            return buffer.Take(bytesRead).ToArray();
        }

        public async Task StreamWrite(byte[] payload)
        {
            await Stream.WriteAsync(payload, 0, payload.Length);
        }
    }
}
