using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

using OneOS.Common;

namespace OneOS.Language
{
    public class InputStream
    {
        string Text;

        public int Pos;
        public int Line;
        public int Col;

        private int LineStart;

        public InputStream(string text)
        {
            Text = text;

            Pos = 0;
            Line = 1;
            Col = 0;

            LineStart = 0;
        }

        public bool Eof()
        {
            return Pos == Text.Length;
        }

        public char Peek()
        {
            return Text[Pos];
        }

        public char Next()
        {
            char ch = Text[Pos++];
            if (ch == '\n')
            {
                Line++;
                Col = 0;

                LineStart = Pos;
            }
            else
            {
                Col++;
            }
            return ch;
        }

        public bool Croak(string message)
        {
            Console.WriteLine(message);
            //throw new ParseError($"\n\t{string.Join("", Text.Skip(LineStart).Take(Col))}    {string.Join("", Text.Skip(LineStart + Col).Take(20))} \n\tCursor on Character '{Text[Pos]}' ({(int)Text[Pos]}), In Line {Line}, Col {Col} (Pos {Pos})\n\t{message}");
            throw new ParseError($"\n\t{string.Join("", Text.Skip(LineStart).Take(Col))}    {string.Join("", Text.Skip(LineStart + Col).Take(20))} \n\tCursor on Character '{Text[Pos-3]}' ({(int)Text[Pos-3]}), In Line {Line}, Col {Col} (Pos {Pos})\n\t{message}");
        }

        public string PrintStream(int numLinesPreceding = 5)
        {
            int lines = 0, index = Pos;
            string output = "";
            while (lines < numLinesPreceding && lines <= Line)
            {
                if (Text[index] == '\n')
                {
                    output = '\n' + (Line - lines).ToString() + "|  " + output;
                    lines++;
                }
                else
                {
                    output = Text[index] + output;
                }
                index--;
            }

            return output;
        }

        public (int, int, int) Checkpoint()
        {
            return (Pos, Line, Col);
        }

        public void Restore((int, int, int) checkpoint)
        {
            (Pos, Line, Col) = checkpoint;
            Console.WriteLine($"Restored to {Pos} {Line} {Col}");
        }
    }
}
