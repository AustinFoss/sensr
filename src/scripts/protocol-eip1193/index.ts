import { Eip1193 as Eip1193Class } from './eip1193.js'
import type { AbortOptions, ComponentLogger, PeerId } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { BrowserProvider } from 'ethers'
import type { WebWorkerProvider } from '../eip1193-ww-client.js'

export interface Eip1193 {
  request(peer: PeerId | Multiaddr | Multiaddr[], request: any, options?: AbortOptions): Promise<number>
}

export interface Eip1193Init {
  maxInboundStreams?: number
  maxOutboundStreams?: number
  runOnLimitedConnection?: boolean
  timeout?: number

  provider?: WebWorkerProvider

}

export interface Eip1193Components {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export function eip1193 (init: Eip1193Init = {}): (components: Eip1193Components) => Eip1193 {
  return (components) => new Eip1193Class(components, init)
}

export { PROTOCOL_ID } from './constants.js'

export { LibP2pProvider } from './provider.js'