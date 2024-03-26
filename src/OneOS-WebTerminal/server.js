/*
* Note:
*   This application runs within the OneOS virtual context
* just like any other JavaScript program running inside OneOS.
* Thus, OneOS will instrument this program prior to execution,
* in order to replace the evaluation context.
* More specifically, the following APIs will be replaced/instrumented:
*   - process
*   - fs, net, child_process modules
* Keeping in mind the above, we can simply treat the OneOS network
* as a localhost machine and serve users accordingly.
* For example, we can simply expose the file system via the fs API.
*/

'use strict';
if (process.argv.length < 3) {
	console.log('port number should be provided\n  e.g., node server.js 3000');
	process.exit(1);
}

const PORT = parseInt(process.argv[2]);

const fs = require('fs');
const url = require('url');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const ws = require('ws');
const io = require('oneos/io');

const sessionManager = (() => {
	const managerUri = 'kernels.' + process.env.DOMAIN + '/SessionManager';
	const cookieName = 'oneos-session';
	const cookieSecret = crypto.randomBytes(10).toString('hex');
	const cookieMaxAge = 86400;
	const sessions = {};

	// remove expired sessions
	setInterval(() => {
		const now = Date.now();
		let deleted = 0;
		Object.keys(sessions).forEach(key => {
			if (sessions[key].expires < now) {
				delete sessions[key];
				deleted++;
			}
		});

		if (deleted > 0) {
			console.log(deleted + ' sessions expired, there are now ' + Object.keys(sessions).length + ' active sessions');
		}
	}, 5000);

	const createSession = (username, oneosSessionKey, res) => {
		// create session
		const token = crypto.randomBytes(16).toString('hex');	// this is the web terminal session key, different from oneosSessionKey
		const now = Date.now();
		const maxAge = 1000 * cookieMaxAge;
		sessions[token] = {
			token: token,
			username: username,
			created: now,
			expires: now + maxAge,
			oneosSessionKey: oneosSessionKey
		};
		console.log('New Sign in by ' + username + ', cookie set to = ' + token);
		console.log(Object.keys(sessions).length + ' active sessions');

		res.cookie(cookieName, token, {
			httpOnly: true,
			maxAge: maxAge,
			signed: true
		});
	}

	const authenticate = (req, res, next) => {
		const token = req.signedCookies ? req.signedCookies[cookieName] : null;
		if (!token) {
			return res.redirect('/login');
		}
		else {
			if (sessions[token]) {
				req.session = sessions[token];
				next();
				return;
			}
			else {
				return res.redirect('/login');
			}
		}
	};

	const loginPage = (err) => `<!DOCTYPE html>
<html lang="en">
	<head>
		<base href="/">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>OneOS Web Terminal | Login</title>
		<style>
body {
	background: linear-gradient(-45deg, #99082a, #990866, #3a0775, #074275);
	background-size: 400% 400%;
	animation: gradient 20s ease infinite;
	height: 100vh;
}

@keyframes gradient {
	0% {
		background-position: 0% 50%;
	}
	50% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0% 50%;
	}
}

label { display:block; font-size:small; }
input { padding: 0.5em; border: 1px solid white; background: none; }
button { padding: 1em; border: 1px solid white; background: none; }
button:hover { box-shadow: 0 0 5px #fff8; background: #fff8; }
		</style>
	</head>
	<body style="padding:0; margin:0; font-family: Helvetica, sans-serif">
		<div style="position:absolute; width:100%; height:100%; align-items:center; justify-content:center; display:flex; flex-direction: column;">
			<form action="/login" method="POST" style="padding:2em; box-shadow:0 0 10px #0008; background: #fffa">
				<div style="padding: 0.5em;">
					<label>Username</label>
					<input type="text" name="username"/>
				</div>
				<div style="padding: 0.5em;">
					<label>Password</label>
					<input type="password" name="password"/>
				</div>
				${(err ? `<div style="margin:0.5em; padding:0.5em; background:#f88; color:white; border-radius:0.25em;">${err}</div>` : '')}
				<div style="text-align:center; padding: 0.5em;">
					<button type="submit">Log in</button>
				</div>
			</form>
		</div>
		<script>
		document.querySelector('input').focus();
		</script>
	</body>
</html>`;
	const loginRouter = express.Router();
	loginRouter.get('/login', (req, res) => res.send(loginPage()));
	loginRouter.post('/login', (req, res) => {
		if (!req.body.username) {
			res.send(loginPage('Username was not provided'));
		}
		else if (!req.body.password) {
			res.send(loginPage('Password was not provided'));
		}
		else {
			// contact OneOS SessionManager
			io.rpcRequest(managerUri, 'LogIn', req.body.username, req.body.password)
				.then(oneosSessionKey => {
					createSession(req.body.username, oneosSessionKey, res);
					res.redirect(req.query.next || '/');
				}).catch(err => {
					console.log(err);

					if (err.message.includes('Incorrect password')) {
						res.send(loginPage('Incorrect password'));
					}
					else if (err.message.includes('User does not exist')) {
						res.send(loginPage('User does not exist'));
					}
					else {
						res.send(loginPage('Unknown Error'));
					}
				});
		}
	});
	loginRouter.all('/logout', authenticate, (req, res) => {
		if (req.session) {
			delete sessions[req.session.token];
			console.log('deleted session ' + req.session.token);
			console.log(Object.keys(sessions).length + ' active sessions');
		}
		res.redirect('/');
	});

	loginRouter.get('/me', authenticate, (req, res) => {
		res.json({
			username: req.session.username
		});
	});

	return {
		cookieParser: cookieParser(cookieSecret),
		authenticate: authenticate,
		loginRouter: loginRouter
	}
})();

