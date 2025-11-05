// Streaming objects
let sock = null;
let stream = null;
let conn = null;

// GUI Objects
let connForm    = document.getElementById('connForm');
let dispNameTb  = document.getElementById('dispName');
let connBtn     = document.getElementById('connect');
let pinValForm  = document.getElementById('pinValForm');
let dispPINTb   = document.getElementById('dispPIN');
let validateBtn = document.getElementById('validate');
let streamForm  = document.getElementById('streamForm');
let locPlayback = document.getElementById('localPlayback');

// User API class
class WisCastUserAPI {
    // Socket to the API endpoint
    #sock;

    // Endpoint URL
    #endpoint;

    constructor(endpoint) {
        // Save the endpoint
        this.endpoint = endpoint;
    }

    // Connect to the API
    async connect() {
        // Connect to the WebSocket endpoint
        console.log('Connecting to the API...')
        this.#sock = new WebSocket(endpoint);

        // Handle connection
        sock.addEventListener('open', this.#connectHandler);

        // Handle messages
        sock.addEventListener('message', this.#messageHandler);

        // Handle disconnection
        sock.addEventListener('close', this.#disconnectHandler);
    }

    // Connect to a display using its ID and OTP
    async connectDisplay(dispID, OTP) {

    }

    #connectHandler(event) {
        console.log('Connected!')
    }

    #messageHandler(event) {
        console.log(event.data)
    }

    #disconnectHandler(event) {
        console.log('Disconnected :/')
    }
}

async function main() {
    // Create the API connection
    const api = new WisCastUserAPI(`ws://${location.host}/sig`);

    // Connect to the server
    await api.connect();
}

// Run the main function
main();