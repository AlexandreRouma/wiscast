package main

// Packages
import "errors"
import "log"
import "net/http"
import "sync"
import "time"
import "github.com/gorilla/websocket"

// Display instance
type Display struct {
	// WebSocket used to communicate with the display
	sock *websocket.Conn;
	sockSendMtx sync.Mutex;

	// User mutex
	userMtx sync.Mutex;

	// User currently connected to the display
	user *User;

	// One-time-pass currently shown on the display
	otpMtx sync.Mutex;
	otp string;

	// Channel to pass the answer from the display coroutine to the user couroutine
	answerCh chan string;
}

// Helper function to flush channels
func chFlush(ch *chan string) {
	for {
		empty := false
		select {
		// If data is available, read it and try again
		case <-*ch:
			continue
		
		// If no data is available, stop reading
		default:
			empty = true
		}
		if empty { break }
	}
}

// Helper function to read from a channel with a timeout
func chReadTimeout(ch *chan string, timeoutMS int) (string, error) {
	select {
	// If data is available, return it with no error
	case data := <-*ch:
		return data, nil
	
	// If no data has been received and the timeout is reached, return an error
	case <-time.After(time.Millisecond * time.Duration(timeoutMS)):
		return "", errors.New("timeout")
	}
}

// List of all connected displays
var displaysLck sync.Mutex
var displays = map[string]*Display{}

// Get the display back to its idle state
func (this *Display) reset() {
	// Acquire the sending mutex
	this.sockSendMtx.Lock()

	// Send a reset command
	this.sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "reset",
	}))

	// Release the sending mutex
	this.sockSendMtx.Unlock()
}

// Switch the display to streaming mode
func (this *Display) stream() {
	// Acquire the sending mutex
	this.sockSendMtx.Lock()
	
	// Send a show-pin command
	this.sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "stream",
	}))

	// Release the sending mutex
	this.sockSendMtx.Unlock()
}

// Send a WebRTC offer to the display and get an answer
func (this *Display) webRTCOffer(offer string, timeoutMS int) (string, error) {
	// Flush the answer channel
	chFlush(&this.answerCh)

	// Acquire the sending mutex
	this.sockSendMtx.Lock()

	// Send the offer
	this.sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "webrtc-offer",
		arguments: map[string]interface{}{
			"offer": offer,
		},
	}))

	// Release the sending mutex
	this.sockSendMtx.Unlock()

	// TODO: Close the connection if the display failed to respond?

	// Receive the answer
	return chReadTimeout(&this.answerCh, CONF_TIMEOUT_MS)
}

// Send an ICE candiate to the display
func (this *Display) iceCandidate(candidate string) {
	// Acquire the sending mutex
	this.sockSendMtx.Lock()
	
	// Send the candidate
	sendMessage(this.sock, Message{
		mtype: "ice-candidate",
		arguments: map[string]interface{}{
			"candidate": candidate,
		},
	})

	// Release the sending mutex
	this.sockSendMtx.Unlock()
}

// Connection handler for displays
func displayHandler(sock *websocket.Conn, dispID string, otp string) {
	// Create the display object
	disp := Display{ sock: sock, otp: otp }

	// Acquire the sending mutex
	disp.sockSendMtx.Lock()

	// Acquire the display list
	displaysLck.Lock()
	
	// Check that a display with that ID doesn't already exist
	if displays[dispID] != nil {
		// Release the display list
		displaysLck.Unlock()

		// Send back an error
		sendErrorMessage(sock, http.StatusConflict)

		// Release the sending mutex
		disp.sockSendMtx.Unlock()
	}

	// Add the display to the list
	displays[dispID] = &disp

	// Release the display list
	displaysLck.Unlock()

	// Send back the config for the display to use
	sendMessage(sock, Message{
		mtype: "config",
		arguments: map[string]interface{}{
			"timeout": CONF_TIMEOUT_MS,
			"iceServers": CONF_ICE_SERVERS,
		},
	})

	// Release the sending mutex
	disp.sockSendMtx.Unlock()

	// Log the new display
	log.Println("New display: ID='" + dispID + "', OTP='" + otp + "'")

	// Message loop
	for {
		// Receive a message
		msg, err := recvMessage(sock, 0)

		// Give up on the connection if there was an error
		if (err != nil) { break }

		// Handle the message depending on its type
		switch msg.mtype {
		case "otp":
			// Check that the message contains an OTP
			otp, valid := msg.arguments["otp"].(string)
			if (!valid) { break }

			// Acquire the display's OTP
			disp.otpMtx.Lock()

			// Update the OTP
			disp.otp = otp

			// Release the display's OTP
			disp.otpMtx.Unlock()

		case "answer":
			// Check that the message contains an answer
			answer, valid := msg.arguments["answer"].(string)
			if (!valid) { break }

			// Send the answer through the display's answer channel
			disp.answerCh <- answer

		case "ice-candidate":
			// Check that the message contains an ice candidate
			candidate, valid := msg.arguments["candidate"].(string)
			if (!valid) { break; }

			// Acquire the user's display pointer
			disp.userMtx.Lock();

			// Check that a user is connected to a display
			if (disp.user == nil) {
				// Release the user's display pointer
				disp.userMtx.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusForbidden);
				continue;
			}

			// Send the ice candidtate to the display
			disp.user.iceCandidate(candidate);

			// Release the user's display pointer
			disp.userMtx.Unlock();

		default:
			// Give up
			break
		}
	}

	// TODO: Gracefull disconnect the connected user if there is one
}