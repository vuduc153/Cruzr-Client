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
        const goals = jsonObj.movements.map(item => item.target.coordinate);
        navigateGoalSequence(goals);
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