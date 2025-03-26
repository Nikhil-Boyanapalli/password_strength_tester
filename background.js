// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    // Open the popup programmatically
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPasswordTester' && message.password) {
    // Store the password temporarily
    chrome.storage.local.set({
      pendingPasswordTest: {
        password: message.password,
        timestamp: Date.now()
      }
    }, () => {
      // Open the popup in a new window
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      });
    });
  }
}); 