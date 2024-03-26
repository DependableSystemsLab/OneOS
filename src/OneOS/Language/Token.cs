using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Language
{
    public enum TokenType
    {
        Keyword,
        Identifier,
        Integer,
        Decimal,
        String,
        Operator,
        Punctuation,
        Comment
    }

    public class Token
    {
        public TokenType Type { get; private set; }
        public string Value { get; private set; }
        public Token(TokenType type, string val)
        {
            Type = type;
            Value = val;
        }

        public bool IsKeyword { get => Type == TokenType.Keyword; }
        public bool IsIdentifier { get => Type == TokenType.Identifier; }
        public bool IsInteger { get => Type == TokenType.Integer; }
        public bool IsDecimal { get => Type == TokenType.Decimal; }
        public bool IsString { get => Type == TokenType.String; }
        public bool IsOperator { get => Type == TokenType.Operator; }
        public bool IsPunctuation { get => Type == TokenType.Punctuation; }
        public bool IsComment { get => Type == TokenType.Comment; }
    }
}
