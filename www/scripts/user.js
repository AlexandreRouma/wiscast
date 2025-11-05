// User API class
class WisCastUserAPIClient {
    // Socket to the API endpoint
    #sock;

    // Endpoint URL
    #endpoint;

    // Called when a config message is received
    #onconfig = (config) => {};

    // Called when a success message is received
    #onsuccess = () => {};

    // Called when an error message is received
    #onerror = (err) => {}

    // Called when a WebRTC answer message is received
    #onwebrtcanswer = (answer) => {}

    /**
     * Handler called when an ICE candidate is received
     * @param {RTCIceCandidateInit} candidate The received ICE candidate.
    */
    onicecandidate = (candidate) => {}

    /**
     * Create a User API client instance.
     * @param {String} endpoint URL of the API endpoint.
    */
    constructor(endpoint) {
        // Save the endpoint
        this.#endpoint = endpoint;
    }

    /**
     * Connect to the API server.
     * @returns {Object} Configuration to use for the session.
     */
    async connect() {
        return new Promise(async (res) => {
            // Register the handler for config messages
            this.#onconfig = (config) => { res(config); };

            // Connect to the WebSocket endpoint
            console.log('Connecting to the API...');
            this.#sock = new WebSocket(this.#endpoint);

            // Handle connection
            this.#sock.addEventListener('open', async (event) => { await this.#connectHandler(event); });

            // Handle messages
            this.#sock.addEventListener('message', async (event) => { await this.#messageHandler(event); });

            // Handle disconnection
            this.#sock.addEventListener('close', async (event) => { await this.#disconnectHandler(event); });
        });
    }

    /**
     * Connect to a display.
     * @param {String} dispID ID of the display. 
     * @param {String} OTP One-Time-Pass currently shown on the display.
     */
    async connectDisplay(dispID, OTP) {
        return new Promise(async (res) => {
            // Register the success and error handlers
            this.#onsuccess = () => { res(null); }
            this.#onerror = (err) => { res(err); }

            // Send the connection command
            await this.#sock.send(JSON.stringify({
                type: 'connect',
                dispID: dispID,
                otp: OTP
            }))
        });
    }

    /**
     * Send a WebRTC offer to the display. Must already be connected.
     * @param {RTCSessionDescriptionInit} offer Offer to send to the display.
     * @returns {RTCSessionDescriptionInit} The answer from the display or null on error.
     */
    async sendWebRTCOffer(offer) {
        return new Promise(async (res) => {
            // Register the answer and error handlers
            this.#onwebrtcanswer = (answer) => { res(answer); }
            this.#onerror = (err) => { res(err); }

            // Send the connection command
            await this.#sock.send(JSON.stringify({
                type: 'webrtc-offer',
                offer: offer
            }))
        });
    }

    /**
     * Send an ICE candidate to the display. Must already be connected.
     * @param {RTCIceCandidateInit} candidate ICE candidate to send to the display.
     */
    async sendICECandidate(candidate) {
        // Send the connection command
        await this.#sock.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: candidate
        }))
    }

    // Disconnect from the display
    async disconnectDisplay() {
        // TODO
    }

    async #connectHandler(event) {
        console.log('Connected!');

        // Send initialization message
        await this.#sock.send(JSON.stringify({
            type: 'init',
            clientType: 'user'
        }));

        // Send a heart-beat message every 30 seconds
        setInterval(async () => {
            await this.#sock.send(JSON.stringify({
                type: 'hb',
            }))
        }, 30000);
    }

    async #messageHandler(event) {
        // Parse the message
        const msg = JSON.parse(event.data);

        // Handle the message depending on its type
        switch (msg.type) {
        case 'success':
            // Call the success handler
            this.#onsuccess();
            break;

        case 'error':
            // Call the success handler
            console.log('Error:', msg.code)
            this.#onerror(msg.code);
            break;

        case 'config':
            // Call the config handler
            this.#onconfig(msg.config);
            break;

        case 'webrtc-answer':
            // Call the answer handler
            this.#onwebrtcanswer(msg.answer);
            break;

        case 'ice-candidate':
            // Call the answer handler
            this.onicecandidate(msg.candidate);
            break;
        }
    }

    async #disconnectHandler(event) {
        console.log('Disconnected :/');
    }
}

