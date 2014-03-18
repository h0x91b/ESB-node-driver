var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: 1234,
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
	
	esb.subscribe('/test', function(channel, data){
		console.log('got subscribe message', channel, data);
	});
	
	
	var esb2 = new ESB({
		publisherPort: 1235,
		redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
		redisPort: 6379
	});
	
	esb2.on('ready', function(){
		console.log('ESB2 ready');
		
		setInterval(function(){
			esb.invoke('/math/plus', {a:1,b:2}, function(err, resp, errStr){
				console.log('response from math plus', err, resp, errStr);
			});
			
			esb.publish('/test', {hello: 123});
		}, 1000)
	});
});