/**
 * AI Agent - Orchestrates browser automation using OpenAI
 * Implements THINK → ACT → OBSERVE loop for autonomous web interactions
 */

import OpenAIClient from '../utils/openai.js';

class AIAgent {
  constructor(apiKey, backgroundScript = null) {
    this.openai = new OpenAIClient(apiKey);
    this.backgroundScript = backgroundScript;
    this.isRunning = false;
    this.currentTask = null;
    this.stepCount = 0;
    this.maxSteps = 10;
    this.conversationHistory = [];
    this.tabId = null;
    this.lastAction = null;
    this.actionHistory = [];
    this.consecutiveFailures = 0;
  }

  async startTask(prompt, tabId) {
    console.log('[AI Agent] Starting task:', prompt);

    this.isRunning = true;
    this.currentTask = prompt;
    this.tabId = tabId;
    this.stepCount = 0;
    this.conversationHistory = [];
    this.lastAction = null;
    this.actionHistory = [];
    this.consecutiveFailures = 0;

    // Send initial message to sidepanel
    this.sendUpdate({
      type: 'task_started',
      message: `🤖 Starting task: "${prompt}"`,
      timestamp: Date.now(),
    });

    try {
      const systemPrompt = this.getSystemPrompt();
      this.conversationHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      await this.agentLoop();
    } catch (error) {
      console.error('[AI Agent] Task failed:', error);
      this.sendUpdate({
        type: 'system',
        message: `❌ Task failed: ${error.message}`,
        timestamp: Date.now(),
      });
      this.stopTask();
    }
  }

  stopTask() {
    this.isRunning = false;
    this.currentTask = null;
    this.stepCount = 0;
    this.lastAction = null;
    this.actionHistory = [];
    this.consecutiveFailures = 0;
    this.sendUpdate({
      type: 'task_aborted',
      message: '🛑 Task aborted by user',
      timestamp: Date.now(),
    });
  }

  async agentLoop() {
    while (this.isRunning && this.stepCount < this.maxSteps) {
      this.stepCount++;

      try {
        // THINK: Get AI's next action
        const thinking = await this.think();

        if (!this.isRunning) break;

        // Check if AI wants to finish
        if (thinking.action === 'finish') {
          this.sendUpdate({
            type: 'system',
            message: `✅ Task completed: ${thinking.summary}`,
            timestamp: Date.now(),
          });
          this.stopTask();
          break;
        }

        // ACT: Execute the action
        const actionResult = await this.act(thinking);

        if (!this.isRunning) break;

        // OBSERVE: Process the results
        await this.observe(actionResult);

        // Small delay between steps
        await this.sleep(1000);
      } catch (error) {
        console.error('[AI Agent] Step failed:', error);
        this.sendUpdate({
          type: 'system',
          message: `⚠️ Step ${this.stepCount} failed: ${error.message}`,
          timestamp: Date.now(),
        });

        // Try to continue with error context
        this.conversationHistory.push({
          role: 'system',
          content: `Error occurred: ${error.message}. Try a different approach.`,
        });
      }
    }

    if (this.stepCount >= this.maxSteps) {
      this.sendUpdate({
        type: 'system',
        message: '⏰ Task reached maximum steps limit',
        timestamp: Date.now(),
      });
      this.stopTask();
    }
  }

  async think() {
    this.sendUpdate({
      type: 'thinking',
      message: '🤔 Thinking about next action...',
      timestamp: Date.now(),
    });

    const response = await this.openai.chat(this.conversationHistory, {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
      tools: [
        {
          type: 'function',
          function: {
            name: 'browser_action',
            description: 'Execute a browser automation action',
            parameters: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'open',
                    'click',
                    'type',
                    'extract_text',
                    'finish',
                  ],
                  description: 'The action to perform',
                },
                target: {
                  type: 'string',
                  description:
                    'CSS selector, URL, or description for the action',
                },
                text: {
                  type: 'string',
                  description: 'Text to type (for type action)',
                },
                reasoning: {
                  type: 'string',
                  description: 'Why you chose this action',
                },
                summary: {
                  type: 'string',
                  description: 'Task completion summary (for finish action)',
                },
              },
              required: ['action', 'reasoning'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'browser_action' } },
    });

    if (!response.success) {
      throw new Error(`AI thinking failed: ${response.error}`);
    }

    // Get the function call from the response
    let functionCall;
    if (response.tool_call && response.tool_call.name === 'browser_action') {
      functionCall = response.tool_call.arguments;
    } else {
      // Fallback if no tool call received
      functionCall = {
        action: 'extract_text',
        target: 'body',
        reasoning:
          'No tool call received, extracting page content to understand current state',
      };
    }

