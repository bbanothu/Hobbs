/**
 * Browser Tools - DOM automation utilities for AI Agent
 * Provides tools for web page interaction and analysis
 */

class BrowserTools {
  constructor() {
    this.lastAction = null;
    this.actionHistory = [];
  }

  async executeAction(tool, target, text) {
    console.log(`[Browser Tools] Executing ${tool}:`, { target, text });

    try {
      switch (tool) {
        case 'click':
          return await this.click(target);
        case 'type':
          return await this.type(target, text);
        case 'extract_text':
          return await this.extractText(target);
        default:
          return {
            success: false,
            error: `Unknown tool: ${tool}`,
          };
      }
    } catch (error) {
      console.error(`[Browser Tools] ${tool} failed:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async click(selector) {
    try {
      console.log(`[Browser Tools] Clicking: ${selector}`);

      // Support for :contains() pseudo-selector
      const element = document.querySelector(selector);

      if (!element) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
          selector,
        };
      }

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(500);

      // Click the element
      element.click();
      await this.sleep(500);

      this.recordAction('click', selector);

      return {
        success: true,
        message: `Clicked: ${selector}`,
        selector,
        elementText: element.textContent?.trim().substring(0, 50) || '',
      };
    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${error.message}`,
        selector,
      };
    }
  }

  async type(selector, text) {
    try {
      console.log(`[Browser Tools] Typing "${text}" into: ${selector}`);

      const element = document.querySelector(selector);

      if (!element) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
          selector,
        };
      }

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(500);

      // Focus and clear
      element.focus();
      element.value = '';

      // Type character by character for more realistic input
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.sleep(50);
      }

      // Trigger change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
      await this.sleep(200);

      this.recordAction('type', selector, text);

      return {
        success: true,
        message: `Typed "${text}" into: ${selector}`,
        selector,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: `Type failed: ${error.message}`,
        selector,
        text,
      };
    }
  }

  async extractText(selector = 'body') {
    try {
      console.log(`[Browser Tools] Extracting text from: ${selector}`);

      const elements = document.querySelectorAll(selector);

      if (elements.length === 0) {
        return {
          success: false,
          error: `No elements found: ${selector}`,
          selector,
        };
      }

      // Extract text from all matching elements
      const extractedText = Array.from(elements)
        .map(el => {
          // Get text content, but clean up whitespace
          const text = el.textContent || el.innerText || '';
          return text.replace(/\s+/g, ' ').trim();
        })
        .filter(text => text.length > 0)
        .join('\n\n');

      // Also extract key page information
      const pageInfo = {
        title: document.title,
        url: window.location.href,
        headings: Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter(Boolean)
          .slice(0, 10),
        buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
          .map(btn => btn.textContent?.trim() || btn.value?.trim())
          .filter(Boolean)
          .slice(0, 10),
        links: Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.textContent?.trim())
          .filter(Boolean)
          .slice(0, 10),
        inputs: Array.from(document.querySelectorAll('input, textarea, select'))
          .map(input => ({
            type: input.type || input.tagName.toLowerCase(),
            placeholder: input.placeholder || '',
            label: input.getAttribute('aria-label') || input.getAttribute('name') || ''
          }))
          .slice(0, 10)
      };

      this.recordAction('extract_text', selector);

      return {
        success: true,
        message: `Extracted text from: ${selector}`,
        selector,
        text: extractedText.substring(0, 5000), // Limit text length
        pageInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Text extraction failed: ${error.message}`,
      };
    }
  }



  recordAction(action, target, data = null) {
    const actionRecord = {
      action,
      target,
      data,
      timestamp: Date.now(),
    };

    this.lastAction = actionRecord;
    this.actionHistory.push(actionRecord);

    // Keep only last 50 actions
    if (this.actionHistory.length > 50) {
      this.actionHistory = this.actionHistory.slice(-50);
    }

    console.log(`[Browser Tools] Action recorded:`, actionRecord);
  }

  getActionHistory() {
    return this.actionHistory;
  }

  getLastAction() {
    return this.lastAction;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Add CSS selector extension for text matching
if (typeof document !== 'undefined') {
  // Extend CSS selectors to support :contains() pseudo-selector
  const originalQuerySelector = document.querySelector;
  const originalQuerySelectorAll = document.querySelectorAll;

  document.querySelector = function (selector) {
    if (selector.includes(':contains(')) {
      return findElementByText(selector, this);
    }
    return originalQuerySelector.call(this, selector);
  };

  document.querySelectorAll = function (selector) {
    if (selector.includes(':contains(')) {
      return findElementsByText(selector, this);
    }
    return originalQuerySelectorAll.call(this, selector);
  };

  function findElementByText(selector, context = document) {
    const match = selector.match(/^([^:]*):contains\(["']([^"']+)["']\)(.*)$/);
    if (!match) return null;

    const [, baseSelector, text, afterSelector] = match;
    const elements = context.querySelectorAll(baseSelector || '*');

    for (const el of elements) {
      if (el.textContent.includes(text)) {
        if (afterSelector) {
          return el.querySelector(afterSelector);
        }
        return el;
      }
    }
    return null;
  }

  function findElementsByText(selector, context = document) {
    const match = selector.match(/^([^:]*):contains\(["']([^"']+)["']\)(.*)$/);
    if (!match) return [];

    const [, baseSelector, text, afterSelector] = match;
    const elements = context.querySelectorAll(baseSelector || '*');
    const results = [];

    for (const el of elements) {
      if (el.textContent.includes(text)) {
        if (afterSelector) {
          const subElements = el.querySelectorAll(afterSelector);
          results.push(...subElements);
        } else {
          results.push(el);
        }
      }
    }
    return results;
  }
}

export default BrowserTools;