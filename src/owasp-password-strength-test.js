/* globals define */
(function (root, factory) {
  
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.owaspPasswordStrengthTest = factory();
  }

}(this, function () {

  var owasp = {};

  // Configuration settings
  owasp.configs = {
    allowPassphrases       : true,
    maxLength              : 128,
    minLength              : 10,
    minPhraseLength        : 20,
    minOptionalTestsToPass : 4,
    commonPasswords        : ['123456', 'password', '123456789', 'qwerty', '12345', '12345678', '111111', '123123'], 
    username               : '',  // Set username/email for similarity check
  };

  // Function to update config
  owasp.config = function(params) {
    for (var prop in params) {
      if (params.hasOwnProperty(prop) && this.configs.hasOwnProperty(prop)) {
        this.configs[prop] = params[prop];
      }
    }
  };

  // Password strength tests
  owasp.tests = {
    required: [
      function(password) {
        if (password.length < owasp.configs.minLength) {
          return 'The password must be at least ' + owasp.configs.minLength + ' characters long.';
        }
      },
      function(password) {
        if (password.length > owasp.configs.maxLength) {
          return 'The password must be fewer than ' + owasp.configs.maxLength + ' characters.';
        }
      },
      function(password) {
        if (/(.)\1{2,}/.test(password)) {
          return 'The password may not contain sequences of three or more repeated characters.';
        }
      },
      function(password) {
        if (owasp.configs.commonPasswords.includes(password.toLowerCase())) {
          return 'The password is too common and easy to guess.';
        }
      },
      function(password) {
        if (owasp.configs.username && password.toLowerCase().includes(owasp.configs.username.toLowerCase())) {
          return 'The password must not contain your username or email.';
        }
      }
    ],

    optional: [
      function(password) {
        if (!/[a-z]/.test(password)) {
          return 'The password must contain at least one lowercase letter.';
        }
      },
      function(password) {
        if (!/[A-Z]/.test(password)) {
          return 'The password must contain at least one uppercase letter.';
        }
      },
      function(password) {
        if (!/[0-9]/.test(password)) {
          return 'The password must contain at least one number.';
        }
      },
      function(password) {
        if (!/[^A-Za-z0-9]/.test(password)) {
          return 'The password must contain at least one special character.';
        }
      }
    ],
  };

  // Time-to-crack estimation
  function estimateCrackTime(password) {
    var complexity = 0;

    if (/[a-z]/.test(password)) complexity += 26; 
    if (/[A-Z]/.test(password)) complexity += 26;
    if (/[0-9]/.test(password)) complexity += 10;
    if (/[^A-Za-z0-9]/.test(password)) complexity += 30; 

    var entropy = password.length * Math.log2(complexity);
    var guesses = Math.pow(2, entropy);  
    var secondsToCrack = guesses / 1e9;  

    if (secondsToCrack < 60) return 'Instantly cracked!';
    if (secondsToCrack < 3600) return 'Crack time: ' + Math.round(secondsToCrack / 60) + ' minutes';
    if (secondsToCrack < 86400) return 'Crack time: ' + Math.round(secondsToCrack / 3600) + ' hours';
    if (secondsToCrack < 31536000) return 'Crack time: ' + Math.round(secondsToCrack / 86400) + ' days';
    return 'Crack time: ' + Math.round(secondsToCrack / 31536000) + ' years';
  }

  // Password strength testing function
  owasp.test = function(password) {
    var result = {
      errors              : [],
      failedTests         : [],
      passedTests         : [],
      requiredTestErrors  : [],
      optionalTestErrors  : [],
      isPassphrase        : false,
      strong              : true,
      optionalTestsPassed : 0,
      estimatedCrackTime  : ''
    };

    var i = 0;
    this.tests.required.forEach(function(test) {
      var err = test(password);
      if (typeof err === 'string') {
        result.strong = false;
        result.errors.push(err);
        result.requiredTestErrors.push(err);
        result.failedTests.push(i);
      } else {
        result.passedTests.push(i);
      }
      i++;
    });

    if (this.configs.allowPassphrases === true && password.length >= this.configs.minPhraseLength) {
      result.isPassphrase = true;
    }

    if (!result.isPassphrase) {
      var j = this.tests.required.length;
      this.tests.optional.forEach(function(test) {
        var err = test(password);
        if (typeof err === 'string') {
          result.errors.push(err);
          result.optionalTestErrors.push(err);
          result.failedTests.push(j);
        } else {
          result.optionalTestsPassed++;
          result.passedTests.push(j);
        }
        j++;
      });
    }

    if (!result.isPassphrase && result.optionalTestsPassed < this.configs.minOptionalTestsToPass) {
      result.strong = false;
    }

    // Estimate time to crack the password
    result.estimatedCrackTime = estimateCrackTime(password);

    return result;
  };

  return owasp;
})); 