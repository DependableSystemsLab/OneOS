using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Language
{
    public class TokenStream
    {
        private static bool IsWhitespaceChar(char ch) => " \t\n\r".IndexOf(ch) > -1;
        private static bool IsDigitChar(char ch) => "0123456789".IndexOf(ch) > -1;
        private static bool IsNameStartChar(char ch) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_".IndexOf(ch) > -1;
        private static bool IsNameChar(char ch) => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_".IndexOf(ch) > -1;
        private static bool IsPunctuationChar(char ch) => ".,:;()[]{}".IndexOf(ch) > -1;
        private static bool IsOperatorChar(char ch) => "!%&*+-/<=>?@^|#".IndexOf(ch) > -1;
        private static string[] Keywords = new string[]
        {
            "null",
            "false",
            "true",
            "let",
            "const",
            "function",
            "return",
            "if",
            "else",
            "do",
            "while",
            "for",
            "in",
            "break",
            "continue",
            "public",
            "class",
            "agent",
            "action",
            "enter",
            "exit",
            "tick",
            "import",
            "export",
            "graph",
            "node",
            "edge",
            "spawn",
            "policy",
            "with"
        };

        InputStream Input;
        Token Current;

        public TokenStream(string code)
        {
            Input = new InputStream(code);
        }

        public Token Peek()
        {
            return Current != null ? Current : (Current = ReadNext());
        }

        public bool Eof()
        {
            return Peek() == null;
        }

        public bool Croak(string message)
        {
            if (Current != null) return Input.Croak($"Current Token ({Current.Type}) '{Current.Value}'\n\t{message}");
            return Input.Croak($"Current Token = null\n\t{message}");
            //throw new InvalidProgramException(message);
        }

        public Token Next()
        {
            var token = Current;
            Current = null;
            return token != null ? token : ReadNext();
        }

        private Token ReadNext()
        {
            ReadWhile((ch, buf) => IsWhitespaceChar(ch));

            if (Input.Eof()) return null;       // return if end of file

            char nextChar = Input.Peek();

            if (IsDigitChar(nextChar)) return ReadNumber();
            else if (nextChar == '"') return ReadString();
            else if (IsNameStartChar(nextChar)) return ReadName();
            else if (IsPunctuationChar(nextChar)) return ReadPunctuation();
            else if (IsOperatorChar(nextChar)) return TryReadComment(ReadOperator());

            Input.Croak($"Unexpected character: '{nextChar}'");
            return null;
        }

        private string ReadWhile(Func<char, string, bool> predicate)
        {
            string val = "";
            while (!Input.Eof() && predicate(Input.Peek(), val))
            {
                val += Input.Next();
            }
            return val;
        }

        private Token ReadNumber()
        {
            string number = ReadWhile((ch, buf) => IsDigitChar(ch));

            if (!Input.Eof() && Input.Peek() == '.')
            {
                number += Input.Next();
                number += ReadWhile((ch, buf) => IsDigitChar(ch));
                return new Token(TokenType.Decimal, number);
            }
            else
            {
                return new Token(TokenType.Integer, number);
            }
        }

        private Token ReadString()
        {
            Input.Next();
            string text = ReadWhile((ch, buf) => "\"\n\r".IndexOf(ch) < 0);
            Input.Next();

            return new Token(TokenType.String, text);
        }

        private Token ReadName()
        {
            string name = Input.Next() + ReadWhile((ch, buf) => IsNameChar(ch));
            return new Token(System.Array.IndexOf(Keywords, name) > -1 ? TokenType.Keyword : TokenType.Identifier, name);
        }

        private Token ReadPunctuation()
        {
            return new Token(TokenType.Punctuation, Input.Next().ToString());
        }

        private Token ReadOperator()
        {
            return new Token(TokenType.Operator, ReadWhile((ch, buf) => IsOperatorChar(ch) && buf != "//"));
        }

        private Token TryReadComment(Token op)
        {
            if (op.Value == "//")
            {
                return new Token(TokenType.Comment, ReadWhile((ch, buf) => "\n\r".IndexOf(ch) < 0));
            }
            else return op;
        }
    }
}
