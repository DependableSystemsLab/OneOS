if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node FraudPredictor.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

var fs = require('fs');

const DEFAULT_MODEL = fs.readFileSync('model.txt', 'utf8');
const LOCAL_PREDICTOR = true;
const STATE_SEQ_WINDOW_SIZE = 5;
const STATE_ORDINAL = 1;
const DETECTION_ALGO = 'missProbability';
const METRIC_THRESHOLD = 0.96;

class MarkovModel {
    constructor(modelString) {
        this.states = null;
        this.numStates = 0;
        this.stateTransitionProb = null;

        modelString.split('\n').forEach((line, index) => {
            if (index === 0) {
                this.states = line.split(',');
                this.numStates = this.states.length;
                this.stateTransitionProb = Array.from({ length: this.numStates }).map(item => Array.from({ length: this.numStates }).fill(0.0));
            }
            else if (index <= this.numStates) {
                //populate state transition probability
                const items = line.split(',');
                if (items.length !== this.numStates) {
                    throw new Error('Row serialization failed, number of tokens in string does not match with number of columns');
                }
                for (let c = 0; c < this.numStates; c++) {
                    this.stateTransitionProb[index - 1][c] = parseFloat(items[c]);
                }
            }
        });

    }
}

class Prediction {
    constructor(entityId, score, states, outlier) {
        this.entityId = entityId;
        this.score = score;
        this.states = states;
        this.outlier = outlier;
    }
}

class MarkovModelPredictor {
    constructor(modelString) {
        this.records = new Map();
        this.markovModel = new MarkovModel(modelString);

        this.localPredictor = LOCAL_PREDICTOR;

        if (this.localPredictor) {
            this.stateSeqWindowSize = STATE_SEQ_WINDOW_SIZE;
        }
        else {
            this.stateSeqWindowSize = 5;
            this.globalParams = new Map();
        }

        //state value ordinal within record
        this.stateOrdinal = STATE_ORDINAL;

        //detection algorithm
        const algo = DETECTION_ALGO;
        if (algo === 'missProbability') {
            this.detectionAlgorithm = 'MissProbability';
        }
        else if (algo === 'missRate') {
            this.detectionAlgorithm = 'MissRate';

            //max probability state index
            this.maxStateProbIndex = Array.from({ length: this.markovModel.numStates });
            for (let i = 0; i < this.markovModel.numStates; i++) {
                let maxProbIndex = -1;
                let maxProb = -1;
                for (let j = 0; j < this.markovModel.numStates; j++) {
                    if (this.markovModel.stateTransitionProb[i][j] > maxProb) {
                        maxProb = this.markovModel.stateTransitionProb[i][j];
                        maxProbIndex = j;
                    }
                }
                this.maxStateProbIndex[i] = maxProbIndex;
            }
        }
        else if (algo === 'entropyReduction') {
            this.detectionAlgorithm = 'EntropyReduction';

            //entropy per source state
            this.entropy = Array.from({ length: this.markovModel.numStates });
            for (let i = 0; i < this.markovModel.numStates; i++) {
                let ent = 0;
                for (let j = 0; j < this.markovModel.numStates; j++) {
                    ent += -this.markovModel.stateTransitionProb[i][j] * Math.log(this.markovModel.stateTransitionProb[i][j]);
                }
                this.entropy[i] = ent;
            }
        }
        else {
            //error
            const msg = "The detection algorithm '" + algo + "' does not exist";
            console.error(msg);
            throw new Error(msg);
        }

        this.metricThreshold = METRIC_THRESHOLD; 
    }

