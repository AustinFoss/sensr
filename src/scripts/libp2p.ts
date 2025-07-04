import { createLibp2p, type Libp2p } from 'libp2p';
import { webRTCDirect, webRTC } from '@libp2p/webrtc'
import { webTransport } from '@libp2p/webtransport'
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { multiaddr, protocols, type Multiaddr } from '@multiformats/multiaddr';
import { identify, identifyPush } from '@libp2p/identify'
import { ping, type Ping } from '@libp2p/ping';
import * as cbor from 'cborg';
import {peerIdFromString} from "@libp2p/peer-id"

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'

import {eip1193} from './protocol-eip1193'

import type { BrowserProvider } from 'ethers';
import type { WebWorkerProvider } from './eip1193-ww-client';

const WEBRTC_CODE = protocols('webrtc').code
const WEBTRANSPORT_CODE = protocols('webtransport').code

const isWebrtc = (ma: Multiaddr) => {
  return ma.protoCodes().includes(WEBRTC_CODE)
}
const isWebtransport = (ma: Multiaddr) => {
  return ma.protoCodes().includes(WEBTRANSPORT_CODE)
}

export async function initLibp2p(options: {privKey: any, provider: WebWorkerProvider}) {

    try {
        return await createLibp2p({
            privateKey: options.privKey,
            addresses: {
                listen: [
                    '/p2p-circuit',
                    '/webrtc'
                ]
            },
            transports: [
                webTransport(),
                // @ts-ignore
                webRTC(),
                // @ts-ignore
                webRTCDirect(),
                // @ts-ignore
                circuitRelayTransport(),
            ],
            connectionEncrypters: [noise()],
            streamMuxers: [yamux()],
            connectionGater: {
                denyDialMultiaddr: () => {
                return false
                }
            },
            services: {
                // @ts-ignore
                identify: identify(),
                // @ts-ignore
                identifyPush: identifyPush(),
                // @ts-ignore
                ping: ping(),
                // @ts-ignore
                eip1193: eip1193({provider: options.provider})
            }
        })

    } catch (err) {
        console.log("Error creating Libp2p", err);
        return undefined
    }
}

export async function bootstrapNode(_node: Libp2p, _addrs_list: string[]) {

        // _node.handle('/libp2p-http', async ({ connection, stream }) => {
        //     console.log('Handling /libp2p-http');

        // })
        _node.addEventListener('connection:open', (event) => {
            console.log("Connection Opened"); 
        })
        _node.addEventListener('connection:close', (event) => {
            console.log("Connection Closed");
        })

        _node.addEventListener('self:peer:update', (event) => {
            console.log('Self Peer Update: ', event);
            let addrs = _node.getMultiaddrs()
            for(let addr in addrs) {
                console.log("My Multiaddr[s]: ", addrs[addr].toString());                
            }
            
        })

        let addrs = []
        for(let addr in _addrs_list) {
            addrs.push(multiaddr(_addrs_list[addr]))
        }
        console.log("Bootstrap Addrs: ", addrs);
        
        console.log("Dialing bootstrap addrs");        
        for(let addr in addrs) {
            // console.log("Dialing peer: ", addrs[addr].getPeerId());
            console.log("Bootstrap adddr: ", addrs[addr].toString());            
            
            // @ts-ignore
            await _node.dial(addrs[addr])
            // @ts-ignore
            let stream = await _node.dialProtocol(addrs[addr], '/ipfs/ping/1.0.0')
            stream.close()
            // @ts-ignore
            await _node.dialProtocol(addrs[addr], '/ipfs/id/1.0.0')
            stream.close()
            // @ts-ignore
            await _node.dialProtocol(addrs[addr], '/ipfs/id/1.0.0')
            stream.close()
            
            let serverPeer;
            const peerIdStr = addrs[addr].getPeerId();
            console.log("Server Peer ID String: ", peerIdStr);            
            if (peerIdStr !== null) {
                serverPeer = await _node.peerStore.get(peerIdFromString(peerIdStr));
            } else {
                // Handle the null case (e.g., throw an error or skip)
                throw new Error(`No PeerId found for address: ${addrs[addr]}`);
            }

            console.log("Server Peer: ", serverPeer);

            for(let addr in serverPeer.addresses) {
                console.log("Server Peer Addr[s]", serverPeer.addresses[addr].multiaddr.toString());
            }
            
            let webtransportAddrs: string[] = [];
            // @ts-ignore
            serverPeer.addresses.filter(ma  => isWebtransport(ma.multiaddr))
                .map((ma) => {
                    // console.log("Webtransport Multiaddr: ");        
                    // console.log(ma.multiaddr.toString());
                    const multiaddr = ma.multiaddr.toString() + "/p2p/" + serverPeer.id.toString()
                    webtransportAddrs.push(multiaddr)
                
                })
            console.log("Webtransport Multiaddrs: ", webtransportAddrs);

            return webtransportAddrs

        }
    
}