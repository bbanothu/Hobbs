/**
 * Site adapter factory and base classes
 */

import DOMHelpers from '../utils/domHelpers.js';

// Base adapter class
export class SiteAdapter {
  constructor() {
    this.dom = new DOMHelpers();
    this.siteName = 'generic';
  }

  async findProducts(intent) {
    throw new Error('findProducts must be implemented by subclass');
  }

  async selectBestProduct(intent) {
    throw new Error('selectBestProduct must be implemented by subclass');
  }

  async addToCart() {
    throw new Error('addToCart must be implemented by subclass');
  }

  async verifyCartAddition() {
    throw new Error('verifyCartAddition must be implemented by subclass');
  }

  async getProductInfo() {
    return {
      name: 'Unknown Product',
      price: null,
      url: window.location.href,
    };
  }
}

// Fake Store Demo adapter
export class FakeStoreAdapter extends SiteAdapter {
  constructor() {
    super();
    this.siteName = 'fake-store-demo';
  }

  async findProducts(intent) {
    try {
      // Wait for products to load
      await this.dom.waitForElement('.MuiImageListItem-root', 5000);
      const products = this.dom.getAllElements('.MuiImageListItem-root');
      console.log(`FakeStore: Found ${products.length} products`);
      return products.length > 0;
    } catch (error) {
      console.error('FakeStore: Products not found:', error);
      return false;
    }
  }

  async selectBestProduct(intent) {
    try {
      const productElements = this.dom.getAllElements('.MuiImageListItem-root');

      if (productElements.length === 0) {
        return false;
      }

      // Score products based on intent
      let bestProduct = null;
      let bestScore = 0;

      for (const product of productElements) {
        const score = this.scoreProduct(product, intent);
        console.log('Product score:', score, this.getProductTitle(product));

        if (score > bestScore) {
          bestScore = score;
          bestProduct = product;
        }
      }

      if (!bestProduct) {
        bestProduct = productElements[0]; // Fallback to first product
      }

      console.log(
        'FakeStore: Selected product:',
        this.getProductTitle(bestProduct)
      );

      // Store selected product for later use
      this.selectedProduct = bestProduct;
      return true;
    } catch (error) {
      console.error('FakeStore: Product selection failed:', error);
      return false;
    }
  }

  scoreProduct(productElement, intent) {
    let score = 0;

    const titleElement = productElement.querySelector('h4[title]');
    const categoryElement = productElement.querySelector(
      'p.MuiTypography-subtitle1'
    );
    const priceElement = productElement.querySelector('p.MuiTypography-h6');

    if (!titleElement) return 0;

    const title = titleElement.textContent.toLowerCase();
    const category = categoryElement
      ? categoryElement.textContent.toLowerCase()
      : '';
    const price = priceElement
      ? this.extractPrice(priceElement.textContent)
      : null;

    console.log(
      `Scoring: "${title}" | Category: "${category}" | Price: $${price}`
    );

    // Category matching
    if (intent.category) {
      if (
        category.includes(intent.category) ||
        title.includes(intent.category)
      ) {
        score += 30;
        console.log('Category match: +30');
      }
    }

    // Price matching
    if (intent.maxPrice && price && price <= intent.maxPrice) {
      score += 25;
      console.log('Price within budget: +25');
    } else if (intent.maxPrice && price && price > intent.maxPrice) {
      score -= 10;
      console.log('Price over budget: -10');
    }

    // Keyword matching
    for (const keyword of intent.keywords) {
      if (title.includes(keyword.toLowerCase())) {
        score += 10;
        console.log(`Keyword "${keyword}" match: +10`);
      }
    }

    // Gender matching
    if (intent.gender) {
      if (title.includes('men') && intent.gender.includes('men')) {
        score += 15;
        console.log("Men's product match: +15");
      }
      if (title.includes('women') && intent.gender.includes('women')) {
        score += 15;
        console.log("Women's product match: +15");
      }
    }

    // Color matching
    if (intent.color && title.includes(intent.color.toLowerCase())) {
      score += 20;
      console.log(`Color "${intent.color}" match: +20`);
    }

    console.log(`Final score: ${score}`);
    return score;
  }

  getProductTitle(productElement) {
    const titleElement = productElement.querySelector('h4[title]');
    return titleElement ? titleElement.textContent : 'Unknown Product';
  }

