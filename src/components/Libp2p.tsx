import { multiaddr } from '@multiformats/multiaddr';
import { createSignal, createEffect, onMount, Show } from 'solid-js'; 
import {initLibp2p, bootstrapNode} from '../scripts/libp2p'
import { privateKeyFromRaw } from '@libp2p/crypto/keys'

import { WebWorkerProvider } from '../scripts/eip1193-ww-client';
import { Settings} from '../scripts/indexedDb'

import {BrowserProvider, EnsResolver, type Eip1193Provider} from 'ethers'
import type { NetworkingConfig } from '../scripts/settings';
import { LibP2pProvider } from '../scripts/protocol-eip1193';



import { useStore } from '@nanostores/solid';
import { $ensResAddr, $remotePeerId } from '../scripts/store';

// Make sure the Service Worker is running
let serviceWorkerReg = await navigator.serviceWorker.ready
let serviceWorker = serviceWorkerReg.active

let settings = new Settings
let remoteId = document.getElementById('remoteId') as HTMLMetaElement
let multiAddrStrs = document.getElementById('multiAddrStrs') as HTMLMetaElement

await settings.init({remoteId: remoteId.name, multiAddrStrs: JSON.parse(multiAddrStrs.name)})

// @ts-ignore TODO: fix type checking later
let privKey = privateKeyFromRaw(settings.getSetting("LibP2P").windowNode.privKey)
// @ts-ignore TODO: fix type checking later
const serverAddr = settings.getSetting('Networking').remoteServers[0].multiAddrStrs[0] + '/p2p/' + settings.getSetting("Networking").remoteServers[0].remoteId;
// @ts-ignore TODO: fix type checking later
let ethProviderConf = settings.getSetting('Networking').networks[0]
// console.log("Eth Prov Conf: ", ethProviderConf);

let worker = new Worker('/workers/worker.js', {type: 'module'})
// @ts-ignore TODO: fix type checking later
const webWorkerProvider = new WebWorkerProvider({worker: worker})

// Start the Webrtc Libp2p Node
let node = await initLibp2p({privKey: privKey, provider: webWorkerProvider})
console.log("Priv Key: ", privKey);

let webtransportAddrs;
if(node !== null && node !== undefined) {
    node.start()
    console.log(serverAddr);

    webtransportAddrs = await bootstrapNode(node, [serverAddr])
} else {
    throw new Error("error initing libp2p")
}

function formatBlock(block: any): string {
  const ts = new Date(Number(block.timestamp) * 1000);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const txCount = block.transactions.length;
  const txLabel = txCount === 1 ? "transaction" : "transactions";
  return `<span class="block-number">Block ${block.number}</span><br>${date} ${time}<br>${txCount} ${txLabel}`;
}

// Render a block and start animations
function renderBlock(network: string, blockTime: number, block: any): void {
    
  const el = document.getElementById(`${network}-latest`);
  if (!el) return;
  
  el.classList.remove("loading");
  el.innerHTML = formatBlock(block);
  el.style.setProperty("--duration", `${blockTime}s`);
  el.classList.remove("animate", "flash");
  void el.offsetWidth; // Force reflow
  el.classList.add("animate", "flash");
}

