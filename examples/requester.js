var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherHost: process.argv[2] || 'h0x91b.toyga.local', //your hostname needed for back connect from ESB proxy
	publisherPort: process.argv[3] || 7786,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	
	setInterval(function(){
		var a = Math.floor(Math.random()*50);
		var b = Math.floor(Math.random()*50);
		var dt = +new Date;
		esb.invoke('/math/plus', {a: a, b: b}, function(err, resp, errStr){
			if(err){
				console.log(err, errStr);
				return;
			}
			if(resp != a+b) {
				//console.log('wrong response') 
			}
			console.log('%s+%s=%s response take %s ms', a, b, resp, (new Date - dt));
		});
	}, 1000);
});