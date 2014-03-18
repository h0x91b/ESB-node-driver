var ESB = require('..');

var responses = 0;
var totaltime = 0;
var mintime = 100000;
var maxtime = 0;
var starttime = +new Date;

process.argv[2] = process.argv[2] || 7790

var esb = new ESB({
	publisherPort: process.argv[2],
	redisHost: 'plt-esbredis01', //Host with redis, esb use it as registry...
	redisPort: 6379
});

esb.on('ready', function(){
	console.log('esb is ready');
	//setInterval(
	function sendBulk(){
		starttime = +new Date;
		var bulkSize = 500;
		var remain = bulkSize;
		for(var i=0;i<bulkSize;i++){
			(function(){
				var a = Math.floor(Math.random()*50);
				var b = Math.floor(Math.random()*50);
				var dt = +new Date;
				esb.invoke('/math/plus', {a: a, b: b}, function(err, resp, errStr){
					if(--remain == 0) {
						setTimeout(sendBulk, 100);
					}
					if(err){
						console.log(err, errStr);
						return;
					}
					//console.assert(resp == a+b);
					responses++;
					var time = (new Date - dt);
					totaltime += time;
					if(maxtime<time) maxtime = time;
					if(time<mintime) mintime = time;
					
					if(remain == 0) {
						report();
					}
				}, {
					timeout: 3000
				});
			})();
		}
	}
	sendBulk();
	//,5);
	
	function report(){
		if(responses < 1) return;
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
	}
	
	setInterval(report,1000);
	
});

esb.on('disconnected', function(){
	//process.exit();
});

