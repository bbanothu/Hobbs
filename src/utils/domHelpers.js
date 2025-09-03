/**
 * DOM manipulation and automation helpers
 */

class DOMHelpers {
  constructor() {
    this.maxRetries = 3;
    this.defaultTimeout = 5000;
  }

  // Wait for element to appear
  async waitForElement(selector, timeout = this.defaultTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(
            new Error(`Element ${selector} not found within ${timeout}ms`)
          );
          return;
        }

        setTimeout(checkElement, 100);
      };

      checkElement();
    });
  }

  // Wait for multiple elements
  async waitForAnyElement(selectors, timeout = this.defaultTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElements = () => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            resolve({ element, selector });
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          reject(
            new Error(
              `None of the elements found within ${timeout}ms: ${selectors.join(', ')}`
            )
          );
          return;
        }

        setTimeout(checkElements, 100);
      };

      checkElements();
    });
  }

  // Click element with retry
  async clickElement(selector, timeout = this.defaultTimeout) {
    const element = await this.waitForElement(selector, timeout);

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait a bit for scroll
    await this.sleep(500);

    // Try regular click first
    try {
      element.click();
      return true;
    } catch (error) {
      console.warn('Regular click failed, trying programmatic click:', error);

      // Fallback to programmatic click
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      element.dispatchEvent(event);
      return true;
    }
  }

  // Type text into input
  async typeText(selector, text, timeout = this.defaultTimeout) {
    const element = await this.waitForElement(selector, timeout);

    // Clear existing text
    element.value = '';
    element.focus();

    // Type character by character for more realistic input
    for (const char of text) {
      element.value += char;

      // Dispatch input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      await this.sleep(50); // Small delay between characters
    }

    // Final events
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    element.blur();

    return true;
  }

  // Select dropdown option
  async selectOption(
    selectSelector,
    optionValue,
    timeout = this.defaultTimeout
  ) {
    const selectElement = await this.waitForElement(selectSelector, timeout);

    // Try to find option by value or text
    const options = selectElement.querySelectorAll('option');
    let targetOption = null;

    for (const option of options) {
      if (
        option.value === optionValue ||
        option.textContent.toLowerCase().includes(optionValue.toLowerCase())
      ) {
        targetOption = option;
        break;
      }
    }

    if (!targetOption) {
      throw new Error(
        `Option "${optionValue}" not found in select ${selectSelector}`
      );
    }

    selectElement.value = targetOption.value;
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  }

  // Extract text content safely
  extractText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : null;
  }

  // Extract attribute safely
  extractAttribute(selector, attribute) {
    const element = document.querySelector(selector);
    return element ? element.getAttribute(attribute) : null;
  }

  // Check if element exists
  elementExists(selector) {
    return document.querySelector(selector) !== null;
  }

  // Get all matching elements
  getAllElements(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Scroll to element
  async scrollToElement(selector, timeout = this.defaultTimeout) {
    const element = await this.waitForElement(selector, timeout);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(500);
    return element;
  }

  // Wait for page to load
  async waitForPageLoad(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }

      const startTime = Date.now();

      const checkState = () => {
        if (document.readyState === 'complete') {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
          return;
        }

        setTimeout(checkState, 100);
      };

      checkState();
    });
  }

  // Execute with retry logic
  async executeWithRetry(fn, maxRetries = this.maxRetries) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed:`, error.message);

        if (i < maxRetries - 1) {
          await this.sleep(1000 * (i + 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  // Check if element is visible
  isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }

  // Find best matching element from multiple candidates
  findBestMatch(elements, searchText) {
    if (!elements || elements.length === 0) return null;
    if (elements.length === 1) return elements[0];

    const lowerSearchText = searchText.toLowerCase();

    // Score each element based on text similarity
    const scored = elements.map(element => {
      const text = element.textContent.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (text === lowerSearchText) score += 100;

      // Contains search text
      if (text.includes(lowerSearchText)) score += 50;

      // Word matches
      const searchWords = lowerSearchText.split(/\s+/);
      const textWords = text.split(/\s+/);

      for (const searchWord of searchWords) {
        for (const textWord of textWords) {
          if (textWord === searchWord) score += 10;
          if (textWord.includes(searchWord)) score += 5;
        }
      }

      // Prefer visible elements
      if (this.isElementVisible(element)) score += 20;

      return { element, score, text };
    });

    // Sort by score and return best match
    scored.sort((a, b) => b.score - a.score);
    return scored[0].element;
  }
}

export default DOMHelpers;
export { DOMHelpers };
