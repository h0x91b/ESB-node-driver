var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: process.argv[2] || 7781,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	
	esb.subscribe('/hello', function(channel, data){
		console.log('got message on channel %s', channel, data);
	});
	
	esb.subscribe('/hellohello', function(channel, data){
		console.log('got message on channel %s', channel, data);
	});
	
	esb.subscribe('/hellohellohello', function(channel, data){
		console.log('got message on channel %s', channel, data);
	});
	
	setInterval(function(){
		console.log(Array(20).join('='));
		esb.publish('/hello', {foo:'bar', rand: Math.random()});
		esb.publish('/hellohello', {foo:'baz', rand: Math.random()});
		esb.publish('/hellohellohello', {foo:'boo', rand: Math.random()});
	}, 3000);
});