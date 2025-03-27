document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Initialize privacy status elements
  const siteSafety = document.getElementById('site-safety');
  const dataCollection = document.getElementById('data-collection');
  const privacyPolicy = document.getElementById('privacy-policy');
  
  // Get current tab and check privacy immediately
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      try {
        const url = new URL(tab.url);
        
        // Update status while checking
        siteSafety.textContent = 'Checking...';
        dataCollection.textContent = 'Checking...';
        
        // Send message to background script to check site safety
        chrome.runtime.sendMessage(
          { action: 'checkSafety', url: tab.url },
          async (response) => {
            if (response && response.safety) {
              updatePrivacyStatus({
                siteSafety: response.safety,
                dataCollection: await checkDataCollection(url.hostname)
              });
            } else {
              // Fallback to direct check if message fails
              const safety = await checkSiteSafety(url.hostname);
              const collection = await checkDataCollection(url.hostname);
              updatePrivacyStatus({
                siteSafety: safety,
                dataCollection: collection
              });
            }
          }
        );
      } catch (error) {
        console.error('Error checking privacy:', error);
        updatePrivacyStatus({
          siteSafety: { status: 'Error', level: 'warning', details: 'Check failed' },
          dataCollection: { status: 'Error', level: 'warning', details: 'Check failed' }
        });
      }
    }
  });

  // Initialize password testing elements
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

  // Function to update privacy status
  function updatePrivacyStatus(status) {
    const siteSafety = document.getElementById('site-safety');
    const dataCollection = document.getElementById('data-collection');

    // Update Site Safety
    siteSafety.textContent = status.siteSafety.status;
    siteSafety.className = `status-value ${status.siteSafety.level.toLowerCase()}`;
    siteSafety.title = status.siteSafety.details;
    
    // Update Data Collection
    dataCollection.textContent = status.dataCollection.status;
    dataCollection.className = `status-value ${status.dataCollection.level.toLowerCase()}`;
    dataCollection.title = status.dataCollection.details;
  }

  // Function to check site safety
  async function checkSiteSafety(hostname) {
    try {
      // Check HTTPS and SSL
      const isHTTPS = await checkHTTPS(hostname);
      const hasSSL = await checkSSLCertificate(hostname);
      
      if (!isHTTPS || !hasSSL) {
        return {
          status: 'Warning',
          level: 'warning',
          details: `Security concerns: ${!isHTTPS ? 'No HTTPS' : ''} ${!hasSSL ? 'Invalid SSL certificate' : ''}`
        };
      }
      
      return {
        status: 'Safe',
        level: 'safe',
        details: 'Site uses secure connection (HTTPS)'
      };
    } catch (error) {
      return {
        status: 'Warning',
        level: 'warning',
        details: 'Unable to verify site safety'
      };
    }
  }

  // Function to check data collection
  async function checkDataCollection(hostname) {
    try {
      // Get stored data collection info
      const { dataCollection = {} } = await chrome.storage.local.get('dataCollection');
      const siteData = dataCollection[hostname] || { count: 0, trackers: [] };
      
      if (siteData.count > 10) {
        return {
          status: 'High Collection',
          level: 'danger',
          details: `Large amount of data being collected (${siteData.count} requests detected)`
        };
      } else if (siteData.count > 5) {
        return {
          status: 'Moderate',
          level: 'warning',
          details: `Moderate data collection detected (${siteData.count} requests)`
        };
      }
      
      return {
        status: 'Low Collection',
        level: 'safe',
        details: 'Minimal data collection detected'
      };
    } catch (error) {
      return {
        status: 'Unknown',
        level: 'warning',
        details: 'Unable to determine data collection practices'
      };
    }
  }

  // Helper function to detect trackers
  async function detectTrackers(hostname) {
    const commonTrackers = [
      'google-analytics.com',
      'doubleclick.net',
      'facebook.com',
      'adnxs.com',
      'hotjar.com'
    ];
    
    const foundTrackers = [];
    // Check network requests for known trackers
    const requests = await chrome.webRequest.getAll();
    requests.forEach(request => {
      const url = new URL(request.url);
      commonTrackers.forEach(tracker => {
        if (url.hostname.includes(tracker)) {
          foundTrackers.push(tracker);
        }
      });
    });
    
    return [...new Set(foundTrackers)]; // Remove duplicates
  }

  // Helper function to check HTTPS
  async function checkHTTPS(hostname) {
    try {
      const response = await fetch(`https://${hostname}`);
      return response.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Helper function to check SSL certificate
  async function checkSSLCertificate(hostname) {
    try {
      const response = await fetch(`https://${hostname}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Function to analyze privacy policy
  function analyzePrivacyPolicy(text) {
    const concerns = [];
    const invasiveTerms = [
      { term: 'third-party sharing', severity: 'high' },
      { term: 'data collection', severity: 'medium' },
      { term: 'tracking', severity: 'medium' },
      { term: 'cookies', severity: 'low' },
      { term: 'advertising', severity: 'medium' },
      { term: 'analytics', severity: 'low' },
      { term: 'personal information', severity: 'high' },
      { term: 'data retention', severity: 'medium' },
      { term: 'data transfer', severity: 'high' },
      { term: 'user data', severity: 'medium' },
      { term: 'we reserve the right', severity: 'high' },
      { term: 'without notice', severity: 'high' },
      { term: 'at our discretion', severity: 'medium' },
      { term: 'may change', severity: 'medium' },
      { term: 'can modify', severity: 'medium' },
      { term: 'without consent', severity: 'high' }
    ];

    const lowerText = text.toLowerCase();
    invasiveTerms.forEach(({ term, severity }) => {
      if (lowerText.includes(term)) {
        concerns.push(`${term} (${severity} risk)`);
      }
    });

    return concerns;
  }

  // Get warnings list and filter elements
  const warningsList = document.getElementById('warnings-list');
  const warningFilter = document.getElementById('warning-filter');
  const clearWarningsBtn = document.getElementById('clear-warnings');

  // Load and display warnings
  await loadWarnings();

  // Add event listeners for warnings
  warningFilter.addEventListener('change', loadWarnings);
  clearWarningsBtn.addEventListener('click', clearWarnings);

  // Function to format timestamp
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Function to load and display warnings
  async function loadWarnings() {
    const { privacyWarnings = [] } = await chrome.storage.local.get('privacyWarnings');
    const selectedType = warningFilter.value;

    // Filter warnings if needed
    const filteredWarnings = selectedType === 'all' 
      ? privacyWarnings 
      : privacyWarnings.filter(w => w.type === selectedType);

    if (filteredWarnings.length === 0) {
      warningsList.innerHTML = '<div class="empty-state">No warnings to display</div>';
      return;
    }

    // Generate warnings HTML
    const warningsHTML = filteredWarnings.map(warning => `
      <div class="warning-item">
        <div class="warning-header">
          <span class="warning-domain">${warning.domain}</span>
          <span class="warning-timestamp">${formatTimestamp(warning.timestamp)}</span>
        </div>
        <div class="warning-content">
          <span class="warning-type ${warning.type}">${warning.type.replace('_', ' ')}</span>
          <span class="warning-message">${warning.message}</span>
        </div>
      </div>
    `).join('');

    warningsList.innerHTML = warningsHTML;
  }

  // Function to clear all warnings
  async function clearWarnings() {
    if (confirm('Are you sure you want to clear all warnings?')) {
      await chrome.storage.local.set({ privacyWarnings: [] });
      await loadWarnings();
    }
  }

  // Get policy analysis elements
  const analyzeButton = document.getElementById('analyze-policy');
  const policyResults = document.getElementById('policy-results');
  const riskIndicator = document.getElementById('risk-indicator');
  const highRiskCount = document.getElementById('high-risk-count');
  const mediumRiskCount = document.getElementById('medium-risk-count');
  const lowRiskCount = document.getElementById('low-risk-count');
  const policyConcerns = document.getElementById('policy-concerns');

  // Add click handler for analyze button
  analyzeButton.addEventListener('click', async () => {
    try {
      analyzeButton.disabled = true;
      analyzeButton.textContent = 'Analyzing...';
      
      // Get current tab URL
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const url = new URL(tabs[0].url);
      
      // Find privacy policy link
      const policyLink = await findPrivacyPolicyLink(url.origin);
      
      if (!policyLink) {
        throw new Error('Privacy policy link not found');
      }

      // Fetch and analyze policy
      const policyText = await fetchPolicyContent(policyLink);
      const analysis = await analyzePolicyContent(policyText);
      
      // Display results
      displayAnalysisResults(analysis);
      
    } catch (error) {
      console.error('Policy analysis failed:', error);
      policyResults.innerHTML = `
        <div class="error-message">
          Failed to analyze privacy policy: ${error.message}
        </div>
      `;
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.textContent = 'Analyze Privacy Policy';
    }
  });

  // Function to find privacy policy link
  async function findPrivacyPolicyLink(origin) {
    const commonPolicyPaths = [
      '/privacy',
      '/privacy-policy',
      '/privacy-statement',
      '/privacypolicy',
      '/privacy_policy',
      '/legal/privacy',
      '/legal/privacy-policy'
    ];

    // Try common paths first
    for (const path of commonPolicyPaths) {
      try {
        const response = await fetch(origin + path);
        if (response.ok) {
          return origin + path;
        }
      } catch (e) {
        continue;
      }
    }

    // If common paths fail, try to find link in page
    try {
      const response = await fetch(origin);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Look for privacy policy links
      const links = Array.from(doc.querySelectorAll('a'));
      const policyLink = links.find(link => {
        const text = link.textContent.toLowerCase();
        const href = link.getAttribute('href')?.toLowerCase() || '';
        return text.includes('privacy') || href.includes('privacy');
      });

      if (policyLink) {
        const href = policyLink.getAttribute('href');
        return href.startsWith('http') ? href : origin + href;
      }
    } catch (e) {
      console.error('Error finding policy link:', e);
    }

    throw new Error('Privacy policy link not found');
  }

  // Function to fetch policy content
  async function fetchPolicyContent(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    
    // Remove scripts, styles, and other non-content elements
    doc.querySelectorAll('script, style, meta, link').forEach(el => el.remove());
    
    // Get main content
    const content = doc.body.textContent.replace(/\s+/g, ' ').trim();
    return content;
  }

  // Function to analyze policy content
  async function analyzePolicyContent(text) {
    const analysis = {
      highRisk: [],
      mediumRisk: [],
      lowRisk: [],
      overallRisk: 'low'
    };

    const riskTerms = {
      high: [
        'sell your data',
        'share with third parties',
        'without your consent',
        'may disclose',
        'reserve the right',
        'at our discretion',
        'without notice',
        'personal information sale',
        'transfer of ownership',
        'unlimited rights'
      ],
      medium: [
        'third party services',
        'advertising partners',
        'marketing purposes',
        'analytics providers',
        'tracking technologies',
        'profiling',
        'automated decision',
        'data retention',
        'may combine information',
        'social media integration'
      ],
      low: [
        'cookies',
        'log files',
        'device information',
        'usage data',
        'aggregate statistics',
        'anonymous data',
        'technical information',
        'security measures',
        'encrypted',
        'industry standard'
      ]
    };

    const lowerText = text.toLowerCase();

    // Check for each risk term
    Object.entries(riskTerms).forEach(([severity, terms]) => {
      terms.forEach(term => {
        if (lowerText.includes(term.toLowerCase())) {
          const context = findTermContext(lowerText, term);
          analysis[severity + 'Risk'].push({
            term,
            context,
            severity
          });
        }
      });
    });

    // Calculate overall risk
    const riskScores = {
      high: analysis.highRisk.length * 3,
      medium: analysis.mediumRisk.length * 2,
      low: analysis.lowRisk.length
    };

    const totalScore = riskScores.high + riskScores.medium + riskScores.low;
    analysis.overallRisk = totalScore > 15 ? 'high' : totalScore > 8 ? 'medium' : 'low';

    return analysis;
  }

  // Helper function to find context around a term
  function findTermContext(text, term) {
    const index = text.indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + term.length + 50);
    let context = text.slice(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  // Function to display analysis results
  function displayAnalysisResults(analysis) {
    // Show results section
    policyResults.style.display = 'block';

    // Update risk indicator
    riskIndicator.textContent = analysis.overallRisk.toUpperCase();
    riskIndicator.className = `risk-value ${analysis.overallRisk}`;

    // Update risk counts
    highRiskCount.textContent = analysis.highRisk.length;
    mediumRiskCount.textContent = analysis.mediumRisk.length;
    lowRiskCount.textContent = analysis.lowRisk.length;

    // Display concerns
    const concerns = [
      ...analysis.highRisk.map(item => ({ ...item, severity: 'high' })),
      ...analysis.mediumRisk.map(item => ({ ...item, severity: 'medium' })),
      ...analysis.lowRisk.map(item => ({ ...item, severity: 'low' }))
    ];

    if (concerns.length === 0) {
      policyConcerns.innerHTML = '<li class="no-concerns">No concerning terms found</li>';
    } else {
      policyConcerns.innerHTML = concerns.map(concern => `
        <li>
          <span class="concern-text">${concern.term}</span>
          <span class="concern-severity ${concern.severity}">${concern.severity}</span>
        </li>
      `).join('');
    }
  }
}); 