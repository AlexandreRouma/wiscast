package main

import "encoding/json"
import "errors"
import "time"
import "github.com/gorilla/websocket"

// Backend message object
type Message struct {
	// Type of message
	mtype string;

	// Arguments of the message
	arguments map[string]interface{};
}

// Get the display back to its idle state
func encodeMessage(msg Message) []byte {
	// Create the message map and set the message type
	msgJson := map[string]interface{}{};
	msgJson["type"] = msg.mtype;

	// Add all arguments
	for k, v := range msg.arguments {
		// Skip the type key
		if (k == "type") { continue };

		// Add the key/value to the argument map
		msgJson[k] = v;
	}

	// Serialize the message
	data, _ := json.Marshal(msgJson);

	// Return the data
	return data;
}

// Get the display back to its idle state
func decodeMessage(data []byte) (Message, error) {
	// Attempt to parse the message
	var msgJson map[string]interface{};
	err := json.Unmarshal(data, &msgJson);
	if (err != nil) { return Message{}, err; }

	// If no message type is given, return an error
	if msgJson["type"] == nil { return Message{}, errors.New("Invalid message"); }

	// If the message type is not a string, return an error
	mtype, valid := msgJson["type"].(string);
	if !valid { return Message{}, errors.New("Invalid message"); }

	// Create the message object
	msg := Message{ mtype: mtype, arguments: map[string]interface{}{} };

	// Extract the arguments
	for k, v := range msgJson {
		// Skip the type key
		if (k == "type") { continue; }

		// Add the key/value to the argument map
		msg.arguments[k] = v;
	}

	// Return the decoded message with no error
	return msg, nil;
}

// Encode a message and send it over a WebSocket
func sendMessage(sock *websocket.Conn, msg Message) {
	// Encode and send the message
	sock.WriteMessage(websocket.TextMessage, encodeMessage(msg));
}

// Receive a message from a WebSocket and decode it
func recvMessage(sock *websocket.Conn, timeoutMS int) (Message, error) {
	for {
		// Configure the timeout
		if timeoutMS > 0 {
			// Milliseconds given
			sock.SetReadDeadline(time.Now().Add(time.Millisecond * time.Duration(timeoutMS)))
		} else {
			// No timeout given
			sock.SetReadDeadline(time.Time{});
		}

		// Receive a WebSocket message
		mt, msgData, err := sock.ReadMessage();

		// If there was an error, give up and return it
		if (err != nil) { return Message{}, err; }

		// If the message is not a text message, continue waiting
		if (mt != websocket.TextMessage) { continue; }

		// Return the decoded message
		return decodeMessage(msgData);
	}
}

// Encode an error message and send it over a WebSocket
func sendErrorMessage(sock *websocket.Conn, code int) {
	// Send the error message
	sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "error",
		arguments: map[string]interface{}{
			"code": code,
		},
	}));
}