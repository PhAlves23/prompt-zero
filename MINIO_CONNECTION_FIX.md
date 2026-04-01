# MinIO Connection Issue - Resolution Guide

## Problem
The application fails to connect to MinIO with the error:
```
S3Error: The request signature we calculated does not match the signature you provided. 
Check your key and signing method.
```

## Root Cause
The `MINIO_ROOT_USER` and/or `MINIO_ROOT_PASSWORD` in your local `.env` file do not match the actual credentials configured in Railway's MinIO service.

## Current Status
✅ **App no longer crashes** - MinIO initialization now fails gracefully with a warning
⚠️ **Avatar uploads won't work** - Until credentials are fixed

## Solution Steps

### 1. Get Correct Credentials from Railway

#### Option A: Using Railway Dashboard
1. Go to https://railway.app/
2. Select your project
3. Navigate to the MinIO service
4. Go to "Variables" tab
5. Copy the values for:
   - `MINIO_ROOT_USER`
   - `MINIO_ROOT_PASSWORD`

#### Option B: Using Railway CLI (if logged in)
```bash
# Login to Railway
railway login

# Link to your project
railway link

# View MinIO service variables
railway variables --service=<minio-service-name>
```

### 2. Update Local `.env` File

Edit `/Users/phalves/ph-projects/pessoal/prompt-zero/backend/.env`:

```bash
# Replace these values with the actual credentials from Railway
MINIO_ENDPOINT=bucket-production-26cf.up.railway.app
MINIO_PORT=443
MINIO_ROOT_USER=<actual_access_key_from_railway>
MINIO_ROOT_PASSWORD=<actual_secret_key_from_railway>
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=prompt-zero
MINIO_PUBLIC_URL=bucket-production-26cf.up.railway.app
```

### 3. Restart the Application

```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero/backend
npm run start:dev
```

## Verification

If credentials are correct, you should see in the logs:
```
[MinioService] MinIO connection successful
[MinioService] Bucket prompt-zero already exists
```

If still failing, you'll see:
```
[MinioService] MinIO connection attempt 1/3 failed: ...
```

## Alternative: Create New MinIO Credentials

If you can't retrieve the original credentials, you can create new ones in Railway:

1. Go to MinIO service in Railway dashboard
2. Update the variables:
   - `MINIO_ROOT_USER` - set a new 32-character random string
   - `MINIO_ROOT_PASSWORD` - set a new 48-character random string
3. Copy these new values to your local `.env`
4. Restart both Railway MinIO service and your local app

## Code Changes Made

### 1. Retry Logic (minio.service.ts)
- Added 3 retry attempts with exponential backoff
- Improved error logging

### 2. Graceful Failure
- App now starts even if MinIO is unavailable
- Logs warning instead of crashing
- Avatar upload endpoints will return errors until MinIO is fixed

## Next Steps

1. Get correct credentials from Railway
2. Update local `.env` file
3. Restart application
4. Test avatar upload functionality

## Files Modified

- `/Users/phalves/ph-projects/pessoal/prompt-zero/backend/src/minio/minio.service.ts`
  - Added retry logic
  - Made initialization non-blocking
  - Enhanced logging

## Cleanup

Delete temporary test files created during debugging:
```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero/backend
rm test-minio.js
rm diagnose-env.ts
```
