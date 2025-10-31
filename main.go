package main

// Packages
import "log"
import "net/http"
// import "os"

func main() {
	// Load the configuration from environment variables
	// TODO

    // Create a handler for the static website
	static := http.FileServer(http.Dir("./www"))
	http.Handle("/", static)

	// Create a handler for the signaling backend
	// http.HandleFunc("/sig", wsHandler)

	// Run the server
	err := http.ListenAndServe(":3000", nil)
	if( err != nil) { log.Fatal(err) }
}