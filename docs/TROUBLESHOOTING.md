# Troubleshooting Guide

Common issues and solutions for SketchToCode.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Development Server Issues](#development-server-issues)
- [API & Generation Issues](#api--generation-issues)
- [Canvas Issues](#canvas-issues)
- [Preview/Editor Issues](#preview-editor-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### "Module not found: motion-dom"

**Cause:** Missing dependency

**Solution:**
```bash
npm install motion-dom
npm install --legacy-peer-deps
```

### "npm ERR! peer dep missing"

**Cause:** React 19 and Next.js 14 peer dependency conflict

**Solution:**
```bash
npm install --legacy-peer-deps
```

### "Cannot find Python" / "node-gyp error"

**Cause:** Missing build tools

**Solution - Windows:**
```bash
npm install --global windows-build-tools
npm install --legacy-peer-deps
```

**Solution - macOS:**
```bash
xcode-select --install
npm install --legacy-peer-deps
```

**Solution - Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential python3
npm install --legacy-peer-deps
```

### "EACCES: permission denied"

**Cause:** Permission issue on npm

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### "Port 3000 already in use"

**Cause:** Another process using port 3000

**Solution - macOS/Linux:**
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

**Solution - Windows (PowerShell):**
```powershell
# Find process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3001; npm run dev
```

### "node_modules completely corrupted"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

---

## Development Server Issues

### Server won't start

**Check logs:**
```bash
npm run dev 2>&1 | grep -i "error"
```

**Try:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### "next: command not found"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install --legacy-peer-deps
npm run dev
```

### Hot reload not working

**Cause:** File watching issue

**Solution:**
```bash
# Increase file watch limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart server
npm run dev
```

### "Cannot find module '@/components'"

**Cause:** Path alias issue

**Solution:**
- Verify `tsconfig.json` paths are correct
- Try restarting dev server
- Clear `.next` folder

```bash
rm -rf .next
npm run dev
```

---

## API & Generation Issues

### "OPENROUTER_API_KEY not configured in .env.local"

**Cause:** Missing environment variable

**Solution:**
1. Create `.env.local` in project root
2. Add: `OPENROUTER_API_KEY=sk-or-v1-xxxxx`
3. Get key from [OpenRouter](https://openrouter.ai/)
4. Restart dev server

### "API error 402: Insufficient credits"

**Cause:** API quota exhausted

**Symptoms:**
```
This request requires more credits, or fewer max_tokens
```

**Solutions:**

1. **Reduce token limit** in `/src/app/api/generate/route.ts`:
   ```typescript
   max_tokens: 1024, // Reduce from 2048
   ```

2. **Add credits** to OpenRouter:
   - Visit https://openrouter.ai/settings/keys
   - Check "Daily Budget"
   - Add payment method
   - Increase limit

3. **Use cheaper model** in `/src/app/api/generate/route.ts`:
   ```typescript
   model: "meta/llama-3-vision", // Cheaper than Gemini
   ```

### "API error 500"

**Cause:** Server error

**Check:**
```bash
# Verify API key format
echo $OPENROUTER_API_KEY

# Test API directly
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"google/gemini-2.5-flash","messages":[{"role":"user","content":"test"}]}'
```

### "No readable stream" / "Stream error"

**Cause:** Network issue

**Solution:**
```bash
# Check internet connection
ping google.com

# Increase timeout
# In browser DevTools → Network → Throttling
# Set to "No throttling"

# Restart server
npm run dev
```

### Generated code is empty

**Cause:** 
- Network timeout
- API returns error
- Stream interrupted

**Solution:**
- Try again with smaller image
- Check browser console for errors
- Verify API key is correct
- Try different sketch

### Generated code has errors

**Cause:** AI model made mistakes

**Solution:**
1. Provide clearer sketch
2. Add more detail/labels
3. Try smaller/simpler sketch
4. Use different model (GPT-4 for higher quality)

---

## Canvas Issues

### Canvas doesn't respond to drawing

**Cause:**
- Canvas not initialized
- Event listeners not attached
- Browser issue

**Solution:**
```bash
# Refresh page
Ctrl+R or Cmd+R

# Clear browser cache
Ctrl+Shift+Delete or Cmd+Shift+Delete

# Use different browser
# Chrome, Firefox, Safari, Edge
```

### Drawing is laggy

**Cause:**
- Too many strokes
- Canvas too large
- System resource limited

**Solution:**
```bash
# Clear canvas history
Ctrl+K

# Optimize:
# - Clear unnecessary strokes
# - Use simpler shapes
# - Refresh page
```

### Undo/Redo not working

**Cause:** History corrupted or full

**Solution:**
```bash
# Clear canvas
Ctrl+K

# Refresh page
Ctrl+R
```

### Canvas "freezes" after many strokes

**Cause:** History limit (50 items) reached

**Solution:**
- Clear canvas: `Ctrl+K`
- Reduce history limit in `src/lib/constants.ts`:
  ```typescript
  export const MAX_HISTORY = 30; // Lower limit
  ```

---

## Preview/Editor Issues

### Preview doesn't show generated code

**Cause:**
- Generation failed
- Code contains errors
- iframe security issue

**Solution:**
1. Check console for errors
2. Try generating again
3. Verify code in Monaco editor
4. Reload page

### "X-Frame-Options" error in preview

**Cause:** CSP/security policy

**Solution:**
- This is expected for some external content
- Generated code should still render
- Check browser console for details

### Monaco Editor doesn't load

**Cause:** 
- Monaco not installed
- Dynamic import failed

**Solution:**
```bash
npm install @monaco-editor/react
npm run dev
```

### Code display is cut off

**Cause:** Panel too small

**Solution:**
- Drag divider to make panel wider
- Use keyboard shortcut to resize
- Try responsive view

### Syntax highlighting not working

**Cause:** Language not detected

**Solution:**
- Verify HTML/CSS is valid
- Try refreshing
- Check Monaco configuration

---

## Deployment Issues

### "Build fails on Vercel"

**Check build log:**
1. Vercel Dashboard → Project → Deployments
2. Click failed deployment
3. View build logs

**Common causes:**
```bash
# Missing environment variable
# Add in Vercel Dashboard → Settings → Environment Variables

# TypeScript errors
npx tsc --noEmit

# ESLint errors
npm run lint -- --fix
```

### "Application running but showing error"

**Check:**
1. Verify environment variables are set
2. Check deployment logs
3. Visit `/api/generate` directly for API errors

### "Serverless Function Timeout"

**Cause:** Generation takes >60 seconds

**Solution:**
- Reduce `max_tokens`
- Use faster model
- Optimize system prompt

### "Out of memory" error

**Cause:** Too much data in canvas

**Solution:**
- Reduce canvas size
- Use simpler sketches
- Clear history more often

---

## Performance Issues

### Application is slow

**Check performance:**
```bash
# Open DevTools
F12 or Cmd+Option+I

# Network tab
# Check for slow API responses

# Performance tab
# Record and analyze
```

**Solutions:**
1. Clear cache: `Ctrl+Shift+Delete`
2. Refresh: `Ctrl+R`
3. Close other tabs
4. Restart browser
5. Check internet speed

### Canvas is slow when drawing

**Solutions:**
1. Use lower line width
2. Clear unnecessary strokes
3. Refresh page
4. Reduce brush complexity

### API calls are slow

**Check:**
```bash
# Measure response time
# DevTools → Network → Time column

# If >10 seconds:
# - Check internet connection
# - Try simpler sketch
# - Verify API key has quota
```

### High memory usage

**Monitor:**
```bash
# Open Task Manager (Windows) or Activity Monitor (macOS)
# Look for Node.js or browser process

# Reduce:
# - Clear canvas history (Ctrl+K)
# - Close unused tabs
# - Restart browser
```

---

## Browser-Specific Issues

### Chrome
Fix: DevTools → Settings → Disable hardware acceleration
```
# Disable cache while DevTools open
DevTools → Settings → Network → Disable cache (while DevTools open)
```

### Safari
- Clear cache: Safari → Preferences → Privacy → Manage Website Data
- Enable developer tools: Safari → Preferences → Advanced → Show Develop Menu
- May need to use HTTP instead of HTTPS in dev

### Firefox
- Clear cache: Menu → History → Clear Recent History
- Check console: F12 → Console tab

### Edge
- Same as Chrome (Chromium-based)

---

## Advanced Debugging

### Enable verbose logging

Create `src/lib/debug.ts`:
```typescript
const DEBUG = process.env.NODE_ENV === "development";

export function log(...args: any[]) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}
```

### Check environment variables

```bash
# List all env vars
printenv | grep OPENROUTER

# Or in browser console
# window.__ENV__ (if exposed)
```

### Network inspection

```bash
# Monitor API calls
# DevTools → Network → Filter by XHR/Fetch

# Check request headers
# Click request → Headers tab

# Check response
# Click request → Response tab
```

### TypeScript errors

```bash
# Check all TypeScript errors
npx tsc --noEmit 2>&1 | head -50
```

---

## Getting Further Help

1. **Check existing issues:** [GitHub Issues](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/issues)
2. **Search documentation:** [Docs folder](./docs)
3. **Ask in discussions:** [GitHub Discussions](https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code/discussions)
4. **Create new issue** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - System info (OS, Node version, etc.)
   - Screenshots/logs
   - Relevant code snippets

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Missing dependency | `npm install` |
| `EACCES: permission denied` | Permission issue | See above |
| `ETIMEDOUT` | Network timeout | Check connection |
| `ENOTFOUND` | DNS resolution | Restart router |
| `Error: listen EADDRINUSE` | Port in use | Use different port |
| `ReferenceError: window is not defined` | SSR issue | Use `useEffect` or `'use client'` |
| `TypeError: Cannot read property` | Null/undefined | Add null checks |

---

Still stuck? Open an issue with the debug information: 🆘
