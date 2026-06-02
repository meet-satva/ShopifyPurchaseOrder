# 🛒 Shopify PO Seeder - Complete Setup Guide

## 📋 Overview

This is a production-ready Shopify app that automatically generates realistic Purchase Orders (POs) in your Shopify admin using Playwright automation. It features:

✅ **Browser Session Authentication** - Save login once, reuse for bulk PO creation
✅ **Real-Time Progress Tracking** - Live updates as POs generate (1-5000)
✅ **Reliable Selectors** - Uses Shopify's stable UI selectors with retry logic
✅ **Fake Data Generation** - Realistic suppliers, products, quantities, and dates
✅ **Session Encryption** - Secure storage of authenticated browser sessions
✅ **Error Handling** - Graceful failure recovery with automatic retries

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites

```bash
# Required: Node.js 18+
node --version  # Should be v18.0.0 or higher

# Required: npm
npm --version   # Should be 8.0.0 or higher
```

### 2. Clone/Download Files

Create a new folder and copy all the files:

```bash
mkdir shopify-po-seeder
cd shopify-po-seeder

# Copy these files into the directory:
# - server.js
# - package.json
# - api/po-seeder/routes.js
# - api/po-seeder/playwright-po-generator.js
# - api/po-seeder/storage-manager.js
# - api/po-seeder/fake-data-generator.js
# - shopify-po-seeder-complete.jsx (React component)
# - .env.example (rename to .env)
```

### 3. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `playwright` - Browser automation
- `cors` - Cross-origin support
- `dotenv` - Environment variables

### 4. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and set:
```
PORT=3000
NODE_ENV=development
SESSION_ENCRYPTION_KEY=your-secure-key-here
```

### 5. Start the Server

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════╗
║   🛒 Shopify PO Seeder Server Started     ║
╚════════════════════════════════════════════╝

Environment: development
Port: 3000
URL: http://localhost:3000
```

### 6. Open in Browser

```
http://localhost:3000
```

---

## 📁 File Structure

```
shopify-po-seeder/
├── server.js                          # Express server entry point
├── package.json                       # Dependencies
├── .env                              # Configuration (create from .env.example)
├── .env.example                      # Template
│
├── api/
│   └── po-seeder/
│       ├── routes.js                 # API endpoints
│       ├── playwright-po-generator.js # Core PO automation
│       ├── storage-manager.js        # Session persistence
│       └── fake-data-generator.js    # Realistic PO data
│
├── public/                           # React build output (auto-created)
│   ├── index.html
│   └── ...
│
└── sessions/                         # Encrypted browser sessions (auto-created)
    └── *.json                        # Saved sessions per shop
```

---

## 🔐 How It Works

### Step 1: Create Browser Session

```
User enters: yourstore.myshopify.com
       ↓
Backend starts headless browser
       ↓
Browser opens Shopify admin
       ↓
User logs in manually (guided)
       ↓
Session saved: ./sessions/yourstore.json (encrypted)
```

### Step 2: Generate POs

```
User enters: 100 (number of POs)
       ↓
Backend loads saved session
       ↓
Playwright navigates to Purchase Orders page
       ↓
Loop 100 times:
   - Generate fake PO data (supplier, items, etc)
   - Click "Create Purchase Order" button
   - Fill form with stable selectors (getByRole)
   - Retry on failure
   - Update progress (23/100 completed)
       ↓
All POs created ✅
```

---

## 📊 API Endpoints

### 1. Check if Session Exists

**POST** `/api/po-seeder/check-session`

```json
Request:
{
  "shopDomain": "yourstore.myshopify.com"
}

Response:
{
  "sessionExists": true,
  "shopDomain": "yourstore.myshopify.com"
}
```

### 2. Create New Browser Session

**POST** `/api/po-seeder/create-session`

```json
Request:
{
  "shopDomain": "yourstore.myshopify.com"
}

Response:
{
  "success": true,
  "message": "Session created successfully"
}
```

Browser will open. User must log in manually. Session is saved when authenticated.

### 3. Generate Purchase Orders (Streaming)

**POST** `/api/po-seeder/generate-pos`

```json
Request:
{
  "shopDomain": "yourstore.myshopify.com",
  "poCount": 100
}

Response (Server-Sent Events):
data: {"type":"progress","completed":1,"total":100}
data: {"type":"progress","completed":2,"total":100}
data: {"type":"progress","completed":3,"total":100}
...
data: {"type":"complete","completed":100}
```

### 4. Delete Saved Session

**POST** `/api/po-seeder/delete-session`

```json
Request:
{
  "shopDomain": "yourstore.myshopify.com"
}

Response:
{
  "success": true,
  "message": "Session deleted"
}
```

---

## 🎯 Testing

### Test 1: Server Health

```bash
curl http://localhost:3000/health

# Response:
# {"status":"ok","version":"1.0.0","environment":"development","timestamp":"..."}
```

### Test 2: API Info

```bash
curl http://localhost:3000/api

