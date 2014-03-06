var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: process.argv[2] || 7751,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	var requests = 0;
	esb.subscribe('/bench', function(channel, data){
		//console.log('got message on channel %s', channel, data);
		requests++;
	});
	
	setInterval(function(){
		console.log('got %s requests per second', requests);
		requests = 0;
	},1000);
});