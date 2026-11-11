# MANUAL SETUP REQUIREMENTS & OWNER GUIDE

**Product:** SMRITI — Audio Learning & Spaced Repetition Platform  
**Target Audience:** Product Owner (No Coding Required)  
**Cost:** $0.00 (Zero Cost — No Credit Card Needed)  

---

## Overview of External Actions
As the product owner, you only need to create free accounts on four platforms and copy a few identification keys into the environment. You will never need to write or edit code.

Every action below is marked with one of:
- **[REQUIRED BEFORE FIRST BUILD]**
- **[REQUIRED BEFORE FIRST INSTALLATION]**
- **[REQUIRED BEFORE PUBLIC LAUNCH]**
- **[OPTIONAL]**
- **[REQUIRED ONLY FOR FUTURE UPDATES]**

---

## Section A: Accounts You Must Create

### 1. GitHub Account `[REQUIRED BEFORE FIRST BUILD]`
- **Website:** https://github.com/signup
- **Why it is needed:** Stores your SMRITI code securely and automatically sends updates to Cloudflare.
- **Plan to choose:** **Free Plan** ($0/month).
- **Credit card asked?** **No.**
- **What to save:** Your GitHub username and repository link.

### 2. Cloudflare Account `[REQUIRED BEFORE FIRST BUILD]`
- **Website:** https://dash.cloudflare.com/sign-up
- **Why it is needed:** Hosts the SMRITI web application globally with lightning-fast speeds and zero hosting bills.
- **Plan to choose:** **Free Plan**.
- **Credit card asked?** **No.** (Skip any billing page).
- **What to save:** Your Cloudflare account login.

### 3. Supabase Account `[REQUIRED BEFORE FIRST BUILD]`
- **Website:** https://supabase.com
- **Why it is needed:** Stores user accounts, learning progress, revision schedules, and audio metadata.
- **Plan to choose:** **Free Tier** (Select "Start your project" -> Choose Free Plan).
- **Credit card asked?** **No.**
- **What to save:** Your Project URL and `anon` public key (found in Project Settings -> API).

### 4. Google Cloud Console (For Google Drive Integration) `[REQUIRED BEFORE FIRST INSTALLATION]`
- **Website:** https://console.cloud.google.com
- **Why it is needed:** Allows students to store their audio notes directly in their personal Google Drive without central storage fees.
- **Plan to choose:** Free Developer Console (Default).
- **Credit card asked?** **No.** (Do not enable billing; standard Google Drive API access operates entirely on the free tier).
- **What to save:** Your Google OAuth Client ID.

---

## Section B: Google Drive & OAuth 2.0 Setup (Step-by-Step)
`[REQUIRED BEFORE FIRST INSTALLATION]`

Google Drive integration is developer-configured and centrally managed. Your users will **never** need to configure API keys or Google Cloud projects—they simply tap "Connect Google Drive" and sign in with their personal Google account.

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com).
   - In the top dropdown, click **New Project**.
   - Name it **Smriti Learning** and click **Create**.

2. **Enable the Google Drive API:**
   - In the search bar at the top, type `Google Drive API` and press Enter.
   - Click on **Google Drive API** and click **Enable**.

3. **Configure the OAuth Consent Screen:**
   - In the left sidebar, click **APIs & Services** > **OAuth consent screen**.
   - Select **External** and click **Create**.
   - App Name: `SMRITI Audio Learning`.
   - User Support Email: Select your email.
   - Developer Contact Email: Enter your email.
   - Click **Save and Continue**.
   - Under **Scopes**, click **Add or Remove Scopes**. Select:
     `.../auth/drive.file` (Per-file access: only files created or opened by SMRITI).
   - Click **Save and Continue**.
   - Under **Test Users**, add your personal Google email address (so you can test the app immediately). Click **Save and Continue**.

4. **Create Credentials:**
   - In the left sidebar, click **Credentials** > **Create Credentials** > **OAuth client ID**.
   - Application Type:
     - For Web: Select **Web Application**. Add Authorized JavaScript origin (your Cloudflare Pages URL) and redirect URI.
     - For Android: Select **Android**. Enter package name `com.smriti.app` and your SHA-1 signing certificate fingerprint.
   - Click **Create**.
   - Copy the generated **Client ID**.

---

