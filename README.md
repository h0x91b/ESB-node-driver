ESB-node-driver
===============

ESB nodejs driver - under heavy development

Installation
===

You need to install zeromq 4 and google protobuf.
And then:

	npm install esb-node-driver

Place into /etc/hosts a ip for domain `esb-redis`

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
					console.log('error while invoking a /math/plus',err, errStr);
					return;
				}
				console.assert(resp == 5);
				console.log('2+3=%s', resp);
			});
			
		}, 1000);
	});
	
API
===

* ESB.register(<identifier>, <version>, <callback>[ ,options])
	Currently is now options here

* ESB.invoke(<identifier>, <data>, <callback>[ ,options])
	Options may contain:
	* version - by default it 1
	* timeout - in ms, by default 15000

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
	