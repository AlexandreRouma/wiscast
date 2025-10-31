# WisCast: Screen Casting Made Easy

No cables, no software to install, just cast your screen using any modern web browser.

TODO: Show illustration

WisCast uses WebRTC to cast your screen directly to any device running a WebRTC-capable web browser.

Since WebRTC allows for direct user-to-screen video streaming, the latency is as low as it gets for wireless screen casting.

# Usage

Connect to the instance that the display you wish to cast to is configured to use. The URL will be shown on the display.

TODO: Show a screenshot

Next, enter the display's ID and the currently displayed one-time

# Install the server (Docker)

The simplest way to install WisCast is using docker, simply use the `wiscast` image as shown below.

```
docker run --name "My (name) Instance" -p8080:80 (name)
```

Next, move to the section about [configuring an HTTPs proxy]()

# Install the server (From source)

TODO

# Configure an HTTPs proxy

WebRTC, the video streaming technology use in this software, requires HTTPs for security reasons.
As such, you next needs to configure an HTTPs proxy to forward connections to the server instance.

# Statement on AI use

No AI was ever used at any point to develop this software.

This is entirely written by a human.