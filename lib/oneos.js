// const Runtime = require('./core/Runtime.js');
// const { getBackend } = require('./core/FileSystem.js');

module.exports = {
	bootstrap: (local_module, main, code_uri, user_meta)=>{
		return require('./core/Code.js').bootstrap(local_module, main, code_uri, user_meta);
	},
	fs: ()=>{
		console.log('Connecting to FileSystem at '+process.pubsub_url);
		return require('./core/FileSystem.js').connect(process.pubsub_url)
	},
	requireFromString: require('./helpers.js').requireFromString,
	actor: (channel, behaviours)=>{
		
	}
};
