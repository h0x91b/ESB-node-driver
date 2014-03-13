var ESB = require('../'); //in your case require('esb-node-driver');

var requests = 0;

var start = +new Date;

process.argv[2] = process.argv[2] || 7751

var esb = new ESB({
	publisherPort: process.argv[2],
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

var esb2 = new ESB({
	publisherPort: process.argv[2] +2,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb2.on('error', function(err){
	console.log('ESB2 error', err);
});

var esb3 = new ESB({
	publisherPort: process.argv[2] +4,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb3.on('error', function(err){
	console.log('ESB3 error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	esb.subscribe('/bench', function(channel, data){
		//console.log('got message on channel %s', channel, data);
		requests++;
	});
	
	setInterval(function(){
		var dt = +new Date - start;
		console.log('got %s requests per second', (requests/dt*1000).toFixed(2));
		start = +new Date;
		requests = 0;
	},1000);
});

esb2.on('ready', function(){
	console.log('ESB2 ready for use');
	
	esb.subscribe('/bench2', function(channel, data){
		//console.log('got message on channel %s', channel, data);
		requests++;
	});
});


esb3.on('ready', function(){
	console.log('ESB3 ready for use');
	
	esb.subscribe('/bench3', function(channel, data){
		//console.log('got message on channel %s', channel, data);
		requests++;
	});
});