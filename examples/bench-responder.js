var ESB = require('..');

var responses = 0;

var esb1 = new ESB({
	publisherPort: process.argv[2] || 7781
});
esb1.on('ready', function(){
	console.log('esb1 is ready');
	for(i=0;i<1;i++){
	esb1.register('/math/plus', 1, function(data, cb){
		responses++;
		cb(null, data.a + data.b);
	});
	esb1.register('/math/plus', 1, function(data, cb){
		responses++;
		cb(null, data.a + data.b);
	});
	esb1.register('/math/plus', 1, function(data, cb){
		responses++;
		cb(null, data.a + data.b);
	});
	}
	
	setInterval(function(){
		console.log('%s invokes per second', responses);
		responses=0;
	},1000);
});

esb1.on('disconnected', function(){
	//process.exit();
});
