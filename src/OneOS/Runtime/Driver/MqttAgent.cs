using System;
using System.Collections.Generic;
using System.Text;

using OneOS.Common;

namespace OneOS.Runtime.Driver
{
    public class MqttAgent : RpcAgent
    {
        public MqttAgent(Runtime runtime) : base(runtime)
        {
            URI = runtime.URI + "/io/mqtt/" + Helpers.RandomText.Next();
        }
    }
}
