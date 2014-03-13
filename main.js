var extend = require('extend');
var zmq = require('zmq');
var fs = require("fs")
var proto = require("node-protobuf").Protobuf;
var pb = new proto(fs.readFileSync(__dirname+"/command.desc"));
var util = require("util");
var events = require("events");
var Redis = require('redis');
var net = require('net');

var guidSize = 16;

var _config = {
	publisherPort: 7780,
	redisHost: 'plt-esbredis01',
	redisPort: 6379,
	proxyTimeout: 10000,
	retryConnectionTime: 1000
};

function ESB(config) {
	events.EventEmitter.call(this);
	this.config = extend(true, {}, _config, config);
	this.proxyGuid = '';
	this.ready = false;
	this.wasready = false;
	this.connecting = false;
	this.guid = genGuid();
	console.log('new ESB driver %s', this.guid);
	this.responseCallbacks = {};
	this.invokeMethods = [];
	this.subscribeChannels = {};
	this.sendQueue = [];
	this.lastSend = +new Date;
	var self = this;
	this.publisherSocket = zmq.socket('pub');
	this.publisherSocket.setsockopt(zmq.ZMQ_SNDBUF, 256*1024);
	this.publisherSocket.setsockopt(zmq.ZMQ_SNDHWM, 5000);
	this.publisherSocket.setsockopt(zmq.ZMQ_BACKLOG, 500);
	this.publisherSocket.on('error', function(err){
		console.log('publisherSocket error', err);
		self.emit('error', err);
	});
	//console.log('try to bind', 'tcp://*:'+this.config.publisherPort);
	this.publisherSocket.bindSync('tcp://*:'+this.config.publisherPort);
	
	//Redis.debug_mode = true;
	this.redis = Redis.createClient(this.config.redisPort, this.config.redisHost);
	this.redis.on('error', function(err){
		console.log('redis error', err);
		self.emit('error', err);
	});
	
	this.redis.on('connect', function(){
		console.log('redis client connected');
	});
	
	this.redis.on('reconnecting', function(){
		console.log('redis client reconnecting');
	});
	
	this.connect();
}

util.inherits(ESB, events.EventEmitter);

ESB.prototype.resubscribe = function(){
	var self = this;
	for(var c in self.subscribeChannels){
		//console.log('re-subscribe on channel `%s`', c);
		self.subscribeSocket.subscribe(c);
		(function(identifier){
			var obj = {
				cmd: 'SUBSCRIBE',
				identifier: identifier,
				payload: 'please',
				source_proxy_guid: self.guid
			};
			var buf = pb.Serialize(obj, "ESB.Command");
			var b = new Buffer(guidSize + 1 + buf.length);
			b.write(self.proxyGuid, 'binary');
			b.write('\t', guidSize, 1, 'binary');
			b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
			var now = +new Date;
			if(now - self.lastSend < 3) {
				self.sendQueue.push(b);
			} else {
				self.publisherSocket.send(b);
				self.sendPostQueue();
			}
		})(c);
	}
};

