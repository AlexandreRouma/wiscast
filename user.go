package main

// Packages
//import "log"
import "github.com/gorilla/websocket"
//import "encoding/json"
import "sync"

// General client instance
type User struct {
	// WebSocket used to communicate with the user
	sock *websocket.Conn

	// Display mutex
	displayMtx sync.Mutex

	// Display that the user is connecting to
	display *Display
}

// TODO: Check type

// Connection handler for users
func userHandler(sock *websocket.Conn) {
	// Initialize the user instance
	user := User{ sock: sock, display: nil }

	// Send back the config for the user to use
	sendMessage(sock, Message{
		mtype: "config",
		arguments: map[string]interface{}{
			"timeout": CONF_TIMEOUT_MS,
			"iceServers": CONF_ICE_SERVERS,
		},
	})

	// Message loop
	for {
		// Receive a message
		msg := recvMessage(sock, 0)

		// TODO: exit on error

		// Handle the message depending on its type
		switch msg.mtype {
		case "connect":
			// Check that a display ID was provided
			if msg.arguments["dispID"] == nil {
				sendErrorMessage(sock, "Missing display ID")
				continue;
			}

			// Check that an OTP was provided
			if msg.arguments["otp"] == nil {
				sendErrorMessage(sock, "Missing OTP")
				continue;
			}

			// Acquire the display ID list
			displaysLck.Lock()

			// Check that the display ID exists
			dispID := msg.arguments["dispID"].(string)
			if displays[dispID] == nil {
				// Release the display list
				displaysLck.Unlock()

				// Send back an error
				sendErrorMessage(sock, "Unknown display")
				continue;
			}

			// Check the OTP
			otp := msg.arguments["otp"].(string)
			if otp == "" || otp != displays[dispID].otp {
				// Release the display list
				displaysLck.Unlock()

				// Send back an error
				sendErrorMessage(sock, "Invalid OTP")
				continue;
			}

			// TODO: Check types

			// Acquire the user's display pointer
			user.displayMtx.Lock()

			// Register the user and display to each other
			user.display = displays[dispID]
			user.display.user = &user

			// Put the display into streaming mode
			user.display.stream()

			// TODO: Check for error
		
			// Release the user's display pointer
			user.displayMtx.Lock()

			// Release the display list
			displaysLck.Unlock()

			// Notify the user of the successful connection
			sendMessage(sock, Message{
				mtype: "success",
			})

		case "webrtc-offer":
			// Check that the message contains an offer
			if msg.arguments["offer"] == nil {
				// Send back an error
				sendErrorMessage(sock, "No offer given")
				continue;
			}

			// TODO: Check type

			// Acquire the user's display pointer
			user.displayMtx.Lock()

			// Check that the user is connected to a display
			if user.display == nil {
				// Release the user's display pointer
				user.displayMtx.Unlock()

				// Send back an error
				sendErrorMessage(sock, "Not connected")
				continue;
			}

			// Send the offer to the display and get the response
			answer := user.display.webRTCOffer(msg.arguments["offer"].(string), CONF_TIMEOUT_MS)

			// TODO: Check for error

			// Release the user's display pointer
			user.displayMtx.Unlock()

			// Send back the response
			sendMessage(sock, Message{
				mtype: "webrtc-answer",
				arguments: map[string]interface{}{
					"answer": answer,
				},
			})

		case "ice-candidate":
			// Check that the message contains an ice candidate
			if msg.arguments["candidate"] == nil {
				// Send back an error
				sendErrorMessage(sock, "No offer given")
				continue;
			}

			// TODO: Check type

			// Acquire the user's display pointer
			user.displayMtx.Lock()

			// Check that the user is connected to a display
			if user.display == nil {
				// Release the user's display pointer
				user.displayMtx.Unlock()

				// Send back an error
				sendErrorMessage(sock, "Not connected")
				continue;
			}

			// Send the ice candidtate to the display
			user.display.iceCandidate(msg.arguments["candidate"].(string))

			// Release the user's display pointer
			user.displayMtx.Unlock()

		default:
			// Send back an error
			sendErrorMessage(sock, "Invalid message type")
		}
	}

	// If the user was connected to a display, disconnect it
}