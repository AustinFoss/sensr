
import * as cbor from 'cborg';
import { multiaddr } from '@multiformats/multiaddr';

export async function dialLibp2pHttp(_node, _serverAddr, _requestString) {

    const P2PHTTPProtocol = "/http/1.1";

    try {
        // console.log("Attempting to dial /p2phttp @: ", _serverAddr);  
        // console.log("From: ", _node.peerId);
              
    
        const stream = await _node.dialProtocol(_serverAddr, P2PHTTPProtocol);    
        // console.log("Stream: ", stream);
        
        const peer = await _node.peerStore.all()
        // console.log("String Requst: ", _requestString);        
        const request = new TextEncoder().encode(_requestString)
        
        // Write the request to the stream
        await stream.sink([request]);
    
        // Read the response
        let response = '';
        for await (const chunk of stream.source) {
            response += new TextDecoder().decode(chunk.subarray());
        }
        // console.log(response);

        return response
        
    
    } catch (err) {
        console.log("Error dialing libp2phttp: ", err.message);    
    }
    
}