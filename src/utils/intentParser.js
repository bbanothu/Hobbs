/**
 * Parse user intent from natural language request
 */

class IntentParser {
  constructor() {
    this.patterns = {
      // Product categories
      categories: {
        clothing: [
          'shirt',
          't-shirt',
          'tshirt',
          'pants',
          'jeans',
          'dress',
          'jacket',
          'sweater',
          'hoodie',
          'shorts',
        ],
        electronics: [
          'phone',
          'laptop',
          'computer',
          'tablet',
          'headphones',
          'mouse',
          'keyboard',
          'monitor',
          'tv',
        ],
        home: [
          'mug',
          'cup',
          'plate',
          'bowl',
          'pillow',
          'blanket',
          'lamp',
          'chair',
          'table',
        ],
        sports: [
          'shoes',
          'sneakers',
          'running',
          'basketball',
          'football',
          'tennis',
          'gym',
          'fitness',
        ],
        books: ['book', 'novel', 'textbook', 'magazine', 'journal'],
        beauty: ['makeup', 'skincare', 'perfume', 'shampoo', 'lotion', 'cream'],
      },

      // Sizes
      sizes: {
        clothing: [
          'xs',
          'extra small',
          's',
          'small',
          'm',
          'medium',
          'l',
          'large',
          'xl',
          'extra large',
          'xxl',
        ],
        shoes: [
          '6',
          '6.5',
          '7',
          '7.5',
          '8',
          '8.5',
          '9',
          '9.5',
          '10',
          '10.5',
          '11',
          '11.5',
          '12',
        ],
      },

      // Colors
      colors: [
        'black',
        'white',
        'red',
        'blue',
        'green',
        'yellow',
        'orange',
        'purple',
        'pink',
        'brown',
        'gray',
        'grey',
        'navy',
        'beige',
      ],

      // Price patterns
      pricePatterns: [
        /under\s*\$?(\d+)/i,
        /below\s*\$?(\d+)/i,
        /less\s+than\s*\$?(\d+)/i,
        /\$?(\d+)\s*or\s+less/i,
        /maximum\s*\$?(\d+)/i,
        /max\s*\$?(\d+)/i,
      ],

      // Gender patterns
      genders: [
        "men's",
        'mens',
        "women's",
        'womens',
        'unisex',
        'boys',
        'girls',
        'kids',
      ],

      // Brands (common ones)
      brands: [
        'nike',
        'adidas',
        'apple',
        'samsung',
        'sony',
        'amazon',
        'target',
        'walmart',
      ],
    };
  }

  parse(request) {
    const intent = {
      originalRequest: request,
      category: null,
      subcategory: null,
      size: null,
      color: null,
      maxPrice: null,
      gender: null,
      brand: null,
      keywords: [],
      confidence: 0,
    };

    const lowerRequest = request.toLowerCase();

    // Extract category
    intent.category = this.extractCategory(lowerRequest);

    // Extract size
    intent.size = this.extractSize(lowerRequest, intent.category);

    // Extract color
    intent.color = this.extractColor(lowerRequest);

    // Extract price
    intent.maxPrice = this.extractMaxPrice(lowerRequest);

    // Extract gender
    intent.gender = this.extractGender(lowerRequest);

    // Extract brand
    intent.brand = this.extractBrand(lowerRequest);

    // Extract keywords (remaining meaningful words)
    intent.keywords = this.extractKeywords(lowerRequest, intent);

    // Calculate confidence score
    intent.confidence = this.calculateConfidence(intent);

    return intent;
  }

  extractCategory(request) {
    for (const [category, keywords] of Object.entries(
      this.patterns.categories
    )) {
      for (const keyword of keywords) {
        if (request.includes(keyword)) {
          return category;
        }
      }
    }
    return null;
  }

  extractSize(request, category) {
    const sizePattern =
      category === 'sports'
        ? this.patterns.sizes.shoes
        : this.patterns.sizes.clothing;
    if (!sizePattern) return null;

    for (const size of sizePattern) {
      const regex = new RegExp(`\\b${size}\\b`, 'i');
      if (regex.test(request)) {
        return size.toUpperCase();
      }
    }
    return null;
  }

  extractColor(request) {
    for (const color of this.patterns.colors) {
      const regex = new RegExp(`\\b${color}\\b`, 'i');
      if (regex.test(request)) {
        return color;
      }
    }
    return null;
  }

  extractMaxPrice(request) {
    for (const pattern of this.patterns.pricePatterns) {
      const match = request.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  extractGender(request) {
    for (const gender of this.patterns.genders) {
      if (request.includes(gender)) {
        return gender;
      }
    }
    return null;
  }

  extractBrand(request) {
    for (const brand of this.patterns.brands) {
      const regex = new RegExp(`\\b${brand}\\b`, 'i');
      if (regex.test(request)) {
        return brand;
      }
    }
    return null;
  }

  extractKeywords(request, intent) {
    // Remove common words and already extracted attributes
    const stopWords = [
      'add',
      'a',
      'an',
      'the',
      'to',
      'cart',
      'find',
      'get',
      'buy',
      'purchase',
      'under',
      'below',
      'less',
      'than',
      'or',
      'with',
      'for',
    ];
    const extracted = [
      intent.color,
      intent.size,
      intent.gender,
      intent.brand,
    ].filter(Boolean);

    const words = request
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2)
      .filter(word => !stopWords.includes(word))
      .filter(
        word => !extracted.some(attr => word.includes(attr.toLowerCase()))
      );

    return [...new Set(words)]; // Remove duplicates
  }

  calculateConfidence(intent) {
    let score = 0;

    if (intent.category) score += 30;
    if (intent.size) score += 20;
    if (intent.color) score += 15;
    if (intent.maxPrice) score += 15;
    if (intent.gender) score += 10;
    if (intent.brand) score += 10;

    return Math.min(score, 100);
  }

  // Generate search query for the site
  generateSearchQuery(intent) {
    const parts = [];

    if (intent.brand) parts.push(intent.brand);
    if (intent.gender) parts.push(intent.gender);
    if (intent.color) parts.push(intent.color);

    // Add category or keywords
    if (intent.category === 'clothing' && intent.keywords.length > 0) {
      parts.push(intent.keywords[0]); // Use first keyword for clothing
    } else if (intent.keywords.length > 0) {
      parts.push(...intent.keywords.slice(0, 2)); // Use first 2 keywords
    }

    return parts.join(' ').trim();
  }
}

export default IntentParser;
export { IntentParser };
