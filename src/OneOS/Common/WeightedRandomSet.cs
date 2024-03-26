using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Text;

namespace OneOS.Common
{
    // Implements the Walker-Vose alias method
    public class WeightedRandomSet<T>
    {
        Random Random;
        ConcurrentDictionary<T, double> WeightMap; // Stores the raw (not normalized) weights. Relative ratio compared to the other elements

        ConcurrentDictionary<T, double> Probabilities;
        ConcurrentDictionary<T, T> Aliases;
        object UpdateLock = new object();

        public WeightedRandomSet()
        {
            Random = new Random();
            WeightMap = new ConcurrentDictionary<T, double>();
            Probabilities = new ConcurrentDictionary<T, double>();
            Aliases = new ConcurrentDictionary<T, T>();
        }

        private void UpdateTables()
        {
            Probabilities.Clear();
            Aliases.Clear();

            // first generate the normalized probability table
            var weightSum = WeightMap.Aggregate(0.0, (acc, item) => acc + item.Value);
            foreach (var item in WeightMap)
            {
                Probabilities[item.Key] = item.Value / weightSum * WeightMap.Count;
            }

            // categorize elements
            var overfull = new List<T>();
            var underfull = new List<T>();

            foreach (var item in Probabilities)
            {
                if (item.Value > 1.0)
                {
                    overfull.Add(item.Key);
                }
                else if (item.Value < 1.0)
                {
                    underfull.Add(item.Key);
                }
                else
                {
                    Aliases[item.Key] = item.Key;
                }
            }

            // assign aliases
            while (Aliases.Count < WeightMap.Count)
            {
                var over = overfull[0];
                var under = underfull[0];
                overfull.RemoveAt(0);
                underfull.RemoveAt(0);

                Aliases[under] = over;

                var prob = Probabilities[over] + Probabilities[under] - 1.0;
                Probabilities[over] = prob;
                if (prob > 1.0)
                {
                    overfull.Add(over);
                }
                else if (prob < 1.0)
                {
                    underfull.Add(over);
                }
                else
                {
                    Aliases[over] = over;
                }

                // There might be residual floating point error for the last element
                if (Aliases.Count == WeightMap.Count - 1 && !Aliases.ContainsKey(over))
                {
                    Probabilities[over] = 1.0;
                    Aliases[over] = over;
                }
            }
        }

        public double Get(T item)
        {
            return WeightMap[item];
        }

        public void Set(T item, double weight)
        {
            WeightMap[item] = weight;
            UpdateTables();
        }

        public void SetWeights(Dictionary<T, double> weights)
        {
            lock (UpdateLock)
            {
                foreach (var item in weights)
                {
                    WeightMap[item.Key] = item.Value;
                }
                UpdateTables();
            }
        }

        public void ResetAll()
        {
            lock (UpdateLock)
            {
                foreach (var item in WeightMap)
                {
                    WeightMap[item.Key] = 1.0;
                }
                UpdateTables();
            }
        }

        public void Remove(T item)
        {
            lock (UpdateLock)
            {
                double val;
                WeightMap.TryRemove(item, out val);
                UpdateTables();
            }
        }

        public T Draw()
        {
            lock (UpdateLock)
            {
                var index = WeightMap.Keys.ToList()[Random.Next(0, WeightMap.Count)];
                var prob = Random.NextDouble();
                return (prob < Probabilities[index]) ? index : Aliases[index];
            }
        }
    }
}
