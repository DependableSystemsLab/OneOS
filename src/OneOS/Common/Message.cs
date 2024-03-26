using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace OneOS.Common
{
    public class Message : IMessage
    {
        public string Author { get; private set; }
        public string Channel { get; private set; }
        public int SequenceNumber { get; private set; }     // the sequence number of the message from Author at Channel
        public byte[] Payload { get; private set; }

        protected Message(string author, string channel, int sequenceNumber, byte[] payload = null)
        {
            Author = author;
            Channel = channel;
            SequenceNumber = sequenceNumber;
            Payload = payload;
        }

        public static Message Create(string author, string channel, int sequenceNumber, byte[] payload = null)
        {
            var message = new Message(author, channel, sequenceNumber, payload);

            return message;
        }

        public void SetChannel(string channel)
        {
            Channel = channel;
        }

        public static Message FromBytes(byte[] buffer)
        {
            int headerLength = BitConverter.ToInt32(buffer, 0);
            byte[] header = new byte[headerLength];
            Buffer.BlockCopy(buffer, 4, header, 0, headerLength);

            var tokens = Encoding.UTF8.GetString(header).Split(';');
            var message = new Message(tokens[0], tokens[1], Int32.Parse(tokens[2]), buffer.Skip(4 + headerLength).ToArray());

            //Console.WriteLine($"Received from {message.Author} : {message.Channel}, message #{message.SequenceNumber}: {Encoding.UTF8.GetString(message.Payload)}");

            return message;
        }

        public byte[] Serialize()
        {
            var header = Encoding.UTF8.GetBytes(string.Join(";", new string[] {
                Author,
                Channel,
                SequenceNumber.ToString()
            }));

            byte[] chunk = new byte[4 + header.Length + Payload.Length];

            Buffer.BlockCopy(BitConverter.GetBytes(header.Length), 0, chunk, 0, 4);
            Buffer.BlockCopy(header, 0, chunk, 4, header.Length);
            Buffer.BlockCopy(Payload, 0, chunk, 4 + header.Length, Payload.Length);

            //Console.WriteLine($"Sending: {Encoding.UTF8.GetString(chunk)}");

            return chunk;
        }

        public Message Clone()
        {
            return new Message(Author, Channel, SequenceNumber, Payload.ToArray());
        }
    }
}