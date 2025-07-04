import { createLibp2p } from 'libp2p';
import { webTransport } from '@libp2p/webtransport';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { multiaddr, protocols } from '@multiformats/multiaddr';
import { identify, identifyPush } from '@libp2p/identify'
import { ping } from '@libp2p/ping';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import {peerIdFromString} from "@libp2p/peer-id"

import { dialLibp2pHttp } from './lib';

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

const remoteID = '12D3KooWAjsZv92pw8meBSaV1sULiCSoWEruqb34gee5yDKE4wM8'
const serverAddrStr ='/ip4/127.0.0.1/udp/37485/webrtc-direct/certhash/uEiBR9NOgSney8KiC2iFsW4kS_B8QwteDjqiysVPsSnC03g'

const serverAddr = serverAddrStr + '/p2p/' + remoteID;

const node = await createLibp2p({
  addresses: {
    listen: [
      "/p2p-circuit"
    ]
  },
  transports: [
    webTransport(),
    circuitRelayTransport()
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  connectionGater: {
    denyDialMultiaddr: () => {
      return false
    }
  },
  services: {
    identify: identify(),
    identifyPush: identifyPush(),
    ping: ping()
  }
})
await node.start()
for(let addr in node.getMultiaddrs()) {
  console.log("SW MultiAddr[s]", node.getMultiaddrs[addr]);
}

self.addEventListener('message', async (event) => {
  
  if (event.data && event.data.type === 'ADD_WEBTRANSPORT_ADDRS') {

    console.log("Bootstrapped PeerData: ", event.data.data.peerData);

    await bootstrapNode(node, event.data.data.peerData)

    let peerData = [];
    
    for(let ma in event.data.data.peerData) {    
        peerData.push(multiaddr(event.data.data.peerData[ma]))
    }        

    try {        
        node.peerStore.save(peerIdFromString(event.data.data.peerId.toString()), peerData)        
        
        await node.dial(event.data.data.peerData[0])

    } catch (err) {
        console.log(err);
        
    }

  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_PEER_ID') {
    const peerId = node.peerId.toString();        
    event.source.postMessage({
      type: 'PEER_ID_RESPONSE',
      peerId: peerId
    });
  }
});

// Basic service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting(); // Take control immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim()); // Take control of clients
});

self.addEventListener('fetch', (event) => {

  // console.log("Fetch Event: ", event.request.url);
  
  if (
    // event.request.url === "https://eth-rpc.12d3koowajszv92pw8mebsav1sulicsoweruqb34gee5ydke4wm8.libp2p/"
    event.request.url.match(/\.libp2p\/.*$/)
  ) {
    // console.log('request matched');

    event.respondWith((async () => {
      const request = event.request.clone();

      // Print details for debugging
      // console.log("Raw fetch request URL:", request.url);
      for (const [key, value] of request.headers) {
        // console.log(`Raw Header: ${key}: ${value}`);
      }
      // console.log("Raw Method:", request.method);
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const previewBody = await request.clone().text();
        // console.log("Raw Body:", previewBody);
      }

      let host = await node.peerStore.all();
      // console.log("Libp2p Peer Host:", host[0]);
      // console.log("Cloned Request:", request);

      // Gather all headers exactly as provided by the browser
      let headers = '';
      for (const [key, value] of request.headers) {
        headers += `${key}: ${value}\r\n`;
      }

      // Manually inject Host header
      const url = new URL(request.url);
      const path = url.pathname;
      const queryString = url.search;
      let hostHeader = `Host: ${url.host}\r\n`;

      // Get the body
      let body = '';
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
        const encoder = new TextEncoder();
        const bodyBytes = encoder.encode(body);
        headers += `content-length: ${bodyBytes.length}\r\n`;
      }

      // Compose the HTTP/1.1 request string
      let requestStr =
        `${request.method} ${path}${queryString} HTTP/1.1\r\n` +
        hostHeader +
        headers +
        '\r\n' +
        body;

      // console.log('Request string sent over libp2p:');
      // console.log(requestStr);

      let rawResponse = await dialLibp2pHttp(node, host[0].id, requestStr);

      // Parse the raw response
      const [statusLine, ...rest] = rawResponse.split('\r\n');
      const [protocol, statusCode, statusText] = statusLine.split(' ');
      let headersEnd = rest.indexOf('');
      const headerLines = rest.slice(0, headersEnd);

      // Check for chunked transfer encoding
      const responseHeaders = new Headers();
      let isChunked = false;
      headerLines.forEach(line => {
        const [key, value] = line.split(': ').map(str => str.trim());
        if (key && value) {
          responseHeaders.append(key, value);
          if (key.toLowerCase() === 'transfer-encoding' && value.toLowerCase() === 'chunked') {
            isChunked = true;
          }
        }
      });

      // Decode the body based on transfer encoding
      let bdy;
      if (isChunked) {
        // Parse chunked data
        const chunkLines = rest.slice(headersEnd + 1);
        let decodedBody = '';
        let i = 0;
        while (i < chunkLines.length) {
          // Get chunk size (in hex)
          const chunkSizeHex = chunkLines[i].trim();
          const chunkSize = parseInt(chunkSizeHex, 16);
          if (chunkSize === 0) {
            break; // End of chunks
          }
          // The next line(s) contain the chunk data
          i++;
          const chunkData = chunkLines.slice(i, i + 1).join('\r\n');
          decodedBody += chunkData;
          i += 1; // Move past the chunk data
          // Skip the trailing \r\n after chunk data
          if (chunkLines[i] === '') {
            i++;
          }
        }
        bdy = decodedBody;
      } else {
        // Non-chunked response, join as before
        bdy = rest.slice(headersEnd + 1).join('\r\n');
      }

      // Create Response object
      const response = new Response(bdy, {
        status: parseInt(statusCode),
        statusText,
        headers: responseHeaders
      });

      return response;
    })());
  }
});

async function bootstrapNode(_node, _addrs_list) {

        console.log("Bootstrapping SW with: ", _addrs_list);
        
        
        // _node.handle('/http/1.1', async ({ stream, protocol }) => {
        //     console.log('Handling /http/1.1 on:', protocol);

        // })

        _node.addEventListener('connection:open', (event) => {
            console.log("Connection Opened"); 
        })
        _node.addEventListener('connection:close', (event) => {
            console.log("Connection closed");
        })

        let addrs = []

        for(let addr in _addrs_list) {
            addrs.push(multiaddr(_addrs_list[addr]))
        }

        for(let addr in addrs) {
            await _node.dialProtocol(addrs[addr], '/ipfs/id/1.0.0')
        }
    
}


self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING')
    self.skipWaiting()
})

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

let allowlist
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('index.html'),
  { allowlist },
))
