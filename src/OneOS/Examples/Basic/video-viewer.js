if (process.argv.length < 4) {
    console.log("Provide video device URI and port. E.g., node video-viewer.js /dev/t1.example.org/vid0 20000");
    process.exit();
}

const deviceUri = process.argv[2];
const port = parseInt(process.argv[3]);

const url = require('url');
const http = require('http');
const express = require('express');
const ws = require('ws');
const io = require('oneos/io');

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ noServer: true });

const video = io.createVideoInputStream(deviceUri);
let count = 0;
video.on('data', payload => {
    //console.log((count++) + ' received ' + payload.length + ' bytes');
    wss.clients.forEach(socket => {
        //console.log('sending ' + payload.length + ' bytes');
        //socket.send(payload.toString('base64'));
        socket.send(payload);
    });
});

server.on('upgrade', (req, socket, head) => {
    const parsed = url.parse(req.url);
    if (parsed.pathname === '/wss') {
        console.log('new websocket client connnected');
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    }
    else {
        socket.destroy();
    }
});

app.get('/echo/:path', (req, res) => {
    console.log('Echo: ' + req.params.path);
    res.send('Echo: ' + req.params.path);
});

app.get('/', (req, res) => {
    console.log('page request received');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Video Viewer</title>
  </head>
  <body>
    <div style="display:flex;justify-content:center;">
      <img id="viewer"/>
    </div>
    <noscript>
      You need to enable JavaScript to run this app.
    </noscript>
    <script>
let video = document.getElementById('viewer');
let socket = new WebSocket('ws://' + window.location.host + '/wss');
socket.binaryType = 'arraybuffer';
socket.addEventListener('message', evt => {
    console.log(evt.data.byteLength);
    video.src = 'data:image/png;base64,' + btoa(new Uint8Array(evt.data).reduce((acc, item) => acc + String.fromCharCode(item), ''));
});

/*
let video = document.getElementById('viewer');
let mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceended', function(event) {
  console.log('MediaSource ended');
});

mediaSource.addEventListener('sourceopen', evt => {

    let queue = [];
    let sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');

    sourceBuffer.addEventListener('update', function(event) {
      if (queue.length > 0 && !sourceBuffer.updating){
        sourceBuffer.appendBuffer(queue.shift());
      }
    });
    sourceBuffer.addEventListener('updateend', function(event) {
      console.log('SourceBuffer updated');

        if (video.paused){
            video.play();
        }
    });

    let socket = new WebSocket('ws://' + window.location.host + '/wss');
    socket.binaryType = 'arraybuffer';
    socket.addEventListener('message', evt => {
        console.log(evt.data.byteLength);
        //console.log('MediaSource state: ', mediaSource.readyState);
        //console.log('SourceBuffer state: ', sourceBuffer.updating);
        if (sourceBuffer.updating || queue.length > 0){
            queue.push(evt.data);
        }
        else {
            sourceBuffer.appendBuffer(evt.data);
        }
    });
});
*/
    </script>
  </body>
</html>`);
});

server.listen(port, () => {
    console.log(`web started on port ${port}`);
});