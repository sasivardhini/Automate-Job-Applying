# LinkedIn Easy Apply Bot 🤖

> **Automate your LinkedIn job applications and save hours of time**

A powerful browser extension that automates the LinkedIn Easy Apply process, intelligently fills forms, tracks applications, and helps you apply to more jobs in less time.

## ✨ Features

- **🎯 Auto-detect Easy Apply Buttons** - Automatically identifies and clicks "Easy Apply" buttons on LinkedIn job listings
- **📝 Smart Form Filling** - Auto-fills your saved profile data (name, email, phone, resume info)
- **🤔 Intelligent Question Answering** - Automatically answers common application questions based on your pre-configured responses
- **📊 Application Dashboard** - Track all your applications with real-time statistics and history
- **🚫 Skip Applied Jobs** - Automatically skips jobs you've already applied to
- **📈 Analytics & Export** - View statistics and export your application history to CSV
- **⚙️ Customizable Settings** - Configure auto-apply behavior, delays, and daily limits
- **🔔 Notifications** - Get notified when applications are submitted

## 🚀 Installation

### Chrome / Edge / Brave

1. **Download or Clone this repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-easy-apply-bot.git
   cd linkedin-easy-apply-bot
   ```

2. **Open Extension Management Page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`
   - Brave: Navigate to `brave://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `linkedin-easy-apply-bot` folder
   - The extension icon should appear in your browser toolbar

### Firefox

1. **Download or Clone this repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-easy-apply-bot.git
   cd linkedin-easy-apply-bot
   ```

2. **Open Firefox Add-ons Page**
   - Navigate to `about:debugging#/runtime/this-firefox`

3. **Load Temporary Add-on**
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the extension folder

## 📖 How to Use

### 1. Set Up Your Profile

1. **Click the extension icon** in your browser toolbar
2. **Navigate to the "Profile" tab**
3. **Fill in your information:**
   - Personal details (name, email, phone)
   - LinkedIn URL and portfolio website
   - Common application answers:
     - Years of experience
     - Work authorization status
     - Sponsorship requirements
     - Expected salary
     - Notice period
     - Relocation preferences

4. **Click "Save Profile"**

### 2. Configure Settings

1. **Go to the "Settings" tab**
2. **Configure your preferences:**
   - **Enable Auto-Apply**: Automatically apply to jobs when browsing LinkedIn
   - **Skip Already Applied Jobs**: Prevent duplicate applications
   - **Enable Notifications**: Get alerts for successful applications
   - **Daily Application Limit**: Set max applications per day (recommended: 50)
   - **Delay Between Actions**: Time between form fills (recommended: 2000ms)

3. **Click "Save Settings"**

### 3. Start Applying to Jobs

#### Option A: Auto-Apply Mode

