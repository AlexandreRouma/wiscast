package main

// Packages
import "log"
import "sync"
import "net/http"
import "github.com/gorilla/websocket"

// General client instance
type User struct {
	// WebSocket used to communicate with the user
	sock *websocket.Conn;
	sockSendMtx sync.Mutex;

	// Display mutex
	displayMtx sync.Mutex;

	// Display that the user is connecting to
	display *Display;
}

// Send an ICE candiate to the user
func (this *User) iceCandidate(candidate string) {
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

// Connection handler for users
func userHandler(sock *websocket.Conn) {
	// Initialize the user instance
	user := User{ sock: sock, display: nil };

	// Send back the config for the user to use
	sendMessage(sock, Message{
		mtype: "config",
		arguments: map[string]interface{}{
			"timeout": CONF_TIMEOUT_MS,
			"iceServers": CONF_ICE_SERVERS,
		},
	});

	// Message loop
	for {
		// Receive a message
		msg, err := recvMessage(sock, 0);

		// Give up on the connection if there was an error
		if (err != nil) { break; }

		// Handle the message depending on its type
		switch msg.mtype {
		case "connect":
			// Check that a display ID was provided
			dispID, valid := msg.arguments["dispID"].(string)
			if (!valid) { break; }

			// Check that an OTP was provided
			otp, valid := msg.arguments["otp"].(string)
			if (!valid) { break; }

			// Acquire the display ID list
			displaysLck.Lock();

			// Check that the display ID exists
			if (displays[dispID] == nil) {
				// Release the display list
				displaysLck.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusNotFound);
				continue;
			}

			// Acquire the displays OTP
			displays[dispID].otpMtx.Lock();

			// Check the OTP
			if (otp == "" || otp != displays[dispID].otp) {
				// Release the display's OTP
				displays[dispID].otpMtx.Unlock();

				// Release the display list
				displaysLck.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusUnauthorized);
				continue;
			}

			// Release the display's OTP
			displays[dispID].otpMtx.Unlock();

			// Acquire the user's display pointer
			user.displayMtx.Lock();

			// Register the user and display to each other
			user.display = displays[dispID];
			user.display.user = &user;

			// Put the display into streaming mode
			user.display.stream();

			// TODO: Check for error
		
			// Release the user's display pointer
			user.displayMtx.Lock();

			// Release the display list
			displaysLck.Unlock();

			// Log the connection
			log.Println("User successfully connected to display: ID='", dispID, "'");

			// Notify the user of the successful connection
			sendMessage(sock, Message{
				mtype: "success",
			});

		case "webrtc-offer":
			// Check that the message contains an offer
			offer, valid := msg.arguments["offer"].(string)
			if (!valid) { break; }

			// Acquire the user's display pointer
			user.displayMtx.Lock();

			// Check that the user is connected to a display
			if (user.display == nil) {
				// Release the user's display pointer
				user.displayMtx.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusForbidden);
				continue;
			}

			// Send the offer to the display and get the response
			answer, err := user.display.webRTCOffer(offer, CONF_TIMEOUT_MS);
			if (err != nil) {
				// Release the user's display pointer
				user.displayMtx.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusBadGateway);
				continue;
			}

			// Release the user's display pointer
			user.displayMtx.Unlock();

			// Send back the response
			sendMessage(sock, Message{
				mtype: "webrtc-answer",
				arguments: map[string]interface{}{
					"answer": answer,
				},
			});

		case "ice-candidate":
			// Check that the message contains an ice candidate
			candidate, valid := msg.arguments["candidate"].(string)
			if (!valid) { break; }

			// Acquire the user's display pointer
			user.displayMtx.Lock();

			// Check that the user is connected to a display
			if (user.display == nil) {
				// Release the user's display pointer
				user.displayMtx.Unlock();

				// Send back an error
				sendErrorMessage(sock, http.StatusForbidden);
				continue;
			}

			// Send the ice candidtate to the display
			user.display.iceCandidate(candidate);

			// Release the user's display pointer
			user.displayMtx.Unlock();

		default:
			// Give up
			break;
		}
	}

	// TODO: Gracefull disconnect the connected display if there is one
}