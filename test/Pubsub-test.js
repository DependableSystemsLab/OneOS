const mqtt = require('mqtt');
const Pubsub = require('../lib/core/Pubsub.js');

/** Socket test
 *
 * usage: env URL=<pubsub URL> mocha Pubsub_test.js
 */
describe('Pubsub Instance', function(){
	let pubsub, tester, inPipe, outPipe;
	before(function(done){
		tester = mqtt.connect('mqtt://localhost');
		tester.on('connect', (ack)=>{
			done();
			tester.subscribe('test-publish');
		});
		tester.on('message', (message)=>{
			console.log(message);
			if (tester.resolveMe) tester.resolveMe(message);
		});
	})

	it('can create a Pubsub object', function(done){
		pubsub = new Pubsub();
		pubsub.ready.then(()=>done());
	});

	it('can subscribe to a topic', function(done){
		pubsub
			.subscribe('test-subscribe', (message)=>{
				// console.log(message);
				if (pubsub.resolveMe) pubsub.resolveMe(message);
			})
			.then(()=>done())
	});

	it('can receive message on subscribed topic', function(done){
		let promise = new Promise((resolve, reject)=>{
			pubsub.resolveMe = resolve;
			pubsub.rejectMe = reject;
		});
		promise.then(()=>done());

		tester.publish('test-subscribe', JSON.stringify({
			subject: 'Hello World',
			body: 'World'
		}));
	});

	it('can publish to a topic', function(done){
		let promise = new Promise((resolve, reject)=>{
			tester.resolveMe = resolve;
			tester.rejectMe = reject;
		});
		promise.then(()=>done());

		pubsub.publish('test-publish', {
			subject: 'Hello',
			body: 'World'
		});
	});

	it('can get an input stream interface', function(done){
		inPipe = pubsub.getInputStream('test-stream-in');
		let promise = new Promise((resolve, reject)=>{
			inPipe.on('data', (data)=>{
				let message = JSON.parse(data);
				if (message.value === 5){
					resolve();
				}
			});
			[1,2,3,4,5].forEach((i)=>{
				pubsub.publish('test-stream-in', { value: i });
			});

		}).then(()=>done());
		// done();
	});

	it('can get an output stream interface', function(done){
		outPipe = pubsub.getOutputStream('test-stream-out');
		let promise = new Promise((resolve, reject)=>{
			pubsub.subscribe('test-stream-out', (message)=>{
				if (message.value === 5) resolve();
			});
			[1,2,3,4,5].forEach((i)=>{
				outPipe.write(JSON.stringify({
					value: i
				}));
			});	
		}).then(()=>done());
		// done();
	});

	
});