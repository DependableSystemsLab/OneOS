using System;
using System.Collections.Generic;
using System.Text;

using OneOS.Common;

namespace OneOS.Language
{
    public class UserSpaceAgent : RpcAgent
    {
        private Runtime.Runtime Runtime;
        public string User { get; private set; }
        public EvaluationContext Context { get; private set; }
        public string ClassName { get; private set; }

        private AsyncFunction OnEnterHandler;
        private AsyncFunction OnTickHandler;
        private AsyncFunction OnExitHandler;

        internal string UserShellOutbox { get => $"{User}.{Runtime.Domain}/shell:stdout"; }

        public UserSpaceAgent(Agent parent, Runtime.Runtime runtime, string username, EvaluationContext context, string className, string uri = null) : base(parent)
        {
            Runtime = runtime;
            User = username;
            Context = context;
            ClassName = className;
            URI = uri != null ? uri : $"{ClassName}/{RandomText.Next(6)}";

            Context.SetOwner(this);
        }

        public override string ToString()
        {
            return $"[{ClassName} {URI}]";
        }

        public void SetOnEnterHandler(AsyncFunction handler)
        {
            OnEnterHandler = handler;
        }

        public void SetOnTickHandler(AsyncFunction handler)
        {
            OnTickHandler = handler;
        }

        public void SetOnExitHandler(AsyncFunction handler)
        {
            OnExitHandler = handler;
        }

        protected override void OnBegin()
        {
            OnEnterHandler?.Invoke(Context).Wait();
        }

        protected override void OnTick()
        {
            OnTickHandler?.Invoke(Context).Wait();
        }

        protected override void OnEnd()
        {
            OnExitHandler?.Invoke(Context).Wait();
        }
    }
}
