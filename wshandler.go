package main

// Packages
import "log"
import "net/http"
import "github.com/gorilla/websocket"

// Create the websocket upgrader
var upgrader = websocket.Upgrader{}

// Handler for the signalling backend
func wsHandler(respWriter http.ResponseWriter, req *http.Request) {
	// Upgrade the HTTP request to a WebSocket session
	sock, err := upgrader.Upgrade(respWriter, req, nil)
	if (err != nil) {
		log.Print(err)
		return
	}

	// Ensure that when this handler exits, the WebSocket closes
	defer sock.Close()

	// Receive the init message
	msg := recvMessage(sock, 5000)

	// If it's not an init message, give up
	if msg.mtype != "init" { return }

	// Handle the client depending on its type
	switch msg.arguments["clientType"] {
	case "user":
		// Handle as a user
		userHandler(sock)

	case "display":
		// Check that the display has provided its ID
		if msg.arguments["dispID"] == nil { return }
		
		// Handle as a display
		displayHandler(sock, msg.arguments["dispID"].(string))
	}
}