const videoManager = (() => {
	const streams = {};

	return {
		subscribe: (ws, uri) => {
			if (!streams[uri]) streams[uri] = io.createVideoInputStream(uri);

			const video = streams[uri];
			const handler = payload => ws.send(payload);
			video.on('data', handler);
			ws.on('close', evt => {
				video.off('data', handler);
				if (video.listeners('data').length === 0) {
					video.destroy();
					delete streams[uri];
					console.log('No more clients consuming ' + uri + ', destroying stream');
				}
			});
		}
	}
})();

const agentMonitor = (() => {
	const streams = {};

	return {
		subscribe: (ws, uri) => {
			if (!streams[uri]) streams[uri] = io.createAgentMonitorStream(uri);

			const stream = streams[uri];
			const handler = payload => ws.send(payload);
			stream.on('data', handler);
			ws.on('close', evt => {
				stream.off('data', handler);
				if (stream.listeners('data').length === 0) {
					stream.destroy();
					delete streams[uri];
					console.log('No more clients consuming ' + uri + ', destroying stream');
				}
			});
		}
	}
})();

const commBroker = (() => {
	const wss = new ws.Server({ noServer: true });

	const listen = (server, mountPath, authManager) => {
		server.on('upgrade', (req, socket, head) => {
			const parsed = url.parse(req.url);
			if (parsed.pathname === mountPath) {
				authManager.cookieParser(req, null, (err) => {
					if (err) {
						console.log(err);
						socket.destroy();
						return;
					}

					authManager.authenticate(req, null, err => {
						if (err) {
							console.log(err);
							socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
							socket.destroy();
							return;
						}

						wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
					})
				});
			}
			else {
				socket.destroy();
			}
		});
	}

	wss.on('connection', (ws, req) => {
		const meta = {
			id: crypto.randomBytes(10).toString('hex')
		};
		ws.meta = meta;
		ws.on('message', data => {
			const message = JSON.parse(data);

			// if meta.handler exists, this connection is established
			if (meta.handler) {
				meta.handler(message);
			}
			else {
				// assign handler based on client needs
				if (message.connection === 'UserShell') {

					console.log('WebSocket client requesting UserShell, opening Agent Tunnel to UserShell');
					const tunnel = io.createAgentTunnel(req.session.oneosSessionKey, `${req.session.username}.${process.env.DOMAIN}/shell`);

					tunnel.on('data', message => {
						ws.send(JSON.stringify({
							line: message.toString('utf8')
						}));
					});

					meta.connection = 'UserShell';
					meta.handler = (message) => {
						tunnel.write(Buffer.from(message.line, 'utf8'));
					};

					ws.on('close', evt => {
						console.log('WebSocket client disconnected, closing Agent Tunnel to UserShell');
						tunnel.destroy();
					});
				}
				else if (message.connection === 'VideoInput') {
					console.log('WebSocket client requesting VideoInput, creating VideoInputStream');
					videoManager.subscribe(ws, message.uri);
					meta.connection = 'VideoInput';
				}
				else if (message.connection === 'AgentMonitor') {
					console.log('WebSocket client wants to view Agent resource, creating AgentMonitorStream');
					agentMonitor.subscribe(ws, message.uri);
					meta.connection = 'AgentMonitor';
				}
				else {
					console.log('WebSocket client requesting invalid connection');
				}
			}
		});
	});

	return {
		listen: listen
	};
})();

