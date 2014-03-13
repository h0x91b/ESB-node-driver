var ESB = require('../'); //in your case require('esb-node-driver');

process.argv[2] = process.argv[2] || 7750;

var esb = new ESB({
	publisherPort: process.argv[2],
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

var esb2 = new ESB({
	publisherPort: process.argv[2]+2,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb2.on('error', function(err){
	console.log('ESB2 error', err);
});

var esb3 = new ESB({
	publisherPort: process.argv[2]+4,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb3.on('error', function(err){
	console.log('ESB3 error', err);
});

var start = +new Date;

esb.on('ready', function(){
	console.log('ESB ready for use');
	var requests = 0;
	
	setInterval(function(){
		for(var i=0;i<200;i++){
			esb.publish('/bench', {1:2});
			esb2.publish('/bench2', {1:2});
			esb3.publish('/bench3', {1:2});
			requests+=3;
		}
	}, 10);
	
	setInterval(function(){
		var dt = +new Date - start;
		console.log('send rate %s per second', (requests/dt*1000).toFixed(2));
		start = +new Date;
		requests=0;
	}, 1000);
});