async function main() {
    // Get GUI objects from their IDs
    const connForm      = document.getElementById('connForm');
    const dispIDTb      = document.getElementById('dispIDTb');
    const dispOTPTb     = document.getElementById('dispOTPTb');
    const connBtn       = document.getElementById('connectBtn');
    const streamForm    = document.getElementById('streamForm');
    const locPlayback   = document.getElementById('localPlayback');
    const disconnectBtn = document.getElementById('disconnectBtn');

    // Create the API client
    const client = new WisCastUserAPIClient(`wss://${location.host}/sig`);

    // Global state
    let config = null;
    let conn = null;
    let stream = null;

    // Register a checking function for the contents of the display ID and OTP
    check = (event) => {
        // Only enable the connect button if the content of both is valid
        console.log('change')
        connBtn.disabled = (dispIDTb.value === '' || dispOTPTb.value.length !== 6 || !config);
    }
    dispIDTb.oninput = check;
    dispOTPTb.oninput = check;

    // Register a handler for when enter is pressed in the display name textbox
    dispIDTb.onkeyup = (event) => {
        // Check that the key was enter
        if (event.key != 'Enter') { return; }

        // Check that the name textbox is not empty
        if (dispIDTb.value === '') { return; }
        
        // Select the OTP textbox
        dispOTPTb.focus();
        dispOTPTb.select();
    };

    // Register a handler for when enter is pressed in the display OTP textbox
    dispOTPTb.onkeyup = (event) => {
        // Check that the key was enter
        if (event.key != 'Enter') { return; }

        // Check that the connect button is enabled
        if (connBtn.disabled) { return; }
        
        // Press the connect button
        connBtn.click();
    };

    // Connect to the server
    config = await client.connect();

    // Register a handler for clicking the connection button
    connBtn.onclick = async (event) => {
        // Disable the text boxes and the button
        dispIDTb.disabled = true;
        dispOTPTb.disabled = true;
        connBtn.disabled = true;

        // Change the status
        connBtn.textContent = 'Getting permissions...';

        // Get the stream for the screen
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } });

        // Disable the text boxes and the button
        dispIDTb.disabled = true;
        dispOTPTb.disabled = true;
        connBtn.disabled = true;

        // Change the status
        connBtn.textContent = 'Authenticating...';

        // Attempt to connect to the display
        const err = await client.connectDisplay(dispIDTb.value, dispOTPTb.value);
        if (err) {
            // TODO: Show the error
            console.log(err)

            // Reset the GUI
            dispIDTb.value = '';
            dispOTPTb.value = '';
            connBtn.textContent = 'Connect';
            dispIDTb.disabled = false;
            dispOTPTb.disabled = false;
            return;
        }

        // Change the status
        connBtn.textContent = 'Connecting...';

        // Create the connection
        conn = new RTCPeerConnection({'iceServers': [{'urls': config.iceServers[0]}]});

        // Handle ice candidates from user to display
        conn.onicecandidate = async (event) => {
            // If there is a new candidate, send it to the peer through websockets
            if (event.candidate) { await client.sendICECandidate(event.candidate); }
        };

        // Handle ice candidates from display to user
        client.onicecandidate = (candidate) => {
            conn.addIceCandidate(candidate);
        }

        // Handle connection and disconnection of peer
        conn.onconnectionstatechange = (event) => {
            switch (conn.connectionState) {
            case 'connected':
                // Switch to stream screen
                connForm.hidden = true;
                streamForm.hidden = false;
                locPlayback.srcObject = stream;
                console.log("Streaming!")
                break;

            case 'disconnected':
                console.log("Stream ended.")
                // Reload the page to ensure the state is complete reset
                location.reload();
                break;

            default:
                break;
            }
        };

        // Start streaming the screen
        stream.getTracks().forEach(track => {
            conn.addTrack(track, stream);
        });

        // If the stream ends, reload the page
        stream.getVideoTracks()[0].onended = (event) => {
            location.reload();
        };

        // Create and send an offer
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        await conn.setRemoteDescription(await client.sendWebRTCOffer(offer));
    };

    // Register the disconnect button click event
    disconnectBtn.onclick = (event) => {
        // Just reload the page
        location.reload();
    };

    // Do a check to potentially enable the connection button
    check(null);
}

// Run the main function
main();