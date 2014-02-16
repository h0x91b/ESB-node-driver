ESB-node-driver
===============

ESB nodejs driver - under heavy development

Installation
===

You need to install zeromq 4 and google protobuf.
And then:

	npm install esb-node-driver

Usage
===

Check the examples directory.

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
	