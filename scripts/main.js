"use strict";

const X_VELOCITY = 0.2;
const Y_VELOCITY = 0.2;
const ROTATION_VELOCITY = 0.2;
const REMOTE_SPEAKER_VOLUME = 0.5;

const remoteVideo = document.getElementById('remoteVideo');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const ipInputAndroid = document.getElementById('ipAndroid');
const ipInputROS = document.getElementById('ipROS');

let peerConnection = null;
let android = null;
let ros = null;
let backend = null;

function initConnection() {
    try {
        initAndroidConnection();
        initROSConnection();
        initBackendConnection();
    } catch(exception) {
        disconnect();
        logMessage(exception);
    }
}

// ==== Connection to Android =====

function initAndroidConnection() {
    const port = "8080";
    const protocol = "wss://";
    const ip = ipInputAndroid.value;
    const wsUrl = `${protocol}${ip}:${port}`;

    // If Android ip is not provided, skip the setup for video call
    if (ip) {
        android = new WebSocket(wsUrl);

        android.onopen = () => {
            logMessage('Connected to Android server');
            setConnectedState(true);
            makeCall();
        };

        android.onmessage = event => {
            logMessage('Received message: ' + event.data);
            handleRTCMessage(event.data);
        };

        android.onclose = () => {
            logMessage('Disconnected from Android server');
            disconnect();
        };

        android.onerror = error => {
            logMessage('Android error: ');
            logMessage(error);
        };
    }
}

// ==== Connection to ROS =====

function initROSConnection() {
    const port = "9090";
    const protocol = "ws://";
    const ip = ipInputROS.value || "localhost";
    const wsUrl = `${protocol}${ip}:${port}`;
    
    ros = new ROSLIB.Ros({
        url : wsUrl
    });

    ros.on("connection", () => {
        logMessage('Connected to ROS server');
        setConnectedState(true);
        initMap();
        // initJoystick();
        showMapBlock();
    });

    ros.on("close", () => {
        logMessage('Disconnected from ROS server');
        disconnect();
    });

    ros.on("error", error => {
        logMessage('ROS error: ');
        logMessage(error);
    });
}

function logMessage(message) {
    console.log(message);
}

function disconnect() {
    closeWebsocket(android);
    closeWebsocket(ros);
    closeWebsocket(backend);
    closePeerConnection();
    hideMapBlock();
    setConnectedState(false);
}

function closeWebsocket(ws) {
    if (ws) {
        ws.close();
        ws = null;
    }
}

// ==== WebRTC & media setup for video calling ====

async function makeCall() {
    setupPeerConnection();
    await setupLocalMediaStream();
    setupSDP();
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection({'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]});

    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            android.send(JSON.stringify({'type': 'candidate', 'iceCandidate': event.candidate}));
        }
    });

    peerConnection.addEventListener('connectionstatechange', event => {
        if (peerConnection.connectionState === 'connected') {
            logMessage('Peer connected');
        }
        if (peerConnection.connectionState == 'disconnected') {
            logMessage('Peer closed');
            closePeerConnection();
        }
    });

    peerConnection.addEventListener('addstream', event => {
        logMessage('Remote stream added.');
        remoteVideo.srcObject = event.stream;
    })

    peerConnection.addEventListener('removestream', event => {
        logMessage('Remote stream removed. Event: ', event);
    })
}

async function setupLocalMediaStream() {
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
}

async function setupSDP() {
    try {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        android.send(JSON.stringify(offer));
    } catch (exception) {
        logMessage(exception);
    }
}

function handleRTCMessage(message) {
    try {
        const json = JSON.parse(message);
        if (json.type == "candidate" && peerConnection != null) {
            peerConnection.addIceCandidate(json).then(() => {
                logMessage('Added ICE candidate ' + json);
            }).catch((err) => {
                logMessage(err);
            });
        }
        if (json.type == "answer" && peerConnection != null) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(json)).then(() => {
                logMessage('Received SDP answer ' + json.sdp);
            }).catch((err) => {
                logMessage(err);
            });
        }
    } catch(exception) {
        logMessage(exception);
    }
}

function closePeerConnection() {
    if (peerConnection != null) {
        peerConnection.close();
        remoteVideo.srcObject = null;
        peerConnection = null;
    }
}

function setConnectedState(connected) {
    if (!connected) {
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
    } else {
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
    }
}

// TODO: replace with ASR code once done
const speechText = document.getElementById('speechText');

speechText.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleRemoteSpeech(speechText.value);
    }
    if (event.key === 'F1') {
        event.preventDefault();
        sendDialogueText();
    }
});