// Streaming objects
let sock = null;
let stream = null;
let conn = null;

// GUI Objects
let connForm    = document.querySelector('#connForm');
let dispNameTb  = document.querySelector('#dispName');
let connBtn     = document.querySelector('#connect');
let pinValForm  = document.querySelector('#pinValForm');
let dispPINTb   = document.querySelector('#dispPIN');
let validateBtn = document.querySelector('#validate');
let streamForm  = document.querySelector('#streamForm');
let locPlayback = document.querySelector('#localPlayback');

// Make sure the connect button cannot be pressed if there is no display name
function onDispNameChange() {
    connBtn.disabled = !(dispNameTb.value.length > 0);
}
function onPINChange() {
    validateBtn.disabled = !(dispPINTb.value.length === 6);
}

// Handle enter key pressed
dispNameTb.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' && !connBtn.disabled) {
        connBtn.click();
    }
})
dispPINTb.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' && !validateBtn.disabled) {
        validateBtn.click();
    }
})

// WebSocket message handler
async function onMessage(data) {
    // Parse the message
    console.log(data)
    const msg = JSON.parse(data);

    // Process depending on the type
    switch (msg.type) {
    case 'disp-ok':
        // Switch to the PIN screen
        connForm.hidden = true;
        pinValForm.hidden = false;
        dispPINTb.focus();
        dispPINTb.select();
        break;

    case 'disp-error':
        // Show the error
        // TODO
        console.log('ERROR: ' + msg.error)
        break;

    case 'auth-ok':
        // Show the status update
        validateBtn.textContent = 'Starting the Stream...';
        await startStream();
        break;

    case 'answer':
        console.log('Got answer')
        // Pass on the offer to WebRTC
        await conn.setRemoteDescription(new RTCSessionDescription(msg.answer));
        break;

    case 'ice-candidate':
        console.log('Got ice candidate')
        // Add the ice candidate to the WebRTC connection
        await conn.addIceCandidate(msg.candidate);
        break;

    case 'disconnect':
        // Reload the page
        location.reload();
        break;

    default:
        console.dir(msg)
        break;
    }
}

async function startStream() {
    // Get the stream for the screen
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } });

    // Create the connection
    conn = new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});

    // Handle ice candidates
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
            // Switch to stream screen
            pinValForm.hidden = true;
            streamForm.hidden = false;
            locPlayback.srcObject = stream;

            console.log("Connected!")
            
            break;

        case 'disconnected':
            console.log("Disconnected.")
            // Reload the page to ensure the state is complete reset
            location.reload();
            break;

        default:
            break;
        }
    });

    // Start streaming the screen
    stream.getTracks().forEach(track => {
        conn.addTrack(track, stream);
    });

    // If the stream ends, reload the page
    stream.getVideoTracks()[0].addEventListener('ended', (event) => {
        location.reload();
    })

    // Create and send an offer
    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    await sock.send(JSON.stringify({
        type: 'offer',
        offer: offer
    }))
}

async function connect() {
    // Disable the connect button and show status
    dispNameTb.disabled = true;
    connBtn.disabled = true;
    connBtn.textContent = 'Connecting...';

    // Send a connect command to the server
    await sock.send(JSON.stringify({
        type: 'connect',
        dispID: dispNameTb.value
    }));
}

async function validatePIN() {
    // Disable the validate button and show status
    dispPINTb.disabled = true;
    validateBtn.disabled = true;
    validateBtn.textContent = 'Checking the PIN...';

    // Send the validate pin command to the server
    await sock.send(JSON.stringify({
        type: 'validate-pin',
        pin: dispPINTb.value
    }));
}

async function disconnect() {
    // Just reload the page
    location.reload();
}

// Connect to the server using WebSockets
console.log('Connecting to websocket...')
sock = new WebSocket(`ws://${location.host}/sig`);
sock.addEventListener('open', async (event) => {
    console.log('Connected to websocket')
});
sock.addEventListener('message', (event) => { onMessage(event.data); })