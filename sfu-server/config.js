const os = require('os');
require('dotenv').config();

module.exports = {
	listenIp:   '0.0.0.0',
	listenPort: parseInt(process.env.SFU_PORT || '3000', 10),

	// Maximum participants allowed per room (tune based on server capacity)
	// ~25 video streams per mediasoup worker is a safe upper bound
	maxParticipantsPerRoom: parseInt(process.env.MAX_PARTICIPANTS || '25', 10),

	mediasoup: {
		// One worker per CPU core; workers auto-restart on death (see server.js)
		numWorkers: Object.keys(os.cpus()).length,

		workerSettings: {
			logLevel: process.env.MEDIASOUP_LOG_LEVEL || 'warn',
			logTags:  ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
			rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000', 10),
			rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '49999', 10),
		},

		routerOptions: {
			mediaCodecs: [
				{
					kind:      'audio',
					mimeType:  'audio/opus',
					clockRate: 48000,
					channels:  2,
					parameters: {
						minptime:     10,
						useinbandfec: 1,  // Opus in-band FEC for packet loss resilience
					},
				},
				{
					kind:      'video',
					mimeType:  'video/VP8',
					clockRate: 90000,
					parameters: { 'x-google-start-bitrate': 1000 },
				},
				{
					kind:      'video',
					mimeType:  'video/VP9',
					clockRate: 90000,
					parameters: {
						'profile-id':             2,
						'x-google-start-bitrate': 1000,
					},
				},
				{
					kind:      'video',
					mimeType:  'video/h264',
					clockRate: 90000,
					parameters: {
						'packetization-mode':      1,
						'profile-level-id':        '42e01f',
						'level-asymmetry-allowed': 1,
						'x-google-start-bitrate':  1000,
					},
				},
			],
		},

		// Simulcast encoding layers - added to RTCRtpSender on the client side
		// The SFU selects which layer to forward per subscriber based on their bandwidth
		simulcastEncodings: [
			{ rid: 'q', scaleResolutionDownBy: 4, maxBitrate: 100000 },  // 180p  ~100 kbps
			{ rid: 'h', scaleResolutionDownBy: 2, maxBitrate: 300000 },  // 360p  ~300 kbps
			{ rid: 'f', scaleResolutionDownBy: 1, maxBitrate: 900000 },  // 720p  ~900 kbps
		],

		webRtcTransportOptions: {
			listenIps: [
				{
					ip:          '0.0.0.0',
					// CRITICAL: Must be the server's public IP in production
					// Set ANNOUNCED_IP or PUBLIC_IP env var on the server
					announcedIp: process.env.ANNOUNCED_IP || process.env.PUBLIC_IP || '127.0.0.1',
				},
			],
			enableUdp: true,
			enableTcp: true,
			preferUdp: true,
			initialAvailableOutgoingBitrate: 1000000,  // 1 Mbps
			minimumAvailableOutgoingBitrate: 600000,   // 600 kbps
			maxSctpMessageSize: 262144,
		},
	},
};
