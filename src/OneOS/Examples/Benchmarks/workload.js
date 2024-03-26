if (process.argv.length < 7) {
    console.log('provide service time (ms), heap branch count, heap depth, node size (bytes), duration (sec)');
    process.exit(1);
}

const serviceTime = parseInt(process.argv[2]);
const heapBranches = parseInt(process.argv[3]);
const heapDepth = parseInt(process.argv[4]);
const nodeSize = parseInt(process.argv[5]);
const duration = parseInt(process.argv[6]);

function fork(branch, depth) {
    let data = Buffer.alloc(nodeSize, Math.random());
    let children = [];

    if (depth > 0) {
        for (let i = 0; i < branch; i++) {
            children.push(fork(branch, depth - 1))
        }
    }

    return data;
}

let root = fork(heapBranches, heapDepth);
let x = 0;

const expStarted = Date.now();
let outFrame = null;
function onFrameReceive(frame) {
    let startedAt = Date.now();
    while (Date.now() - startedAt < serviceTime) {
        // waste cycles
        x = x * Math.random() * Math.random();
    }

    outFrame = Buffer.alloc(frame.length + 4);
    outFrame.writeInt32LE(frame.length, 0);
    frame.copy(outFrame, 4, 0, frame.length);
    process.stdout.write(outFrame);

    let progress = Date.now() - expStarted;
    if (progress > duration * 1000) {
        process.exit();
    }
}


let header = Buffer.alloc(4);
let headerRead = 0;
let frame = null;
let frameCursor = 0;

process.stdin.on('data', chunk => {
    let bytesRead = chunk.length;
    let cursor = 0;
    while (cursor < bytesRead) {
        while (frame === null) {
            header[headerRead] = chunk[cursor];
            headerRead++;
            cursor++;
            if (headerRead === 4) {
                frame = Buffer.alloc(header.readInt32LE());
                frameCursor = 0;
                headerRead = 0;
            }
            if (cursor >= bytesRead) break;
        }

        let frameBytesLeft = frame.length - frameCursor;
        let bytesLeft = bytesRead - cursor;

        if (frameBytesLeft <= bytesLeft) {
            chunk.copy(frame, frameCursor, cursor, cursor + frameBytesLeft);
            onFrameReceive(frame);

            cursor += frameBytesLeft;
            frame = null;
        }
        else {
            chunk.copy(frame, frameCursor, cursor, cursor + bytesLeft);
            cursor += bytesLeft;
            frameCursor += bytesLeft;
        }
    }
});