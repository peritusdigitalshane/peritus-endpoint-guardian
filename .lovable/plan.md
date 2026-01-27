

# Update Dockerfile for Seamless Self-Hosted Deployment

## Overview
Update the Dockerfile to use `npm install` instead of `npm ci` so that you can deploy directly with `docker compose build` after cloning the repository, without needing to manually regenerate the lock file.

## What's Changing

### Dockerfile Updates
1. **Replace `npm ci` with `npm install`** - This allows the build to proceed even when `package-lock.json` is out of sync with `package.json`
2. **Add `--legacy-peer-deps` flag** - Prevents peer dependency conflicts from failing the build
3. **Make `package-lock.json` optional** - Only copy it if it exists, so builds work with or without it

## Updated Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies - copy package.json first, lock file is optional
COPY package.json ./
COPY package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## After This Update

Your deployment workflow will be:

```bash
git clone <your-repo>
cd <your-repo>
docker compose build
docker compose up -d
```

No manual `npm install` or lock file regeneration needed.

## Technical Notes
- The `*` after `package-lock.json` makes the file optional in the COPY command
- `--legacy-peer-deps` ensures compatibility with packages that have strict peer dependency requirements
- Build times may be slightly longer than `npm ci` since it's not using the optimized clean install, but the flexibility is worth it for self-hosted deployments