ESB.prototype.connect= function(){
	if(this.ready || this.connecting) return;
	this.connecting = true;
	var self = this;
	
	this.redis.zrevrange('ZSET:PROXIES', '0', '-1', function(err, resp){
		console.log(resp);
		if(err){
			console.log('Cannot get data from registry', err);
			self.emit('error', err);
			self.connecting = false;
			return;
		}
		if(resp.length<1){
			console.log('currently no proxies can be found, wait %s ms', self.config.retryConnectionTime);
			setTimeout(function(){
				self.connect();
			}, self.config.retryConnectionTime);
			self.connecting = false;
			return;
		}
		var id = null;
		var entry = resp[Math.floor(Math.random()*resp.length)];
		var d = entry.split('#');
		var connectStr = d[1];
		self.proxyGuid = d[0];
		
		if(self.requestSocket){
			console.log("disconnect requestSocket from %s", connectStr);
			self.requestSocket.destroy();
			self.requestSocket = null;
		}
		self.requestSocket = new net.Socket({
			readable: true,
			writable: true
		});
		self.requestSocket.on('error', function(err){
			console.log('requestSocket error', err);
			self.emit('error', err);
		});
		
		if(self.subscribeSocket){
			if(self.subscribeSocket.__connectStr) {
				console.log("disconnect subscribeSocket from %s", self.subscribeSocket.__connectStr);
				self.subscribeSocket.disconnect(self.subscribeSocket.__connectStr);
			}
			self.subscribeSocket = null;
		}
	
		self.subscribeSocket = zmq.socket('sub');
		self.subscribeSocket.setsockopt(zmq.ZMQ_RCVBUF, 256*1024);
		self.subscribeSocket.subscribe(self.guid);
		self.resubscribe();

		self.subscribeSocket.on('error', function(err){
			console.log('subscribeSocket error', err);
			self.emit('error', err);
		});
		
		setTimeout(function(){
			if(self.ready) return;
			console.log('connection failed to %s, remove entry from redis and try again', entry);
			self.redis.zrem('ZSET:PROXIES', entry, function(err, resp){
				if(err) {
					console.log('error on zrem', err);
				}
				self.connecting = false;
				self.connect();
			});
		}, self.config.proxyTimeout);
		
		console.log('connectStr', connectStr);
		var host = connectStr.split(':')[0];
		var port = connectStr.split(':')[1];
		console.log({host: host, port: port});
		console.log('ESB Node %s connecting to: %s:%s (%s)', self.guid, host, port, self.proxyGuid);
		self.requestSocket.connect(port, host, function(){
			self.connecting = false;
			console.log('connected, send my publishers port', self.config.publisherPort);
			self.requestSocket.write(self.config.publisherPort+'#'+self.guid);
		});
		
		self.requestSocket.once('data', function(data){
			console.log('requestSocket get data', data.toString());
			self.requestSocket.destroy();
			self.requestSocket = null;
			
			var t = 'tcp://'+host+':'+data.toString();
			console.log('got response from Proxy, builded connectionString is', t);
			self.subscribeSocket.__connectStr = t;
			self.subscribeSocket.on('message', function(data){
				self.onMessage.call(self, data);
			});
		
			self.subscribeSocket.connect(t);

			self.ready = true;
			console.log('connected successfully to %s %s', self.subscribeSocket.__connectStr, self.proxyGuid);
			self.resubscribe();
	
			if(self.wasready === false){
				self.emit('ready');
				self.wasready = true;
			}
		
			if(!self.intervalsSetedOn) {
				setInterval(function(){
					self.sendRegistry();
					self.redis.ping(function(err, resp){
						if(err) {
							console.log('error while pinging redis', err);
						}
					});
					self.resubscribe();
				}, 1000);
				setInterval(function(){
					self.ping();
				}, self.config.proxyTimeout);
				setInterval(function(){
					self.sendPostQueue();
				}, 50);
				self.intervalsSetedOn = true;
			}
		});
		// self.requestSocket.connect(connectStr);
		//console.log('ESB Node %s connected', self.guid);
		// self.sendHello();
	});
};

ESB.prototype.ping = function(){
	// console.log('send ping to %s', this.guid, this.proxyGuid);
	if(!this.ready || this.connecting) return;
	var cmdGuid = genGuid();
	var guid = this.guid;
	var obj = {
		cmd: 'PING',
		payload: 'hi',
		guid_from: cmdGuid,
		source_proxy_guid: guid,
		//target_proxy_guid: ''
	}
	var buf = pb.Serialize(obj, "ESB.Command");
	var id = null;
	var self = this;
	
	function timeout(){
		console.log('ESB-node-driver get timeout on PING request, reconnect to another proxy');
		if(self.ready){
			self.ready = false;
			self.emit('disconnected');
			self.connect();
		}
		delete self.responseCallbacks[cmdGuid];
	}
	
	id = setTimeout(timeout, this.config.proxyTimeout);
	
	this.responseCallbacks[cmdGuid] = function(err, data, errString){
		//console.log('pong %s', cmdGuid);
		self.ready = true;
		if(id) clearTimeout(id);
		delete self.responseCallbacks[cmdGuid];
	}
	
	
	var b = new Buffer(guidSize + 1 + buf.length);
	b.write(this.proxyGuid, 'binary');
	b.write('\t', guidSize, 1, 'binary');
	b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
	this.publisherSocket.send(b);
};

