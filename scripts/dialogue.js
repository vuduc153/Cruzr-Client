"use strict";

let dialogueHistory = "";
let currentDialogue = "";

// TODO: replace with ASR code once done
const speechText = document.getElementById('speechText');

speechText.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleRemoteSpeech(speechText.value);
        speechText.value = '';
    }
    if (event.key === 'F1') {
        event.preventDefault();
        sendDialogueText();
    }
});

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

function handleRemoteSpeech(text) {
	currentDialogue += `A: ${text}\n`;
}