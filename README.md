# SENSR - Sovereign ENS Resolver

This project consists of 4 parts

- Web App
    - Front End UI - LibP2P WebRTC & WebRTC-Direct (Main Thread)
    - Service Worker - LibP2P Webtransport (Worker Thread)
    - Web Worker - Helios Ethereum Light Client (Worker Thread)
- Remote Server - LibP2P WebRTC & Webtransport: HTTP over LibP2P, Ethereum HTTP RPC, WebRTC Direct (Browser -> Server) & WebRTC (Browser -> Browser)

See the [project description](/DESCRIPTION.md) for an in depth explanation for the rational and purpose for why this was built.

## Install & Run

1. Start a server that provides an Ethereum HTTP RPC service behind a LibP2P Node using the [LibP2P HTTP Protocol as defined in this spec](https://github.com/libp2p/specs/tree/master/http). This can be implemented in any number of ways. Since Go-LibP2P is the only one with an existing implementation I have created a server that performs this function at this repository, [Go SENSR Server]().

1. Duplicate the `.env.tmp` file to a new `.env` file. Copy the WebRTC Direct Multiaddress your server is listening on and the peer ID over.

    ```env
    MULTIADDR_STRINGS='[
        "/ip4/10.0.0.167/udp/37485/webrtc-direct/certhash/uEiBR9NOgSney8KiC2iFsW4kS_B8QwteDjqiysVPsSnC03g"
    ]'
    REMOTE_ID='12D3KooWAjsZv92pw8meBSaV1sULiCSoWEruqb34gee5yDKE4wM8'
    ```

1. Install dependencies & start the dev server. My `dev` script starts concurrent watches for both the Service Worker & Web Worker directories the bundles each and places the resulting files the public directory.

    ```bash
    pnpm i && pnpm dev
    ```

1. Open the Web App at http://localhost:4321

## Explanation

When the Web App starts the LibP2P node in the main thread begins the bootstrap process by dialing the remote server's 'well-known' public WebRTC-Direct Multiaddress. Upon connecting it runs the identify protocol to request the server's Webtransport Multiaddresses, which it then passes to the LibP2P Node in the Service Worker which connects via those addresses.

This is done because there are three transports available for Browser -> Server communication:

- WebRTC-Direct
- Webtransport
- Websocket Secure

> "Up until recently, configuring a libp2p node to be connectable from browsers required additional effort, as node operators had to own and manually configure a domain name and obtain a TLS certificate signed by a certificate authority (CA).
>
> Recent investments in WebTransport (opens new window)and WebRTC (opens new window)helped circumvent this problem, by removing the need for CA-signed TLS certificate, but they have their own drawbacks outlined below." - [Announcing AutoTLS: Bridging the Gap Between libp2p and the Web](https://blog.libp2p.io/autotls/), Daniel Norman (2025-02-13)

As I am trying to implement this in an entirely 'sovereign' way, without using a CA signed TLS certificate, that leaves Webtransport and WebRTC. Webtransport self signed certificates cannot be more than 2 weeks old per the W3C spec. WebRTC self signed certificates can be valid for up to 1 year per the W3C; however it cannot operate inside a worker and WebRTC connections must be made from the main thread.

In order to provide an address that can remain constant for a reasonable length of time a WebRTC-Direct Multiaddress must be the first step in bootstrapping. Webtransport addresses can be cached with IndexedDB to try and speed up the startup process. Having a LibP2P Node connected with Webtransport allows us to relay HTTP requests through a libp2p connection.

Now that the Service Worker is connected to the remote server the Helios light client in the Webworker can begin its syncing process. Once it is synced messages can be sent to it from the main thread using libraries like ethers.js and viem (only ethers.js is currntly working) to send EIP-1193 JSON RPC request messages to the Helios Worker and return the response. This is done by wrapping the Helios Web Worker in a class that implements an EIP-1193 compatible interface.

When Helios makes its HTTP requests the Fetch events are intercepted by the service worker and relays the request to the remote LibP2P server which then resolves the EIP-1193 request and propogates it back up the chain.