ESB.prototype.onMessage= function(data) {
	try {
		//console.log('ESB.prototype.onMessage', data);
		var channel = data.slice(0, data.toString('utf-8').indexOf('\t'));
		//console.log('==========[ channel "%s" ]===========', channel);
		data = data.slice(data.toString('utf-8').indexOf('\t')+1);
		var respObj = pb.Parse(data, "ESB.Command");
		//console.log('suscriber got message: ', respObj);
		switch(respObj.cmd)
		{
		case 'INVOKE':
			//console.log('got INVOKE request', respObj);
			var fn = this.invokeMethods[respObj.guid_to].method;
			if(!fn) {
				console.log('can not find such invoke method', respObj, Object.keys(this.invokeMethods));
				break;
			}
			fn(respObj);
			break;
		case 'ERROR_RESPONSE':
			//console.log('got ERROR_RESPONSE', respObj);
			var fn = this.responseCallbacks[respObj.guid_to];
			if(fn){
				delete this.responseCallbacks[respObj.guid_to];
				fn('ERROR_RESPONSE', null, respObj.payload.toString());
			} else {
				console.log('callback "%s" for response not found', respObj.guid_to, respObj, respObj.payload.toString());
			}
			break;
		case 'PONG':
		case 'RESPONSE':
			//console.log('got RESPONSE', respObj);
			var fn = this.responseCallbacks[respObj.guid_to];
			if(fn){
				delete this.responseCallbacks[respObj.guid_to];
				fn(null, JSON.parse(respObj.payload.toString()), null);
			} else {
				console.log('callback "%s" for response not found', respObj.guid_to, respObj, respObj.payload.toString());
			}
			break;
		case 'PING':
			// console.log('got PING request');
			var obj = {
				cmd: 'PONG',
				payload: +new Date,
				guid_to: respObj.guid_from,
				guid_from: this.guid,
			}
			var buf = pb.Serialize(obj, "ESB.Command");
			var b = new Buffer(guidSize + 1 + buf.length);
			b.write(this.proxyGuid, 'binary');
			b.write('\t', guidSize, 1, 'binary');
			b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
			this.publisherSocket.send(b);
			break;
		case 'ERROR':
			console.log('driver got ERROR response from Proxy: ', respObj.payload.toString());
			if(this.responseCallbacks[respObj.guid_to]){
				var fn = this.responseCallbacks[respObj.guid_to];
				fn(respObj.cmd, null, respObj.payload.toString());
			}
			break;
		case 'REGISTER_INVOKE_OK':
			//console.log("REGISTER_INVOKE_OK for %s from Proxy %s", respObj.payload, respObj.source_proxy_guid);
			break;
		case 'PUBLISH':
			this.emit('subscribe_'+respObj.identifier, {
				channel: channel, 
				data:JSON.parse(respObj.payload.toString()
			)});
			break;
		default:
			console.log("unknown operation", respObj);
		}
	} catch(e){
		console.log('ERROR while processing message', e);
		console.log(data.toString());
	}
};

ESB.prototype.invoke = function(identifier, data, cb, options){
	if(!this.ready){
		cb('Not connected!', null, 'Currently driver not connected to any proxy.');
		return;
	}
	options = extend(true, {
		version: 1,
		timeout: 30000
	}, options);
	identifier = identifier+'/v'+options.version;
	//console.log('invoke()', identifier, options, data);
	var isCalled = false;
	var id = null;
	var self = this;
	if(options.timeout>0){
		id = setTimeout(timeoutCb, options.timeout);
		function timeoutCb(){
			if(isCalled) return;
			isCalled = true;
			delete self.responseCallbacks[cmdGuid];
			cb('Timeout', null, 'Timeout triggered by esb-node-driver');
		};
	} else
		options.timeout = 0;
	
	var cmdGuid = genGuid();
	//console.log('invoke guid for response', cmdGuid);
	
	this.responseCallbacks[cmdGuid] = function(err, data, errString){
		//console.log('invoke %s get response', cmdGuid, data);
		if(isCalled){
			console.log('got response from Proxy, but callback already was called');
			return;
		}
		isCalled = true;
		if(id) clearTimeout(id);
		delete self.responseCallbacks[cmdGuid];
		//console.log('call response callback');
		cb(err, data, errString);
	}
	
	try {
		var obj = {
			cmd: 'INVOKE',
			identifier: identifier,
			payload: JSON.stringify(data),
			guid_from: cmdGuid,
			//target_proxy_guid: this.proxyGuid,
			source_proxy_guid: this.guid,
			//start_time: +new Date,
			//timeout_ms: options.timeout
		}
		//console.log(obj, this.proxyGuid);
		var buf = pb.Serialize(obj, "ESB.Command");
		var b = new Buffer(guidSize + 1 + buf.length);
		b.write(this.proxyGuid, 'binary');
		b.write('\t', guidSize, 1, 'binary');
		b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
		var now = +new Date;
		if(now - this.lastSend < 3) {
			this.sendQueue.push(b);
		} else {
			this.publisherSocket.send(b);
			this.sendPostQueue();
		}
	} catch(e){
		isCalled = true;
		if(id) clearTimeout(id);
		delete self.responseCallbacks[cmdGuid];
		cb('Exception', null, 'Exception while encoding/sending message: '+e.toString());
	}
	
	return cmdGuid;
};

ESB.prototype.sendPostQueue = function(){
	if(!this.ready) return;
	for(var i=0;i<this.sendQueue.length;i++){
		this.publisherSocket.send(this.sendQueue[i]);
	}
	this.sendQueue = [];
	this.lastSend = +new Date;
};

