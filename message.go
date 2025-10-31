package main

import "github.com/gorilla/websocket"
//import "encoding/json"

// Backend message object
type Message struct {
	// Type of message
	mtype string

	// Arguments of the message
	arguments map[string]interface{}
}

// Get the display back to its idle state
func encodeMessage(msg Message) []byte {
	// TODO
	return nil
}

// Get the display back to its idle state
func decodeMessage(data []byte) Message {
	// TODO
	return Message{}
}

// Encode a message and send it over a WebSocket
func sendMessage(sock *websocket.Conn, msg Message) {
	// Encode and send the message
	sock.WriteMessage(websocket.TextMessage, encodeMessage(msg))
}

// Receive a message from a WebSocket and decode it
func recvMessage(sock *websocket.Conn, timeoutMS int) Message {
	// TODO
	return Message{}
}

// Encode an error message and send it over a WebSocket
func sendErrorMessage(sock *websocket.Conn, err string) {
	// Send the error message
	sock.WriteMessage(websocket.TextMessage, encodeMessage(Message{
		mtype: "error",
		arguments: map[string]interface{}{
			"error": err,
		},
	}))
}