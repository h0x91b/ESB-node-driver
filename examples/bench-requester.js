var ESB = require('..');

responses = 0;

var esb = new ESB({
	publisherHost: process.argv[2] || 'h0x91b.toyga.local', //your hostname needed for back connect from ESB proxy
	publisherPort: process.argv[3] || 7790,
	redisHost: 'esb-redis', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('ready', function(){
	console.log('esb is ready');
	setInterval(function(){
	for(var i=0;i<100;i++)
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

