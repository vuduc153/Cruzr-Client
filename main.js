"use strict";

// Replace with the IP address of your Android device running the server
const X_VELOCITY = 0.2;
const Y_VELOCITY = 0.2;
const ROTATION_VELOCITY = 0.2;
const REMOTE_SPEAKER_VOLUME = 0.5;

const remoteVideo = document.getElementById('remoteVideo');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const ipInput = document.getElementById('ip');
const messagesDiv = document.getElementById('messages');

let peerConnection = null;
let ws = null;
let activeKeys = new Set();

// WebSocket Connection

function connectAndMakeCall() {
    const port = "8080";
    const protocol = "wss://";
    const ip = ipInput.value;
    const wsUrl = `${protocol}${ip}:${port}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
        logMessage('Connected to WebSocket server');
        makeCall();
    };

    ws.onmessage = function(event) {
        console.log('Received message: ' + event.data);
        try {
            const json = JSON.parse(event.data);
            if (json.type == "candidate" && peerConnection != null) {
                peerConnection.addIceCandidate(json).then(() => {
                    console.log('Added ICE candidate ' + json);
                }).catch((err) => {
                    console.log(err);
                });
            }
            if (json.type == "answer" && peerConnection != null) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(json)).then(() => {
                    console.log('Received SDP answer ' + json.sdp);
                }).catch((err) => {
                    console.log(err);
                });
            }
        } catch(exception) {
            console.log(exception);
        }
    };

    ws.onclose = function() {
        logMessage('Disconnected from WebSocket server');
    };

    ws.onerror = function(error) {
        logMessage('WebSocket error: ' + error);
    };
}

function logMessage(message) {
    console.log(message);
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}

function disconnect() {
    if (ws) ws.close();
    closeConnection();
}

// WebRTC & media setup

async function makeCall() {
    peerConnection = new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});

    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            ws.send(JSON.stringify({'type': 'candidate', 'iceCandidate': event.candidate}));
        }
    });

    peerConnection.addEventListener('connectionstatechange', event => {
        if (peerConnection.connectionState === 'connected') {
            console.log('Peer connected');
        }
        if (peerConnection.connectionState == 'disconnected') {
            console.log('Peer closed');
            closeConnection();
        }
    });

    peerConnection.addEventListener('addstream', event => {
        console.log('Remote stream added.');
        remoteVideo.srcObject = event.stream;
    })

    peerConnection.addEventListener('removestream', event => {
        console.log('Remote stream removed. Event: ', event);
    })


    const media = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {width: 1280, height: 720}
  });

    // Lower stream output volume since for some reason this cannot be done from Cruzr's end
    // const audioContext = new AudioContext();
    // const gainNode = audioContext.createGain();
    // const audioSource = audioContext.createMediaStreamSource(media);
    // const audioDestination = audioContext.createMediaStreamDestination();

    // audioSource.connect(gainNode);
    // gainNode.connect(audioDestination);
    // gainNode.gain.value = 0.5;

    peerConnection.addStream(media);
    setupSDP();

    changeButtonState();
}

async function setupSDP() {
    try {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify(offer));
    } catch (exception) {
        console.log(exception);
    }
}

function closeConnection() {
    if (peerConnection != null) {
        peerConnection.close();
        remoteVideo.srcObject = null;
        peerConnection = null;
    }

    changeButtonState();
}

function changeButtonState() {
    if (connectBtn.style.display === 'none') {
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
    } else {
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
    }
}

// Logic for robot control

remoteVideo.onkeydown = function(event) {
    event.preventDefault();
    if (event.repeat) return;
    activeKeys.add(event.key);
    if (activeKeys.size == 1 && event.key == 'space') {
        sendStopMoveCommand();
    }
    const directions = getDirections();
    sendMoveCommand(...directions);
}

remoteVideo.onkeyup = function(event) {
    event.preventDefault();
    if (event.repeat) return;
    activeKeys.delete(event.key);
    const directions = getDirections();
    if (activeKeys.size == 0) {
        sendStopMoveCommand();
    } else {
        sendMoveCommand(...directions);
    }
}

function sendMoveCommand(xDirection, yDirection, rotationDirection) {
    const msg = JSON.stringify({
        'type': 'move',
        'params': [X_VELOCITY * xDirection, Y_VELOCITY * yDirection, ROTATION_VELOCITY * rotationDirection]
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}

function sendStopMoveCommand() {
    const msg = JSON.stringify({
        'type': 'move',
        'params': []
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}


function sendPresetCommand(button) {
    const msg = JSON.stringify({
        'type': 'preset',
        'params': [button.id]
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}

function sendStopActionCommand() {
    const msg = JSON.stringify({
        'type': 'preset',
        'params': []
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}

function sendExpressionCommand(button) {
    const msg = JSON.stringify({
        'type': 'expression',
        'params': [button.id]
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}

function sendStopExpressionCommand() {
    const msg = JSON.stringify({
        'type': 'expression',
        'params': []
    });
    ws.send(msg);
    console.log('Sent message: ' + msg);
}

function getDirections() {
    let dir = [0, 0, 0];
    for (const item of activeKeys) {
        if (item == 'w') dir[0] = 1;
        if (item == 's') dir[0] = -1;
        if (item == 'a') dir[1] = 1;
        if (item == 'd') dir[1] = -1;
        if (item == 'q') dir[2] = 1;
        if (item == 'e') dir[2] = -1;
    }
    return dir;
}