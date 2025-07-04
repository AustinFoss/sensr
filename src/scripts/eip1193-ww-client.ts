import type {Config, NetworkKind, Network} from '@a16z/helios'

// This interface definition was taken from the Ethers.JS library found here:
// https://github.com/ethers-io/ethers.js/blob/main/src.ts/providers/provider-browser.ts#L18
// It is MIT Licensed
// Not imported from the Ethers library to minimize this repo's dependencies 
export interface Eip1193Provider {
    request(request: { method: string, params?: Array<any> | Record<string, any> }): Promise<any>;
};

export type NetworkConfig = {name: string, config: Config, kind: NetworkKind}

export class WebWorkerProvider implements Eip1193Provider {

    webWorker: Worker;

    constructor(options: {
        worker: Worker,
        // TODO: Implement for multiple networks to be running
        // For now assume there is only networks[0]
        // networks?: NetworkConfig[]
    }) {
        console.log(options);
        
        this.webWorker = options.worker
        console.log(this.webWorker);
        this.webWorker.onerror = (error) => {
            console.error('Worker error:', error)
        }
        // const workerMessage = {
        //     type: 'init',
        //     options: {
        //         networks: options.networks
        //     }
        // }
        // this.webWorker.postMessage(workerMessage)
        
    }

    async init(networks: NetworkConfig[]) {
        const workerMessage = {
            type: 'init',
            options: {
                networks: networks
            }
        }
        this.webWorker.postMessage(workerMessage)        
    }

    async request(request: { method: string, params?: Array<any> | Record<string, any> }): Promise<any> {
        return new Promise((resolve, reject) => {
            // Create a unique ID for this request
            const id = Math.random().toString(36).slice(2);                
            
            // Set up message handler
            const handler = (event: MessageEvent) => {

                if (event.data.id === id) {                        
                    this.webWorker.removeEventListener('message', handler);
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        resolve(event.data.result);
                    }
                }
            };

            // Add listener and post message
            this.webWorker.addEventListener('message', handler);
            this.webWorker.postMessage({
                type: "eth_rpc_req",
                id,
                req: request
            });
        });
    }

}