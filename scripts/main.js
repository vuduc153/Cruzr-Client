"use strict";

// Replace with the IP address of your Android device running the server
const X_VELOCITY = 0.2;
const Y_VELOCITY = 0.2;
const ROTATION_VELOCITY = 0.2;
const REMOTE_SPEAKER_VOLUME = 0.5;
const MODE = {
    NAVIGATION: 0,
    LOCALIZATION: 1
}

const remoteVideo = document.getElementById('remoteVideo');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const ipInput = document.getElementById('ip');
const messagesDiv = document.getElementById('messages');
const xInput = document.getElementById('coordinateX');
const yInput = document.getElementById('coordinateY');
const thetaInput = document.getElementById('coordinateTheta');
const mapImg = document.getElementById('map');
const coordOutput = document.getElementById('coord-output');
const localizeBtn = document.getElementById('localizeBtn');
const navBtn = document.getElementById('navBtn');

let peerConnection = null;
let ws = null;
let mode = null;
let localizeCoord = null;
let navCoord = null;
let localizeMarker = null;
let navMarker = null;
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

localizeBtn.onclick = function() {
    if (mode !== null && mode == MODE.LOCALIZATION) {
        mode = null;
        localizeBtn.classList.remove('btn-active');
    } else {
        mode = MODE.LOCALIZATION;
        resetButtons();
        localizeBtn.classList.add('btn-active');
    }
}

navBtn.onclick = function() {
    if (mode !== null && mode == MODE.NAVIGATION) {
        mode = null;
        navBtn.classList.remove('btn-active');
    } else {
        mode = MODE.NAVIGATION;
        resetButtons();
        navBtn.classList.add('btn-active');
    }
}

map.onclick = function(event) {
    if (mode == null) return;
    
    const rect = map.getBoundingClientRect();
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = 100 - (y / rect.height) * 100; // map coordinate in ROS has its origin in the bottom left corner

    coordOutput.textContent = `X: ${xPercent.toFixed(2)}%, Y: ${yPercent.toFixed(2)}%`;


    if (mode == MODE.LOCALIZATION) {
        if (localizeMarker) {
            localizeMarker.remove();
        }
        localizeMarker = document.createElement("div");
        localizeMarker.classList.add("marker", "red-marker");
        localizeMarker.style.left = `calc(${xPercent}% - 5px)`;
        localizeMarker.style.bottom = `calc(${yPercent}% - 5px)`;
        document.getElementById("image-container").appendChild(localizeMarker);
        localizeCoord = { xPercent, yPercent };
        console.log(localizeCoord);
    } else {
        if (navMarker) {
            navMarker.remove();
        }
        navMarker = document.createElement("div");
        navMarker.classList.add("marker", "blue-marker");
        navMarker.style.left = `calc(${xPercent}% - 5px)`;
        navMarker.style.bottom = `calc(${yPercent}% - 5px)`;
        document.getElementById("image-container").appendChild(navMarker);
        navCoord = { xPercent, yPercent };
        console.log(navCoord);
    }
}

thetaInput.onkeydown = function(event) {
    if (event.key == 'Enter') {
        sendNavigationCommand();
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

function sendNavigationCommand() {
    const msg = JSON.stringify({
        'type': 'navigation',
        'params': [parseFloat(xInput.value), parseFloat(yInput.value), parseFloat(thetaInput.value)]
    })
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

function resetButtons() {
    localizeBtn.classList.remove("btn-active");
    navBtn.classList.remove("btn-active");
}