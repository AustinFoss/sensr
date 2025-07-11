export const PROTOCOL_ID = '/eip1193/0.1.0'
export const PROTOCOL_VERSION = '0.1.0'
export const PROTOCOL_NAME = 'eip1193'
export const TIMEOUT = 10000

// See https://github.com/libp2p/specs/blob/d4b5fb0152a6bb86cfd9ea/ping/ping.md?plain=1#L38-L43
// The dialing peer MUST NOT keep more than one outbound stream for the ping protocol per peer.
// The listening peer SHOULD accept at most two streams per peer since cross-stream behavior is
// non-linear and stream writes occur asynchronously. The listening peer may perceive the
// dialing peer closing and opening the wrong streams (for instance, closing stream B and
// opening stream A even though the dialing peer is opening stream B and closing stream A).
export const MAX_INBOUND_STREAMS = 6
export const MAX_OUTBOUND_STREAMS = 6