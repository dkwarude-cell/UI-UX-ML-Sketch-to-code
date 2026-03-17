# Installation Guide

Complete setup instructions for SketchToCode development and production environments.

## System Requirements

### Minimum
- Node.js 18+
- npm 9+ (or yarn 3.6+, pnpm 8+)
- 500 MB disk space
- 2 GB RAM

### Recommended
- Node.js 20 LTS
- npm 10+
- 1 GB disk space
- 4 GB RAM

## Step 1: Clone the Repository

### HTTPS (recommended for most users)
```bash
git clone https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code.git
cd UI-UX-ML-Sketch-to-code
```

### SSH (if you have SSH keys configured)
```bash
git clone git@github.com:dkwarude-cell/UI-UX-ML-Sketch-to-code.git
cd UI-UX-ML-Sketch-to-code
```

## Step 2: Install Dependencies

### Option A: npm (default)

```bash
npm install --legacy-peer-deps
```

**Why `--legacy-peer-deps`?**
React 19 and Next.js 14 have minor peer dependency conflicts. This flag resolves them safely.

### Option B: Yarn

```bash
yarn install --legacy-peer-deps
```

### Option C: pnpm

```bash
pnpm install --legacy-peer-deps
```

### Verify Installation

```bash
node --version    # Should be v18 or higher
npm --version     # Should be 9 or higher
```

### Additional Dependencies

If you encounter missing dependencies:

```bash
npm install motion-dom
```

## Step 3: Configure Environment Variables

### Create `.env.local`

1. In the project root directory, create a new file named `.env.local`:

```bash
# On macOS/Linux
touch .env.local

# On Windows
type nul > .env.local
```

2. Add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your_api_key_here
```

### Get Your API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for a free account
3. Go to [API Keys](https://openrouter.ai/settings/keys)
4. Create a new API key
5. Copy it to `.env.local`

### Optional Configuration

```env
# Custom AI model (optional, defaults to google/gemini-2.5-flash)
NEXT_PUBLIC_AI_MODEL=google/gemini-2.5-flash

# Next.js environment
NODE_ENV=development

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

## Step 4: Verify Setup

Run this command to verify all dependencies are installed:

```bash
npm list --depth=0
```

Expected output should include (at minimum):
```
sketch-to-code@0.1.0
├── @anthropic-ai/sdk@^0.78.0
├── @monaco-editor/react@^4.7.0
├── fabric@^5.5.2
├── framer-motion@^12.35.1
├── next@^14.2.35
├── react@19.2.3
├── react-dom@19.2.3
├── react-resizable-panels@^4.7.2
├── zustand@^5.0.11
└── ... (other dependencies)
```

## Step 5: Start Development Server

### Development Mode

```bash
npm run dev
```

The server will start on:
- **Default:** http://localhost:3000
- **Fallback:** http://localhost:3001 (if 3000 is in use)

### Production Mode

```bash
npm run build
npm run start
```

## Troubleshooting Installation Issues

### Issue: "Module not found: Can't resolve 'motion-dom'"

**Solution:**
```bash
npm install motion-dom
```

### Issue: "npm ERR! peer dep missing: react@^18"

**Solution:**
This is expected. Use the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### Issue: "Port 3000 is in use"

**Solution A:** Kill the process using port 3000:
```bash
# On macOS/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# On Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solution B:** Use a different port:
```bash
PORT=3001 npm run dev
```

### Issue: "EACCES: permission denied" on macOS/Linux

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Or use sudo
sudo npm install
```

### Issue: "Cannot find Python" or "node-gyp build error"

**Solution:** Install Python 3 and build tools:

**macOS:**
```bash
xcode-select --install
```

**Windows:**
```bash
npm install --global windows-build-tools
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install build-essential python3
```

### Issue: Node modules completely corrupted

**Solution:** Clean reinstall:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

## Verify Complete Installation

Create a test file `test-setup.js`:

```javascript
// test-setup.js
const requiredPackages = [
  'next',
  'react',
  'react-dom',
  'fabric',
  '@monaco-editor/react',
  'zustand',
  'framer-motion',
  'tailwindcss'
];

const missingPackages = [];

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log(`✓ ${pkg}`);
  } catch {
    console.log(`✗ ${pkg}`);
    missingPackages.push(pkg);
  }
});

if (missingPackages.length === 0) {
  console.log('\n✓ All dependencies installed successfully!');
  process.exit(0);
} else {
  console.log(`\n✗ Missing dependencies: ${missingPackages.join(', ')}`);
  process.exit(1);
}
```

Run it:
```bash
node test-setup.js
```

## Development Server First Run

When you run `npm run dev` for the first time, Next.js will:
1. Compile all TypeScript files
2. Build Tailwind CSS
3. Set up the development server
4. Show a "ready - started server on 0.0.0.0:3000" message

**First startup usually takes 2-5 minutes.** Subsequent starts are faster due to caching.

## Next Steps

1. ✅ Verify the app loads at http://localhost:3001
2. 📝 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
3. 🚀 Deploy using [DEPLOYMENT.md](./DEPLOYMENT.md)
4. 👨‍💻 Check [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute

## System-Specific Notes

### macOS
- Use Homebrew to install Node: `brew install node`
- M1/M2 native binaries are supported

### Windows
- Use [nvm-windows](https://github.com/coreybutler/nvm-windows) for managing Node versions
- Visual Studio Build Tools may be required for some packages

### Linux
- Use nvm or your distro's package manager
- Ensure build-essential is installed: `sudo apt-get install build-essential`

### Docker

Build and run in Docker:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t sketch-to-code .
docker run -p 3000:3000 -e OPENROUTER_API_KEY=sk-or-v1-xxx sketch-to-code
```

## Getting Help

If you encounter issues during installation:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Open an [Issue on GitHub](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/issues)
3. Check existing issues and discussions
4. Provide:
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - OS and version
   - Full error messages

---

**Installation complete!** 🎉 Proceed to the main [README.md](../README.md) for usage instructions.
