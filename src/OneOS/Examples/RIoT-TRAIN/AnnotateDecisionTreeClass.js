const math = require('mathjs');

const RESULT_ATTRIBUTE = 'total_amount';

class Percentile {
    constructor(labels) {
        this.data = [];
        this.labels = labels;
        this.markers = [];
    }

    update(item) {
        if (item instanceof Array) {
            this.data = this.data.concat(item);
        }
        else {
            this.data.push(item);
        }
        this.data = Array.from(new Set(this.data));

        this.markers = this.labels.map((_, index) => math.quantileSeq(this.data, (1 + index) / this.labels.length));
    }

    getLabel(val) {
        for (let i = 0; i < this.markers.length; i ++) {
            if (val < this.markers[i]) {
                return this.labels[i];
            }
        }
    }
}

const percentile = new Percentile(['BAD', 'GOOD', 'VERY GOOD', 'EXCELLENT']);

function doTask(msg) {
    try {

        percentile.update(msg.dataset.map(item => parseFloat(item.data[RESULT_ATTRIBUTE])));

        msg.dataset.forEach(item => {
            item['classified_class'] = percentile.getLabel(parseFloat(item.data[RESULT_ATTRIBUTE]));
        });

        process.stdout.json.write(msg);
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());