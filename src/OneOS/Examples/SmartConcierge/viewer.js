const url = require('url');
const http = require('http');
const express = require('express');
const ws = require('ws');

const PORT = 20000;

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ noServer: true });

const video = process.stdin.json;
let count = 0;
video.on('data', payload => {
    //console.log((count++) + ' received ' + payload.length + ' bytes');
    const message = JSON.stringify(payload);
    wss.clients.forEach(socket => {
        //console.log('sending ' + payload.length + ' bytes');
        //socket.send(payload.toString('base64'));
        socket.send(message);
    });
});

video.on('end', () => process.exit());

process.runtime.events.on('data', data => {
    wss.clients.forEach(socket => {
        socket.send(JSON.stringify({
            event: data.type,
            data: data.data
        }));
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

app.get('/runtimes', async (req, res) => {
    const list = await process.runtime.listAllRuntimes();
    res.json(list);
});

app.get('/agents', async (req, res) => {
    const list = await process.runtime.listAllAgents();
    res.json(list);
});

app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
    console.log('page request received');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Video Viewer</title>
    <style>
body {
    background: #ccc;

}
.label {
    padding: 0.25em;
    border-radius: 0.2em;
    border: 1px solid #0033cc;
    color: white;
    background: #0033cc;
}
table {
    border-collapse: collapse;
    border: 1px solid #444;
    box-shadow: 0 0 5px #888;
    width: 100%;
}
table th {
    padding: 0.5em;
}
table tr:not(:first-child) {
    border-top: 1px solid #aaa;
}
#logs {
    flex:3;
    background: white;
    margin-top: 0.5em;
    min-height: 2em;
    padding: 0.5em;
    overflow: auto;
}
    </style>
  </head>
  <body>
    <div style="display:flex;flex-direction:row;">
      <div style="flex:3;display:flex;flex-direction:column;align-items:center;font-family:Arial,sans-serif;background:white;">
        <div style="position: relative;">
          <img id="viewer"/>
          <img id="landmarks"/>
          <div id="fps-overlay"></div>
        </div>
        <div id="face-label"></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:stretch;font-family:Arial,sans-serif;padding:0.5em;">
        <div style="flex:1; background: white;">
            <table>
                <tr>
                    <th>Door</th>
                    <td id="door-state">
                        <span style="display:inline-block;padding:0.5em;background:#aaa">Unknown</span>
                    </td>
                </tr>
            </table>
        </div>
        <div id="runtimes" style="flex:4; background: white; margin-top: 0.5em;">
            <table>
                <thead>
                    <tr>
                        <th>Runtime</th>
                        <th>Status</th>
                        <th>Components</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>0</th>
                        <td id="runtime-status-0"></td>
                        <td id="runtime-comps-0"></td>
                    </tr>
                    <tr>
                        <th>1</th>
                        <td id="runtime-status-1"></td>
                        <td id="runtime-comps-1"></td>
                    </tr>
                    <tr>
                        <th>2</th>
                        <td id="runtime-status-2"></td>
                        <td id="runtime-comps-2"></td>
                    </tr>
                    <tr>
                        <th>3</th>
                        <td id="runtime-status-3"></td>
                        <td id="runtime-comps-3"></td>
                    </tr>
                    <tr>
                        <th>4</th>
                        <td id="runtime-status-4"></td>
                        <td id="runtime-comps-4"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div id="logs">
        </div>
      </div>
    </div>
    <noscript>
      You need to enable JavaScript to run this app.
    </noscript>
    <script>
class StopWatch {
    constructor(){
        this.lastCount = Date.now();
        this.rate = 0;
    }

    get roundedRate(){
        return this.rate.toFixed(1);
    }

    count (){
        if (isNaN(this.rate)) this.rate = 0;

        const now = Date.now();
        const diff = now - this.lastCount;
        const weight = Math.min(diff, 1000) / 1000;
        this.rate += weight * (1000 / diff - this.rate);
        this.lastCount = now;
    }
}

//const doorOpenAudio = new Audio('/assets/door-open.mp3');
//const doorCloseAudio = new Audio('/assets/door-close.mp3');

const components = [ 'streamer.js', 'recognizer.js', 'concierge.js', 'doorlock.js', 'notifier.js', 'viewer.js' ];

const runtimeMap = {
    'test-0.jungabyte.com': 0,
    'test-1.jungabyte.com': 1,
    'test-2.jungabyte.com': 2,
    'test-3.jungabyte.com': 3,
    'test-4.jungabyte.com': 4
};

const agentMap = {}

const video = document.getElementById('viewer');

const landmarks = document.getElementById('landmarks');
landmarks.style.position = 'absolute';
landmarks.style.top = '0px';
landmarks.style.left = '0px';

const label = document.getElementById('face-label');
const fpsOverlay = document.getElementById('fps-overlay');
fpsOverlay.style.position = 'absolute';
fpsOverlay.style.top = '0px';
fpsOverlay.style.right = '0px';

const doorState = document.getElementById('door-state');
const runtimeDiv = document.getElementById('runtimes');
const logDiv = document.getElementById('logs');

let fps = new StopWatch();    // frames-per-second
let dps = new StopWatch();    // detections-per-second

function renderLabels(labels){
    label.innerHTML = labels.map(item => '<span class="label">' + item + '</span>').join('');
}

function renderAgents(){
    const state = Object.keys(agentMap).reduce((acc, comp) => {
        if (!acc[agentMap[comp]]) acc[agentMap[comp]] = [];
        acc[agentMap[comp]].push(comp);
        return acc;
    }, {});
    Object.keys(runtimeMap).forEach(runtime => {
        const agents = state[runtime] || [];
        const innerHTML = agents.map(comp => '<div>' + comp + '</div>').join('');
        document.getElementById('runtime-comps-' + runtimeMap[runtime]).innerHTML = innerHTML;
    })
}

fetch('runtimes').then(resp => resp.json()).then(list => list.forEach(item => {
    const innerHTML = item.status === 'Alive' ? '<span style="display:inline-block;padding:0.5em;background:#44FC17">Alive</span>' : '<span style="display:inline-block;padding:0.5em;background:#DC7E7E;color:#555">Dead</span>';
    document.getElementById('runtime-status-' + runtimeMap[item.uri]).innerHTML = innerHTML;
}));

fetch('agents').then(resp => resp.json()).then(list => {
    list.forEach(item => {
        const filename = item.uri.split('/').slice(-2)[0];
        if (components.includes(filename)){
            agentMap[filename] = item.runtime;
        }
    });
    renderAgents();
});

const socket = new WebSocket('ws://' + window.location.host + '/wss');
socket.addEventListener('message', evt => {
    const message = JSON.parse(evt.data);
    if (message.frame){
        video.src = 'data:image/jpeg;base64,' + message.frame;
        fps.count();
    }
    if (message.labels){
        renderLabels(message.labels);
    }
    if (message.landmarks){
        landmarks.src = 'data:image/jpeg;base64,' + message.landmarks;
        dps.count();
    }

    if (message.event){
        if (message.event === 'door-open'){
            doorState.innerHTML = '<span style="display:inline-block;padding:0.5em;background:#44FC17">Open</span>';
            //doorOpenAudio.play();
        }
        else if (message.event === 'door-close'){
            doorState.innerHTML = '<span style="display:inline-block;padding:0.5em;background:#DC7E7E;color:#555">Closed</span>';
            //doorCloseAudio.play();
        }
        else if (message.event === 'runtime-leave'){
            const msgDiv = document.createElement('div');
            msgDiv.appendChild(document.createTextNode('Runtime ' + runtimeMap[message.data] + ' left'));
            logDiv.appendChild(msgDiv);

            logDiv.scrollTop = logDiv.scrollHeight;

            document.getElementById('runtime-status-' + runtimeMap[message.data]).innerHTML = '<span style="display:inline-block;padding:0.5em;background:#DC7E7E;color:#555">Dead</span>';
        }
        else if (message.event === 'runtime-join'){
            const msgDiv = document.createElement('div');
            msgDiv.appendChild(document.createTextNode('Runtime ' + runtimeMap[message.data] + ' joined'));
            logDiv.appendChild(msgDiv);

            logDiv.scrollTop = logDiv.scrollHeight;

            document.getElementById('runtime-status-' + runtimeMap[message.data]).innerHTML = '<span style="display:inline-block;padding:0.5em;background:#44FC17">Alive</span>';
        }
        else if (message.event === 'agent-join'){
            const msgDiv = document.createElement('div');
            const filename = message.data.uri.split('/').slice(-2)[0];
            msgDiv.appendChild(document.createTextNode('Node ' + filename + ' started on Runtime ' + runtimeMap[message.data.runtime]));
            logDiv.appendChild(msgDiv);

            logDiv.scrollTop = logDiv.scrollHeight;

            if (components.includes(filename)){
                agentMap[filename] = message.data.runtime;
            }

            renderAgents();
        }

        console.log(message);
    }

    if (message.message){
        const msgDiv = document.createElement('div');
        msgDiv.appendChild(document.createTextNode(message.message));
        logDiv.appendChild(msgDiv);

        logDiv.scrollTop = logDiv.scrollHeight;
    }

    fpsOverlay.innerHTML = fps.roundedRate + ' FPS, ' + dps.roundedRate + ' DPS';
});
    </script>
  </body>
</html>`);
});

server.listen(PORT, () => {
    console.log(`web started on port ${PORT}`);
});