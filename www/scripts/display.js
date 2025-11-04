// Streaming objects
let sock = null;
let conn = null;

// GUI Objects
let idleScreen  = document.querySelector('#idleScreen');
let dispIDSpan  = document.querySelector('#dispID');
let pinScreen   = document.querySelector('#pinScreen');
let pinSpan     = document.querySelector('#pin');
let playback    = document.querySelector('#playback');
let credits     = document.querySelector('#credits');

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
        clientType: 'display',
        dispID: 'TEST',
        otp: '123456'
    }));
});

sock.addEventListener('message', (event) => {
    console.log(event.data)
});

sock.addEventListener('close', (event) => {
    console.log('Disconnected from websocket')
});