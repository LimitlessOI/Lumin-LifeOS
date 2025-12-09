```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { action: "trackUserBehavior" }, (response) => {
            if (response && response.data) {
                sendToServer(response.data);
            }
        });
    }
});

function sendToServer(data) {
    fetch('https://robust-magic-lumin-sandbox.up.railway.app/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(error => console.error('Error sending data:', error));
}
```