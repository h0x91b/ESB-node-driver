var ESB = require('..');

responses = 0;

var esb = new ESB({
	publisherPort: process.argv[3] || 7790
});

esb.on('ready', function(){
	console.log('esb is ready');
	setInterval(function(){
	for(var i=0;i<300;i++)
		(function(){
			var a = Math.floor(Math.random()*50);
			var b = Math.floor(Math.random()*50);
			esb.invoke('/math/plus', {a: a, b: b}, function(err, resp, errStr){
				if(err){
					console.log(err, errStr);
					return;
				}
				console.assert(resp == a+b);
				responses++;
			});
		})();
	},10);
	
	setInterval(function(){
		console.log('%s invokes per second', responses);
		responses=0;
	},1000);
	
});

esb.on('disconnected', function(){
	process.exit();
});

