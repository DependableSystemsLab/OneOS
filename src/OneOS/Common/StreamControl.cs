using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.Threading.Tasks;

namespace OneOS.Common
{
    public class StreamControl
    {
        private static long TickResolution = Stopwatch.Frequency / 10000000;
        private static long TicksPerMB = Stopwatch.Frequency / 1000000;
        private double ThroughputLimit = 9999000000 / Stopwatch.Frequency; // limit rate - x bytes/tick
        private double ThroughputTarget = 0.0;

        private double _forcedLimit = 9999999999.0 / Stopwatch.Frequency; // for debugging
        public double ForcedLimit { get => _forcedLimit * TicksPerMB; set
            {
                _forcedLimit = value * 1000000 / Stopwatch.Frequency;
                Quota = 0;
                Console.WriteLine($"Limit forcefully set to {ForcedLimit} ({_forcedLimit}) MB/s (Original limit = {ThroughputLimit * TicksPerMB} MB/s or {ThroughputLimit} /tick)");
            } }

        public long Quota { get; private set; }
        public long NumBytes { get; private set; }
        public long NumFrames { get; private set; }
        public double Throughput { get; private set; }  // per tick
        public double FrameRate { get; private set; }   // per tick
        long LastUpdated = Stopwatch.GetTimestamp();

        public double ThroughputMB { get { return Math.Round(TicksPerMB * Throughput, 2); } }
        public double FrameRatePerSecond { get => FrameRate * Stopwatch.Frequency; }
        public double MinRate { get => Math.Round(TicksPerMB * ThroughputTarget, 2); }
        public double MaxRate { get => Math.Round(TicksPerMB * ThroughputLimit, 2); }
        private long QuotaPerSecond { get => Convert.ToInt64(ThroughputLimit * Stopwatch.Frequency); }

        public StreamControl() : this(9999.0) { }
        public StreamControl(double mbps)
        {
            ThroughputLimit = mbps * 1000000 / Stopwatch.Frequency;
        }

        public void SetLimit(double mbps)
        {
            ThroughputLimit = mbps * 1000000 / Stopwatch.Frequency;
            Quota = 0;  // Need to reset quota, if we want the new limit to take effect immediately
            if (ThroughputLimit < ThroughputTarget) throw new AssertionError($"Target (Min) Rate (value = {ThroughputTarget}) must be less than or equal to the Limit (Max) Rate (value = {ThroughputLimit})");
        }

        public void SetTarget(double mbps)
        {
            ThroughputTarget = mbps * 1000000 / Stopwatch.Frequency;
            if (ThroughputLimit < ThroughputTarget) throw new AssertionError($"Target (Min) Rate (value = {ThroughputTarget}) must be less than or equal to the Limit (Max) Rate (value = {ThroughputLimit})");
        }

        public void Reset()
        {
            LastUpdated = Stopwatch.GetTimestamp();
            Quota = 0;
            NumBytes = 0;
            NumFrames = 0;
            Throughput = 0;
        }

        public void Update(int numBytes)
        {
            NumBytes += numBytes;
            NumFrames++;

            var diff = Stopwatch.GetTimestamp() - LastUpdated;
            LastUpdated += diff;

            var weight = (double)Math.Min(diff, Stopwatch.Frequency) / Stopwatch.Frequency;
            Throughput += weight * ((double)numBytes / diff - Throughput);
            FrameRate += weight * (1.0 / diff - FrameRate);

            //Quota += Convert.ToInt64(diff * ThroughputLimit) - numBytes;
            Quota += Convert.ToInt64(diff * Math.Min(ThroughputLimit, _forcedLimit)) - numBytes;

            // Mode #1: Has an initial burst of flow, then converges to limit
            //Quota += (Quota > QuotaPerSecond) ? -numBytes : Convert.ToInt64(diff * ThroughputLimit) - numBytes;

            // Mode #2: Has a small initial burst, but converges to limit soon
            //Quota += (Quota > QuotaPerSecond) ? -numBytes : (diff > 10000000 ? QuotaPerSecond - numBytes : Convert.ToInt64(diff * ThroughputLimit) - numBytes);

            // Mode #3: Conservative option -- slowly increases flow towards the limit
            //Quota += (Quota > QuotaPerSecond || diff > Stopwatch.Frequency / 2) ? -numBytes : Convert.ToInt64(diff * ThroughputLimit) - numBytes;
        }

        public async Task Delay()
        {
            //if (Quota < 0) await Task.Delay(TimeSpan.FromTicks(-(long)(Quota / ThroughputLimit / TickResolution)));
            if (Quota < 0) await Task.Delay(TimeSpan.FromTicks(-(long)(Quota / Math.Min(ThroughputLimit, _forcedLimit) / TickResolution)));
            //if (Quota < 0) await Task.Delay(TimeSpan.FromTicks(-(long)(Quota / ThroughputLimit * 2)));    // *2 multiplication to "overprovision" since we anticipate more bytes in the next read
            //else Task.Yield();
        }
    }
}
