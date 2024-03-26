using System;
using System.Collections.Generic;
using System.Text;

namespace OneOS.Runtime
{
    public class RuntimeTag
    {
        public string Name { get; private set; }
        public object Value { get; private set; }
        public Type Type { get; private set; }

        public RuntimeTag(string name)
        {
            Name = name;
            Value = null;
            Type = null;
        }

        public RuntimeTag(string name, object val, Type type)
        {
            Name = name;
            Value = val;
            Type = type;
        }

        public static RuntimeTag Parse(string tagString)
        {
            var tokens = tagString.Split('=');

            if (tokens.Length == 1) return new RuntimeTag(tokens[0]);

            bool valBool;
            int valInt;
            float valFloat;

            if (int.TryParse(tokens[1], out valInt))
            {
                return new RuntimeTag(tokens[0], valInt, typeof(int));
            }
            else if (float.TryParse(tokens[1], out valFloat))
            {
                return new RuntimeTag(tokens[0], valFloat, typeof(float));
            }
            else if (bool.TryParse(tokens[1], out valBool))
            {
                return new RuntimeTag(tokens[0], valBool, typeof(bool));
            }
            else
            {
                return new RuntimeTag(tokens[0], tokens[1], typeof(string));
            }
        }
    }
}
