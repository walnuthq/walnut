# Deployment Guide

## Automated Deployment (GitHub Actions)

**Push to main branch** - deployment will trigger automatically

### Workflow

The GitHub Actions workflow will:

1. ✅ Checkout code
2. ✅ Install dependencies
3. ✅ Run tests
4. ✅ Build application
5. ✅ Deploy to server via SSH
6. ✅ Restart PM2 process

## Health Checks

After deployment, verify the application is running:

```bash
# Check health endpoint
curl http://evm.walnut.com/api/health

# Check CLI health
curl http://evm.walnut.com/api/health/walnut-cli

# Check PM2 status
pm2 status
```

## Rollback

```bash
# Revert to previous commit
git reset --hard HEAD~1
npm ci --production
npm run build
pm2 restart walnut
```
