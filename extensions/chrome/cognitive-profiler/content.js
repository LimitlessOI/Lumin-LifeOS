```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "trackUserBehavior") {
        const userData = gatherUserData();
        sendResponse({ data: userData });
    }
});

function gatherUserData() {
    // Logic to gather user interactions on the webpage
    return {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        actions: [] // Capture specific user actions
    };
}
```