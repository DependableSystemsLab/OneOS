if (process.argv.length < 3) {
    console.error("Provide video device URI. E.g., node recognizer.js config.json");
    process.exit();
}

const configPath = process.argv[2];

const fs = require('fs');
const io = require('oneos/io');
const tf = require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

const readFile = path => new Promise((resolve, reject) => fs.readFile(path, (err, data) => {
    if (err) return reject(err);
    resolve(data);
}))

faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image: canvas.Image, ImageData: canvas.ImageData });

const faceDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

(async () => {
    // Load NNs for different tasks
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./weights');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./weights');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./weights');

    let config = await readFile(configPath);
    config = JSON.parse(config.toString());

    const labeledDescriptors = [];
    for (let item of config.faces) {
        const descriptors = [];
        for (let imagePath of item.images) {
            const imageData = await readFile(imagePath);
            const input = tf.node.decodeImage(imageData, 3);

            const result = await faceapi.detectSingleFace(input, faceDetectionOptions)
                .withFaceLandmarks()
                .withFaceDescriptor();

            descriptors.push(result.descriptor);
        }

        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(item.label, descriptors));
        //console.log('Registered ' + item.label);
    }

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
    const myCanvas = canvas.createCanvas(640, 480);
    const ctx = myCanvas.getContext('2d');

    const recognize = async (frame) => {
        const input = tf.node.decodeJpeg(frame, 3);

        const query = await faceapi.detectAllFaces(input, faceDetectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (query) {
            ctx.clearRect(0, 0, 640, 480);
            faceapi.draw.drawDetections(myCanvas, query);
            faceapi.draw.drawFaceLandmarks(myCanvas, query);

            const labels = query.map(item => ({
                label: faceMatcher.findBestMatch(item.descriptor)._label,
                x: item.detection._box._x + item.detection._box._width,
                y: item.detection._box._y + item.detection._box._height,
            }))

            labels.forEach(item => {
                const drawBox = new faceapi.draw.DrawTextField(item.label, item, { anchorPosition: 'TOP_RIGHT' });
                drawBox.draw(myCanvas);
            })

            return {
                frame: myCanvas.toBuffer(),
                labels: labels.map(item => item.label)
            };
        }
        else {
            ctx.clearRect(0, 0, 640, 480);

            return {
                frame: myCanvas.toBuffer(),
                labels: []
            };
        }
    }

    const video = io.createVideoInputStream(config.deviceUri);
    //video.pipe(process.stdout.segment);

    let skipped = 0;
    let toSkip = 0;
    let frameToProcess = null;
    video.on('data', async payload => {
        if (!frameToProcess) {
            frameToProcess = payload;

            const started = Date.now();
            // const result = await recognizer.recognize(msg);
            const result = await recognize(frameToProcess);
            const elapsed = Date.now() - started;

            if (result) {
                process.stdout.json.write({
                    landmarks: result.frame.toString('base64'),
                    labels: result.labels,
                    elapsed: elapsed,
                    skipped: skipped
                });
            }

            //frameToProcess = null;
            skipped = 0;
            toSkip = Math.ceil(elapsed * 15 / 1000);
        }
        else {
            skipped++;
            toSkip--;
            if (toSkip === 0) {
                frameToProcess = null;
            }
        }
    });
})();