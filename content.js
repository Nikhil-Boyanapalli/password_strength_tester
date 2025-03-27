// Function to check if a site is trusted
async function checkSiteTrust(domain) {
  try {
    const result = await chrome.storage.local.get('trustedSites');
    return result.trustedSites && result.trustedSites[domain] !== undefined;
  } catch (error) {
    console.error('Error checking site trust:', error);
    return false;
  }
}

// Function to save trusted site
async function saveTrustedSite(domain) {
  try {
    const result = await chrome.storage.local.get('trustedSites');
    const trustedSites = result.trustedSites || {};
    trustedSites[domain] = {
      dateAdded: Date.now()
    };
    await chrome.storage.local.set({ trustedSites });
    console.log('Site saved as trusted:', domain);
  } catch (error) {
    console.error('Error saving trusted site:', error);
  }
}

// Function to show site trust prompt
function showSiteTrustPrompt(domain) {
  const prompt = document.createElement('div');
  prompt.className = 'owasp-trust-prompt';
  prompt.innerHTML = `
    <div class="owasp-trust-content">
      <h3>Site Security Check</h3>
      <p>You're about to enter a password on ${domain}.</p>
      <div class="owasp-trust-actions">
        <button class="owasp-trust-check">Continue</button>
        <label>
          <input type="checkbox" class="owasp-trust-remember"> Don't ask again for this site
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(prompt);

  // Handle button clicks
  prompt.querySelector('.owasp-trust-check').addEventListener('click', async () => {
    const remember = prompt.querySelector('.owasp-trust-remember').checked;
    if (remember) {
      await saveTrustedSite(domain);
    }
    prompt.remove();
  });
}

// Monitor password fields
function monitorPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  let popupTriggered = false;

  passwordFields.forEach(field => {
    field.addEventListener('focus', async () => {
      if (popupTriggered) return; // Prevent multiple triggers
      
      const domain = window.location.hostname;
      const isTrusted = await checkSiteTrust(domain);
      
      if (!isTrusted) {
        showSiteTrustPrompt(domain);
      }
    });

    // Add click handler for the test password button
    field.addEventListener('click', (e) => {
      if (popupTriggered) return; // Prevent multiple triggers
      
      const testButton = e.target.closest('.owasp-test-button');
      if (testButton) {
        popupTriggered = true;
        const password = field.value;
        if (password) {
          chrome.runtime.sendMessage({
            action: 'openPasswordTester',
            password: password
          });
        }
      }
    });
  });
}

// Start monitoring
monitorPasswordFields();

// Listen for password input changes
document.addEventListener('input', function(e) {
  if (e.target.type === 'password') {
    handlePasswordInput(e.target);
  }
});

// Function to handle password input
async function handlePasswordInput(input) {
  // Check if site is already trusted
  const isTrusted = await checkTrustedSite(window.location.href);
  if (isTrusted) {
    return;
  }

  // Create security check dialog
  const dialog = document.createElement('div');
  dialog.className = 'security-check-dialog';
  dialog.innerHTML = `
    <div class="security-check-content">
      <h2>Site Security Check</h2>
      <p>You're about to enter a password on ${window.location.hostname}.</p>
      <button id="continueBtn">Continue</button>
      <div class="trust-option">
        <input type="checkbox" id="trustSite">
        <label for="trustSite">Don't ask again for this site</label>
      </div>
    </div>
  `;

  // Add dialog styles
  const styles = document.createElement('style');
  styles.textContent = `
    .security-check-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 999999;
      color: #e0e0e0;
    }
    .security-check-content {
      text-align: center;
    }
    .security-check-content h2 {
      margin-top: 0;
      color: #2196f3;
    }
    .security-check-content button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 0;
    }
    .security-check-content button:hover {
      background: #1976d2;
    }
    .trust-option {
      margin-top: 10px;
    }
    .trust-option label {
      margin-left: 8px;
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(dialog);

  // Handle continue button click
  const continueBtn = dialog.querySelector('#continueBtn');
  const trustCheckbox = dialog.querySelector('#trustSite');

  continueBtn.addEventListener('click', async () => {
    if (trustCheckbox.checked) {
      // Send message to add site to trusted sites
      await chrome.runtime.sendMessage({
        action: 'trustSite',
        url: window.location.href
      });
    }
    dialog.remove();
    // Send password to extension for testing
    chrome.runtime.sendMessage({
      action: 'openPasswordTester',
      password: input.value
    });
  });
}

// Function to check if site is trusted
async function checkTrustedSite(url) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkTrustedSite',
      url: url
    });
    return response.trusted;
  } catch (error) {
    console.error('Error checking trusted site:', error);
    return false;
  }
} 