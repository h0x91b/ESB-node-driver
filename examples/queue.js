var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: 1234,
	redisHost: 'plt-esbredis01', //Host with redis, used as registry by esb
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	esb.regQueue('/foo', '/esb-test-queue1');
	esb.regQueue('/foo', '/esb-test-queue2');
	esb.regQueue('/foo2', '/esb-test-queue3');
	setInterval(function(){
		esb.publish('/foo', {foo: +new Date});
		esb.publish('/foo2', {foo: +new Date});
		
		setTimeout(function(){
			esb.peek('/foo', '/esb-test-queue1', 3000, function(msg, done, msgId){
				console.log('peek msg: %s, id: %s', msg, msgId);
				done(); //dequeue
			});
		}, 500);
	}, 1000);
	
	esb.subscribe('/foo', function(){
		
	})
	
	setInterval(function(){
		console.log(Array(42).join('='));
		console.log('flush all queues now!');
		esb.unregQueue('/foo', '/esb-test-queue1');
		esb.unregQueue('/foo', '/esb-test-queue2');
		esb.unregQueue('/foo2', '/esb-test-queue3');
	}, 15000)
});