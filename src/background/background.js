/**
 * Background service worker - handles popup communication and AI agent coordination
 */

import AIAgent from './aiAgent.js';

class BackgroundScript {
  constructor() {
    console.log('[Background] Service worker started');
    this.aiAgent = null;
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background received message:', message);

      if (message.type === 'PROCESS_REQUEST') {
        this.handleProcessRequest(message, sender, sendResponse);
        return true; // Keep message channel open
      }

      if (message.type === 'GET_OPENAI_KEY') {
        // Return OpenAI API key from environment variables
        try {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error(
              'OPENAI_API_KEY not found in environment variables'
            );
          }
          sendResponse({ success: true, apiKey });
        } catch (error) {
          console.error('Failed to get OpenAI API key:', error);
          sendResponse({
            success: false,
            error: 'API key not found in environment',
          });
        }
        return;
      }

      if (message.type === 'AGENT_START') {
        this.handleAgentStart(message, sender, sendResponse);
        return true;
      }

      if (message.type === 'AGENT_STOP') {
        this.handleAgentStop(message, sender, sendResponse);
        return;
      }

      if (message.type === 'AGENT_UPDATE') {
        // Forward agent updates to sidepanel
        this.forwardToSidepanel(message);
        return;
      }


      return false;
    });
  }


  async handleAgentStart(message, sender, sendResponse) {
    try {
      // Extract prompt from either message.prompt or message.payload.prompt
      const prompt = message.prompt || message.payload?.prompt;
      console.log('[Background] Starting AI agent with prompt:', prompt);

      if (!prompt) {
        sendResponse({
          success: false,
          message: 'No prompt provided',
          error: 'Prompt is required to start AI agent'
        });
        return;
      }

      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        sendResponse({
          success: false,
          message: 'No active tab found.',
        });
        return;
      }

      // Get OpenAI API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OPENAI_API_KEY not found in environment variables'
        );
      }

      // Initialize or reuse AI agent
      if (!this.aiAgent) {
        this.aiAgent = new AIAgent(apiKey, this);
      }

      // Start the task
      await this.aiAgent.startTask(prompt, tab.id);

      sendResponse({
        success: true,
        message: 'AI agent started successfully',
      });
    } catch (error) {
      console.error('[Background] Failed to start AI agent:', error);
      sendResponse({
        success: false,
        message: 'Failed to start AI agent',
        error: error.message,
      });
    }
  }

  handleAgentStop(message, sender, sendResponse) {
    if (this.aiAgent && this.aiAgent.isRunning) {
      this.aiAgent.stopTask();
      sendResponse({
        success: true,
        message: 'AI agent stopped',
      });
    } else {
      sendResponse({
        success: false,
        message: 'No AI agent running',
      });
    }
  }

  forwardToSidepanel(message) {
    // Forward messages to all sidepanel contexts
    chrome.runtime.sendMessage(message).catch(error => {
      // Ignore errors if sidepanel is not open
      console.log('Sidepanel not available:', error.message);
    });
  }

  async handleProcessRequest(message, sender, sendResponse) {
    try {
      const { request, credentials, tabId, originalRequest } = message;

      console.log(`Processing request for tab ${tabId}: "${request}"`);

      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        sendResponse({
          success: false,
          message: 'No active tab found.',
        });
        return;
      }

      // Send message to content script
      const result = await this.sendMessageToTab(tab.id, {
        type: 'PROCESS_REQUEST',
        request,
        credentials,
        originalRequest,
      });

      sendResponse(result);
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({
        success: false,
        message: 'An unexpected error occurred.',
        error: error.message,
      });
    }
  }

  async sendMessageToTab(tabId, message, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Background] Sending message to tab ${tabId} (attempt ${attempt}):`,
          message.type
        );

        return await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, message, response => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        console.warn(`Message attempt ${attempt} failed:`, error.message);

        // Handle specific cache-related errors
        if (
          error.message.includes('back/forward cache') ||
          error.message.includes('Receiving end does not exist')
        ) {
          console.log(
            'Detected cache issue, trying to refresh content script...'
          );

          // Try to inject the content script again
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js'],
            });
            console.log('Content script re-injected');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (injectError) {
            console.warn('Failed to re-inject content script:', injectError);
          }
        }

        if (attempt === maxRetries) {
          throw error;
        }

        // Progressive backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Initialize background script
const backgroundScript = new BackgroundScript();