const url = require('url');
const http = require('http');
const express = require('express');
const ws = require('ws');

const PORT = 20000;

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ noServer: true });

const video = process.stdin.segment;
let count = 0;
video.on('data', payload => {
    //console.log((count++) + ' received ' + payload.length + ' bytes');
    wss.clients.forEach(socket => {
        //console.log('sending ' + payload.length + ' bytes');
        //socket.send(payload.toString('base64'));
        socket.send(payload);
    });
});

video.on('end', () => process.exit());

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
    video.src = 'data:image/jpeg;base64,' + btoa(new Uint8Array(evt.data).reduce((acc, item) => acc + String.fromCharCode(item), ''));
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

server.listen(PORT, () => {
    console.log(`web started on port ${PORT}`);
});