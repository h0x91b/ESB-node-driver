var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherHost: process.argv[2] || 'h0x91b.toyga.local', //your hostname needed for back connect from ESB proxy
	publisherPort: process.argv[3] || 7781,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
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
	
	esb.register('/math/plus', 1, function(data, cb){
		console.log('/math/plus cb #2 simulate service error', data);
		cb('Sorry dude', null);
	});
	
	esb.register('/math/plus', 1, function(data, cb){
		console.log('/math/plus cb #3 simulate timeout', data);
		setTimeout(function(){
			cb(null, data.a + data.b);
		}, 1500);
	});
});