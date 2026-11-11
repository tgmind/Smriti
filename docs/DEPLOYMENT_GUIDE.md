# SMRITI DEPLOYMENT & RELEASE GUIDE

**Target:** Zero-Cost Production Deployment  
**Hosting Platforms:** Cloudflare Pages Free, Supabase Free, GitHub Free  

---

## 1. Automated GitHub Actions CI/CD for Cloudflare Pages

Whenever code is pushed to the `master` or `main` branch, GitHub Actions can automatically build and deploy the frontend to Cloudflare Pages.

### `.github/workflows/deploy-cloudflare.yml`
```yaml
name: Deploy SMRITI to Cloudflare Pages

on:
  push:
    branches: [ master, main ]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-cloudflare.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package.json

      - name: Install Dependencies
        run: cd frontend && npm ci

      - name: Build Production Frontend
        run: cd frontend && npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy frontend/dist --project-name=smriti
```

---

## 2. Supabase Migration Deployment

1. Navigate to your Supabase Project dashboard.
2. In the left navigation, click on **SQL Editor**.
3. Copy the contents of `supabase/migrations/20261111000001_initial_smriti_schema.sql`.
4. Click **Run**.
5. All 15 relational tables, performance indexes, and atomic RPC functions are now active.

---

## 3. Android Release Build & Signing Guide

### Step 1: Generate Release Keystore (Run Once)
```bash
keytool -genkey -v -keystore smriti-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias smriti -storepass "YourSecurePass123!" -keypass "YourSecurePass123!" \
  -dname "CN=Smriti, OU=Education, O=Smriti, L=Global, S=Global, C=IN"
```

### Step 2: Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### Step 3: Sign Release APK with `apksigner`
```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner sign \
  --ks smriti-release-key.jks \
  --ks-pass pass:"YourSecurePass123!" \
  --out app-release-signed.apk \
  app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 4: Verify APK Signature
```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner verify app-release-signed.apk
```