    execute(entityId, record) {
        let score = 0;

        if (!this.records.has(entityId)) {
            this.records.set(entityId, []);
        }
        let recordSeq = this.records.get(entityId);

        //add and maintain size
        recordSeq.push(record);
        if (recordSeq.length > this.stateSeqWindowSize) {
            recordSeq.shift();
        }

        let stateSeq = null;
        if (this.localPredictor) {
            //local metric
            //console.log("local metric,  seq size " + recordSeq.length);

            if (recordSeq.length === this.stateSeqWindowSize) {
                stateSeq = Array.from({ length: this.stateSeqWindowSize }).fill('');
                for (let i = 0; i < this.stateSeqWindowSize; i++) {
                    stateSeq[i] = recordSeq[i].split(',')[this.stateOrdinal];
                }
                score = this.getLocalMetric(stateSeq);
            }
        }
        else {
            //global metric
            //console.log("global metric");

            if (recordSeq.length >= 2) {
                stateSeq = ['', ''];

                for (let i = this.stateSeqWindowSize - 2, j = 0; i < this.stateSeqWindowSize; i++) {
                    stateSeq[j++] = recordSeq[i].split(',')[this.stateOrdinal];
                }

                if (!this.globalParams.has(entityId)) {
                    this.globalParams.set(entityId, [0.0, 0.0]);
                }
                let params = this.globalParams.get(entityId);

                score = this.getGlobalMetric(stateSeq, params);
            }
        }

        //outlier
        console.log("metric  " + entityId + ":" + score);
        
        const prediction = new Prediction(entityId, score, stateSeq, (score > this.metricThreshold));

        if (score > this.metricThreshold) {
            /*
            StringBuilder stBld = new StringBuilder(entityID);
            stBld.append(" : ");
            for (String st : stateSeq) {
                stBld.append(st).append(" ");
            }
            stBld.append(": ");
            stBld.append(score);
            jedis.lpush(outputQueue,  stBld.toString());
            */
            // should return the score and state sequence
            // should say if is an outlier or not
        }

        return prediction;
    }


    getLocalMetric(stateSeq) {
        let metric = 0;
        let params = Array.from({ length: 2 }).fill(0.0);

        if (this.detectionAlgorithm == 'MissProbability') {
            this.missProbability(stateSeq, params);
        }
        else if (this.detectionAlgorithm == 'MissRate') {
            this.missRate(stateSeq, params);
        }
        else {
            this.entropyReduction(stateSeq, params);
        }

        metric = params[0] / params[1];
        return metric;
    }


    getGlobalMetric(stateSeq, globParams) {
        let metric = 0;
        let params = Array.from({ length: 2 }).fill(0.0);

        if (this.detectionAlgorithm == 'MissProbability') {
            this.missProbability(stateSeq, params);
        }
        else if (this.detectionAlgorithm == 'MissRate') {
            this.missRate(stateSeq, params);
        }
        else {
            this.entropyReduction(stateSeq, params);
        }

        globParams[0] = globParams[0] + params[0];
        globParams[1] = globParams[1] + params[1];
        metric = globParams[0] / globParams[1];
        return metric;
    }

    missProbability(stateSeq, params) {
        let start = this.localPredictor ? 1 : stateSeq.length - 1;
        for (let i = start; i < stateSeq.length; i++) {
            let prState = this.markovModel.states.indexOf(stateSeq[i - 1]);
            let cuState = this.markovModel.states.indexOf(stateSeq[i]);

            console.log("state prob index:" + prState + " " + cuState);

            //add all probability except target state
            for (let j = 0; j < this.markovModel.states.length; j++) {
                if (j !== cuState) params[0] += this.markovModel.stateTransitionProb[prState][j];
            }
            params[1] += 1;
        }
        console.log("params:" + params[0] + ":" + params[1]);
    }

    missRate(stateSeq, params) {
        let start = this.localPredictor ? 1 : stateSeq.length - 1;
        for (let i = start; i < stateSeq.length; i++) {
            let prState = this.markovModel.states.indexOf(stateSeq[i - 1]);
            let cuState = this.markovModel.states.indexOf(stateSeq[i]);
            params[0] += (cuState == this.maxStateProbIndex[prState] ? 0 : 1);
            params[1] += 1;
        }
    }

    entropyReduction(stateSeq, params) {
        let start = this.localPredictor ? 1 : stateSeq.length - 1;
        for (let i = start; i < stateSeq.length; ++i) {
            let prState = this.markovModel.states.indexOf(stateSeq[i - 1]);
            let cuState = this.markovModel.states.indexOf(stateSeq[i]);
            params[0] += (cuState == this.maxStateProbIndex[prState] ? 0 : 1);
            params[1] += 1;
        }
    }
}

const predictor = new MarkovModelPredictor(DEFAULT_MODEL);

process.stdin.segment.on('data', chunk => {
    const tokens = chunk.toString().split(',');
    const entityId = tokens[0];
    const record = tokens[1] + ',' + tokens[2];

    const p = predictor.execute(entityId, record);

    if (p.outlier) {
        process.stdout.json.write({
            entityId: entityId,
            score: p.score,
            states: p.states.join(',')
        });
    }
});
process.stdin.segment.on('end', () => process.exit());