1. **Navigate to LinkedIn Jobs** (https://www.linkedin.com/jobs/)
2. **Search for jobs** you're interested in
3. **Enable Auto-Apply** in the extension settings
4. **Browse job listings** - the bot will automatically:
   - Detect Easy Apply buttons
   - Check if you've already applied
   - Fill out application forms
   - Submit applications
   - Track everything in your dashboard

#### Option B: Manual Mode

1. **Navigate to a specific job** on LinkedIn
2. **Click the extension icon**
3. **Click "Apply to Current Job"**
4. The bot will handle the application process

### 4. Track Your Applications

1. **Open the extension popup**
2. **Go to the "Dashboard" tab**
3. **View your statistics:**
   - Total applications
   - Applications submitted today
   - Successful applications
   - Failed applications

4. **See recent applications** with job title, company, status, and date
5. **Export applications** to CSV for record-keeping

## 🎮 Control Panel

When on LinkedIn, you'll see a floating control panel in the bottom-right corner:

- **Status Display**: Shows current bot status (Idle/Running/Applying)
- **Start/Stop Button**: Quick toggle for auto-apply mode
- **Real-time Updates**: See what the bot is doing

## ⚙️ Configuration Options

| Setting | Description | Recommended Value |
|---------|-------------|-------------------|
| Auto-Apply | Automatically apply to jobs while browsing | Off (for testing) |
| Skip Applied Jobs | Don't reapply to jobs you've already applied to | On |
| Notifications | Show browser notifications | On |
| Daily Limit | Maximum applications per day | 50 |
| Apply Delay | Milliseconds between actions | 2000ms |

## 📊 Features Breakdown

### Smart Form Filling

The bot intelligently detects and fills various form fields:

- **Text Inputs**: Name, email, phone number, URLs
- **Dropdowns**: Experience level, work authorization, etc.
- **Radio Buttons**: Yes/No questions
- **Checkboxes**: Optional preferences
- **Text Areas**: Cover letters and additional information

### Question Detection

Automatically recognizes and answers common questions:

- Years of experience
- Work authorization
- Sponsorship requirements
- Salary expectations
- Start date availability
- Notice period
- Relocation willingness
- LinkedIn/Portfolio URLs
- Demographic questions (gender, race, veteran status, disability)

### Application Tracking

Every application is tracked with:

- Job title and company name
- Application date and time
- Application status (Applied/Failed/Skipped)
- Direct link to job posting
- Export capability to CSV

## 🔒 Privacy & Security

- **All data is stored locally** in your browser using Chrome's storage API
- **No data is sent to external servers**
- **Your information is never shared** with anyone
- **You have full control** over your data and can clear it anytime

## ⚠️ Important Notes

### LinkedIn's Terms of Service

- This bot is for **educational purposes** and to demonstrate automation capabilities
- Using automation tools may violate LinkedIn's Terms of Service
- **Use at your own risk** and be aware of potential account restrictions
- Always review applications before the bot submits them in production use

### Best Practices

1. **Start with manual mode** to test the bot's behavior
2. **Review your profile thoroughly** before enabling auto-apply
3. **Set reasonable daily limits** (50 applications max recommended)
4. **Monitor the bot** during initial use
5. **Customize your answers** to match your actual qualifications
6. **Export your application data** regularly for backup

### Limitations

- Only works with **LinkedIn Easy Apply** jobs (not external redirects)
- Cannot upload custom cover letters per application
- May not handle all custom question types
- Requires manual intervention for file uploads beyond resume
- LinkedIn's page structure changes may require updates

## 🛠️ Troubleshooting

### Extension doesn't load

- Make sure Developer Mode is enabled
- Try reloading the extension
- Check browser console for errors

### Forms aren't filling

- Verify your profile is saved
- Check that you're on a LinkedIn Easy Apply job
- LinkedIn may have updated their page structure

### Auto-apply not working

- Ensure Auto-Apply is enabled in settings
- Check your daily limit hasn't been reached
- Verify you're on LinkedIn job search pages

### Applications failing

- Some jobs have custom questions the bot can't handle
- Check the dashboard for error details
- Try applying manually to those jobs

## 📁 Project Structure

```
linkedin-easy-apply-bot/
├── manifest.json              # Extension configuration
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                     # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/                   # Scripts that run on LinkedIn
│   ├── content.js             # Main automation logic
│   └── content.css            # UI styling
├── background/                # Background service worker
│   └── background.js          # Event handling & storage
└── utils/                     # Shared utilities
    ├── constants.js           # Configuration constants
    ├── helpers.js             # Helper functions
    └── storage.js             # Storage management
```

## 🔧 Development

### Prerequisites

- Node.js (for icon generation, optional)
- Modern web browser (Chrome/Firefox/Edge)
- Basic understanding of JavaScript and browser extensions

### Making Changes

1. **Edit the source files** in your preferred editor
2. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card
3. **Test your changes** on LinkedIn
4. **Check console** for any errors

### Customizing Icons

The extension includes placeholder icons. To create custom icons:

```bash
# Using ImageMagick
convert -size 16x16 -background "#0073b1" -fill white -font Arial -pointsize 12 \
        -gravity center label:"🤖" icons/icon16.png

convert -size 48x48 -background "#0073b1" -fill white -font Arial -pointsize 36 \
        -gravity center label:"🤖" icons/icon48.png

convert -size 128x128 -background "#0073b1" -fill white -font Arial -pointsize 96 \
        -gravity center label:"🤖" icons/icon128.png
```

Or use any image editor to create PNG icons in sizes: 16x16, 48x48, and 128x128 pixels.

## 📝 Version History

### v1.0.0 (Current)

- ✅ Initial release
- ✅ Auto-detect Easy Apply buttons
- ✅ Smart form filling
- ✅ Question answering system
- ✅ Application tracking dashboard
- ✅ Settings configuration
- ✅ CSV export functionality
- ✅ Skip already-applied jobs
- ✅ Daily application limits
- ✅ Real-time notifications

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is provided as-is for educational purposes. Use responsibly and at your own risk.

## ⚖️ Disclaimer

This tool is created for educational and demonstration purposes. The authors are not responsible for any consequences of using this tool, including but not limited to LinkedIn account restrictions or violations of terms of service. Always use automation tools responsibly and ethically.

## 🙏 Acknowledgments

- Built with vanilla JavaScript for maximum compatibility
- Uses Chrome Extension Manifest V3
- Inspired by the need to streamline the job application process

## 📧 Support

If you encounter any issues or have questions:

1. Check the Troubleshooting section above
2. Review the browser console for error messages
3. Open an issue on GitHub with detailed information

---

**Made with ❤️ to help job seekers save time and apply to more opportunities**

**⭐ Star this repo if you find it helpful!**
