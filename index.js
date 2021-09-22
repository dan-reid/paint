const os = require('os');
const path = require('path');
const express = require('express');
const osc = require('osc');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 3000;

const getIPAddresses = () => {
	const interfaces = os.networkInterfaces();
	const ipAddresses = [];

	for (const deviceName in interfaces) {
		const addresses = interfaces[deviceName] || [];

		for (const addressInfo of addresses) {
			if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
				ipAddresses.push(addressInfo.address);
			}
		}
	}

	return ipAddresses;
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}.\nStarting upd server....`);

	const udp = new osc.UDPPort({
		localAddress: '0.0.0.0',
		localPort: 7400,
		remoteAddress: '127.0.0.1',
		remotePort: 7500,
	});

	udp.on('ready', () => {
		const ipAddresses = getIPAddresses();
		ipAddresses.forEach((address) => console.log(' Host:', address + ', Port:', udp.options.localPort));
		console.log('Broadcasting OSC over UDP to', udp.options.remoteAddress + ', Port:', udp.options.remotePort);
		udp.on('message', (data) => console.log(data));
	});

	udp.open();

	console.log(`Establishing a Web Socket connection...`);
	const wss = new WebSocket.Server({
		port: 8081,
	});

	wss.on('connection', (socket) => {
		console.log('A Web Socket connection has been established!');
		const socketPort = new osc.WebSocketPort({
			socket: socket,
		});

		const relay = new osc.Relay(udp, socketPort, {
			raw: true,
		});
	});
});
