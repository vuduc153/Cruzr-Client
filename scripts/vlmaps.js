function initBackendConnection() {
	backend = new WebSocket(`ws://localhost:43007`);
    backend.binaryType = 'arraybuffer';

    backend.onopen = () => {
        console.log('Connected to backend server');
        sendTempInstruction();  // TODO: Delete this once ASR server is set up
    };

    backend.onclose = () => {
        console.log('Disconnected from backend server');
    };

    backend.onerror = error => {
        console.error('Backend server error:', error);
    };

    backend.onmessage = event => {
        console.log(event.data);
    };
}

function sendTempInstruction() {
	const tempInstruction = 'go to the sofa, turn right and move in between the table and the chair, and then move back and forth to the keyboard and the screen twice';
	if (backend && backend.readyState === WebSocket.OPEN) {
        backend.send(tempInstruction);
    }
}