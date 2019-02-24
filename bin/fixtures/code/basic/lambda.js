/*oneos.meta
name: Lambda
*/
/*
Lambda is a stateless agent that serves lambda functions on demand.
Why it is a good idea to have this agent is because 
spawning a Node.js per Agent costs around 70 MB on a 64-bit processor.
To service a simple function, this is a waste. So we instead define
a general Lambda Agent.
 */

var oneos = require('oneos');

var fs = oneos.fs();

var Lambdas = {
	'ping': (payload)=>{
		console.log('Pinging '+payload);
		return payload;
	}
};

var actor = process.getActor('inbox');

actor.setBehaviours({
	'signature': (payload, response)=>{
		if (payload.lambda in Lambdas){
			response.okay(Lambdas[payload.lambda].signature);
			// return Promise.resolve(Lambdas[payload.lambda].signature);
		}
		else {
			// return new Promise((resolve, reject)=>{
				console.log('Lambda '+payload.lambda+' not in cache, reading from File System');

				fs.readFile('/code/lambda/'+ payload.lambda+'.js', (err, content)=>{
					if (err) response.error(err);
					else {
						Lambdas[payload.lambda] = oneos.requireFromString(content.toString());
						response.okay(Lambdas[payload.lambda].signature);
					}
					// if (!err){
					// 	Lambdas[payload.lambda] = oneos.requireFromString(content.toString());
					// 	resolve(Lambdas[payload.lambda].signature);
					// }
				})	
			// });
		}
	},
	'execute': (payload, response)=>{
		if (payload.lambda in Lambdas){
			console.log('Calling Lambda '+payload.lambda);
			response.okay(Lambdas[payload.lambda].apply(null, payload.args));
			// return Promise.resolve(Lambdas[payload.lambda].apply(null, payload.args));
		}
		else {
			// return new Promise((resolve, reject)=>{
				console.log('Lambda '+payload.lambda+' not in cache, reading from File System');

				fs.readFile('/code/lambda/'+ payload.lambda+'.js', (err, content)=>{
					if (err) response.error(err);
					else {
						Lambdas[payload.lambda] = oneos.requireFromString(content.toString());
						response.okay(Lambdas[payload.lambda].apply(null, payload.args));
					}
					// if (!err){
					// 	Lambdas[payload.lambda] = oneos.requireFromString(content.toString());
					// 	resolve(Lambdas[payload.lambda].apply(null, payload.args));
					// }
				})	
			// });
		}
	}
});

console.log('Lambda Agent '+process.oneos.agentID+' Started');