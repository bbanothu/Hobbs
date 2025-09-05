/**
 * Chrome Storage utilities for the extension
 */

class StorageManager {
  constructor() {
    this.KEYS = {
      TARGET_WEBSITE: 'targetWebsite',
      ADDED_ITEMS: 'addedItems',
      SETTINGS: 'settings',
      CHAT_HISTORY: 'chatHistory',
      CREDENTIALS: 'credentials',
    };
  }

  // Get data from Chrome storage
  async get(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  // Set data in Chrome storage
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      console.log(`Storage: Saved ${key}`);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  // Get target website from storage
  async getTargetWebsite() {
    const cached = await this.get(this.KEYS.TARGET_WEBSITE);
    return cached || 'auto'; // Default to auto-detect
  }

  // Save target website to storage
  async setTargetWebsite(site) {
    return await this.set(this.KEYS.TARGET_WEBSITE, site);
  }

  // Get all added items from storage
  async getAddedItems() {
    const items = await this.get(this.KEYS.ADDED_ITEMS);
    return items || [];
  }

  // Add a successfully added item to storage
  async addSuccessfulItem(itemData) {
    try {
      const existingItems = await this.getAddedItems();

      const newItem = {
        id: Date.now() + Math.random(), // Unique ID
        timestamp: new Date().toISOString(),
        site: itemData.site || 'unknown',
        name: itemData.name || 'Unknown Product',
        price: itemData.price || null,
        image: itemData.image || null,
        url: itemData.url || null,
        category: itemData.category || null,
        originalRequest: itemData.originalRequest || null,
      };

      existingItems.unshift(newItem); // Add to beginning of array

      // Keep only last 50 items to prevent storage bloat
      const trimmedItems = existingItems.slice(0, 50);

      await this.set(this.KEYS.ADDED_ITEMS, trimmedItems);
      console.log('Storage: Added successful item:', newItem.name);

      return newItem;
    } catch (error) {
      console.error('Storage: Failed to add item:', error);
      return null;
    }
  }

  // Clear all added items
  async clearAddedItems() {
    return await this.set(this.KEYS.ADDED_ITEMS, []);
  }

  // Get chat history from storage
  async getChatHistory() {
    const history = await this.get(this.KEYS.CHAT_HISTORY);
    return history || [];
  }

  // Save chat history to storage
  async saveChatHistory(messages) {
    try {
      // Keep only last 100 messages to prevent storage bloat
      const trimmedMessages = messages.slice(-100);
      await this.set(this.KEYS.CHAT_HISTORY, trimmedMessages);
      console.log(
        'Storage: Saved chat history with',
        trimmedMessages.length,
        'messages'
      );
      return true;
    } catch (error) {
      console.error('Storage: Failed to save chat history:', error);
      return false;
    }
  }

  // Clear chat history
  async clearChatHistory() {
    return await this.set(this.KEYS.CHAT_HISTORY, []);
  }

  // Get all credentials
  async getCredentials() {
    const credentials = await this.get(this.KEYS.CREDENTIALS);
    return credentials || {};
  }

  // Get credentials for a specific website
  async getCredentialsForSite(hostname) {
    try {
      const allCredentials = await this.getCredentials();
      return allCredentials[hostname] || null;
    } catch (error) {
      console.error('Storage: Failed to get credentials for site:', error);
      return null;
    }
  }

  // Save credentials for a specific website
  async saveCredentialsForSite(hostname, username, password) {
    try {
      const allCredentials = await this.getCredentials();

      allCredentials[hostname] = {
        username: username,
        password: password,
        lastUsed: new Date().toISOString(),
      };

      await this.set(this.KEYS.CREDENTIALS, allCredentials);
      console.log(`Storage: Saved credentials for ${hostname}`);
      return true;
    } catch (error) {
      console.error('Storage: Failed to save credentials:', error);
      return false;
    }
  }

  // Clear credentials for a specific website
  async clearCredentialsForSite(hostname) {
    try {
      const allCredentials = await this.getCredentials();
      delete allCredentials[hostname];
      await this.set(this.KEYS.CREDENTIALS, allCredentials);
      console.log(`Storage: Cleared credentials for ${hostname}`);
      return true;
    } catch (error) {
      console.error('Storage: Failed to clear credentials:', error);
      return false;
    }
  }

  // Clear all credentials
  async clearAllCredentials() {
    return await this.set(this.KEYS.CREDENTIALS, {});
  }

  // Get storage usage stats
  async getStorageStats() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      return {
        used: usage,
        total: quota,
        percentage: ((usage / quota) * 100).toFixed(2),
      };
    } catch (error) {
      console.error('Storage stats error:', error);
      return null;
    }
  }
}

export default StorageManager;
export { StorageManager };
