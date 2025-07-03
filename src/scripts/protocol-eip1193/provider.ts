import type {Config, NetworkKind, Network} from '@a16z/helios'
import type { Libp2p } from '@libp2p/interface';
import type { Multiaddr } from '@multiformats/multiaddr';

import type { BrowserProvider} from 'ethers'

// This interface definition was taken from the Ethers.JS library found here:
// https://github.com/ethers-io/ethers.js/blob/main/src.ts/providers/provider-browser.ts#L18
// It is MIT Licensed
// Not imported from the Ethers library to minimize this repo's dependencies 
export interface Eip1193Provider {
    request(request: { method: string, params?: Array<any> | Record<string, any> }): Promise<any>;
};

export type NetworkConfig = {name: string, config: Config, kind: NetworkKind}

export class LibP2pProvider implements Eip1193Provider {

    node: Libp2p;
    remote: Multiaddr

    constructor(options: {
        node: Libp2p,
        // TODO: Implement for multiple networks to be running
        // For now assume there is only networks[0]
        remote: Multiaddr,
        provider?: BrowserProvider
    }) {
        console.log(options);        
        this.node = options.node  
        this.remote = options.remote
    }

    async request(request: { method: string, params?: Array<any> | Record<string, any> }): Promise<any> {
        return new Promise((resolve, reject) => {
            // Create a unique ID for this request
            const id = Math.random().toString(36).slice(2);

            // @ts-ignore TODO
            resolve(this.node.services.eip1193.request(this.remote, request))

        });
    }

}