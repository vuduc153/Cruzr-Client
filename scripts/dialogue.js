"use strict";

const terminatingCharacters = new Set(['?', '.', '!']);

let localState = {
    label: "A",
    buffer: "",
    silence: false
};

let remoteState = {
    label: "B",
    buffer: "",
    silence: false
};

let dialogueHistory = "";
let currentDialogue = "";

// TODO: replace with ASR code once done
const speechText = document.getElementById('speechText');

speechText.addEventListener('keydown', function(event) {
    if (event.key === 'F1') {
        event.preventDefault();
        // sendDialogueText(); // TODO
        console.log(currentDialogue);
    }
});

function updateTranscriptionState(state, otherState, payload) {
    const obj = JSON.parse(payload);

    state.buffer += obj.transcript;

    if (terminatingCharacters.has(state.buffer.trim().at(-1))) {
        currentDialogue += `${state.label}: ${state.buffer}\n`;
        state.buffer = '';
    }

    // currently not receiving speech transcript from both sources
    if (!state.silence && otherState.silence && obj.silence) {
        // handle pending buffers
        handlePendingBuffers();

        // TODO
        console.log("prompt LLM");
        console.log(currentDialogue);
    }
    state.silence = obj.silence;
}

function handlePendingBuffers() {
    handlePendingBuffer(localState);
    handlePendingBuffer(remoteState);
}

function handlePendingBuffer(state) {
    if (state.buffer) {
        currentDialogue += `${state.label}: ${state.buffer}\n`;
        state.buffer = '';
    }
}

function sendDialogueText() {

    currentDialogue = `Location ${currentCoordinate}\n` + currentDialogue;

    const message = {
        'past': dialogueHistory,
        'current': currentDialogue
    }

    dialogueHistory += currentDialogue;
    currentDialogue = '';

    const server = 'http://localhost:43001';
    const endpoint = server + '/parse';

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Only perform navigation if the intended actor of the movement is the robot aka `A``
      const goals = data.movements.filter(item => item.actor == 'A');
      showNavPopup(goals[0]); // TODO: plan a sequence of navigation actions
    })
    .catch(error => {
      console.error('Error:', error);
    });
}