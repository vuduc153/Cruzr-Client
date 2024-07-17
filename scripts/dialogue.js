"use strict";

let dialogueHistory = "";
let currentDialogue = "";

function initBackendConnection() {
	backend = new WebSocket(`ws://localhost:43007`);
    backend.binaryType = 'arraybuffer';

    backend.onopen = () => {
        console.log('Connected to backend server');
    };

    backend.onclose = () => {
        console.log('Disconnected from backend server');
    };

    backend.onerror = error => {
        console.error('Backend server error:', error);
    };

    backend.onmessage = event => {
        const jsonObj = JSON.parse(event.data);
        // Only perform navigation if the intended actor of the movement is the robot aka `A``
        const goals = jsonObj.movements.filter(item => item.actor == 'A');
        showNavPopup(goals[0]);
    };
}

function sendDialogueText() {

    currentDialogue = `Location ${currentCoordinate}\n` + currentDialogue;

    const message = {
        'past': dialogueHistory,
        'current': currentDialogue
    }

    dialogueHistory += currentDialogue;
    currentDialogue = '';

    if (backend && backend.readyState === WebSocket.OPEN) {
        backend.send(JSON.stringify(message));
    }
}

function handleRemoteSpeech(text) {
	currentDialogue += `A: ${text}\n`;
}