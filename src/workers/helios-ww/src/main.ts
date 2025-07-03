import {createHeliosProvider, HeliosProvider, type NetworkKind, type Config } from '@a16z/helios';

export type NetworkConfig = {
    name: string,
    blockTime?: number,
    config: Config,
    kind: NetworkKind,
    provider?: HeliosProvider
}

let workerState: {
    workerScriptPath: string,
    networks: NetworkConfig[]
}

self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initWorker(e.data.options);
            break;
        case 'eth_rpc_req':
            handleEthRpcReq(e.data)
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};

const initWorker = async (options: any) => {

    workerState = options   
    console.log("Config?: ", workerState.networks[0].config);
    
    workerState.networks[0].provider = await createHeliosProvider(workerState.networks[0].config, workerState.networks[0].kind)

    await workerState.networks[0].provider.waitSynced();

    console.log('Helios is synced and ready!');
    
    // Example: Get latest block number
    const blockNumber = await workerState.networks[0].provider.request({ method: 'eth_blockNumber', params: [] });
    console.log('Latest block number:', blockNumber);

    // heliosProvider = heliosProvider;

}

const handleEthRpcReq = async (
    data: {
        type: string,
        id: number,
        req: {method: string, params: []}
    }
) => {
    let res = await workerState.networks[0].provider?.request(data.req)
    self.postMessage({id: data.id, result: res});
    return {id: data.id, result: res}
}