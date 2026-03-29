const os = require('os');

module.exports = {
	listenIp: '0.0.0.0',
	listenPort: 3000,

	mediasoup: {
		// Worker settings
		numWorkers: Object.keys(os.cpus()).length,
		workerSettings: {
			logLevel: 'warn',
			logTags: [
				'info',
				'ice',
				'dtls',
				'rtp',
				'srtp',
				'rtcp',
			],
			rtcMinPort: 40000,
			rtcMaxPort: 49999,
		},
		// Router settings
		routerOptions: {
			mediaCodecs: [
				{
					kind: 'audio',
					mimeType: 'audio/opus',
					clockRate: 48000,
					channels: 2,
				},
				{
					kind: 'video',
					mimeType: 'video/VP8',
					clockRate: 90000,
					parameters: {
						'x-google-start-bitrate': 1000,
					},
				},
				{
					kind: 'video',
					mimeType: 'video/VP9',
					clockRate: 90000,
					parameters: {
						'profile-id': 2,
						'x-google-start-bitrate': 1000,
					},
				},
				{
					kind: 'video',
					mimeType: 'video/h264',
					clockRate: 90000,
					parameters: {
						'packetization-mode': 1,
						'profile-level-id': '42e01f',
						'level-asymmetry-allowed': 1,
						'x-google-start-bitrate': 1000,
					},
				},
			],
		},
		// WebRtcTransport settings
		webRtcTransportOptions: {
			listenIps: [
				{
					ip: '0.0.0.0',
					announcedIp: process.env.ANNOUNCED_IP || '72.62.195.63',
				},
			],
			initialAvailableOutgoingBitrate: 1000000,
			minimumAvailableOutgoingBitrate: 600000,
			maxSctpMessageSize: 262144,
			// Additional options like enableTcp, enableUdp, etc.
			enableUdp: true,
			enableTcp: true,
			preferUdp: true,
		},
	},
};
