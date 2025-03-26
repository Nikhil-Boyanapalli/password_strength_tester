# OWASP Password Strength Test

A JavaScript module for testing password strength based on OWASP guidelines. This module provides comprehensive password validation and strength estimation. Available as both an npm package and a Chrome extension.

## Features

- OWASP compliant password testing
- Configurable requirements
- Password strength estimation
- Time-to-crack calculation
- Common password checking
- Username/email similarity check
- Support for passphrases
- Real-time password strength feedback
- Visual strength meter
- Detailed requirements checklist

## Installation

### As an npm package:

```bash
npm install owasp-password-strength-test
```

### As a Chrome Extension:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your Chrome toolbar

## Usage

### As an npm package:

```javascript
const owasp = require('owasp-password-strength-test');

// Basic usage
const result = owasp.test('MyPassword123!');
console.log(result);

// Configure settings
owasp.config({
  minLength: 12,
  maxLength: 128,
  allowPassphrases: true,
  username: 'user@example.com'
});

// Test with configuration
const result2 = owasp.test('MyPassword123!');
```

### As a Chrome Extension:

1. Click the extension icon in your Chrome toolbar
2. Enter the password you want to test
3. Optionally enter a username/email to check for similarity
4. View real-time feedback including:
   - Password strength meter
   - Requirements checklist
   - Estimated time to crack
   - Overall strength assessment

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| allowPassphrases | boolean | true | Allow passphrases as valid passwords |
| maxLength | number | 128 | Maximum password length |
| minLength | number | 10 | Minimum password length |
| minPhraseLength | number | 20 | Minimum length for passphrases |
| minOptionalTestsToPass | number | 4 | Minimum number of optional tests to pass |
| commonPasswords | array | [...] | Array of common passwords to check against |
| username | string | '' | Username/email for similarity check |

## Test Results

The `test()` function returns an object with the following properties:

- `errors`: Array of all error messages
- `failedTests`: Array of indices of failed tests
- `passedTests`: Array of indices of passed tests
- `requiredTestErrors`: Array of required test error messages
- `optionalTestErrors`: Array of optional test error messages
- `isPassphrase`: Boolean indicating if password is a passphrase
- `strong`: Boolean indicating if password meets all requirements
- `optionalTestsPassed`: Number of optional tests passed
- `estimatedCrackTime`: String with estimated time to crack the password

## Requirements

- Minimum 10 characters
- Maximum 128 characters
- No sequences of 3 or more repeated characters
- Not in common passwords list
- Must not contain username/email (if configured)

## Optional Requirements

- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

## License

MIT License - see LICENSE file for details 