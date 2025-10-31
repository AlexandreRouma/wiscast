// Get or generate a display ID
let params = new URLSearchParams(document.location.search);
let dispID = params.get("dispID");
if (dispID === null) {
    // Generate a random name (TODO)
    dispID = self.crypto.randomUUID().substring(0, 6);
}

// App objects
let sock = null;
let conn = null;

// GUI Objects
let idleScreen  = document.querySelector('#idleScreen');
let dispIDSpan  = document.querySelector('#dispID');
let pinScreen   = document.querySelector('#pinScreen');
let pinSpan     = document.querySelector('#pin');
let playback    = document.querySelector('#playback');
let credits     = document.querySelector('#credits');

// Show the display ID
dispIDSpan.textContent = dispID;

async function reset() {
    // Completely reset the state
    playback.hidden = true;
    pinScreen.hidden = true;
    idleScreen.hidden = false;
    credits.hidden = false;
    playback.srcObject = null;
    conn = null;

    // Initialize WebRTC
    await initRTC();
}

// WebSocket message handler
async function onMessage(data) {
    // Parse the message
    console.log(data)
    const msg = JSON.parse(data);

    // Process depending on the type
    switch (msg.type) {
    case 'conn-req':
        // Show the pin
        pinSpan.textContent = msg.pin;

        // Switch to pin mode
        idleScreen.hidden = true;
        pinScreen.hidden = false;
        break;

    case 'offer':
        console.log('Got offer')
        // Pass on the offer to WebRTC
        await conn.setRemoteDescription(new RTCSessionDescription(msg.offer));

        // Create an answer
        answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        // Encode and send the answer
        await sock.send(JSON.stringify({
            type: 'answer',
            answer: answer
        }))
        break;

    case 'ice-candidate':
        console.log('Got ice candidate')
        // Add the ice candidate to the WebRTC connection
        await conn.addIceCandidate(msg.candidate);
        break;

    case 'auth-ok':

        break;

    case 'disconnect':
        // Reset the display
        reset();
        break;

    default:
        break;
    }
}

async function initRTC() {
    // Create the WebRTC connection
    conn = new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});
        
    // Handle new ice candidates
    conn.addEventListener('icecandidate', async (event) => {
        // If there is a new candidate, send it to the peer through websockets
        if (event.candidate) {
            await sock.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate
            }))
        }
    });

    // Handle connection and disconnection of peer
    conn.addEventListener('connectionstatechange', (event) => {
        switch (conn.connectionState) {
        case 'connected':
            // Switch to playback mode
            pinScreen.hidden = true;
            credits.hidden = true;
            playback.hidden = false;
            break;

        case 'disconnected':
            // Reset the display
            reset();
            break;

        default:
            break;
        }
    });

    // Send remote stream to the playback widget
    conn.addEventListener('track', (event) => {
        const [remoteStream] = event.streams;
        playback.srcObject = remoteStream;
    });
}

// Main function for the app
async function main() {
    // Connect to the server using WebSockets
    console.log('Connecting to websocket...')
    sock = new WebSocket(`ws://${location.host}/sig`);

    // Add handlers for the socket
    sock.addEventListener('message', (event) => { onMessage(event.data); })

    sock.addEventListener('open', async (event) => {
        console.log('Connected to websocket')
        // Tell the server that this is a screen
        await sock.send(JSON.stringify({
            type: 'screen',
            name: dispID
        }))

        // Initialize WebRTC
        await initRTC();
    });
}

// Run the main function
main();