  extractPrice(priceText) {
    const match = priceText.match(/\$?([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(',', '')) : null;
  }

  async addToCart() {
    try {
      if (!this.selectedProduct) {
        console.error('FakeStore: No product selected');
        return false;
      }

      // First, try to find the "Add to cart" button in the selected product
      const addButton = this.selectedProduct.querySelector(
        'button.MuiButton-contained'
      );

      if (addButton) {
        const buttonText = addButton.textContent.toLowerCase();
        if (buttonText.includes('add to cart')) {
          console.log('FakeStore: Clicking add to cart button');
          addButton.click();

          // Wait for cart update
          await this.dom.sleep(1000);
          return true;
        }
      }

      // If regular "Add to cart" button not found, try the "+" icon button
      console.log(
        'FakeStore: Regular add to cart button not found, trying + icon button'
      );
      const iconButton = this.selectedProduct.querySelector(
        'button[aria-label="Action Button"] svg[data-testid="AddIcon"]'
      );

      if (iconButton) {
        console.log('FakeStore: Clicking + icon button');
        iconButton.closest('button').click();

        // Wait for cart update
        await this.dom.sleep(1000);
        return true;
      }

      // Also try a more general selector for the + button
      const plusButton = this.selectedProduct.querySelector(
        'button.MuiIconButton-root[aria-label="Action Button"]'
      );

      if (plusButton) {
        console.log('FakeStore: Clicking + action button');
        plusButton.click();

        // Wait for cart update
        await this.dom.sleep(1000);
        return true;
      }

      console.error(
        'FakeStore: Neither add to cart button nor + icon button found'
      );
      return false;
    } catch (error) {
      console.error('FakeStore: Add to cart failed:', error);
      return false;
    }
  }

  async verifyCartAddition() {
    try {
      // Check cart badge count
      const cartBadge = document.querySelector('.MuiBadge-badge');
      if (cartBadge) {
        const cartCount = parseInt(cartBadge.textContent) || 0;
        console.log('FakeStore: Cart count:', cartCount);
        return cartCount > 0;
      }

      // Assume success if no badge found
      console.log('FakeStore: No cart badge found, assuming success');
      return true;
    } catch (error) {
      console.error('FakeStore: Cart verification failed:', error);
      return false;
    }
  }

  async getProductInfo() {
    try {
      if (!this.selectedProduct) {
        return super.getProductInfo();
      }

      const title = this.getProductTitle(this.selectedProduct);
      const priceElement =
        this.selectedProduct.querySelector('p.MuiTypography-h6');
      const categoryElement = this.selectedProduct.querySelector(
        'p.MuiTypography-subtitle1'
      );
      const imageElement = this.selectedProduct.querySelector('img');
      const price = priceElement ? priceElement.textContent : null;

      return {
        name: title,
        price: price,
        image: imageElement ? imageElement.src : null,
        category: categoryElement ? categoryElement.textContent : null,
        url: window.location.href,
      };
    } catch (error) {
      console.error('FakeStore: Failed to get product info:', error);
      return super.getProductInfo();
    }
  }
}

// Factory function to get appropriate adapter
export function getSiteAdapter(url) {
  const hostname = new URL(url).hostname.toLowerCase();

  // Check for Fake Store Demo
  if (
    hostname.includes('fake-store-demo.vercel.app') ||
    url.includes('/store') ||
    document.title === 'Fake Store'
  ) {
    return new FakeStoreAdapter();
  }

  // Sauce Demo adapter
  if (hostname.includes('saucedemo.com')) {
    return new SauceDemoAdapter();
  }

  // Future: Add OpenCart adapter
  // if (hostname.includes('demo-opencart.com')) {
  //   return new OpenCartAdapter();
  // }

  return new SiteAdapter(); // Generic fallback
}

// Sauce Demo adapter
export class SauceDemoAdapter extends SiteAdapter {
  constructor() {
    super();
    this.siteName = 'sauce-demo';
  }

  async findProducts(intent) {
    try {
      // Check if we're on the login page
      if (this.isLoginPage()) {
        console.log('SauceDemo: On login page, need to login first');
        return false; // Will trigger login flow
      }

      // Wait for inventory page to load
      await this.dom.waitForElement('.inventory_item', 5000);
      const products = this.dom.getAllElements('.inventory_item');
      console.log(`SauceDemo: Found ${products.length} products`);
      return products.length > 0;
    } catch (error) {
      console.error('SauceDemo: Products not found:', error);
      return false;
    }
  }

  isLoginPage() {
    return document.querySelector('#login-button') !== null;
  }

  async login(username, password) {
    try {
      console.log('SauceDemo: Attempting login...');

      // Fill username
      const usernameField = document.querySelector('#user-name');
      if (usernameField) {
        usernameField.value = username;
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Fill password
      const passwordField = document.querySelector('#password');
      if (passwordField) {
        passwordField.value = password;
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Click login button
      const loginButton = document.querySelector('#login-button');
      if (loginButton) {
        loginButton.click();

        // Wait for navigation to inventory page
        await this.dom.sleep(2000);

        // Check if we're now on inventory page
        const inventoryLoaded = await this.dom.waitForElement(
          '.inventory_item',
          5000
        );
        console.log('SauceDemo: Login successful, inventory loaded');
        return true;
      }

      return false;
    } catch (error) {
      console.error('SauceDemo: Login failed:', error);
      return false;
    }
  }

  async selectBestProduct(intent) {
    try {
      const productElements = this.dom.getAllElements('.inventory_item');

      if (productElements.length === 0) {
        return false;
      }

      // Filter out products that are already in cart (have REMOVE button)
      const availableProducts = productElements.filter(product => {
        const button = product.querySelector('.btn_inventory');
        const isInCart = button && button.textContent.includes('REMOVE');
        if (isInCart) {
          console.log(
            'SauceDemo: Skipping already added product:',
            this.getProductTitle(product)
          );
        }
        return !isInCart;
      });

      console.log(
        `SauceDemo: Found ${availableProducts.length} available products out of ${productElements.length} total`
      );

      if (availableProducts.length === 0) {
        console.error(
          'SauceDemo: No available products to add (all already in cart)'
        );
        return false;
      }

      // Score products based on intent
      let bestProduct = null;
      let bestScore = 0;

      for (const product of availableProducts) {
        const score = this.scoreProduct(product, intent);
        console.log('Product score:', score, this.getProductTitle(product));

        if (score > bestScore) {
          bestScore = score;
          bestProduct = product;
        }
      }

      if (!bestProduct) {
        bestProduct = availableProducts[0]; // Fallback to first available product
      }

      console.log(
        'SauceDemo: Selected product:',
        this.getProductTitle(bestProduct),
        'with score:',
        bestScore
      );

      // Store selected product for later use
      this.selectedProduct = bestProduct;
      return true;
    } catch (error) {
      console.error('SauceDemo: Product selection failed:', error);
      return false;
    }
  }

  scoreProduct(productElement, intent) {
    let score = 0;

    const titleElement = productElement.querySelector('.inventory_item_name');
    const descElement = productElement.querySelector('.inventory_item_desc');
    const priceElement = productElement.querySelector('.inventory_item_price');

    if (!titleElement) return 0;

    const title = titleElement.textContent.toLowerCase();
    const description = descElement
      ? descElement.textContent.toLowerCase()
      : '';
    const price = priceElement
      ? this.extractPrice(priceElement.textContent)
      : null;

    console.log(
      `Scoring: "${title}" | Desc: "${description}" | Price: $${price}`
    );

    // Category matching based on product names
    if (intent.category) {
      const categoryKeywords = {
        clothing: ['shirt', 't-shirt', 'onesie'],
        accessories: ['backpack', 'light'],
        sports: ['bike'],
      };

      const keywords = categoryKeywords[intent.category] || [];

      if (
        keywords.some(
          keyword => title.includes(keyword) || description.includes(keyword)
        )
      ) {
        score += 30;
        console.log('Category match: +30');
      }
    }

    // Price matching
    if (intent.maxPrice && price && price <= intent.maxPrice) {
      score += 25;
      console.log('Price within budget: +25');
    } else if (intent.maxPrice && price && price > intent.maxPrice) {
      score -= 10;
      console.log('Price over budget: -10');
    }

    // Keyword matching
    for (const keyword of intent.keywords) {
      if (
        title.includes(keyword.toLowerCase()) ||
        description.includes(keyword.toLowerCase())
      ) {
        score += 10;
        console.log(`Keyword "${keyword}" match: +10`);
      }
    }

    // Color matching
    if (
      intent.color &&
      (title.includes(intent.color.toLowerCase()) ||
        description.includes(intent.color.toLowerCase()))
    ) {
      score += 20;
      console.log(`Color "${intent.color}" match: +20`);
    }

    console.log(`Final score: ${score}`);
    return score;
  }

  getProductTitle(productElement) {
    const titleElement = productElement.querySelector('.inventory_item_name');
    return titleElement ? titleElement.textContent : 'Unknown Product';
  }

  extractPrice(priceText) {
    const match = priceText.match(/\$?([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(',', '')) : null;
  }

  async addToCart() {
    try {
      if (!this.selectedProduct) {
        console.error('SauceDemo: No product selected');
        return false;
      }

      // Find the "ADD TO CART" button in the selected product
      const addButton = this.selectedProduct.querySelector(
        '.btn_primary.btn_inventory'
      );

      if (addButton && addButton.textContent.includes('ADD TO CART')) {
        console.log('SauceDemo: Button text:', addButton.textContent);
        console.log('SauceDemo: Clicking add to cart button');
        addButton.click();

        // Wait for the button text to change to "REMOVE"
        await this.dom.sleep(500);

        // Check if button text changed to "REMOVE"
        const updatedButtonText = addButton.textContent;
        console.log('SauceDemo: Button text after click:', updatedButtonText);

        if (updatedButtonText.includes('REMOVE')) {
          console.log(
            'SauceDemo: Successfully added to cart - button changed to REMOVE'
          );
          return true;
        } else {
          console.error('SauceDemo: Button text did not change to REMOVE');
          return false;
        }
      }

      // Check if product is already in cart (has REMOVE button)
      const removeButton = this.selectedProduct.querySelector(
        '.btn_secondary.btn_inventory'
      );
      if (removeButton && removeButton.textContent.includes('REMOVE')) {
        console.log(
          'SauceDemo: Product is already in cart (has REMOVE button)'
        );
        return true; // Consider this a success since item is already in cart
      }

      console.error('SauceDemo: Add to cart button not found');
      return false;
    } catch (error) {
      console.error('SauceDemo: Add to cart failed:', error);
      return false;
    }
  }

  async verifyCartAddition() {
    try {
      // Check cart badge count
      const cartBadge = document.querySelector('.shopping_cart_badge');
      if (cartBadge) {
        const cartCount = parseInt(cartBadge.textContent) || 0;
        console.log('SauceDemo: Cart count:', cartCount);
        return cartCount > 0;
      }

      // Check if the button text changed to "REMOVE"
      if (this.selectedProduct) {
        const button = this.selectedProduct.querySelector(
          '.btn_primary.btn_inventory'
        );
        if (button && button.textContent.includes('REMOVE')) {
          console.log('SauceDemo: Button changed to REMOVE, item added');
          return true;
        }
      }

      console.log('SauceDemo: No clear cart verification, assuming success');
      return true;
    } catch (error) {
      console.error('SauceDemo: Cart verification failed:', error);
      return false;
    }
  }

  async getProductInfo() {
    try {
      if (!this.selectedProduct) {
        return super.getProductInfo();
      }

      const title = this.getProductTitle(this.selectedProduct);
      const priceElement = this.selectedProduct.querySelector(
        '.inventory_item_price'
      );
      const descElement = this.selectedProduct.querySelector(
        '.inventory_item_desc'
      );
      const imageElement = this.selectedProduct.querySelector(
        '.inventory_item_img img'
      );
      const price = priceElement ? priceElement.textContent : null;

      return {
        name: title,
        price: price,
        image: imageElement ? imageElement.src : null,
        category: 'product', // Sauce Demo doesn't have explicit categories
        description: descElement ? descElement.textContent : null,
        url: window.location.href,
      };
    } catch (error) {
      console.error('SauceDemo: Failed to get product info:', error);
      return super.getProductInfo();
    }
  }
}

export default {
  SiteAdapter,
  FakeStoreAdapter,
  SauceDemoAdapter,
  getSiteAdapter,
};
