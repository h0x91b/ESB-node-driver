var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: process.argv[2] || 7750,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	var requests = 0;
	
	setInterval(function(){
		for(var i=0;i<300;i++){
			esb.publish('/bench', {foo:'bar'});
			requests++;
		}
	}, 10);
	
	setInterval(function(){
		console.log('send rate %s per second', requests);
		requests=0;
	}, 1000);
});