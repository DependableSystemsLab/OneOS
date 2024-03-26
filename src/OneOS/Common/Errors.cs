using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Common
{
    public class AssertionError : Exception
    {
        public AssertionError(string message) : base(message) { }
    }

    public class OperationError : Exception
    {
        public OperationError(string message) : base(message) { }
    }

    public class ConnectionError: Exception
    {
        public ConnectionError(string message) : base(message) { }
    }

    public class TimeoutError : Exception
    {
        public TimeoutError(string message) : base(message) { }
    }

    public class PermissionError: Exception
    {
        public bool UserExists;
        public PermissionError(bool userExists, string message) : base(message)
        {
            UserExists = userExists;
        }
    }

    public class InvalidUserError : PermissionError
    {
        public InvalidUserError(string message) : base(false, message) { }
    }

    public class InvalidPasswordError : PermissionError
    {
        public InvalidPasswordError(string message) : base(true, message) { }
    }

    public class MessageFormatError : Exception
    {
        public MessageFormatError(string message) : base(message) { }
    }

    public class RpcError : Exception
    {
        public RpcError(string message) : base(message) { }
        public RpcError(string message, Exception innerException) : base(message, innerException) { }

        public static RpcError FromResponse(string remoteExceptionType, string message)
        {
            RpcError error;
            Exception inner = null;
            switch (remoteExceptionType)
            {
                case "OperationError":
                    inner = new OperationError(message);
                    break;
                case "MessageFormatError":
                    inner = new MessageFormatError(message);
                    break;
                case "InvalidUserError":
                    inner = new InvalidUserError(message);
                    break;
                case "InvalidPasswordError":
                    inner = new InvalidPasswordError(message);
                    break;
                default:
                    break;
            }

            if (inner == null)
            {
                error = new RpcError(message);
            }
            else
            {
                error = new RpcError(message, inner);
            }
            return error;
        }
    }

    public class ParseError : Exception
    {
        public ParseError(string message) : base(message) { }
    }

    public class EvaluationError : Exception
    {
        public EvaluationError(string message) : base(message) { }
    }

    public class SchedulingError : Exception
    {
        public SchedulingError(string message) : base(message) { }
    }
}
