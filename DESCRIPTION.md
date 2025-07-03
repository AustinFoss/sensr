## Providing Trustless & Permissionless Client Side ENS Resolution

Since I first started learning about a Decentralized Apps (DApps) and client side front ends for blockchain apps hosted on IPFS I've had a personal hang up with a lingering trusted centralized system, the Domain Name System (DNS).

I'm not sure what the first DApp was but the first use case I remember was DeFi on Ethereum such as Uniswap DEx and 1inch DEx, and then later on the Gnosis Safe wallet. All of these, and likely many more, still publish their Web Apps using IPFS, which is a method for sharing digital content in a manner that's similar to torrenting where you can fetch what you're looking for (defined by a unique Content Identifier, or CID) from any number of IPFS nodes you are connected to. So you don't need to get the Uniswap DApp just from app.uniswap.org, you can get it from any IPFS node that has the corresponding CID for the latest release version of the DApp.

This poses a UX problem because manually finding the CID and pasting it into a public IPFS HTTP Gateway to manually construct a URL isn't acceptable to expect a user to jump through those hoops. One way around this is to add a DNS TXT record for your IPFS CID or IPNS record, that way if a user has the IPFS Companion browser extension installed it will detect this TXT record and fetch the content not from docs.ipfs.io but from the IPFS network.

Having to use a browser extension isn't the end of the world but it introduces the previously mentioned problem the DNS is a centralized trusted system. Another option is to use a blockchain ledger the Ethereum Name Service (ENS) to publish your DApp's CID to the Content Hash record of your registered ENS name. Using ENS also requireseither a browser extension like MetaMask or an HTTP public resolver like eth.limo to resolve the CID/IPNS record from the ENS name.

Unfortunately their doesn't seem to be a significant effort to guide users to this option through an ENS record from DApps like Uniswap or Gnosis Safe. Both have ways to do this and publish the latest release's CID to their GitHub, but neither have an up to date, functional, or existing DNS/ENS record for their DApps. Their could be any number of reasons for this but the main one I can think of is having to update the IPFS CID for each release in your DNS TXT record which takes time to update and if there is a critical bug fix then this time delay might be too risky, and/or update the ENS Content Hash record which is more or less instant but costs money for each update. Updating either of these options using an IPNS public key instead of the CID solves both of these issues but then requires the developers to maintain their own IPFS node infrastructure or trust a third party to do so on their behalf to keep the IPNS record live within the IPFS network.

So if we eliminate the legacy DNS system from our list of options and try to move exclusively to a decentralized option like ENS let's assume for a moment that developers are willing to either pay to update their ENS Content Hash record each time a new release is published or maintain their own IPFS infrastructure to maintain an IPNS record (making this part easier for developers is a problem for another project at another time). Now we are left with a chicken and egg problem for the users about how they are supposed to be able to resolve an ENS name without using DNS. In DNS this is done by bootstrapping a user to the rest of the internet with their ISP's DNS server or public DNS servers like 1.1.1.1 or 0.0.0.0 (Cloudflare and Google). Bootstrapping for ENS doesn't exist because this involves connecting to a public Ethereum RPC endpoint.

At last we arrive at the purpose of this project; to provide client side trustless ENS resolution for a user without ever touching the legacy DNS.

## LibP2P & Trustless ENS Resolution

Due to the way the Web grew up it's existing security model makes it challenging for a Web App to communicate with other services, in this case an Ethereum RPC endpoint, without a valid TLS certificate to provide an HTTPS connection, and this TLS certificate requires the RPC endpoint's provider to have a valid DNS name.

**So how can a user of a Web App ask an Ethereum RPC endpoint for ENS information without DNS?**

LibP2P is what powers the Ethereum and IPFS decentralized networks by allowing nodes to talk to one another using an array of different transports protocols. In the legacy DNS method this is done through TCP and HTTP(S), but LibP2P opens the door to other options. Back in 2019 the methods were still very early in development, and still are maturing, but today we can experiment to start laying the groundwork for more permissionless client-server communication without the need for a domain name or TLS certificate from a Certificate Authority (CA).

Our two options are to use WebRTC or Webtransport, and we will should use both because of the limitations they each carry. WebRTC's main limitation is that it cannot be used outside a Web App's main thread, meaning if a request to a server is taking a while it can run the risk of blocking the main thread and causing UX friction such as freezing. Webtransport has the problem that, in the [current W3C draft of it's spec](https://w3c.github.io/webtransport/#web-transport-configuration), the server's self signed certificate, not from a CA, "validity period MUST NOT exceed two weeks." Whereas WebRTC allows for TLS certificates of up to [365 days](https://w3c.github.io/webrtc-pc/#methods-3). 

**These limitations dictate that we will use a LibP2P connection over WebRTC in the mainthread to bootstrap the process.**

After this first connection is made the user's LibP2P main thread node asks from the server's webtransport information and passes it to a LibP2P node in a service worker to make further requests to the server over webtransport from there. This information can be cached so that if a user is connecting to the Ethereum RPC endpoint frequently they don't need to make the WebRTC connection every time and simply make the webtransport connection immediately.

**How is the response from the Ethereum RPC endpoint trustless?**

Enter Helios, a Ethereum light client developed by a16z written in Rust that can be compiled to WebAssembly (WASM) for embedding into Web Apps. Using this light client the user can fetch information from the server's Ethereum RPC endpoint and independently verify it's true on the client side.

The way this would work is the user makes a request from the main thread to the Helios light client running in a web worker which then makes it's call to an RPC endpoint. Helios is built to do this by making HTTP requests using the browser's Fetch API which the LibP2P node in the service worker can intercept and proxy the request over it's webtransport connection to the server. On the server side the request is received from the LibP2P webtransport connection and relayed to it's Ethereum RPC endpoint, and then the response is returned in reverse order and verified by Helios.

Helios is operating separately in a web worker from the LibP2P service worker so that while it is verifying responses it doesn't block subsequent requests being made. All together we have a main thread, a service worker thread, and a web worker.

## Avoiding Duplicate Functionality

It doesn't make sense to integrate a Helios light client inside every single Web DApp, this would be far to resource inefficient. Thankfully this service can be provided to subsequent Web DApps be connecting different browser tabs together. So if this project's Helios functionality is available from WebDApp1 in a tab, and WebDApp2 wants to use Helios' ENS resolution features it can bootstrap its LibP2P nodes in the same way and then connect to WebDApp1's WebRTC LibP2P node in the main thread from it's own using the same server as an initial meeting point, after which the two Web DApps in deperate tabs can communicate with eachother and WebDApp2 doesn't its own duplicate Helios light client.

## Why Web DApps Instead of Mobile/Desktop DApps

Why publishing to the Google Play Store or Apple's App store a developer is restricted to asking permission and adhering to the each store's guideline. For instance it was only until recently that Apple allowed crypto payments in apps because they circumvented the app store's fees for any purchase made in apps from the app store.