// User API class
class WisCastDisplayAPIClient {
    // Socket to the API endpoint
    #sock;

    // Endpoint URL
    #endpoint;

    // Display ID
    #dispID;

    // Initial OTP
    #initOTP;

    // Called when a config message is received
    #onconfig = (config) => {};

    /**
     * Handler called when streaming should be started.
     */
    onstream = () => {};

    /**
     * Handler called when a WebRTC offer is received.
     * @param {RTCSessionDescriptionInit} offer The received WebRTC offer.
    */
    onwebrtcoffer = (offer) => { return null; };

    /**
     * Handler called when an ICE candidate is received
     * @param {RTCIceCandidateInit} candidate The received ICE candidate.
    */
    onicecandidate = (candidate) => {};

    /**
     * Handler called when the connection to the user should be reset.
     */
    onreset = () => {};

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
     * @param displayID ID of the display to give to the server.
     * @param initialOTP Initial OTP to give the server.
     * @returns {Object} Configuration to use for the session.
     */
    async connect(displayID, initialOTP) {
        // Save the parameters
        this.#dispID = displayID;
        this.#initOTP = initialOTP;

        // Do the rest asynchronously
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
     * Set a new OTP.
     * @param {String} otp New OTP.
     */
    async setOTP(otp) {
        // Send the connection command
        await this.#sock.send(JSON.stringify({
            type: 'otp',
            otp: otp
        }))
    }

    /**
     * Send a WebRTC answer to the user.
     * @param {RTCSessionDescriptionInit} answer ICE candidate to send to the display.
     */
    async sendWebRTCAnswer(answer) {
        // Send the connection command
        await this.#sock.send(JSON.stringify({
            type: 'webrtc-answer',
            answer: answer
        }))
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
            clientType: 'display',
            dispID: this.#dispID,
            otp: this.#initOTP
        }))
    }

    async #messageHandler(event) {
        // Parse the message
        const msg = JSON.parse(event.data);

        // Handle the message depending on its type
        switch (msg.type) {
        case 'config':
            console.log(msg)
            // Call the config handler
            this.#onconfig(msg.config);
            break;

        case 'stream':
            this.onstream();
            break;

        case 'webrtc-offer':
            // Call the offer handler to get the answer
            answer = await this.onwebrtcoffer(msg.offer);

            // Send the answer back to the server
            await this.#sock.send(JSON.stringify({
                type: 'webrtc-answer',
                answer: answer
            }))
            break;

        case 'ice-candidate':
            // Call the answer handler
            this.onicecandidate(msg.candidate);
            break;

        case 'reset':
            // Call the reset handler
            this.onreset();
            break;
        }
    }

    async #disconnectHandler(event) {
        console.log('Disconnected :/');
    }
}

async function initWebRTC(client, config) {
    // Create the WebRTC connection
    let conn = new RTCPeerConnection({'iceServers': [{'urls': config.iceServers[0]}]});
        
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

function genOTP() {
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return  otp;
}

async function main() {
    // Get or generate a display ID
    let params = new URLSearchParams(document.location.search);
    let dispID = params.get("dispID");
    if (dispID === null) {
        // Generate a random name (TODO)
        dispID = self.crypto.randomUUID().substring(0, 8).toUpperCase();
    }

    // Generate the initial OTP
    let initOTP = genOTP();

    // GUI Objects
    const idleScreen    = document.getElementById('idleScreen');
    const dispIDSpan    = document.getElementById('dispID');
    const otpSpan       = document.getElementById('otp');
    const playback      = document.getElementById('playback');
    const credits       = document.getElementById('credits');
    const lifespan      = document.getElementById('lifespan');

    // Set the ID and OTP spans
    dispIDSpan.textContent = dispID;
    otpSpan.textContent = initOTP;

    // Global state
    let conn = null;

    // Create the API client
    const client = new WisCastDisplayAPIClient(`wss://${location.host}/sig`);

    // Connect to the server
    const config = await client.connect(dispID, initOTP);

    // Define the progress bar animation
    const animKeyframes = [
        { width: '100%' },
        { width: '0%'   },
    ];
    const animTiming = {
        duration: config.otpLifespan,
        iterations: 1
    };

    // Start the animation
    lifespan.animate(animKeyframes, animTiming);

    // Generate a new OTP every given interval
    console.log(lifespan)
    setInterval(() => {
        // Generate a new OTP
        const otp = genOTP();

        // Send it to the server
        client.setOTP(otp);

        // Update it in the GUI
        otpSpan.textContent = otp;

        // Restart the animation
        lifespan.animate(animKeyframes, animTiming);
        
    }, config.otpLifespan);

    // Define the WebRTC initialization function
    const initWebRTC = () => {
        // Create the WebRTC connection
        conn = new RTCPeerConnection({'iceServers': [{'urls': config.iceServers[0]}]});

        // Handle offers
        client.onwebrtcoffer = async (offer) => {
            // Pass on the offer to WebRTC
            await conn.setRemoteDescription(new RTCSessionDescription(offer));

            // Create an answer
            answer = await conn.createAnswer();
            await conn.setLocalDescription(answer);

            // Return the answer to the server
            return answer;
        };

        // Handle ice candidate from user to display
        client.onicecandidate = async (candidate) => {
            // Add the ice candidate to the WebRTC connection
            await conn.addIceCandidate(candidate);
        };

        // Handle ice candidate from display to user
        conn.onicecandidate = async (event) => {
            // If there is a new candidate, send it to the peer through websockets
            if (event.candidate) { await client.sendICECandidate(event.candidate); }
        };

        // Handle connection and disconnection of peer
        conn.onconnectionstatechange = async (event) => {
            switch (conn.connectionState) {
            case 'connected':
                // Switch to playback mode
                credits.hidden = true;
                playback.hidden = false;
                break;

            case 'disconnected':
                // Completely reset the state
                playback.hidden = true;
                credits.hidden = false;
                playback.srcObject = null;
                conn = null;

                // Initialize WebRTC
                await initWebRTC();
                break;
            }
        };

        // Send remote stream to the playback widget
        conn.ontrack = (event) => {
            const [remoteStream] = event.streams;
            playback.srcObject = remoteStream;
        };
    }

    // Init WebRTC
    initWebRTC();

    // Register the reset handler
    client.onreset = async () => {
        // Completely reset the state
        playback.hidden = true;
        credits.hidden = false;
        playback.srcObject = null;
        conn = null;

        // Initialize WebRTC
        await initWebRTC();
    }
}

// Run the main function
main();



