// config/advanced-config.js
// Advanced configuration and extensibility options

export const config = {
  // ============================================
  // PLAYWRIGHT CONFIGURATION
  // ============================================
  playwright: {
    // Browser launch options
    launch: {
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
      slowMo: process.env.PLAYWRIGHT_SLOW_MO ? parseInt(process.env.PLAYWRIGHT_SLOW_MO) : 0,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    },

    // Navigation timeout
    navigationTimeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT) || 30000,
    
    // Wait for selector timeout
    selectorTimeout: 10000,

    // Retry configuration
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 2000,

    // Page configuration
    viewportSize: {
      width: 1280,
      height: 720,
    },

    // User agent (optional)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // ============================================
  // PO GENERATION CONFIGURATION
  // ============================================
  poGeneration: {
    // Batch processing
    batchSize: 50,
    delayBetweenBatches: 5000,
    delayBetweenPOs: 1000,

    // Data generation
    suppliers: {
      min: 10,
      max: 1000,
      realism: 'high', // 'high', 'medium', 'low'
    },
    items: {
      min: 1,
      max: 5,
    },
    deliveryDateRange: {
      minDays: 30,
      maxDays: 90,
    },

    // Validation
    validateBefore: true,
    validateAfter: true,

    // Progress
    updateProgressEvery: 1, // Update after each PO
  },

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  sessions: {
    // Storage
    directory: process.env.SESSIONS_DIR || './sessions',
    
    // Encryption
    encryption: {
      enabled: process.env.ENABLE_SESSION_ENCRYPTION !== 'false',
      algorithm: 'aes-256-cbc',
      key: process.env.SESSION_ENCRYPTION_KEY || 'dev-key-change-in-production',
    },

    // Expiration
    expirationDays: 30,
    autoCleanup: true,
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours

    // Security
    requireHttpsForProduction: true,
    secureSessionCookie: true,
    sameSite: 'Strict',
  },

  // ============================================
  // API CONFIGURATION
  // ============================================
  api: {
    // Rate limiting
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },

    // Request validation
    validateInput: true,
    maxRequestSize: '10mb',

    // Response
    compression: true,
    cacheControl: 'no-cache',

    // CORS
    cors: {
      enabled: true,
      origins: [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.CORS_ORIGIN || '*',
      ],
      credentials: true,
    },
  },

  // ============================================
  // LOGGING CONFIGURATION
  // ============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info', // 'error', 'warn', 'info', 'debug'
    format: 'json', // 'json', 'text'
    
    // Outputs
    outputs: {
      console: true,
      file: process.env.LOG_FILE || './logs/po-seeder.log',
      errorFile: './logs/po-seeder-errors.log',
    },

    // File rotation
    maxSize: '10m',
    maxFiles: 5,

    // Sensitive data
    redactSecrets: true,
    redactPatterns: [
      /password/i,
      /token/i,
      /authorization/i,
      /session/i,
    ],
  },

  // ============================================
  // SHOPIFY CONFIGURATION
  // ============================================
  shopify: {
    // Admin API (optional - for future webhook support)
    api: {
      key: process.env.SHOPIFY_API_KEY || '',
      secret: process.env.SHOPIFY_API_SECRET || '',
      scopes: [
        'write_purchase_orders',
        'read_purchase_orders',
      ],
    },

    // Admin URL patterns
    adminUrlPattern: '{shop}.myshopify.com',
    poPagePath: '/admin/purchase_orders',

    // Selectors (use for quick updates if Shopify UI changes)
    selectors: {
      createButton: 'button:has-text("Create purchase order")',
      supplierInput: 'input[placeholder*="Supplier"]',
      poNumberInput: 'input[placeholder*="PO"]',
      saveButton: 'button:has-text("Save")',
      successMessage: 'text=/success|created|saved/i',
    },
  },

  // ============================================
  // FEATURE FLAGS
  // ============================================
  features: {
    enablePOGeneration: process.env.ENABLE_PO_GENERATION !== 'false',
    enableSessionEncryption: process.env.ENABLE_SESSION_ENCRYPTION !== 'false',
    enableProgressTracking: process.env.ENABLE_PROGRESS_TRACKING !== 'false',
    enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableDebugMode: process.env.DEBUG === 'true',
  },

  // ============================================
  // PERFORMANCE TUNING
  // ============================================
  performance: {
    // Connection pooling
    maxConnections: 10,
    connectionTimeout: 5000,

    // Memory
    maxMemory: 1024, // MB
    gcInterval: 60000, // ms

    // Caching
    enableCache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  },

  // ============================================
  // MONITORING & ALERTS
  // ============================================
  monitoring: {
    enabled: true,
    
    // Metrics
    trackMetrics: {
      poGenerationTime: true,
      errorRate: true,
      sessionUsage: true,
    },

    // Alerts
    alerts: {
      highErrorRate: {
        threshold: 10, // %
        enabled: true,
      },
      slowGeneration: {
        threshold: 10000, // ms
        enabled: true,
      },
    },

    // Health checks
    healthCheck: {
      enabled: true,
      interval: 60000, // ms
      timeout: 5000,
    },
  },

  // ============================================
  // DEVELOPMENT OPTIONS
  // ============================================
  development: {
    mockPlaywright: false,
    mockSessions: false,
    verboseLogging: process.env.DEBUG === 'true',
    testDataOnly: false,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get environment-specific config
 */
export function getConfig(env = process.env.NODE_ENV) {
  const baseConfig = { ...config };

  if (env === 'production') {
    // Production overrides
    baseConfig.playwright.launch.headless = true;
    baseConfig.playwright.maxRetries = 3;
    baseConfig.sessions.encryption.enabled = true;
    baseConfig.api.rateLimit.enabled = true;
    baseConfig.logging.level = 'info';
  } else if (env === 'development') {
    // Development overrides
    baseConfig.playwright.launch.slowMo = 500;
    baseConfig.logging.level = 'debug';
    baseConfig.development.verboseLogging = true;
  } else if (env === 'test') {
    // Test overrides
    baseConfig.playwright.navigationTimeout = 5000;
    baseConfig.development.mockPlaywright = true;
    baseConfig.development.testDataOnly = true;
  }

  return baseConfig;
}

/**
 * Validate configuration
 */
export function validateConfig(cfg = config) {
  const errors = [];

  if (!cfg.playwright.launch) errors.push('Missing playwright.launch config');
  if (!cfg.sessions.directory) errors.push('Missing sessions.directory');
  if (cfg.sessions.encryption.enabled && !cfg.sessions.encryption.key) {
    errors.push('Missing session encryption key');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    return false;
  }

  return true;
}

/**
 * Merge custom config with defaults
 */
export function mergeConfig(customConfig = {}) {
  return {
    ...config,
    ...customConfig,
    playwright: { ...config.playwright, ...customConfig.playwright },
    poGeneration: { ...config.poGeneration, ...customConfig.poGeneration },
    sessions: { ...config.sessions, ...customConfig.sessions },
    api: { ...config.api, ...customConfig.api },
    logging: { ...config.logging, ...customConfig.logging },
    shopify: { ...config.shopify, ...customConfig.shopify },
    features: { ...config.features, ...customConfig.features },
  };
}

export default config;
