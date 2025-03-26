# Password Shield - Chrome Extension

A Chrome extension that helps users create and maintain strong passwords while following OWASP (Open Web Application Security Project) guidelines.

## Features

- **Site Trust Management**: 
  - Prompts users when entering passwords on new websites
  - Option to remember trusted sites to reduce prompts
  - Manage trusted sites through a dedicated interface

- **Password Strength Testing**:
  - Real-time password strength analysis
  - Based on OWASP security guidelines
  - Checks for:
    - Minimum length requirements
    - Character complexity (uppercase, lowercase, numbers, special characters)
    - Common patterns and words
    - Username inclusion

- **User-Friendly Interface**:
  - Clean, modern design
  - Simple one-click password testing
  - Clear feedback on password strength
  - Easy site trust management

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Password Shield icon should appear in your Chrome toolbar

## Usage

### Password Testing
1. Click the Password Shield icon in your Chrome toolbar
2. Enter a password in the input field
3. View real-time feedback on your password's strength
4. Check the detailed requirements list to improve your password

### Site Trust Management
1. When entering a password on a new site, a trust prompt will appear
2. Choose to trust the site by checking "Don't ask again"
3. Manage trusted sites through the extension's management page
4. Remove sites from the trusted list as needed

## Security Features

- No passwords are stored by the extension
- Site trust information is stored locally
- Follows OWASP password security guidelines
- Real-time password strength analysis
- Protection against common password vulnerabilities

## Development

The extension is built using:
- HTML/CSS for the user interface
- JavaScript for functionality
- Chrome Extension APIs
- OWASP password security guidelines

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on OWASP password security guidelines
- Uses Chrome Extension APIs
- Inspired by the need for better password security practices 