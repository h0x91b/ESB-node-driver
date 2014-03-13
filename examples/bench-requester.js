var ESB = require('..');

var responses = 0;
var totaltime = 0;
var mintime = 100000;
var maxtime = 0;
var starttime = +new Date;


var esb = new ESB({
	publisherPort: process.argv[2] || 7790,
	redisHost: 'plt-esbredis01', //Host with registry used by esb, place it in /etc/hosts
	redisPort: 6379
});

esb.on('ready', function(){
	console.log('esb is ready');
	setInterval(
	function sendBulk(){
		for(var i=0;i<300;i++){
			(function(){
				var a = Math.floor(Math.random()*50);
				var b = Math.floor(Math.random()*50);
				var dt = +new Date;
				esb.invoke('/math/plus', {a: a, b: b}, function(err, resp, errStr){
					if(err){
						console.log(err, errStr);
						return;
					}
					console.assert(resp == a+b);
					responses++;
					var time = (new Date - dt);
					totaltime += time;
					if(maxtime<time) maxtime = time;
					if(time<mintime) mintime = time;
				}, {
					timeout: 15000
				});
			})();
		}
	},10);
	
	setInterval(function(){
		var dt = new Date - starttime;
		console.log(
			'%s invokes per second, avg request time: %s ms, worst: %s ms, best: %s ms, invokes without response in queue: %s', 
			(responses/dt*1000).toFixed(2), 
			(totaltime/responses).toFixed(2), 
			maxtime,
			mintime,
			Object.keys(esb.responseCallbacks).length
		);
		responses = 0;
		totaltime = 0;
		maxtime = 0;
		mintime = 100000;
		starttime = +new Date;
	},1000);
	
});

esb.on('disconnected', function(){
	//process.exit();
});

