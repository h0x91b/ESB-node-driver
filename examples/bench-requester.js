var ESB = require('..');

responses = 0;

var esb = new ESB({
	publisherPort: process.argv[3] || 7790
});

esb.on('ready', function(){
	console.log('esb is ready');
	setInterval(function(){
	for(var i=0;i<250;i++)
		esb.invoke('/math/plus', {a: 2, b: 2}, function(err, resp, errStr){
			if(err){
				console.log(err, errStr);
				return;
			}
			console.assert(resp == 4);
			responses++;
		});
	},10);
	
	setInterval(function(){
		console.log('%s invokes per second', responses);
		responses=0;
	},1000);
	
});

esb.on('disconnected', function(){
	process.exit();
});