ESB.prototype.publish = function(identifier, data, options) {
	if(!this.ready) return;
	options = extend(true, {
		version: 1
	}, options);
	var obj = {
		cmd: 'PUBLISH',
		identifier: identifier,
		payload: JSON.stringify(data),
		source_proxy_guid: this.guid
	};
	var buf = pb.Serialize(obj, "ESB.Command");
	var b = new Buffer(guidSize + 1 + buf.length);
	b.write(this.proxyGuid, 'binary');
	b.write('\t', guidSize, 1, 'binary');
	b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
	var now = +new Date;
	if(now - this.lastSend < 3) {
		this.sendQueue.push(b);
	} else {
		this.publisherSocket.send(b);
		this.sendPostQueue();
	}
};

ESB.prototype.subscribe = function(identifier, cb) {
	this.on('subscribe_'+identifier, function(obj){
		cb(obj.channel, obj.data);
	});
	if(!(identifier in this.subscribeChannels))
		this.subscribeSocket.subscribe(identifier);
	this.subscribeChannels[identifier] = 1;
	
	if(!this.ready) return;
	
	var obj = {
		cmd: 'SUBSCRIBE',
		identifier: identifier,
		payload: 'please',
		source_proxy_guid: this.guid
	};
	var buf = pb.Serialize(obj, "ESB.Command");
	var b = new Buffer(guidSize + 1 + buf.length);
	b.write(this.proxyGuid, 'binary');
	b.write('\t', guidSize, 1, 'binary');
	b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
	var now = +new Date;
	if(now - this.lastSend < 3) {
		this.sendQueue.push(b);
	} else {
		this.publisherSocket.send(b);
		this.sendPostQueue();
	}
};

ESB.prototype.sendRegistry = function(){
	if(!this.ready) return;
	for(var g in this.invokeMethods){
		var m = this.invokeMethods[g];
		this.register(m.identifier, m.version, m.method, m.options, true);
	}
};

ESB.prototype.register = function(_identifier, version, cb, options, internalCall) {
	if(!this.ready){
		if(!internalCall)
			cb('Not connected!', null, 'Currently driver not connected to any proxy.');
		return;
	}
	
	//console.log('register', _identifier, version);
	options = extend(true, {
		version: 1,
		guid: genGuid()
	}, options);
	var identifier = _identifier+'/v'+options.version;
	
	var cmdGuid = options.guid;
	//console.log('registerInvoke guid:', cmdGuid);
	var self = this;
	if(!this.invokeMethods[cmdGuid])
	{
		//console.log('register', _identifier, version, cmdGuid);
		var invokeMethod = {
			identifier: _identifier,
			guid: cmdGuid,
			version: version,
			options: options
		};
		invokeMethod.method = function(data){
			//console.log('invoke method ', data);
			cb(JSON.parse(data.payload.toString()), function(err, resp){
				//console.log('got response from method...', err, resp);
				var obj = {
					cmd: 'RESPONSE',
					payload: JSON.stringify(resp),
					guid_from: cmdGuid,
					guid_to: data.guid_from,
					//target_proxy_guid: self.proxyGuid,
					source_proxy_guid: self.guid,
					//start_time: +new Date,
				}
			
				try {
					if(err) {
						obj.cmd = 'ERROR_RESPONSE';
						obj.payload = JSON.stringify(err);
					}
					//console.log('invoke method send response',obj);
					var buf = pb.Serialize(obj, "ESB.Command");
					var b = new Buffer(guidSize + 1 + buf.length);
					b.write(self.proxyGuid, 'binary');
					b.write('\t', guidSize, 1, 'binary');
					b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
					var now = +new Date;
					if(now - self.lastSend < 3) {
						self.sendQueue.push(b);
					} else {
						self.publisherSocket.send(b);
						self.sendPostQueue();
					}
					//self.publisherSocket.send(b);
				} catch(e){
					console.log('Exception while encoding/sending message after invoke: '+e.toString(), resp);
				}
			
			});
		};
		this.invokeMethods[cmdGuid] = invokeMethod;
	}
	try {
		var obj = {
			cmd: 'REGISTER_INVOKE',
			identifier: identifier,
			payload: cmdGuid,
			guid_from: cmdGuid,
			//target_proxy_guid: this.proxyGuid,
			source_proxy_guid: this.guid,
			start_time: +new Date,
		}
		//console.log('register',obj);
		var buf = pb.Serialize(obj, "ESB.Command");
		var b = new Buffer(guidSize + 1 + buf.length);
		b.write(this.proxyGuid, 'binary');
		b.write('\t', guidSize, 1, 'binary');
		b.write(buf.toString('binary'), guidSize+1, buf.length, 'binary');
		this.publisherSocket.send(b);
	} catch(e){
		console.log('Exception', null, 'Exception while encoding/sending message: '+e.toString());
	}
	
	return cmdGuid;
};

function genGuid() {
	var a = [];
	var alphabet = '01234567890ABCDEF';
	for(var i=0;i<guidSize;i++){
		a.push(alphabet[~~(Math.random()*16)]);
	}
	return a.join('');
}

module.exports = ESB;
