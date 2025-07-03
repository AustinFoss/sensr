import type {Config, NetworkKind} from '@a16z/helios'

export type Libp2pConfig = {
    allowConnectionsFrom: string[],
    windowNode: {
        privKey: Uint8Array
    },
    swNode: {
        privKey: Uint8Array
    }
}

export type NetworkConfig = {
    providerInfo: {
        name: string,
        // uuid: string,
        config: Config,
        kind: NetworkKind,
    },
    blockTime?: number,
    lastSeen?: number,
    enabled?: boolean
}

export type NetworkingConfig = {
    remoteServers: RemoteServer[]
    networks: NetworkConfig[]
}

export type Setting = {
    name: string,
    value: NetworkingConfig | Libp2pConfig
}

export type RemoteServer = {
    remoteId: string,
    multiAddrStrs: string[]
}


const remoteServer: RemoteServer = {
    remoteId: '12D3KooWAjsZv92pw8meBSaV1sULiCSoWEruqb34gee5yDKE4wM8',
    multiAddrStrs: ['/ip4/10.0.0.167/udp/37485/webrtc-direct/certhash/uEiBR9NOgSney8KiC2iFsW4kS_B8QwteDjqiysVPsSnC03g']
}

const networks: NetworkConfig[] = [
    {
        providerInfo: {    
            name: "ethereum",
            config: {
                executionRpc: "https://eth-rpc." + remoteServer.remoteId + ".libp2p",
                consensusRpc: 'https://ethereum.operationsolarstorm.org',
                // consensusRpc: 'https://eth-consensus.' +remoteServer.remoteId + '.libp2p',
                checkpoint:
                // "0x573ce6fd80e33a11c0ba1d6e398109e043b804ddb6e12d26d8a00eff7ccf9e8f",
                "0x0c4b712835ba0b33af8cac5904ba1450110163cfc4ea9b556e3e7d839e227afd",
                dbType: "localstorage",
                network: 'mainnet'
            },
            kind: "ethereum"
        },
        blockTime: 12,
        lastSeen: 0,
        enabled: true
    }
]

const libp2pConfig: Setting = {
    name: 'LibP2P',
    value: {
        allowConnectionsFrom: [],
        windowNode: {
            privKey: new Uint8Array
        },
        swNode: {
            privKey: new Uint8Array
        }
    }
}

const networkingConf: Setting = {
    name: 'Networking',
    value: {
        remoteServers: [remoteServer],
        networks: networks
        
    }
}

type Factory = {
    settings: Setting[]
}

export const factory:Factory = {
    settings: [
        libp2pConfig,
        networkingConf
    ]
}