/**
 * SYNOPSIS: LifeOS overlay UI — Lifeos Ambient Listener.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
[
  {
    "old_string": "function sendInterimTranscript(transcript) {\n      fetch('/api/v1/lifeos/ambient/capture', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json'\n        },\n        body: JSON.stringify({ transcript: transcript })\n      }).catch(() => {\n        // Silently degrade if endpoint not available\n      });\n    }",
    "new_string": "function updateChatInput(transcript) {\n      const chatInput = document.querySelector('#lumin-input');\n      if (chatInput) {\n        chatInput.value = transcript;\n      }\n    }\n\n    function sendInterimTranscript(transcript) {\n      fetch('/api/v1/lifeos/ambient/capture', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json'\n        },\n        body: JSON.stringify({ transcript: transcript })\n      }).catch(() => {\n        // Silently degrade if endpoint not available\n      });\n      updateChatInput(transcript);\n    }"
  },
  {
    "old_string": "chatInput.value = finalTranscript;",
    "new_string": "updateChatInput(finalTranscript);"
  },
  {
    "old_string": "        const event = new KeyboardEvent('keydown', { keyCode: 13, which: 13 });",
    "new_string": "        const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });"
  }
]
