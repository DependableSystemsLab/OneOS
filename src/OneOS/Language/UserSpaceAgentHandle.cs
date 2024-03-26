using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Language
{
    public class UserSpaceAgentHandle : Object
    {
        UserSpaceAgent Agent;

        public UserSpaceAgentHandle(UserSpaceAgent agent) : base(new object())
        {
            Agent = agent;
        }

        public override string ToString()
        {
            return $"[Handle:{Agent.ClassName} {Agent.URI}]";
        }
    }
}