const fsManager = (() => {
	const fsRouter = express.Router();

	const readDir = (abspath, req, res) => {
		fs.readdir(abspath, { withFileTypes: true }, (err, files) => {
			if (err) res.status(500).send(err.message);
			else {
				let resp = [];
				files.forEach(item => {
					if (item.isDirectory()) {
						resp.push({ type: 'directory', name: item.name });
					}
					else if (item.isFile()) {
						resp.push({ type: 'file', name: item.name });
					}
					// no support for socket or FIFO yet.
				});

				res.json(resp);
			}
		});
	}

	fsRouter.get('/:path(*)', (req, res) => {
		const abspath = '/' + req.params.path;
		console.log(abspath);

		fs.stat(abspath, (err, stats) => {
			if (err) res.status(500).send(err.message);
			else {
				if (stats.isDirectory()) {
					readDir(abspath, req, res);
				}
				else if (stats.isFile()) {
					res.sendFile(abspath);
				}
				// no support for socket or FIFO yet.
				else {
					res.status(500).send('Object cannot be viewed over the web');
				}
			}
		});
	});

	fsRouter.post('/:path(*)', (req, res) => {
		const abspath = '/' + req.params.path;
		console.log(abspath);

		fs.stat(abspath, (err, stats) => {
			if (err) res.status(500).send(err.message);
			else {
				if (stats.isDirectory()) {
					res.status(400).send('Cannot POST to directory');
				}
				else if (stats.isFile()) {
					fs.writeFile(abspath, req.body.content, (err) => {
						res.json({ error: err ? err.message : null });
					});
				}
				// no support for socket or FIFO yet.
				else {
					res.status(500).send('Object cannot be viewed over the web');
				}
			}
		});
	});

	fsRouter.get('/', (req, res) => readDir('/', req, res));

	return fsRouter;
})();

const runtimeManager = (() => {
	const router = express.Router();

	router.get('/agents', async (req, res) => {
		const list = await process.runtime.listAllAgents();	// process.runtime is a oneos-specific API injected in Runtime.js
		res.json(list);
	});

	router.get('/pipes', async (req, res) => {
		const list = await process.runtime.listAllPipes();	// process.runtime is a oneos-specific API injected in Runtime.js
		res.json(list);
	});

	router.get('/runtimes', async (req, res) => {
		const list = await process.runtime.listAllRuntimes();	// process.runtime is a oneos-specific API injected in Runtime.js
		res.json(list);
	});

	router.get('/sockets', async (req, res) => {
		const list = await process.runtime.listAllSockets();	// process.runtime is a oneos-specific API injected in Runtime.js
		res.json(list);
	});

	router.get('/io', async (req, res) => {
		const list = await process.runtime.listAllIO();	// process.runtime is a oneos-specific API injected in Runtime.js
		res.json(list);
	});

	return router;
})();

// main express app
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(sessionManager.cookieParser);
app.use(sessionManager.loginRouter);
app.use(sessionManager.authenticate);

app.use('/fs', fsManager);
app.use('/runtime', runtimeManager);

app.use('/', express.static('client', { extensions: ['html'] }));

const server = http.createServer(app);

commBroker.listen(server, '/ws', sessionManager);

server.listen(PORT, () => {
	console.log('OneOS Web Terminal Server started, listening on port ' + PORT);
});