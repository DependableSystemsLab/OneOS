const SPIKE_DETECTOR_THRESHOLD = 0.03;

process.stdin.json.on('data', msg => {
    if (Math.abs(msg.value - msg.movingAvg) > SPIKE_DETECTOR_THRESHOLD * msg.movingAvg) {
        msg.message = "spike detected";
        process.stdout.json.write(msg);
    }
});
process.stdin.json.on('end', () => process.exit());