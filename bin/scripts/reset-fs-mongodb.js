if (process.argv.length < 3){
    console.log('Please specify the database url - e.g.  mongodb://localhost:27017/oneos-fs');
    console.log('To use the default url shown above, enter "default"');
    process.exit();
}

var mongoUrl = process.argv[2] === 'default' ? 'mongodb://localhost:27017/oneos-fs' : process.argv[2] ;

var path = require('path');
var fs = require('fs');
var gfs = require('../../lib/core/FileSystem.js').getBackend(mongoUrl);
var helpers = require('../../lib/helpers.js');

var FIXTURE = require('./fs-fixture.js');

function addFixture(node, prefix){
	prefix = prefix || '/';
	return helpers.resolveSequence(
		Object.keys(node)
			.map((name)=>
				(
					(typeof node[name] === 'string') ?
					()=>new Promise((resolve, reject)=>{
				 		fs.readFile(path.resolve(__dirname, '../fixtures'+ prefix+node[name]), (rErr, data)=>{
				 			gfs.writeFile(prefix+name, data.toString(), (wErr)=>resolve())
					 	})
				 	})
				 	: ()=>new Promise((resolve, reject)=>{
						gfs.mkdir(prefix+name, (err)=>{
							if (err) reject(err);
							else resolve();
						});
					}).then(()=>addFixture(node[name], prefix+name+'/'))
				)
			)
		)
}

var dropped = Promise.all([
	new Promise((resolve, reject)=>{
		gfs.db.collections.fsindexes.drop(function(err){
			if (err !== null) reject(err);
			else resolve();
			console.log('Dropped FSIndex collection', err);
		});
	}),
	new Promise((resolve, reject)=>{
		gfs.db.collections.fshandles.drop(function(err){
			if (err !== null) reject(err);
			else resolve();
			console.log('Dropped FSHandle collection', err);
		});
	})
]);

dropped.then(()=>addFixture(FIXTURE))
	.then(()=>{
		console.log('All done.');
		process.exit();
	})
	.catch((error)=>{
		console.log(error, 'Failed to reset the database');
	});