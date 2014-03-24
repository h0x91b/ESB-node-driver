var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: process.argv[2] || 7781,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	esb.register('/math/plus', 1, function(data, cb){
		console.log('/math/plus cb #1 is invoked', data);
		cb(null, data.a + data.b);
	});
	
	esb.register('/math/minus', 1, function(data, cb){
	});
});