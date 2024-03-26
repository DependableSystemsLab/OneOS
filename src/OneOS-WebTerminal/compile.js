// This script is run when the OneOS-Dashboard project is built
//
// to change the build tasks, edit the project's .njsproj file by
// first unloading the project

const path = require('path');
const fs = require('fs');

const cwd = process.cwd();
const oneosResourcesDir = path.resolve(cwd, "../OneOS/Resources");
const localDist = path.join(cwd, "dist/server.js");
//const oneosResourcesDist = path.resolve(cwd, "../OneOS/Resources/server.js");


console.log('Compiling the OneOS-WebTerminal Node.js application...');
console.log('  - The app will be copied to the /lib/web-terminal-server.js');
console.log('  - The app can then be run from the OneOS shell with "node /lib/web-terminal-server.js 1337"');

fs.copyFileSync(path.join(cwd, "server.js"), localDist);
fs.copyFileSync(path.join(cwd, "server.js"), path.join(oneosResourcesDir, "server.js"));
fs.copyFileSync(path.join(cwd, "client/index.html"), path.join(oneosResourcesDir, "index.html"));
fs.copyFileSync(path.join(cwd, "client/app.js"), path.join(oneosResourcesDir, "app.js"));
fs.copyFileSync(path.join(cwd, "client/style.css"), path.join(oneosResourcesDir, "style.css"));
fs.copyFileSync(path.join(cwd, "client/bundle.js"), path.join(oneosResourcesDir, "bundle.js"));
fs.copyFileSync(path.join(cwd, "client/bundle.css"), path.join(oneosResourcesDir, "bundle.css"));

console.log('OneOS-WebTerminal application was compiled and written to ' + localDist);
console.log('OneOS-WebTerminal application was compiled and written to ' + path.join(oneosResourcesDir, "server.js"));