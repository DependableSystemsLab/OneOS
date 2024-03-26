const TIMESTAMP_FIELD = 0;
const PLOT_WINDOW = 250;

const averageMap = new Map();
const predictionMap = new Map();
const countMap = new Map();

class Plot {
    constructor() {
        this.data = [];
    }

    addData(timestamp, data) {
        if (this.data.length === PLOT_WINDOW) {
            this.data.shift();
        }

        this.data.push([timestamp, data]);
    }

    draw() {
        if (this.data.length < PLOT_WINDOW) return null;

        return this.data;
    }
}

function accumulate(msg) {
    const key = msg.sensorId + msg.obsType;
    let plotMap, valueField;
    if ('average' in msg) {
        plotMap = averageMap;
        valueField = 'average';
    }
    else if ('count' in msg) {
        plotMap = countMap;
        valueField = 'count';
    }
    else if ('predictions' in msg) {
        plotMap = predictionMap;
        valueField = 'predictions';
    }

    if (!plotMap.has(key)) {
        plotMap.set(key, new Plot());
    }

    const plot = plotMap.get(key);
    const timestamp = new Date(msg.meta.split(',')[TIMESTAMP_FIELD]);

    plot.addData(timestamp.getTime(), msg[valueField]);

    return plot;
}

function createPlot(plot) {
    return plot.draw();
}

function zip(serializedPlot) {
    let data = Buffer.from(JSON.stringify(serializedPlot));
    process.stdout.segment.write(data);
}

function doTask(msg) {
    try {
        const plot = accumulate(msg);
        const visualized = createPlot(plot);

        if (visualized !== null) {
            zip(visualized);
        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());