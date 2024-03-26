const USE_MSG_FIELD = 1;
const USE_MSG_FIELDLIST = [
	'trip_time_in_secs',
	'trip_distance',
	'fare_amount',
	'surcharge',
	'mta_tax',
	'tip_amount',
	'tolls_amount',
	'total_amount'
]

const PROCESS_NOISE = 0.125;
const SENSOR_NOISE = 0.32
const ESTIMATED_ERROR = 30;

class KalmanFilter {
	constructor() {
		this.prevEstimation = 0;
		this.prevErrorCovariance = ESTIMATED_ERROR;
	}

	apply(val) {
		let measuredValue = parseFloat(val);

		// Time Update
		let currentErrorCovariance = this.prevErrorCovariance + PROCESS_NOISE;

		// Measurement update
		let kalmanGain = currentErrorCovariance / (currentErrorCovariance + SENSOR_NOISE);
		let currentEstimation = this.prevEstimation + kalmanGain * (measuredValue - this.prevEstimation);
		currentErrorCovariance = (1 - kalmanGain) * currentErrorCovariance;
		
		// Update estimate and covariance for next iteration
		this.prevEstimation = currentEstimation;
		this.prevErrorCovariance = currentErrorCovariance;

		return currentEstimation;
	}
}

const filterMap = new Map();

function doTask(msg) {
	try {
		if (USE_MSG_FIELDLIST.includes(msg.obsType)) {

			const key = msg.sensorId + msg.obsType;
			if (!filterMap.has(key)) {
				filterMap.set(key, new KalmanFilter());
			}
			const kalman = filterMap.get(key);
			const result = kalman.apply(msg.obsVal);

			if (result !== null) {
				process.stdout.json.write({
					meta: msg.meta,
					sensorId: msg.sensorId,
					obsType: msg.obsType,
					kalmanUpdatedVal: result,
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