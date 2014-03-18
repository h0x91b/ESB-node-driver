var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherPort: process.argv[2] || 7786,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

var responses = 0;

esb.on('ready', function(){
	console.log('ESB ready for use');
	
	// setInterval(function(){
	// 	for(var i=0;i<100;i++){
	// 		esb.invoke('/Platform/GetAppData', {guid: 'F3F23619A2053C80E040CB0A146B48E9', partner: 7}, function(err, resp, errStr){
	// 			if(err){
	// 				console.log(err, errStr);
	// 				return;
	// 			}
	// 			//console.log('response', resp);
	// 			responses++;
	// 		});
	// 	}
	// }, 250);
	setInterval(function(){
		esb.invoke('/Platform/GetAppData', {guid: 'F3F23619A2053C80E040CB0A146B48E9', partner: 7}, function(err, resp, errStr){
			if(err){
				console.log(err, errStr);
				return;
			}
			//console.log('response', resp);
			responses++;
		});
	}, 1000);
	
	esb.subscribe('/Platform/AppData/F3F23619A2053C80E040CB0A146B48E9', function(channel, data){
		//console.log('data on %s: ', channel.toString(), data);
		responses++;
	});
	
	setInterval(function(){
		console.log('responses %s per sec', responses);
		responses = 0;
	}, 1000);
});