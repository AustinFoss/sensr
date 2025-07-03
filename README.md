# Sensor - Sovereign ENS Resolver

This project consists of 4 parts

- Web App
    - Front End UI - LibP2P WebRTC & WebRTC-Direct
    - Service Worker - LibP2P Webtransport
    - Web Worker - Helios Ethereum Light Client
- Remote Server - LibP2P WebRTC-Direct & Webtransport (HTTP over LibP2P, Ethereum HTTP RPC, WebRTC Rendevous)

See the [project description](/DESCRIPTION.md) for an in depth explanation for the rational and purpose for why this was built.



## Architecture

### Flow

1. DOM Spawn
1. Service Worker (SW) Initialize
1. LibP2P WebRTC Node Spawn in DOM
1. WebRTC -> Remote Server Req for Webtransport Address
1. Remote Server WebTpt Addrs passed to Service Worker
1. Service Worker Adds Remote Server Addrs to LibP2P Node & Connects
    - Confirm Connection to the DOM
1. Use the PeerId of the Remote Server to form the urls passed to the NetworkConfigs
1. For each NetworkConfig generate a new WebWorkerProvider(HeliosWebWorker | new HeliosWebWorker(), Networks[ Network.Config ]) 

## TODO List

- [ ] Store a constant LibP2P Private Key in the browser IndexedDB 
    - This may or may not be the same key used for both the Main Thread WebRTC LibP2P node and the Service Worker Webtransport LibP2P node; undecided
- [ ] Build in Authorization for the Remote Server to only accept connections from specific PeerIDs
- [ ] Build in Authorization for the WebRTC node in the browser to only accept connections from specific PeerIDs
- [ ] Fix the HTTP relaying through the Remote Server