# Response shows all available endpoints
```

### Test 3: Generate Fake Data

```bash
node tests/test-data-generator.js
```

This generates 5 sample POs with realistic data.

---

## 🔧 Production Deployment

### Deploy to Heroku

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_ENCRYPTION_KEY=$(openssl rand -hex 32)

# 3. Deploy
git push heroku main

# 4. View logs
heroku logs --tail
```

### Deploy to Railway.app

```bash
# 1. Connect repository
# 2. Railway auto-detects Node.js app
# 3. Set environment variables in dashboard
# 4. Deploy automatically
```

### Deploy to VPS (Ubuntu)

```bash
# 1. SSH into server
ssh user@your-vps-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone project
git clone https://github.com/yourusername/shopify-po-seeder.git
cd shopify-po-seeder

# 4. Install dependencies
npm install --production

# 5. Create .env file
nano .env
# Add your configuration

# 6. Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js --name "po-seeder"
pm2 startup
pm2 save

# 7. Use Nginx as reverse proxy
# Create /etc/nginx/sites-available/po-seeder
# Proxy traffic to localhost:3000
```

---

## 🛡️ Security Best Practices

### 1. Change Encryption Key

```bash
# Generate secure key
openssl rand -hex 32

# Update in .env
SESSION_ENCRYPTION_KEY=your-generated-key
```

### 2. Use HTTPS in Production

```bash
# Use Let's Encrypt with Nginx/Apache
# Or use Heroku/Railway for automatic HTTPS
```

### 3. Rate Limiting

```bash
# Implement rate limiting (example with express-rate-limit)
npm install express-rate-limit

# Add to server.js
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

### 4. Environment Secrets

```bash
# Never commit .env file
echo ".env" >> .gitignore
echo "sessions/" >> .gitignore

# Use environment variable services in production
# - Heroku Config Vars
# - Railway Secrets
# - AWS Secrets Manager
```

---

## ⚠️ Troubleshooting

### Issue: "Cannot find module 'playwright'"

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Browser automation failed"

**Possible causes:**
- Shopify admin URL is incorrect
- Browser session is expired (older than 30 days)
- Shopify UI selectors changed

**Solution:**
- Verify domain format: `yourstore.myshopify.com`
- Create a new session
- Check if Shopify UI changed and update selectors in `playwright-po-generator.js`

### Issue: "Port 3000 already in use"

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Issue: "Network error connecting to shop"

**Causes:**
- Domain is invalid
- Shop is not accessible
- Firewall blocking connections

**Solution:**
- Verify shop domain is correct
- Test in browser manually: `https://yourstore.myshopify.com/admin`
- Check firewall rules

### Issue: Session expired after 30 days

**Solution:**
Users need to create a new session. The app prompts for this.

---

## 📈 Performance Optimization

### Increase PO Generation Speed

Edit `playwright-po-generator.js`:

```javascript
// Line: Delay between POs
// Change from 1000ms to 500ms for faster generation
await page.waitForTimeout(500); // was 1000

// Or disable headless for visual debugging
const browser = await chromium.launch({ headless: false });
```

### Batch Processing

For 1000+ POs, consider splitting into batches:

```javascript
const BATCH_SIZE = 100;
const batches = Math.ceil(poCount / BATCH_SIZE);

for (let b = 0; b < batches; b++) {
  const start = b * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, poCount);
  
  // Process batch, close browser
  // Reopen for next batch to prevent memory leaks
}
```

---

## 📝 Logging

### Enable Detailed Logs

Edit `server.js`:

```javascript
// Add at top
import pino from 'pino';
const logger = pino();

// Use throughout
logger.info('PO created', { poNumber, shop });
logger.error('Generation failed', { error, shop });
```

### Check Logs

```bash
# In development
npm start  # Logs to console

# In production with PM2
pm2 logs po-seeder

# Docker
docker logs container-id
```

---

## 🆘 Support & Issues

### Report a Bug

Create an issue with:
- Error message
- Steps to reproduce
- Browser console errors
- Server logs

### Request a Feature

Suggest improvements:
- Better retry logic
- Support for more PO fields
- Bulk session management
- CSV export of generated POs

---

## 📜 License

MIT License - Use freely in commercial projects

---

## 🎉 Next Steps

1. ✅ Install and start server
2. ✅ Open http://localhost:3000 in browser
3. ✅ Enter your Shopify domain (yourstore.myshopify.com)
4. ✅ Click "Connect & Create Session"
5. ✅ Log in when browser opens
6. ✅ Enter number of POs (try 10 first)
7. ✅ Click "Start Generating"
8. ✅ Watch progress in real-time
9. ✅ Check Shopify admin for generated POs

---

## 🚀 Ready to Deploy?

When ready for production:

1. Update `.env` with secure values
2. Run `npm run build`
3. Deploy to Heroku/Railway/VPS
4. Set up HTTPS
5. Monitor with PM2/Docker

**That's it! Your PO seeding app is ready to scale.** 🎯
