package main

// Packages
import "github.com/gorilla/websocket"
import "sync"

// Display instance
type Display struct {
	// WebSocket used to communicate with the display
	sock *websocket.Conn

	// User currently connected to the display
	user *User

	// One-time-pass currently shown on the display
	otp string
}

// List of all connected displays
var displaysLck sync.Mutex
var displays map[string]*Display

// Get the display back to its idle state
func (this *Display) reset() {
	// Send a reset command
	this.sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "reset",
	}))
}

// Switch the display to streaming mode
func (this *Display) stream() {
	// Send a show-pin command
	this.sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "stream",
	}))
}

// Send a WebRTC offer to the display and get an answer
func (this *Display) webRTCOffer(offer string, timeoutMS int) string {
	// TODO
	return ""
}

// Send an ICE candiate to the display
func (this *Display) iceCandidate(candidate string) {
	// Send the candidate
	sendMessage(this.sock, Message{
		mtype: "ice-candidate",
		arguments: map[string]interface{}{
			"candidate": candidate,
		},
	})
}

// Connection handler for displays
func displayHandler(sock *websocket.Conn, dispID string) {
	
}