const swMessage = async (req: any) => {
    return new Promise((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {            
            if(event.data?.jsonrpc && event.data.id === req.id) {
                navigator.serviceWorker.removeEventListener('message', onMessage);
                clearTimeout(timeoutId);
                resolve(event.data);
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);

        serviceWorker?.postMessage(req);

        const timeoutId = setTimeout(() => {
            navigator.serviceWorker.removeEventListener('message', onMessage);
            reject(new Error("Response Timeout"));
        }, 3000);
    });
};

let res = await swMessage({
    jsonrpc: '2.0', 
    method: 'init',
    params: {
        // @ts-ignore TODO: fix type checking later
        privKey: settings.getSetting("LibP2P").swNode.privKey,
        bootstrapList: webtransportAddrs
    },
    id: 1    
})

let serviceWorkerId: any = await swMessage({
    jsonrpc: '2.0',
    method: 'peerId',
    params: {},
    id: 2
// @ts-ignore
})
// console.log("SW Init Success with PeerID: ", serviceWorkerId);

// @ts-ignore
webWorkerProvider.init([settings.getSetting('Networking').networks[0].providerInfo])
let ethClient = new BrowserProvider(webWorkerProvider)

setInterval(async () => {            
    try {        
        const latestNumber = await ethClient.getBlockNumber();

        if (latestNumber !== ethProviderConf.lastSeen) {
            ethProviderConf.lastSeen = latestNumber;
            const blk = await ethClient.getBlock(latestNumber);
            console.log("Block: ",blk);
            
            renderBlock(ethProviderConf.providerInfo.name, ethProviderConf.blockTime, blk);                
        }
    } catch (err) {
    console.error(`Error fetching ${ethProviderConf.name}:`, err);
    }   
}, 1000);

export default () => {
    const ensResAddr = useStore($ensResAddr)
    const remotePeerId = useStore($remotePeerId)

    let sting: any[] = [];

    let [getPermitId, setPermitId] = createSignal('Add Peer ID to Permit List')
    let [getSettings, setSettings] = createSignal(sting)

    let [getLocalResolved, setLocalResolved] = createSignal('')
    let [getRemoteResolved, setRemoteResolved] = createSignal('')

    setSettings([])
    settings.init().then((res) => setSettings(res))
    
    let addrs = node.getMultiaddrs()
    console.log("My MultiAddrs: ", addrs);
    for(let addr in addrs) {
        console.log(addrs[addr].toString());            
    }


    return <>
    
        <h1 class="pros prose-h1">SENSR</h1>
        <h2>Sovereign ENS Resolver</h2>

        <br />
        <br />

        <div class='flex'>
            <h3>Main Thread LibP2P ID:&nbsp;</h3>
            <p>Operates the WebRTC & WebRTC-Direct Connections</p>
        </div>        
        <p>{node?.peerId.toString()}</p>
        
        <br />

        <div class='flex'>
            <h3>Service Worker LibP2P ID:&nbsp;</h3>
            <p>Operates the Webtransport Connections</p>
        </div>
        <p>{serviceWorkerId.result}</p>

        <br />
        <br />

        <div class="panels-container">
            <div class="panel">
                <h2>Ethereum</h2>
                <pre class="block-info loading" id="ethereum-latest"></pre>
            </div>
        </div>

        <br />
        <br />

        <input class='input' id='ensQuery' type="text" placeholder='.eth?' onInput={(event) => {
            const input = document.getElementById('ensQuery') as HTMLInputElement  
            $ensResAddr.set(input.value)     
        }} />

        <button class=" btn" onClick={async () => {
            let resolver = await EnsResolver.fromName(ethClient, ensResAddr())
            let addr = await resolver?.getAddress()
            console.log("ENS resolves to: ", addr);
            if(addr) {
                setLocalResolved(addr)
            }
        }}>Local ENS Query?</button>
        <p>{getLocalResolved()}</p>

        <input class='input' type="text" id='remotePeerId' placeholder='Peer ID: 12D3KooW...' onInput={() => {
            const input = document.getElementById('remotePeerId') as HTMLInputElement
            $remotePeerId.set(input.value)
        }} />
        <button class=' btn' onClick={async () => {
            let libp2pProvider: BrowserProvider = new BrowserProvider(new LibP2pProvider({
                remote: multiaddr(serverAddr + '/p2p-circuit/webrtc/p2p/' + remotePeerId()),
                // @ts-ignore TODO
                node: node,
                provider: ethClient
            }))
            let resolver = await EnsResolver.fromName(libp2pProvider, ensResAddr())
            let _ensResAddr = await resolver?.getAddress()
            console.log("Reote ENS Query Resolved to: ", _ensResAddr);  
            if(_ensResAddr) {
                setRemoteResolved(_ensResAddr)
            }   
        }}>Remote ENS Query?</button>
        <p>{getRemoteResolved()}</p>

    </>;

}
