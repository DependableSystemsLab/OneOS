using Newtonsoft.Json.Linq;
using OneOS.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace OneOS.Language
{
    public class EvaluationContext : Dictionary<string, Object>
    {
        public EvaluationContext Parent { get; private set; }
        internal string ID { get; private set; }    // Used for debugging only
        public Agent Owner { get; private set; }    // A context can have a reference to the agent owning the context (can also be null)

        public EvaluationContext(EvaluationContext parent = null)
        {
            ID = Helpers.RandomText.Next();
            Parent = parent;
        }

        public EvaluationContext(EvaluationContext parent, Agent owner)
        {
            ID = Helpers.RandomText.Next();
            Parent = parent;
            Owner = owner;
        }

        public bool TryGet(string name, out Object result)
        {
            if (ContainsKey(name))
            {
                result = this[name];
                return true;
            }
            else if (Parent != null)
            {
                return Parent.TryGet(name, out result);
            }
            else
            {
                result = null;
                return false;
            }
        }

        public EvaluationContext TryGetContainer(string name)
        {
            if (ContainsKey(name))
            {
                return this;
            }
            else if (Parent != null)
            {
                return Parent.TryGetContainer(name);
            }
            else
            {
                return null;
            }
        }

        public EvaluationContext Spawn()
        {
            return new EvaluationContext(this);
        }

        public EvaluationContext Spawn(Agent owner)
        {
            return new EvaluationContext(this, owner);
        }

        public void SetOwner(Agent agent)
        {
            Owner = agent;
        }

        public override string ToString()
        {
            return $"[Evaluation Context '{ID}':\n{{{string.Join(",\n", this.Select(item => "  " + item.Key + ": " + item.Value.ToString() ))}\n  __parent: {(Parent != null ? Parent.ID : "null")}\n}}]";
        }

        public JObject ToJson()
        {
            var json = new JObject();
            foreach (var item in this)
            {
                json[item.Key] = item.Value.ToJson();
            }
            return json;
        }

        public static EvaluationContext FromJson(JObject json)
        {
            var context = new EvaluationContext();
            foreach (var item in json)
            {
                context[item.Key] = Object.FromJson(item.Value);
            }
            return context;
        }
    }
}
