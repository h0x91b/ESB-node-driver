var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherHost: process.argv[2] || 'h0x91b.toyga.local', //your hostname needed for back connect from ESB proxy
	publisherPort: process.argv[3] || 7781,
	redisHost: 'esb-redis',
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	
	setInterval(function(){
		esb.invoke('/math/plus', {a: 2, b: 3}, function(err, resp, errStr){
			if(err){
				console.log(err, errStr);
				return;
			}
			console.assert(resp == 5);
			console.log('2+3=%s', resp);
		});
	}, 1000);
});