using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace OneOS.Common
{
    public class AgentPlaceHolder : Agent
    {
        TaskCompletionSource<Agent> Tcs;
        public AgentPlaceHolder() : base(null)
        {
            Tcs = new TaskCompletionSource<Agent>();
        }

        public void SetReady(Agent agent)
        {
            Tcs.SetResult(agent);
        }

        public Task<Agent> WhenReady()
        {
            return Tcs.Task;
        }
    }
}
