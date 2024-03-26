using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Common
{
    public interface IMessage
    {
        byte[] Serialize();
    }
}