    // Check for loop detection - be more aggressive
    if (this.isRepeatingAction(functionCall)) {
      console.warn('[AI Agent] Detected repeated action, forcing progression');

      // If we're repeating navigation, switch to extracting content
      if (functionCall.action === 'open') {
        functionCall = {
          action: 'extract_text',
          target: 'body',
          reasoning:
            'Already navigated, now extracting page content to proceed with task',
        };
      }
      // If repeating click actions, try different approach
      else if (functionCall.action === 'click') {
        functionCall = {
          action: 'extract_text',
          target: 'body',
          reasoning:
            'Previous click failed, extracting page content to understand current state and find alternative approach',
        };
      }
      // If repeating extraction, try to finish or take a different action
      else if (functionCall.action === 'extract_text') {
        functionCall = {
          action: 'finish',
          summary: 'Task appears complete based on previous actions',
          reasoning: 'Preventing loop by finishing task',
        };
      }
    }

    // Record this action
    this.recordAction(functionCall);

    this.sendUpdate({
      type: 'thinking',
      message: `💭 ${functionCall.reasoning}`,
      timestamp: Date.now(),
    });

    return functionCall;
  }

  async act(thinking) {
    const actionMessage = this.getActionMessage(thinking);
    this.sendUpdate({
      type: 'action',
      message: actionMessage,
      timestamp: Date.now(),
    });

    // Handle navigation separately
    if (thinking.action === 'open') {
      try {
        await chrome.tabs.update(this.tabId, { url: thinking.target });
        await this.sleep(3000); // Wait for page load
        return {
          success: true,
          message: `Navigated to ${thinking.target}`,
          url: thinking.target,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to navigate: ${error.message}`,
        };
      }
    }

    // Send other actions to content script with timeout
    const result = await Promise.race([
      this.sendMessageToContent({
        type: 'EXECUTE_TOOL',
        tool: thinking.action,
        target: thinking.target,
        text: thinking.text,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Action timeout after 10 seconds')), 10000)
      )
    ]);

    // Add wait time after actions that might trigger navigation (like search clicks)
    if (thinking.action === 'click' && thinking.target.includes('submit')) {
      console.log('[AI Agent] Search click detected, adding wait time for navigation');
      await this.sleep(3000); // Wait for potential navigation
    }

    return result;
  }

  async observe(actionResult) {
    let observationMessage = '';

    if (actionResult.success) {
      observationMessage = `👁️ Success: ${actionResult.message}`;
      if (actionResult.data) {
        observationMessage += ` | Data: ${actionResult.data.substring(0, 100)}...`;
      }
      this.consecutiveFailures = 0; // Reset failure counter on success

      // Add smart success handling for specific actions
      if (this.lastAction && this.lastAction.action === 'click' && this.lastAction.target.includes('submit')) {
        // Search button click succeeded - tell AI to extract search results
        this.conversationHistory.push({
          role: 'system',
          content: 'Search button click was successful! The search has been submitted. Now extract the page content to see the search results and proceed with the task.',
        });
      }
    } else {
      // Handle timeout as potential success for search button clicks
      if (actionResult.error && actionResult.error.includes('timeout') && 
          this.lastAction && this.lastAction.action === 'click' && this.lastAction.target.includes('submit')) {
        console.log('[AI Agent] Search button timeout - treating as potential success');
        this.conversationHistory.push({
          role: 'system',
          content: 'Search button click timed out, but this often means the search was submitted successfully. Extract the page content to see if search results are displayed.',
        });
        // Reset failure counter since this might be a success
        this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
      }
      
      observationMessage = `❌ Failed: ${actionResult.error}`;
      this.consecutiveFailures++;

      // If action fails, suggest next logical step instead of retrying
      if (this.consecutiveFailures >= 1) {
        const nextActionSuggestion = this.getNextActionSuggestion();
        this.conversationHistory.push({
          role: 'system',
          content: `Action failed: ${actionResult.error}. ${nextActionSuggestion}`,
        });
      }

      // If too many consecutive failures, try to finish
      if (this.consecutiveFailures >= 2) {
        this.sendUpdate({
          type: 'system',
          message:
            '⚠️ Too many consecutive failures, attempting to complete task',
          timestamp: Date.now(),
        });

        // Force finish on next iteration
        this.conversationHistory.push({
          role: 'system',
          content:
            'Too many failures. Please use the finish action to complete what you can or explain what went wrong.',
        });
      }
    }

    this.sendUpdate({
      type: 'observation',
      message: observationMessage,
      timestamp: Date.now(),
    });

    // Add observation to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: `Action result: ${actionResult.success ? 'SUCCESS' : 'FAILED'}. ${actionResult.message || actionResult.error}${actionResult.data ? ` Data: ${actionResult.data}` : ''}`,
    });
  }

  getActionMessage(thinking) {
    const actionEmojis = {
      open: '🌐',
      click: '👆',
      type: '⌨️',
      extract_text: '📄',
      finish: '✅',
    };

    const emoji = actionEmojis[thinking.action] || '🔧';
    let message = `${emoji} ${thinking.action}`;

    if (thinking.target) {
      message += `: ${thinking.target}`;
    }
    if (thinking.text) {
      message += ` ("${thinking.text}")`;
    }

    return message;
  }

  getSystemPrompt() {
    return `You are an AI browser automation agent. Your goal is to complete user tasks by controlling a web browser through available tools.

AVAILABLE TOOLS:
- open(url): Navigate to a URL
- click(selector): Click an element using CSS selector  
- type(selector, text): Type text into an input field
- extract_text(selector): Get text content from elements
- finish(summary): Complete the task with a summary

CORE PRINCIPLES:
1. Think step-by-step before each action
2. Always explain your reasoning
3. Use simple, reliable selectors when possible
4. If a selector fails, try different selectors or extract page content
5. Extract page content to understand what's available
6. NEVER repeat the same action twice in a row
7. Complete tasks efficiently with minimal steps
8. ALWAYS move forward - don't get stuck in loops
9. If an action fails, try a DIFFERENT approach, don't retry the same action
10. Maximum 2 attempts per action type, then move to next logical step

TASK APPROACH:
1. If user asks to "go to" a website, open it ONCE then extract page content
2. If user asks to "search for" something, find the search box and search
3. If user asks to "buy" or "add to cart", find and click the appropriate buttons
4. ALWAYS progress the task - each action should move closer to completion
5. After successful navigation, immediately proceed to the next logical step
6. Use extract_text to understand what's on the page before taking action
7. Finish when the main objective is complete

CRITICAL: Never repeat actions. If you just navigated somewhere, immediately extract page content or take the next action. Don't navigate to the same place twice.

Example flows:
User: "Go to Amazon and search for headphones"
1. open(amazon.com) 
2. extract_text(body) - see what's on the page
3. type(input[name='field-keywords'], "headphones")
4. click(input[type='submit']) - if timeout, extract page content to check if search worked
5. extract_text(body) - see search results
6. click(.s-result-item .a-link-normal) - click first result
7. click(#add-to-cart-button) - add to cart
8. finish("Successfully added headphones to cart")

User: "Go to Google and search for Reddit"
1. open(google.com)
2. extract_text(body) - see what's on the page  
3. type([name='q'], "Reddit")
4. click([name='btnK']) - if timeout, extract page content to check if search worked
5. finish("Successfully searched for Reddit on Google")

Remember: PROGRESS THE TASK with each step. Don't repeat actions. If one approach fails, try a different one.`;
  }

  async sendMessageToContent(message) {
    // Use the background script's robust message sending with retry logic
    if (this.backgroundScript && this.backgroundScript.sendMessageToTab) {
      console.log('[AI Agent] Using robust messaging via background script');
      return await this.backgroundScript.sendMessageToTab(this.tabId, message);
    }

    // Fallback to simple message sending (shouldn't happen in normal flow)
    console.warn('[AI Agent] Using fallback messaging - may fail with bfcache');
    return new Promise(resolve => {
      chrome.tabs.sendMessage(this.tabId, message, response => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  sendUpdate(update) {
    // Send update to sidepanel
    chrome.runtime
      .sendMessage({
        type: 'AGENT_UPDATE',
        data: update,
      })
      .catch(error => {
        console.error('[AI Agent] Failed to send update:', error);
      });
  }

  isRepeatingAction(functionCall) {
    // Check if this exact action was just performed
    if (
      this.lastAction &&
      this.lastAction.action === functionCall.action &&
      this.lastAction.target === functionCall.target
    ) {
      console.log('[AI Agent] Exact same action detected:', functionCall);
      return true;
    }

    // Check if we've done this action multiple times recently (more aggressive)
    const recentActions = this.actionHistory.slice(-2); // Only check last 2 actions
    const sameActionCount = recentActions.filter(
      action =>
        action.action === functionCall.action &&
        action.target === functionCall.target
    ).length;

    if (sameActionCount >= 1) {
      console.log('[AI Agent] Repeated action detected in recent history:', functionCall);
      return true;
    }

    return false;
  }

  recordAction(functionCall) {
    const actionRecord = {
      action: functionCall.action,
      target: functionCall.target,
      text: functionCall.text,
      timestamp: Date.now(),
      step: this.stepCount,
    };

    this.lastAction = actionRecord;
    this.actionHistory.push(actionRecord);

    // Keep only last 10 actions
    if (this.actionHistory.length > 10) {
      this.actionHistory = this.actionHistory.slice(-10);
    }
  }

  getNextActionSuggestion() {
    // Get the last action to suggest what to try next
    if (!this.lastAction) {
      return 'Try extracting page content to understand what\'s available.';
    }

    const lastAction = this.lastAction.action;
    const lastTarget = this.lastAction.target;

    // Suggest logical next steps based on what failed
    if (lastAction === 'click') {
      if (lastTarget.includes('search') || lastTarget.includes('btn') || lastTarget.includes('submit')) {
        return 'The search button click failed. Try extracting page content to see if the search was successful, or try pressing Enter in the search box instead.';
      }
      return 'The click failed. Try extract_text to see what\'s available on the page, or try a different selector.';
    }

    if (lastAction === 'type') {
      return 'The typing failed. Try extracting page content to see if the input field is available, or try a different selector.';
    }

    if (lastAction === 'extract_text') {
      return 'Text extraction failed. Try a different selector or approach.';
    }


    return 'Try a different approach or extract page content to understand what\'s available.';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AIAgent;
