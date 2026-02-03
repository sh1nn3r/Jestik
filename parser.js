/**
 * Watch Listing Parser
 * Extracts watch details from listing text
 */

const WatchParser = {
  // Known watch brands and their common reference patterns
  brands: {
    'rolex': {
      patterns: [/\b1[12][0-9]{4}\b/, /\b16[0-9]{3}\b/, /\b126[0-9]{3}\b/, /\b124[0-9]{3}\b/, /\b228[0-9]{3}\b/],
      models: {
        'submariner': ['sub', 'submariner'],
        'daytona': ['daytona'],
        'datejust': ['datejust', 'dj'],
        'gmt-master': ['gmt', 'gmt-master', 'gmt master', 'pepsi', 'batman', 'sprite'],
        'explorer': ['explorer', 'exp'],
        'day-date': ['day-date', 'daydate', 'dd', 'president'],
        'yacht-master': ['yacht-master', 'yachtmaster', 'ym'],
        'sea-dweller': ['sea-dweller', 'seadweller', 'sd'],
        'air-king': ['air-king', 'airking'],
        'milgauss': ['milgauss'],
        'cellini': ['cellini'],
        'sky-dweller': ['sky-dweller', 'skydweller'],
        'oyster perpetual': ['oyster perpetual', 'op']
      }
    },
    'omega': {
      patterns: [/\b3[0-9]{3}\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}\.[0-9]{3}\b/, /\b210\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}\.[0-9]{3}\b/],
      models: {
        'speedmaster': ['speedmaster', 'speedy', 'moonwatch'],
        'seamaster': ['seamaster', 'smp'],
        'planet ocean': ['planet ocean', 'po'],
        'aqua terra': ['aqua terra', 'at'],
        'constellation': ['constellation', 'connie'],
        'de ville': ['de ville', 'deville']
      }
    },
    'patek philippe': {
      patterns: [/\b5[0-9]{3}[A-Z]?\b/, /\b3[0-9]{3}[A-Z]?\b/],
      aliases: ['patek', 'pp'],
      models: {
        'nautilus': ['nautilus'],
        'aquanaut': ['aquanaut'],
        'calatrava': ['calatrava'],
        'complications': ['complications', 'annual calendar', 'world time'],
        'grand complications': ['grand complications', 'perpetual calendar', 'minute repeater']
      }
    },
    'audemars piguet': {
      patterns: [/\b15[0-9]{3}[A-Z]{2}\.[A-Z]{2}\.[0-9]{4}[A-Z]{2}\.[0-9]{2}\b/, /\b26[0-9]{3}[A-Z]{2}\b/],
      aliases: ['ap', 'audemars'],
      models: {
        'royal oak': ['royal oak', 'ro'],
        'royal oak offshore': ['offshore', 'roo'],
        'code 11.59': ['code 11.59', 'code 1159']
      }
    },
    'tudor': {
      patterns: [/\b7[0-9]{4}\b/, /\bM7[0-9]{4}\b/],
      models: {
        'black bay': ['black bay', 'bb'],
        'pelagos': ['pelagos'],
        'ranger': ['ranger']
      }
    },
    'cartier': {
      patterns: [/\bW[A-Z0-9]{7,10}\b/, /\bWSNM[0-9]{4}\b/],
      models: {
        'santos': ['santos'],
        'tank': ['tank'],
        'ballon bleu': ['ballon bleu', 'ballon'],
        'panthere': ['panthere', 'panthère']
      }
    },
    'iwc': {
      patterns: [/\bIW[0-9]{6}\b/],
      models: {
        'portugieser': ['portugieser', 'portuguese'],
        'pilot': ['pilot', 'big pilot', 'mark'],
        'portofino': ['portofino'],
        'aquatimer': ['aquatimer']
      }
    },
    'panerai': {
      patterns: [/\bPAM[0-9]{4,5}\b/, /\bPAM\s?[0-9]{3,5}\b/i],
      models: {
        'luminor': ['luminor'],
        'radiomir': ['radiomir'],
        'submersible': ['submersible']
      }
    },
    'breitling': {
      patterns: [/\bA[0-9]{5}\b/, /\bAB[0-9]{4}\b/],
      models: {
        'navitimer': ['navitimer'],
        'superocean': ['superocean'],
        'chronomat': ['chronomat'],
        'avenger': ['avenger']
      }
    },
    'grand seiko': {
      patterns: [/\bSBG[A-Z][0-9]{3}\b/, /\bSLG[A-Z][0-9]{3}\b/],
      aliases: ['gs'],
      models: {
        'spring drive': ['spring drive'],
        'hi-beat': ['hi-beat', 'high beat']
      }
    },
    'richard mille': {
      patterns: [/\bRM\s?[0-9]{2,3}(-[0-9]{2})?\b/i],
      aliases: ['rm'],
      models: {}
    },
    'vacheron constantin': {
      patterns: [/\b[0-9]{4}[A-Z]\/[0-9]{3}[A-Z]-[0-9]{4}\b/],
      aliases: ['vc', 'vacheron'],
      models: {
        'overseas': ['overseas'],
        'patrimony': ['patrimony'],
        'traditionnelle': ['traditionnelle']
      }
    },
    'jaeger-lecoultre': {
      patterns: [/\bQ[0-9]{7}\b/],
      aliases: ['jlc', 'jaeger'],
      models: {
        'reverso': ['reverso'],
        'master': ['master control', 'master ultra thin']
      }
    },
    'a. lange & sohne': {
      patterns: [/\b[0-9]{3}\.[0-9]{3}\b/],
      aliases: ['lange', 'als'],
      models: {
        'lange 1': ['lange 1'],
        'saxonia': ['saxonia'],
        'zeitwerk': ['zeitwerk']
      }
    },
    'hublot': {
      patterns: [/\b[0-9]{6}\.[A-Z]{2}\.[0-9]{4}\.[A-Z]{2}\.[0-9]{4}\b/],
      models: {
        'big bang': ['big bang'],
        'classic fusion': ['classic fusion']
      }
    }
  },

  // Dial color patterns
  dialColors: [
    'black', 'white', 'blue', 'green', 'silver', 'grey', 'gray', 'champagne',
    'gold', 'rose gold', 'mother of pearl', 'mop', 'slate', 'rhodium',
    'salmon', 'tiffany', 'turquoise', 'red', 'burgundy', 'brown', 'chocolate',
    'anthracite', 'sunburst', 'tropical', 'gilt', 'cream', 'ivory', 'panda',
    'reverse panda', 'meteorite', 'lapis', 'onyx', 'polar'
  ],

  // Case materials
  materials: [
    'steel', 'stainless steel', 'ss', 'white gold', 'wg', 'yellow gold', 'yg',
    'rose gold', 'rg', 'everose', 'platinum', 'pt', 'titanium', 'ti',
    'ceramic', 'carbon', 'bronze', 'two-tone', 'tt', 'bi-metal'
  ],

  /**
   * Parse watch listing text and extract details
   */
  parse(text) {
    const normalizedText = text.toLowerCase();

    return {
      brand: this.extractBrand(normalizedText, text),
      model: this.extractModel(normalizedText),
      reference: this.extractReference(text),
      year: this.extractYear(text),
      dialColor: this.extractDialColor(normalizedText),
      material: this.extractMaterial(normalizedText),
      price: this.extractPrice(text),
      condition: this.extractCondition(normalizedText),
      box: this.hasBox(normalizedText),
      papers: this.hasPapers(normalizedText),
      rawText: text,
      extractedAt: new Date().toISOString()
    };
  },

  /**
   * Extract brand from text
   */
  extractBrand(normalizedText, originalText) {
    for (const [brand, config] of Object.entries(this.brands)) {
      // Check brand name
      if (normalizedText.includes(brand)) {
        return this.formatBrand(brand);
      }
      // Check aliases
      if (config.aliases) {
        for (const alias of config.aliases) {
          const regex = new RegExp(`\\b${alias}\\b`, 'i');
          if (regex.test(normalizedText)) {
            return this.formatBrand(brand);
          }
        }
      }
    }
    return null;
  },

  /**
   * Format brand name properly
   */
  formatBrand(brand) {
    const brandMap = {
      'rolex': 'Rolex',
      'omega': 'Omega',
      'patek philippe': 'Patek Philippe',
      'audemars piguet': 'Audemars Piguet',
      'tudor': 'Tudor',
      'cartier': 'Cartier',
      'iwc': 'IWC',
      'panerai': 'Panerai',
      'breitling': 'Breitling',
      'grand seiko': 'Grand Seiko',
      'richard mille': 'Richard Mille',
      'vacheron constantin': 'Vacheron Constantin',
      'jaeger-lecoultre': 'Jaeger-LeCoultre',
      'a. lange & sohne': 'A. Lange & Söhne',
      'hublot': 'Hublot'
    };
    return brandMap[brand] || brand;
  },

  /**
   * Extract model name
   */
  extractModel(normalizedText) {
    for (const [brand, config] of Object.entries(this.brands)) {
      if (config.models) {
        for (const [model, aliases] of Object.entries(config.models)) {
          for (const alias of aliases) {
            const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(normalizedText)) {
              return model.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
          }
        }
      }
    }
    return null;
  },

  /**
   * Extract reference number
   */
  extractReference(text) {
    // Try each brand's reference pattern
    for (const [brand, config] of Object.entries(this.brands)) {
      if (config.patterns) {
        for (const pattern of config.patterns) {
          const match = text.match(pattern);
          if (match) {
            return match[0].toUpperCase();
          }
        }
      }
    }

    // Generic reference patterns
    const genericPatterns = [
      /\bref\.?\s*#?\s*([A-Z0-9]{4,15})\b/i,
      /\breference\s*#?\s*([A-Z0-9]{4,15})\b/i,
      /\b([A-Z]{1,3}[0-9]{4,6}[A-Z]{0,3})\b/
    ];

    for (const pattern of genericPatterns) {
      const match = text.match(pattern);
      if (match) {
        return (match[1] || match[0]).toUpperCase();
      }
    }

    return null;
  },

  /**
   * Extract year
   */
  extractYear(text) {
    // Look for year patterns
    const patterns = [
      /\b(19[5-9][0-9]|20[0-2][0-9])\s*(watch|model|card|papers|box)?\b/i,
      /\b(year|circa|c\.|dated?)\s*(19[5-9][0-9]|20[0-2][0-9])\b/i,
      /\[(19[5-9][0-9]|20[0-2][0-9])\]/,
      /\((19[5-9][0-9]|20[0-2][0-9])\)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1] || match[2];
        const yearNum = parseInt(year);
        // Sanity check - watch should be from reasonable era
        if (yearNum >= 1950 && yearNum <= new Date().getFullYear()) {
          return yearNum;
        }
      }
    }

    // Look for any 4-digit year in reasonable range
    const yearMatch = text.match(/\b(19[5-9][0-9]|20[0-2][0-9])\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 1950 && year <= new Date().getFullYear()) {
        return year;
      }
    }

    return null;
  },

  /**
   * Extract dial color
   */
  extractDialColor(normalizedText) {
    // Check for dial color mentions
    for (const color of this.dialColors) {
      const patterns = [
        new RegExp(`\\b${color}\\s*(dial|face)\\b`, 'i'),
        new RegExp(`\\b(dial|face)\\s*:?\\s*${color}\\b`, 'i'),
        new RegExp(`\\b${color}\\b`, 'i')
      ];

      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          return color.charAt(0).toUpperCase() + color.slice(1);
        }
      }
    }
    return null;
  },

  /**
   * Extract case material
   */
  extractMaterial(normalizedText) {
    const materialMap = {
      'ss': 'Stainless Steel',
      'steel': 'Stainless Steel',
      'stainless steel': 'Stainless Steel',
      'wg': 'White Gold',
      'white gold': 'White Gold',
      'yg': 'Yellow Gold',
      'yellow gold': 'Yellow Gold',
      'rg': 'Rose Gold',
      'rose gold': 'Rose Gold',
      'everose': 'Rose Gold',
      'pt': 'Platinum',
      'platinum': 'Platinum',
      'ti': 'Titanium',
      'titanium': 'Titanium',
      'ceramic': 'Ceramic',
      'carbon': 'Carbon',
      'bronze': 'Bronze',
      'tt': 'Two-Tone',
      'two-tone': 'Two-Tone',
      'bi-metal': 'Two-Tone'
    };

    for (const [key, value] of Object.entries(materialMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(normalizedText)) {
        return value;
      }
    }
    return null;
  },

  /**
   * Extract price
   */
  extractPrice(text) {
    const pricePatterns = [
      // $12,500 or $12500
      /\$\s*([\d,]+(?:\.\d{2})?)/,
      // 12,500 USD or 12500 USD
      /([\d,]+(?:\.\d{2})?)\s*(?:USD|usd)/,
      // $12.5k or $12.5K
      /\$\s*([\d.]+)\s*[kK]\b/,
      // 12.5k USD
      /([\d.]+)\s*[kK]\s*(?:USD|usd)/,
      // Price: $12,500 or Asking $12,500
      /(?:price|asking|obo|firm|shipped)\s*:?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
      // Euro prices €12,500
      /€\s*([\d,]+(?:\.\d{2})?)/,
      // GBP prices £12,500
      /£\s*([\d,]+(?:\.\d{2})?)/
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        let price = match[1].replace(/,/g, '');

        // Handle 'k' notation
        if (/[kK]/.test(text.substring(match.index, match.index + match[0].length + 2))) {
          price = parseFloat(price) * 1000;
        } else {
          price = parseFloat(price);
        }

        // Sanity check - watches usually $100 - $5,000,000
        if (price >= 100 && price <= 5000000) {
          return {
            amount: price,
            currency: text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : 'USD',
            formatted: this.formatPrice(price, text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : 'USD')
          };
        }
      }
    }
    return null;
  },

  /**
   * Format price with currency
   */
  formatPrice(amount, currency = 'USD') {
    const symbols = { USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  /**
   * Extract condition
   */
  extractCondition(normalizedText) {
    const conditions = {
      'mint': 'Mint',
      'excellent': 'Excellent',
      'very good': 'Very Good',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor',
      'bnib': 'Brand New In Box',
      'nwt': 'New With Tags',
      'unworn': 'Unworn',
      'like new': 'Like New',
      'worn': 'Worn',
      'vintage': 'Vintage'
    };

    for (const [key, value] of Object.entries(conditions)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(normalizedText)) {
        return value;
      }
    }
    return null;
  },

  /**
   * Check if box is included
   */
  hasBox(normalizedText) {
    const boxPatterns = [
      /\bbox\b/i,
      /\bfull set\b/i,
      /\bcomplete set\b/i,
      /\bfull kit\b/i,
      /\bw\/?box\b/i
    ];
    return boxPatterns.some(p => p.test(normalizedText));
  },

  /**
   * Check if papers are included
   */
  hasPapers(normalizedText) {
    const paperPatterns = [
      /\bpapers?\b/i,
      /\bcertificate\b/i,
      /\bcard\b/i,
      /\bfull set\b/i,
      /\bcomplete set\b/i,
      /\bw\/?papers?\b/i,
      /\bwarranty\b/i
    ];
    return paperPatterns.some(p => p.test(normalizedText));
  }
};

// Export for use in content script and popup
if (typeof window !== 'undefined') {
  window.WatchParser = WatchParser;
}
