# Deployment Guide

Production deployment instructions for SketchToCode on various platforms.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel (Recommended)](#vercel-recommended)
- [Docker](#docker)
- [AWS](#aws)
- [Google Cloud Platform](#google-cloud-platform)
- [Azure](#azure)
- [Self-Hosted](#self-hosted)
- [Environment Configuration](#environment-configuration)

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are configured
- [ ] API key is valid and has sufficient credits
- [ ] Build succeeds locally: `npm run build`
- [ ] No sensitive data in code
- [ ] `.env.local` is in `.gitignore`
- [ ] Dependencies are up to date
- [ ] Tests pass (if applicable)
- [ ] TypeScript compilation has no errors

---

## Vercel (Recommended)

Vercel is the official Next.js deployment platform with seamless integration.

### Step 1: Prepare Repository

Ensure your code is on GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign up / Log in
3. Click "New Project"
4. Import your GitHub repository
5. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./  (or . )
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Step 3: Add Environment Variables

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxxxx
   ```
3. Select all environments (Production, Preview, Development)
4. Click "Save"

### Step 4: Deploy

Click "Deploy" and wait for build to complete.

**Your app will be live at:** `https://your-project.vercel.app`

### Monitoring

- View logs: Dashboard → **Function Logs**
- Monitor performance: Dashboard → **Analytics**
- Check errors: Dashboard → **Error Tracking**

### Auto-Deploy

Every push to `main` triggers automatic deployment:

```bash
git push origin main
→ Vercel builds & deploys automatically
```

---

## Docker

Containerize for any platform supporting Docker.

### Step 1: Create Dockerfile

Already created in project root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start server
CMD ["npm", "start"]
```

### Step 2: Create .dockerignore

```
node_modules
.next
.git
.env.local
*.log
dist
```

### Step 3: Build Image

```bash
docker build -t sketch-to-code:latest .
```

### Step 4: Run Container

```bash
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=sk-or-v1-xxxxx \
  sketch-to-code:latest
```

Access at: `http://localhost:3000`

### Step 5: Push to Registry

#### Docker Hub

```bash
docker login
docker tag sketch-to-code:latest yourusername/sketch-to-code:latest
docker push yourusername/sketch-to-code:latest
```

#### GitHub Container Registry

```bash
docker login ghcr.io
docker tag sketch-to-code:latest ghcr.io/yourusername/sketch-to-code:latest
docker push ghcr.io/yourusername/sketch-to-code:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  sketch-to-code:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  default:
    name: sketch-to-code
```

Run:

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx docker-compose up -d
```

---

## AWS

Deploy on AWS using ECS or Elastic Beanstalk.

### Option 1: ECS (Elastic Container Service)

#### 1. Create ECR Repository

```bash
aws ecr create-repository --repository-name sketch-to-code
```

#### 2. Build & Push Image

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t sketch-to-code .
docker tag sketch-to-code:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sketch-to-code:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sketch-to-code:latest
```

#### 3. Create ECS Cluster

AWS Console → ECS → Create Cluster

#### 4. Create Task Definition

```json
{
  "family": "sketch-to-code",
  "containerDefinitions": [
    {
      "name": "sketch-to-code",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sketch-to-code:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "OPENROUTER_API_KEY",
          "value": "sk-or-v1-xxxxx"
        }
      ],
      "memory": 512,
      "cpu": 256
    }
  ]
}
```

#### 5. Create Service

AWS Console → ECS → Clusters → Create Service

### Option 2: Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli --upgrade --user

# Initialize
eb init -p "Node.js 20 running on 64bit Amazon Linux 2"

# Create environment
eb create sketch-to-code-env

# Deploy
eb deploy

# Set environment variables
eb setenv OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Monitor
eb logs
eb status
```

---

## Google Cloud Platform

Deploy using Cloud Run (serverless) or App Engine.

### Option 1: Cloud Run

#### 1. Build Image

```bash
gcloud auth configure-docker
docker build -t gcr.io/YOUR_PROJECT_ID/sketch-to-code .
docker push gcr.io/YOUR_PROJECT_ID/sketch-to-code
```

#### 2. Deploy

```bash
gcloud run deploy sketch-to-code \
  --image gcr.io/YOUR_PROJECT_ID/sketch-to-code \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Option 2: App Engine

Create `app.yaml`:

```yaml
runtime: nodejs20

env: standard

entrypoint: npm start

env_variables:
  OPENROUTER_API_KEY: "sk-or-v1-xxxxx"
```

Deploy:

```bash
gcloud app deploy
```

---

## Azure

Deploy using Azure Container Instances or App Service.

### Option 1: Container Instances

```bash
# Create resource group
az group create --name sketch-to-code --location eastus

# Deploy container
az container create \
  --resource-group sketch-to-code \
  --name sketch-to-code \
  --image sketch-to-code:latest \
  --ports 3000 \
  --environment-variables OPENROUTER_API_KEY=sk-or-v1-xxxxx \
  --cpu 1 --memory 1
```

### Option 2: App Service

```bash
# Create app service plan
az appservice plan create \
  --name sketch-to-code-plan \
  --resource-group sketch-to-code \
  --sku B1 --is-linux

# Create web app
az webapp create \
  --resource-group sketch-to-code \
  --plan sketch-to-code-plan \
  --name sketch-to-code-app \
  --runtime "node|20-lts"

# Set environment variables
az webapp config appsettings set \
  --resource-group sketch-to-code \
  --name sketch-to-code-app \
  --settings OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

---

## Self-Hosted

Deploy on your own server.

### Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 20+ installed
- PM2 or systemd for process management
- Nginx/Apache for reverse proxy
- SSL certificate (Let's Encrypt)

### Step 1: Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/sketch-to-code
sudo chown $USER:$USER /var/www/sketch-to-code
cd /var/www/sketch-to-code
```

### Step 2: Deploy Code

```bash
# Clone repository
git clone https://github.com/dkwarude-cell/UI-UX-ML-Sketch-to-code.git .

# Install dependencies
npm install --legacy-peer-deps

# Create .env.local
cat > .env.local << EOF
OPENROUTER_API_KEY=sk-or-v1-xxxxx
NODE_ENV=production
EOF

# Build
npm run build
```

### Step 3: Start with PM2

```bash
# Start app
pm2 start npm --name sketch-to-code -- start

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs
```

### Step 4: Nginx Reverse Proxy

Create `/etc/nginx/sites-available/sketch-to-code`:

```nginx
upstream sketch_to_code {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name your-domain.com;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  location / {
    proxy_pass http://sketch_to_code;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/sketch-to-code /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Step 6: Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs sketch-to-code

# Restart
pm2 restart sketch-to-code

# Update code
git pull origin main
npm install
npm run build
pm2 restart sketch-to-code
```

---

## Environment Configuration

### Production Environment Variables

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Optional
NODE_ENV=production
NEXT_PUBLIC_AI_MODEL=google/gemini-2.5-flash

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_ga_id

# Sentry (optional)
SENTRY_AUTH_TOKEN=xxxxx
NEXT_PUBLIC_SENTRY_DSN=xxxxx
```

### Security Best Practices

1. **No Secrets in Code** - Use environment variables
2. **Rotate Keys** - Regularly update API keys
3. **HTTPS Only** - Always use SSL/TLS
4. **CORS** - Restrict to your domain
5. **Rate Limiting** - Implement on API endpoints
6. **Monitoring** - Set up error tracking
7. **Backups** - Regular data backups
8. **Updates** - Keep dependencies updated

---

## Performance Optimization

### 1. Enable CDN

- **Vercel:** Automatic with built-in CDN
- **AWS:** CloudFront + S3
- **GCP:** Cloud CDN
- **Azure:** Azure CDN

### 2. Optimize Images

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

### 3. Database Caching

If adding database, use Redis:

```bash
# Docker
docker run -d -p 6379:6379 redis:latest
```

### 4. Monitoring Tools

- **Performance:** Vercel Analytics, Datadog
- **Errors:** Sentry, LogRocket
- **Uptime:** UptimeRobot, Pingdom

---

## Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling**
   - Load balancer (Nginx, AWS ELB)
   - Multiple app instances
   - Stateless architecture

2. **Vertical Scaling**
   - Upgrade server resources
   - Use faster CDN
   - Optimize database queries

3. **Database**
   - Add Redis caching layer
   - Connection pooling
   - Query optimization

4. **API Management**
   - Rate limiting per user
   - Request queuing
   - Batch processing

---

## Rollback Procedure

### Vercel
```bash
# View deployments
vercel list

# Rollback to previous version
vercel promote [deployment-id]
```

### Docker with Git
```bash
# Rollback code
git revert [commit-hash]
git push

# Rebuild & redeploy
docker build -t sketch-to-code:latest .
docker push [registry]/sketch-to-code:latest
# Deploy new image
```

---

## Support & Troubleshooting

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Docs](https://docs.docker.com/)
- [AWS Documentation](https://docs.aws.amazon.com/)

---

**Deployment complete!** 🚀
