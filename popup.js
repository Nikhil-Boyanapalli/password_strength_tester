document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  const passwordInput = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const strengthBar = document.getElementById('strengthBar');
  const resultDiv = document.getElementById('result');
  const requirementsDiv = document.getElementById('requirements');
  const crackTimeDiv = document.getElementById('crackTime');
  const testButton = document.getElementById('test-button');

  console.log('Elements found:', {
    passwordInput: !!passwordInput,
    usernameInput: !!usernameInput,
    testButton: !!testButton
  });

  // Update username in OWASP config when changed
  usernameInput.addEventListener('input', function() {
    owaspPasswordStrengthTest.config({
      username: this.value
    });
  });

  // Check for pending password test
  const { pendingPasswordTest } = await chrome.storage.local.get('pendingPasswordTest');
  if (pendingPasswordTest) {
    console.log('Found pending password test');
    passwordInput.value = pendingPasswordTest.password;
    testPassword(pendingPasswordTest.password);
    
    // Clear the pending test
    await chrome.storage.local.remove('pendingPasswordTest');
  }

  // Test password on input
  passwordInput.addEventListener('input', async function() {
    console.log('Password input changed');
    const password = this.value;
    await testPassword(password);
  });

  // Test button click handler
  testButton.addEventListener('click', async () => {
    console.log('Test button clicked');
    const password = passwordInput.value;
    if (password) {
      console.log('Testing password');
      await testPassword(password);
    } else {
      console.log('No password entered');
    }
  });

  // Function to test password
  async function testPassword(password) {
    console.log('Running password test');
    const result = checkPasswordStrength(password);
    console.log('Test result:', result);
    updateStrengthIndicator(result.strength);
    updateFeedback(result.feedback);
    
    // Update strength meter
    const strength = calculateStrength(result);
    strengthBar.style.width = strength + '%';
    strengthBar.style.backgroundColor = getStrengthColor(strength);

    // Show result message
    resultDiv.style.display = 'block';
    resultDiv.className = 'result ' + (result.strong ? 'success' : 'error');
    resultDiv.textContent = result.strong ? 'Password is strong!' : 'Password needs improvement';

    // Show requirements
    displayRequirements(result);

    // Show crack time
    crackTimeDiv.textContent = result.estimatedCrackTime;

    // Send result back to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'passwordTestResult',
        result: result
      });
    });

    // Store the result
    await chrome.storage.local.set({ 
      lastTestResult: {
        ...result,
        timestamp: Date.now()
      }
    });
  }

  function calculateStrength(result) {
    const totalTests = owaspPasswordStrengthTest.tests.required.length + owaspPasswordStrengthTest.tests.optional.length;
    const passedTests = result.passedTests.length;
    return Math.round((passedTests / totalTests) * 100);
  }

  function getStrengthColor(strength) {
    if (strength < 30) return '#d32f2f';
    if (strength < 60) return '#ff9800';
    if (strength < 80) return '#4caf50';
    return '#2e7d32';
  }

  function displayRequirements(result) {
    const requirements = [
      { text: 'Minimum 10 characters', met: !result.requiredTestErrors.includes('The password must be at least 10 characters long.') },
      { text: 'Maximum 128 characters', met: !result.requiredTestErrors.includes('The password must be fewer than 128 characters.') },
      { text: 'No repeated sequences', met: !result.requiredTestErrors.includes('The password may not contain sequences of three or more repeated characters.') },
      { text: 'Not in common passwords', met: !result.requiredTestErrors.includes('The password is too common and easy to guess.') },
      { text: 'Contains lowercase letter', met: !result.optionalTestErrors.includes('The password must contain at least one lowercase letter.') },
      { text: 'Contains uppercase letter', met: !result.optionalTestErrors.includes('The password must contain at least one uppercase letter.') },
      { text: 'Contains number', met: !result.optionalTestErrors.includes('The password must contain at least one number.') },
      { text: 'Contains special character', met: !result.optionalTestErrors.includes('The password must contain at least one special character.') }
    ];

    requirementsDiv.innerHTML = requirements.map(req => `
      <div class="requirement ${req.met ? 'met' : 'unmet'}">
        ${req.met ? '✓' : '✗'} ${req.text}
      </div>
    `).join('');
  }

  // Function to check password strength
  function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    // Character type checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeated characters');
    }

    // Check for common words
    const commonWords = ['password', '123456', 'qwerty', 'admin'];
    if (commonWords.some(word => password.toLowerCase().includes(word))) {
      score -= 1;
      feedback.push('Avoid common words');
    }

    // Determine strength level
    let strength;
    if (score >= 5) {
      strength = 'Strong';
    } else if (score >= 3) {
      strength = 'Medium';
    } else {
      strength = 'Weak';
    }

    return {
      score,
      strength,
      feedback
    };
  }

  // Function to update strength indicator
  function updateStrengthIndicator(strength) {
    const indicator = document.getElementById('strength-indicator');
    indicator.className = `strength-indicator ${strength.toLowerCase()}`;
    indicator.textContent = strength;
  }

  // Function to update feedback
  function updateFeedback(feedback) {
    const feedbackList = document.getElementById('feedback-list');
    feedbackList.innerHTML = '';
    feedback.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      feedbackList.appendChild(li);
    });
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkPassword') {
      const password = message.password;
      const username = message.username;
      
      if (checkUsernameWords(password, username)) {
        sendResponse({
          error: 'Password contains words from username/email',
          strong: false
        });
        return true;
      }
    }
  });
}); 