const USE_MSG_FIELD = [
    'trip_time_in_secs',
    'trip_distance',
    'fare_amount',
    'surcharge',
    'mta_tax',
    'tip_amount',
    'tolls_amount',
    'total_amount'
];
const BLOCK_COUNT_WINDOW_SIZE = 10;

const trainWindowSize = 10;
const predictionHorizonSize = 10;

class SimpleRegression {
    constructor() {
        this.data = [];
    }

    _update() {
        // Calculate the mean of x and y
        const meanX = this.data.reduce((sum, point) => sum + point[0], 0) / this.data.length;
        const meanY = this.data.reduce((sum, point) => sum + point[1], 0) / this.data.length;

        // Calculate the slope (m)
        const numerator = this.data.reduce((sum, point) => sum + (point[0] - meanX) * (point[1] - meanY), 0);
        const denominator = this.data.reduce((sum, point) => sum + Math.pow(point[0] - meanX, 2), 0);
        const slope = numerator / denominator;

        // Calculate the y-intercept (b)
        this.yIntercept = meanY - slope * meanX;
        this.slope = slope;
    }

    addData(x, y) {
        this.data.push([x, y]);
        this._update();
    }

    removeData(x, y) {
        let index = this.data.findIndex(item => item[0] === x && item[1] === y);
        if (index > -1) {
            this.data.splice(index, 1);
            this._update();
        }
    }

    predict(x) {
        return this.slope * x + this.yIntercept;
    }
}

class LinearRegressionPredictor {
    constructor() {
		this.simpleReg = new SimpleRegression();
        this.trailWindowItems = [];
        this.predictions = Array.from({ length: predictionHorizonSize });
		this.itemCount = 0;
    }

	predict(strVal) {
		const val = parseFloat(strVal);
		this.itemCount += 1;

		// add latest <attr, value> pair to list & regression
		this.trailWindowItems.push([this.itemCount, val]);
		this.simpleReg.addData(this.itemCount, val);

		// make prediction once train window is full
		if (this.itemCount > trainWindowSize) {
			// remove latest <attr, value> pair from list & regression to maintain train window size
			let oldVal = this.trailWindowItems.shift();
			this.simpleReg.removeData(oldVal[0], oldVal[1]);

			// make 'predictionHorizonSize' number of predictions
            for (let j = 1; j <= predictionHorizonSize; j++) {
                let pred = this.simpleReg.predict(this.itemCount + j);
                this.predictions[j - 1] = pred;
            }

            return this.predictions;
        }
        else {
            // no predictions till window is full
            return null;
        }
    }
}

const predMap = new Map();

function doTask(msg) {
    try {
        if (USE_MSG_FIELD.includes(msg.obsType)) {

            const key = msg.sensorId + msg.obsType;
            if (!predMap.has(key)) {
                predMap.set(key, new LinearRegressionPredictor());
            }
            const predictor = predMap.get(key);
            const result = predictor.predict(msg.kalmanUpdatedVal);

            if (result !== null) {
                msg.meta = msg.meta + ',' + msg.obsType;
                process.stdout.json.write({
                    meta: msg.meta,
                    sensorId: msg.sensorId,
                    obsType: msg.obsType,
                    predictions: result,
                    msgId: msg.msgId
                });
            }

        }
    }
    catch (err) {
        console.error(err);
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());