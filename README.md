ESB-node-driver
===============

ESB nodejs driver - under heavy development

Installation
===

You need to install zeromq 4 and google protobuf.
And then:

	npm install esb-node-driver

You will need a redis server, place his ip into /etc/hosts as domain `esb-redis`.

Usage
===

Check the examples directory.

	var ESB = require('esb-node-driver');
	
	var esb = new ESB({
		//your hostname, needed for back connection from ESB proxy
		publisherHost: 'h0x91b.toyga.local',
		//some free port for listen on it
		publisherPort: 7786,
		
		//Hostname with redis, redis used for proxy registry, place it in /etc/hosts
		redisHost: 'esb-redis',
		redisPort: 6379
	});
	
	esb.on('error', function(err){
		console.log('ESB error', err);
	});
	
	esb.on('ready', function(){
		console.log('ESB ready for use');
		
		//register some method that will be accessed from any client ESB
		esb.register('/math/plus', 1, function(data, cb){
			console.log('/math/plus cb #1 is invoked with data: ', data);
			cb(null, data.a + data.b);
		});
		
		//you can register any number of responders for same identifier
		esb.register('/math/plus', 1, function(data, cb){
			console.log('/math/plus cb #2 is invoked with data: ', data);
			cb(null, data.a + data.b);
		});
		
		setInterval(function(){
			
			//lets invoke method above every second
			esb.invoke('/math/plus', {a: 2, b: 3}, function(err, resp, errStr){
				if(err){
					console.log('error while invoking a /math/plus', err, errStr);
					return;
				}
				console.assert(resp == 5);
				console.log('2+3=%s', resp);
			});
			
		}, 1000);
	});
	
API
===

* ESB.register(&lt;identifier>, &lt;version, &lt;callback>[ ,options])

Currently is no options here

* ESB.invoke(&lt;identifier>, &lt;data>, &lt;callback>[ ,options])

Options may contain:

* version - by default version is 1
* timeout - in ms, by default 15000

* ESB.publish(&lt;identifier>, &lt;data>[ ,options])

Options may contain:

* version - by default version is 1

* ESB.subscribe(&lt;identifier>, &lt;version, &lt;callback>)


Issues
===

If you get error similar to this

	module.js:356
	  Module._extensions[extension](this, filename);
	                               ^
	Error: libzmq.so.3: cannot open shared object file: No such file or directory
	    at Module.load (module.js:356:32)
	    at Function.Module._load (module.js:312:12)
	    at Module.require (module.js:364:17)
	    at require (module.js:380:17)
	    at Object.<anonymous> (/root/node_modules/ESB-proxy-server/main.js:7:10)
	    at Module._compile (module.js:456:26)
	    at Object.Module._extensions..js (module.js:474:10)
	    at Module.load (module.js:356:32)
	    at Function.Module._load (module.js:312:12)
	    at Function.Module.runMain (module.js:497:10)

You need to add `export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"` to your `~/.bashrc`


Building zmq and protobuf from source
===

	#ZMQ
	cd /tmp/
	wget http://download.zeromq.org/zeromq-4.0.3.tar.gz
	tar -xzvf zeromq-4.0.3.tar.gz
	cd zeromq-*
	./configure && make && sudo make install
	#protobuf
	cd /tmp/
	wget https://protobuf.googlecode.com/files/protobuf-2.5.0.tar.gz
	tar -xzvf protobuf-2.5.0.tar.gz
	cd protobuf-2.5.0/
	./configure && make && sudo make install
	