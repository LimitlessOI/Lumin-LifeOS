/**
 * SYNOPSIS: LifeOS overlay UI — Lifeos Ambient Listener.
 */
(function() {
  // Define the public API
  window.LifeOSAmbientListener = {
    isListening: false
  };

  // Function to initialize the ambient listener
  function initializeAmbientListener() {
    const micButton = document.querySelector('#lumin-mic-btn');
    const chatInput = document.querySelector('#lumin-input');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    let finalTranscript = '';
    let interimTranscript = '';
    let lastRecognitionTime = Date.now();

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
      interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          lastRecognitionTime = Date.now();
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      chatInput.value = finalTranscript;
      sendInterimTranscript(interimTranscript);
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error detected: ' + event.error);
      stopListening();
    };

    function startListening() {
      recognition.start();
      window.LifeOSAmbientListener.isListening = true;
      micButton.style.setProperty('--listening-indicator', 'active');
    }

    function stopListening() {
      recognition.stop();
      window.LifeOSAmbientListener.isListening = false;
      micButton.style.setProperty('--listening-indicator', 'inactive');
    }

    function toggleListening() {
      if (window.LifeOSAmbientListener.isListening) {
        stopListening();
      } else {
        startListening();
      }
    }

    function sendInterimTranscript(transcript) {
      fetch('/api/v1/lifeos/ambient/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript: transcript })
      }).catch(() => {
        // Silently degrade if endpoint not available
      });
    }

    function checkForFinalSubmission() {
      if (window.LifeOSAmbientListener.isListening && Date.now() - lastRecognitionTime > 2000) {
        // Simulate enter key press to submit chat input
        const event = new KeyboardEvent('keydown', { keyCode: 13, which: 13 });
        chatInput.dispatchEvent(event);
        finalTranscript = '';
      }
    }

    // Create and append the microphone toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '🎤';
    toggleButton.setAttribute('id', 'ambient-mic-toggle');
    toggleButton.style.setProperty('--mic-button-style', '...');
    toggleButton.addEventListener('click', toggleListening);
    micButton.parentNode.insertBefore(toggleButton, micButton.nextSibling);

    // Periodically check if the recognition should trigger submission
    setInterval(checkForFinalSubmission, 1000);
  }

  // Initialize the ambient listener on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initializeAmbientListener);
})();
