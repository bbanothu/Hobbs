/**
 * Main content script - coordinates automation
 */

import IntentParser from '../utils/intentParser.js';
import { getSiteAdapter } from './siteAdapters.js';
import BrowserTools from './browserTools.js';

class ContentScript {
  constructor() {
    this.intentParser = new IntentParser();
    this.siteAdapter = null;
    this.isProcessing = false;
    this.browserTools = new BrowserTools();
  }

  async initialize() {
    // Get the appropriate site adapter
    this.siteAdapter = getSiteAdapter(window.location.href);
    console.log(`Content script initialized for: ${this.siteAdapter.siteName}`);
  }

  async processRequest(request, credentials = null) {
    if (this.isProcessing) {
      return {
        success: false,
        message: 'Another request is already being processed. Please wait.',
      };
    }

    this.isProcessing = true;

    try {
      console.log('Processing request:', request);

      // Parse the user intent
      const intent = this.intentParser.parse(request);
      console.log('Parsed intent:', intent);

      if (intent.confidence < 30) {
        return {
          success: false,
          message: 'Could not understand the request. Please be more specific.',
          intent,
        };
      }

      // Execute the automation workflow
      const result = await this.executeAutomation(intent, credentials);
      return result;
    } catch (error) {
      console.error('Content script error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while processing your request.',
        error: error.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async executeAutomation(intent, credentials = null) {
    try {
      // Handle Sauce Demo login if needed
      if (
        this.siteAdapter.siteName === 'sauce-demo' &&
        this.siteAdapter.isLoginPage &&
        this.siteAdapter.isLoginPage()
      ) {
        if (!credentials || !credentials.username || !credentials.password) {
          return {
            success: false,
            message: 'Login required. Please provide username and password.',
            requiresLogin: true,
          };
        }

        console.log('Step 0: Logging in to Sauce Demo...');
        const loginSuccess = await this.siteAdapter.login(
          credentials.username,
          credentials.password
        );

        if (!loginSuccess) {
          return {
            success: false,
            message: 'Login failed. Please check your credentials.',
          };
        }
      }

      console.log('Step 1: Finding products...');
      const foundProducts = await this.siteAdapter.findProducts(intent);

      if (!foundProducts) {
        return {
          success: false,
          message: 'Could not find any products matching your request.',
        };
      }

      console.log('Step 2: Selecting best product...');
      const selectedProduct = await this.siteAdapter.selectBestProduct(intent);

      if (!selectedProduct) {
        return {
          success: false,
          message: 'Could not select a suitable product.',
        };
      }

      console.log('Step 3: Adding to cart...');
      const addedToCart = await this.siteAdapter.addToCart();

      if (!addedToCart) {
        return {
          success: false,
          message: 'Could not add the product to cart.',
        };
      }

      console.log('Step 4: Verifying cart addition...');
      const verified = await this.siteAdapter.verifyCartAddition();

      const productInfo = await this.siteAdapter.getProductInfo();

      return {
        success: verified,
        message: verified
          ? 'Successfully added product to cart!'
          : 'Product may have been added, please check your cart.',
        product: productInfo,
        site: this.siteAdapter.siteName,
        intent,
      };
    } catch (error) {
      console.error('Automation workflow error:', error);
      return {
        success: false,
        message: `Automation failed: ${error.message}`,
        error: error.message,
      };
    }
  }


  // Handle messages from background script
  handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);

    if (message.type === 'PING') {
      sendResponse({
        status: 'ready',
        site: this.siteAdapter ? this.siteAdapter.siteName : 'unknown',
      });
      return;
    }

    if (message.type === 'PROCESS_REQUEST') {
      this.processRequest(message.request, message.credentials)
        .then(result => {
          console.log('Sending response:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error processing request:', error);
          sendResponse({
            success: false,
            message: 'Failed to process request',
            error: error.message,
          });
        });

      return true; // Keep message channel open for async response
    }

    if (message.type === 'EXECUTE_TOOL') {
      this.executeTool(message.tool, message.target, message.text)
        .then(result => {
          console.log('Tool execution result:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('Tool execution error:', error);
          sendResponse({
            success: false,
            error: error.message,
          });
        });
      return true; // Keep message channel open for async response
    }

    // Handle DOM snapshot extraction
  }

  async executeTool(tool, target, text) {
    console.log(`[Content Script] Executing tool: ${tool}`, { target, text });

    try {
      // Handle navigation separately (background script responsibility)
      if (tool === 'open') {
        return {
          success: true,
          message: `Already on ${window.location.href}`,
          url: window.location.href,
        };
      }

      // Execute other tools through BrowserTools
      const result = await this.browserTools.executeAction(tool, target, text);
      return result;
    } catch (error) {
      console.error(`[Content Script] Tool ${tool} failed:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Initialize content script
const contentScript = new ContentScript();
contentScript.initialize();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return contentScript.handleMessage(message, sender, sendResponse);
});

console.log('Hobbs content script loaded on:', window.location.href);