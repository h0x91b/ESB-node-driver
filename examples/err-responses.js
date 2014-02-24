var ESB = require('../'); //in your case require('esb-node-driver');

var esb = new ESB({
	publisherHost: process.argv[2] || 'h0x91b.toyga.local', //your hostname needed for back connect from ESB proxy
	publisherPort: process.argv[3] || 7781,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('error', function(err){
	console.log('ESB error', err);
});

esb.on('ready', function(){
	console.log('ESB ready for use');
	
	esb.register('/superlongmethod/superlongmethod/superlongmethod/superlongmethod/superlongmethod/', 1, function(data, cb){
		console.log('/cb #1 is invoked', data);
		cb("Everything is wrong!!!");
	});
	
	setInterval(function(){
		// esb.invoke('/superlongmethod/superlongmethod/superlongmethod/superlongmethod/superlongmethod/', {a:123}, function(err, resp, errStr){
	// 		console.log('err is', err, errStr);
	// 	});
		
		esb.invoke('/ca/getLeads', {}, function(err, res, errStr){
			console.log('/ca/getLeads/v1', err, JSON.stringify(res, null, '\t'), errStr);
		});
	}, 1000);
});