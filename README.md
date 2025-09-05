# Hobbes Assistant - AI-Powered Shopping Chrome Extension

A Chrome Extension that uses AI to understand natural language requests and automatically navigate any website to complete shopping tasks. Simply type what you want (e.g., "Go to Amazon and find wireless headphones under $50") and watch the AI agent do the work for you.

## 🚀 Features

- **AI-Powered Automation**: GPT-4 powered browser agent that can navigate any website
- **Natural Language Understanding**: Type requests in plain English - no complex commands needed
- **Universal Website Support**: Works on any website, not just specific shopping sites
- **Dual Interface**: Both popup and side panel for different use cases
- **Smart Error Recovery**: AI learns from failures and tries different approaches
- **Modern Glass UI**: Beautiful glassmorphism design with custom branding
- **Persistent State**: Remembers your preferences and shopping history
- **Credential Management**: Securely stores login information for sites
- **Real-time Updates**: Live chat interface showing AI agent progress

## 🌐 Supported Sites

- **Any Website**: The AI agent can navigate and interact with any website
- **Demo Sites**: Fake Store Demo, Sauce Demo, OpenCart Demo
- **E-commerce**: Amazon, Target, Walmart, Best Buy, and more
- **Search Engines**: Google, Bing, DuckDuckGo
- **Social Media**: Reddit, Twitter, Facebook
- **Custom Sites**: Just tell the AI where to go and what to do

## 🛠️ Development Setup

### Prerequisites

- Node.js 16+ and npm
- Google Chrome browser
- OpenAI API key (for AI agent functionality)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd Hobbs
npm install
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

3. **Build the extension:**

```bash
npm run build
```

4. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `dist` folder

### Development Commands

```bash
# Build for production
npm run build

# Build and watch for changes (development)
npm run dev

# Clean build directory
npm run clean

# Format code with Prettier
npm run format
```

## 📁 Project Structure

```
Hobbs/
├── public/
│   ├── manifest.json          # Chrome Extension manifest
│   ├── favico.png            # Extension icon
│   ├── logo.svg              # Logo for UI
│   └── background.avif       # Background image
├── src/
│   ├── popup/                # React popup UI
│   │   ├── App.jsx           # Main popup component
│   │   ├── components/       # UI components
│   │   │   ├── RequestForm.jsx
│   │   │   ├── ResultDisplay.jsx
│   │   │   └── HistoryView.jsx
│   │   └── index.js          # Entry point
│   ├── sidepanel/            # Side panel interface
│   │   ├── SidePanelApp.jsx  # Main side panel component
│   │   ├── index.js          # Entry point
│   │   └── sidepanel.html    # HTML template
│   ├── content/              # Content scripts
│   │   ├── content.js        # Main content script
│   │   ├── browserTools.js   # Browser automation tools
│   │   └── siteAdapters.js   # Site-specific automation
│   ├── background/           # Service worker
│   │   ├── background.js     # Background script
│   │   └── aiAgent.js        # AI agent orchestrator
│   ├── utils/               # Shared utilities
│   │   ├── intentParser.js   # NLP request parsing
│   │   ├── domHelpers.js     # DOM manipulation helpers
│   │   ├── storage.js        # Chrome storage management
│   │   └── openai.js         # OpenAI API client
│   └── styles/
│       └── globals.css       # Tailwind CSS styles
├── dist/                     # Built extension files
├── .env                      # Environment variables
└── webpack.config.js         # Build configuration
```

## 🎯 How It Works

### 1. AI Agent Architecture

The extension uses a sophisticated AI agent that follows a **THINK → ACT → OBSERVE** loop:

- **THINK**: AI analyzes the user's request and plans the next action
- **ACT**: Executes browser automation (click, type, navigate, etc.)
- **OBSERVE**: Analyzes the result and decides the next step
- **REPEAT**: Continues until the task is complete

### 2. Browser Automation Tools

The AI agent has access to 5 core tools:

- **`open(url)`**: Navigate to any website
- **`click(selector)`**: Click elements using CSS selectors
- **`type(selector, text)`**: Type text into input fields
- **`extract_text(selector)`**: Read page content
- **`finish(summary)`**: Complete the task

### 3. Smart Error Recovery

The AI agent includes advanced error handling:

