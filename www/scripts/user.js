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

// Connect to the server using WebSockets
console.log('Connecting to websocket...')
sock = new WebSocket(`ws://${location.host}/sig`);
sock.addEventListener('open', async (event) => {
    console.log('Connected to websocket')

    // // DEBUGGING ONLY
    // await sock.send(JSON.stringify({
    //     type: 'init',
    //     pin: dispPINTb.value
    // }))

    await sock.send(JSON.stringify({
        type: 'init',
        clientType: 'user'
    }));
});

sock.addEventListener('message', (event) => {
    console.log(event.data)
});

sock.addEventListener('close', (event) => {
    console.log('Disconnected from websocket')
});