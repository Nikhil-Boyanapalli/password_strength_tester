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
  passwordFields.forEach(field => {
    field.addEventListener('focus', async () => {
      const domain = window.location.hostname;
      const isTrusted = await checkSiteTrust(domain);
      
      if (!isTrusted) {
        showSiteTrustPrompt(domain);
      }
    });
  });
}

// Start monitoring
monitorPasswordFields(); 