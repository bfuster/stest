var net = require('net');

var socket = new net.Socket();
socket.on('connect', function() {
	console.log('connected');
	socket.end(process.argv[2], 'utf8', function() {
		console.log('write was done!');
	});	
});
socket.on('error', function() {
	console.log('error!');
});
socket.on('data', function(data) {

	var str = new String(data);
	if (str.indexOf('FL-SERVER-READY') <= -1) {
		var data2 = new String(data).split('\n');
		console.log(data2);	
	}
});
socket.connect(50005, '192.168.56.101');