## Section C: Supabase Setup (Step-by-Step)
`[REQUIRED BEFORE FIRST BUILD]`

1. **Create a New Project:**
   - Log in to [Supabase](https://supabase.com).
   - Click **New Project**.
   - Project Name: `Smriti-Production`.
   - Database Password: Create a secure password (save it safely).
   - Region: Choose the region closest to you or your students (e.g. `ap-south-1` for India or `us-east-1` for US).
   - Pricing Plan: Choose **Free**. Click **Create new project**.

2. **Apply Database Migrations (Zero Coding):**
   - In your Supabase dashboard, click the **SQL Editor** tab on the left sidebar (looks like `>_`).
   - Click **New Query**.
   - Open the file `supabase/migrations/20261111000001_initial_smriti_schema.sql` provided in this project.
   - Copy the entire contents of that file and paste it into the Supabase SQL Editor.
   - Click **Run** (green button). You will see "Success. No rows returned".
   - Your complete database schema, security policies, and performance indexes are now active!

3. **Copy Your API Keys:**
   - In the left sidebar, click **Project Settings** (gear icon) > **API**.
   - Find:
     - `Project URL` (e.g. `https://xyzcompany.supabase.co`)
     - `Project API Keys` > `anon` `public` key.
   - These are safe to use in frontend configuration.

---

## Section D: Cloudflare Pages Deployment (Step-by-Step)
`[REQUIRED BEFORE FIRST BUILD]`

1. **Push your code to GitHub:**
   - Push this workspace to your GitHub account repository.

2. **Connect to Cloudflare Pages:**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
   - In the left navigation, click **Workers & Pages**.
   - Click **Create application** > **Pages** > **Connect to Git**.
   - Select your GitHub repository (`smriti`).
   - Click **Begin setup**.

3. **Configure Build Settings:**
   - Project Name: `smriti`
   - Production branch: `master` or `main`
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`

4. **Add Environment Variables:**
   - Under **Environment variables (advanced)**, click **Add variable**:
     - `VITE_SUPABASE_URL`: (Paste your Supabase Project URL)
     - `VITE_SUPABASE_ANON_KEY`: (Paste your Supabase anon key)
     - `VITE_GOOGLE_CLIENT_ID`: (Paste your Google OAuth Web Client ID)
   - Click **Save and Deploy**.
   - In 1 to 2 minutes, Cloudflare will display your live web address (e.g. `https://smriti.pages.dev`).

---

## Section E: Android Installation & Permissions
`[REQUIRED BEFORE FIRST INSTALLATION]`

1. **Obtain the APK:**
   - Download the built APK file `smriti-debug.apk` directly from your build directory:
     `android/app/build/outputs/apk/debug/app-debug.apk`.

2. **Transfer to Your Android Phone:**
   - Send the file to your phone via USB cable, Google Drive, or messaging.

3. **Install on Phone:**
   - On your Android phone, open the downloaded APK.
   - If prompted "Install unknown apps", tap **Settings** and toggle **Allow from this source**.
   - Tap **Install**.

4. **Grant App Permissions:**
   - **Microphone:** Required for recording study notes and lectures.
   - **Notifications:** Required for lock-screen audio playback controls and spaced-repetition revision reminders.
   - **Battery Optimization:** When prompted, select **Don't optimize / Unrestricted** so your audio lessons continue playing smoothly when your phone screen turns off.

---

## Section F: Future Updates & Maintenance

### Updates that require ONLY Cloudflare Deployment (Zero App Reinstallation):
- UI updates, new study themes, design polish, button tweaks, or text updates.
- Simply push changes to GitHub; Cloudflare automatically updates the web app within 60 seconds. Every student opening the app instantly sees the new version!

### Updates that require a New Android APK:
- Changes to native audio playback algorithms (ExoPlayer), hardware microphone DSP, local Room database migrations, or Android system permissions.

---

## Section G: Cost & Quota Monitoring

- **Cloudflare Pages:** 100% Free with unlimited bandwidth. No charges can occur.
- **Supabase:** Free tier provides 500 MB database and 50,000 active users. If you approach 500 MB, the database soft-limits write operations—it **never** bills you automatically.
- **Google Drive:** Audio storage uses the student's own Google account (15 GB free per student). Your platform incurs zero storage costs.