- **Timeout Detection**: Recognizes when actions succeed despite timeouts
- **Loop Prevention**: Avoids repeating failed actions
- **Fallback Strategies**: Tries different approaches when one fails
- **Context Awareness**: Understands page state and adapts accordingly

### 4. Dual Interface

- **Popup**: Quick tasks and site selection
- **Side Panel**: Full chat interface with AI agent
- **Persistent State**: Remembers preferences and history
- **Real-time Updates**: Live progress tracking

## 🧪 Usage Examples

### Shopping Examples:

- "Go to Amazon and find wireless headphones under $50"
- "Search for Nike running shoes size 10 on Amazon"
- "Add a men's medium t-shirt under $25 to cart"
- "Find the cheapest laptop on Best Buy"

### General Web Navigation:

- "Go to Google and search for Reddit"
- "Navigate to Reddit and find posts about AI"
- "Go to Twitter and search for #JavaScript"
- "Visit GitHub and find React repositories"

### Demo Site Examples:

- "Go to Fake Store Demo and add a backpack to cart"
- "Login to Sauce Demo and add the Bolt T-shirt"
- "Navigate to OpenCart Demo and find electronics"

### Advanced Examples:

- "Go to Amazon, search for 'wireless mouse', click the first result, and add it to cart"
- "Visit Google, search for 'best laptops 2024', and click on the first result"
- "Go to Reddit, search for 'programming', and click on the first post"

## 🔧 Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **React 18**: Modern React with hooks for UI
- **Tailwind CSS**: Utility-first CSS framework with glassmorphism design
- **Webpack 5**: Module bundling and build system
- **OpenAI GPT-4**: AI agent for natural language understanding
- **Chrome APIs**: Storage, scripting, side panel, alarms
- **Content Scripts**: DOM manipulation and automation
- **Background Service Worker**: AI agent orchestration

### Key Components

- **AIAgent**: Core AI orchestrator with THINK→ACT→OBSERVE loop
- **BrowserTools**: DOM manipulation and automation utilities
- **StorageManager**: Chrome storage for preferences and history
- **OpenAIClient**: GPT-4 API integration
- **IntentParser**: Natural language request parsing
- **SiteAdapters**: Site-specific automation strategies

### Performance Optimizations

- **Efficient AI Agent**: Reduced from 68 steps to 8-12 steps average
- **Smart Timeout Handling**: Recognizes successful actions despite timeouts
- **Loop Prevention**: Prevents infinite retry loops
- **Code Cleanup**: Removed 10.8 KiB of unused code
- **Minimal Bundle**: Optimized webpack build

### Security & Privacy

- Minimal permissions (activeTab, storage, scripting, sidePanel)
- OpenAI API key stored locally in .env file
- No data collection or external tracking
- Local storage for user preferences only
- Respects site terms of service

## 🚧 Limitations & Future Improvements

### Current Limitations:

- Requires OpenAI API key for AI agent functionality
- Some sites may have anti-automation measures
- Complex multi-step workflows may need refinement
- No support for checkout process (by design)

### Recent Improvements:

- ✅ **AI Agent Efficiency**: Reduced from 68 to 8-12 steps average
- ✅ **Universal Website Support**: Works on any website
- ✅ **Modern UI**: Glassmorphism design with dual interface
- ✅ **Smart Error Recovery**: Advanced timeout and loop handling
- ✅ **Code Cleanup**: Removed 10.8 KiB of unused code
- ✅ **Credential Management**: Secure login storage
- ✅ **Real-time Updates**: Live chat interface

### Planned Improvements:

- Enhanced multi-step workflow support
- Better handling of dynamic content
- Integration with more AI models
- Advanced user preference learning
- Checkout automation (with explicit user consent)
- Voice command support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This extension is for educational and personal use. Always respect website terms of service and use responsibly. The extension may break if sites change their layouts or implement anti-automation measures. The AI agent is designed to be respectful and follows ethical automation practices.

## 🎉 Recent Updates

- **v2.0**: Complete rewrite with AI agent architecture
- **v2.1**: Added side panel interface and modern UI
- **v2.2**: Implemented smart error recovery and timeout handling
- **v2.3**: Major performance optimization and code cleanup
- **v2.4**: Added credential management and persistent state

---

**Built with ❤️ using React, Tailwind CSS, and OpenAI GPT-4**
