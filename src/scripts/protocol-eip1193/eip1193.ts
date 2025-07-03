
import { PROTOCOL_ID, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { Eip1193Components, Eip1193Init, Eip1193 as Eip1193Interface } from './index.js'
import type { AbortOptions, Logger, Stream, PeerId, Startable, IncomingStreamData } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import { lpStream } from 'it-length-prefixed-stream'
import type { BrowserProvider } from 'ethers'
import type { WebWorkerProvider } from '../eip1193-ww-client.js'

export class Eip1193 implements Startable, Eip1193Interface {
  public readonly protocol: string
  private readonly components: Eip1193Components
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnLimitedConnection: boolean
  private readonly log: Logger
  provider: WebWorkerProvider | null

  constructor (components: Eip1193Components, init: Eip1193Init = {}) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:ping')
    this.started = false
    // this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.protocol = PROTOCOL_ID
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? true
    this. provider = init.provider ?? null

    this.handleMessage = this.handleMessage.bind(this)
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
    })
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  handleMessage (data: IncomingStreamData): void {

    const { stream } = data

    console.log("Received eip1193 message from Peer ID: ", data.connection.remotePeer.toString());    

    new Promise(async (reject, resolve) => {

        const lp = lpStream(stream)
        const req = await lp.read()

        // deserialize the query
        const query = JSON.parse(new TextDecoder().decode(req.subarray()))

        console.log("Requested eip1193 message: ", query);

        let res = await this.provider?.request(query)

        console.log("Sending res: ", res);
        
        
        await lp.write(new TextEncoder().encode(JSON.stringify(res)))
        
    })

  }

  async request (peer: PeerId | Multiaddr | Multiaddr[], request = {}, options: AbortOptions = {}): Promise<number> {    
    
    return new Promise(async (resolve, reject) => {

        console.log("Trying to send request: ", request);
        console.log("To Peer at Multiaddr: ", peer.toString());

        // @ts-ignore TODO
        const connection = await this.components.connectionManager.openConnection(peer, options)
        let stream: Stream | undefined

        if (options.signal == null) {
            const signal = AbortSignal.timeout(this.timeout)

            options = {
                ...options,
                signal
            }
        }
        try {
            stream = await connection.newStream(this.protocol, {
                ...options,
                runOnLimitedConnection: this.runOnLimitedConnection
            })
            console.log("Stream: ", stream);

            let lp = lpStream(stream)

            await lp.write(new TextEncoder().encode(JSON.stringify(request)))


            let res = await lp.read()
            let response = JSON.parse(new TextDecoder().decode(res.subarray()))

            console.log("Response: ", response);

            resolve(response)

            stream.close()
            
            
        } catch(err: any) {
            this.log.error('error while pinging %p', connection.remotePeer, err)
            stream?.abort(err)
            throw err
        } finally {
            if (stream != null) {
                await stream.close(options)
            }
        }

    
    })
  }
}