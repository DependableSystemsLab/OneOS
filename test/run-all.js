var oneos = require('../lib/oneos.js');

function runTest(name, path){
	describe(name, function(){
		require(path);
	})
}

// Setup a Mosca server and a Pubsub instance
// var server;
// before(function(done){
// 	server = new things.Pubsub.Server();
// 	server.on('ready', done);
// });

runTest('Pubsub', './Pubsub-test.js');
runTest('Store', './Store-test.js');
//runTest('Socket', './Socket-test.js');
runTest('Runtime', './Runtime-test.js');
runTest('Agent', './Agent-test.js');

// after(function(done){
//  	server.kill().then(function(){
//  		done();
//  	});
// });
