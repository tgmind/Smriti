# MANUAL SETUP REQUIREMENTS & OWNER GUIDE (UPDATED)

**Product:** SMRITI — Audio Learning & Spaced Repetition Platform  
**Target Audience:** Product Owner (No Coding Required)  
**Backend Status:** **100% CONFIGURED & DEPLOYED AUTOMATICALLY**  
**Cost:** $0.00 (Strictly Free-Tier — Zero Credit Card Required)  

---

## 1. What Has Been Completed Automatically For You

You do **NOT** need to create or configure a Supabase project or write any SQL. The entire backend has already been provisioned, connected, and verified:

- [x] **Google OAuth Client ID Configured:**
  - Client ID: `964954219665-jf8pdaq8n3aejm2hf45p68nmcmc710mb.apps.googleusercontent.com`
  - Client secrets safely ignored from Git tracking.
  - Linked in `frontend/.env` and compiled into web & Android bundles.
- [x] **Supabase Credentials Loaded & Saved:**
  - Project URL: `https://wppnfezoqpcgmowdkofp.supabase.co`
  - Public Anon Key: `sb_publishable_Jv7t8irT0s7wTNheRXMUpQ_SrNOB-0n`
  - Direct PostgreSQL Pooler: `db.wppnfezoqpcgmowdkofp.supabase.co:6543/postgres`
- [x] **Full Production Database Migrations Applied:**
  - All 15 relational tables created (`profiles`, `user_settings`, `subjects`, `collections`, `audio_items`, `playlists`, `playlist_items`, `playback_events`, `audio_statistics`, `daily_statistics`, `recall_assessments`, `revision_schedule`, `listening_sessions`, `user_devices`, `sync_state`).
- [x] **User Tracking & Admin Remote Blocking Applied (Part 2):**
  - Added `is_blocked`, `blocked_reason`, `role`, and `last_seen_at` columns to `public.profiles`.
  - Automated `register_or_sync_student` and `check_user_status` RPC functions deployed directly to live PostgreSQL.
  - Automatically synchronizes registered students into both `auth.users` and `public.profiles`.
- [x] **Automated Inactivity Keepalive Deployed:**
  - `.github/workflows/keepalive.yml` pings Supabase PostgREST every 4 days, preventing the 7-day inactivity pause.
- [x] **PostgreSQL Row-Level Security (RLS) Active:** Every table is secured with tenant isolation policies (`auth.uid() = user_id`).
- [x] **Automatic Student Provisioning Trigger:** New user registrations automatically initialize student profiles, default preferences, and 4 starter academic subjects (Physics, Chemistry, Biology, Mathematics).
- [x] **Frontend Production Build Configured:** The web bundle has been recompiled with live Supabase credentials.
- [x] **Android APK Built & Bundled:** `smriti-debug.apk` has been re-assembled with the live credentials and bundled assets.

---

## 2. What Remains: Step-by-Step Manual Setup Checklist

Below are the **only 3 remaining manual steps** required to test on your phone and launch the web app.

---

### Step 1: Google Cloud & Drive OAuth 2.0 Setup
**Timing:** `[REQUIRED FOR GOOGLE DRIVE AUDIO STORAGE]`  
**Estimated Time:** ~3 minutes  
**Cost:** $0.00 (Free Developer Console — No billing required)  

Because audio files are saved directly in each student's personal Google Drive (saving you central storage bills), Google requires an OAuth Client ID so users can securely sign in with their Google accounts.

1. **Open Google Cloud Console:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com) and log in with your Google account.
2. **Create a Project:**
   - In the top dropdown bar, click **New Project**.
   - Project Name: `Smriti Audio Learning`.
   - Click **Create**.
3. **Enable Google Drive API:**
   - In the top search bar, type `Google Drive API` and press Enter.
   - Click on **Google Drive API** in the results, then click the blue **Enable** button.
4. **Configure OAuth Consent Screen:**
   - In the left sidebar, click **APIs & Services** > **OAuth consent screen**.
   - Select **External** and click **Create**.
   - **App name:** `SMRITI`.
   - **User support email:** (Select your email address).
   - **Developer contact information:** (Enter your email address).
   - Click **Save and Continue**.
   - Under **Scopes**, click **Add or Remove Scopes**. Search for and check:
     `.../auth/drive.file` (This grants access ONLY to audio files created or opened by SMRITI).
   - Click **Save and Continue**.
   - Under **Test Users**, click **Add Users** and enter your personal email address so you can test it immediately. Click **Save and Continue**.
5. **Create Credentials:**
   - In the left menu, click **Credentials** > **Create Credentials** > **OAuth client ID**.
   - **Application type:** Select **Web application**.
   - **Name:** `SMRITI Web Client`.
   - Under **Authorized JavaScript origins**, click **Add URI** and enter:
     - `http://localhost:3000` (for local testing)
     - `https://smriti.pages.dev` (or your future Cloudflare domain)
   - Click **Create**.
   - Copy the generated **Client ID** (it looks like `123456789-abcdefg.apps.googleusercontent.com`).
   - Paste it into `frontend/.env` as `VITE_GOOGLE_CLIENT_ID=your-client-id`.

---

### Step 2: Install SMRITI on Your Android Phone
**Timing:** `[READY TO TEST NOW]`  
**Estimated Time:** ~1 minute  

The Android application is completely built and ready in your workspace.

1. **Locate the APK:**
   - File path: [`./smriti-debug.apk`](file:///home/thoughtful/Documents/antigravity/brave-mendeleev/smriti-debug.apk) (15 MB).
2. **Transfer to Your Phone:**
   - Send the file to your phone via USB cable, Google Drive, or messaging.
3. **Install:**
   - Tap `smriti-debug.apk` on your phone.
   - If prompted *"Install unknown apps"*, tap **Settings** and toggle **Allow from this source**.
   - Tap **Install**.
4. **Permissions:**
   - When opened, allow **Microphone** (for recording study audio notes) and **Notifications** (for lock-screen audio controls and revision reminders).
   - You can test audio playback, background operation, voice recording with noise reduction, and spaced repetition immediately!

---

### Step 3: Deploy Frontend to Cloudflare Pages (Optional Web Launch)
**Timing:** `[WHEN YOU WANT THE WEB VERSION LIVE GLOBALLY]`  
**Estimated Time:** ~2 minutes  
**Cost:** $0.00 (Cloudflare Pages Free Tier — Unlimited bandwidth)  

1. Push your SMRITI workspace to your free GitHub account repository.
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
3. Click **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your GitHub repository (`smriti`).
5. Configure Build Settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
6. Under **Environment variables (advanced)**, add:
   - `VITE_SUPABASE_URL`: `https://wppnfezoqpcgmowdkofp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_Jv7t8irT0s7wTNheRXMUpQ_SrNOB-0n`
   - `VITE_GOOGLE_CLIENT_ID`: (Your Google Client ID from Step 1)
7. Click **Save and Deploy**. Your web platform will be live at `https://smriti.pages.dev`!

---

### Step 4: Supabase Keepalive & User Management Setup (Part 2 Upgrade)
**Timing:** `[DATABASE MIGRATION ALREADY APPLIED LIVE]`  
**Status:** **100% DEPLOYED & TESTED**  
**Cost:** $0.00  

#### 1. SQL Migration Status: COMPLETED
The database schema migration [`supabase/migrations/20261119000001_add_user_blocking_and_roles.sql`](file:///home/thoughtful/Documents/antigravity/brave-mendeleev/supabase/migrations/20261119000001_add_user_blocking_and_roles.sql) has been **executed directly on your live PostgreSQL server**. You do **NOT** need to run any SQL manually in the Supabase SQL Editor.

#### 2. How to View Registered Users (User Count)
1. In Supabase Dashboard, click **Table Editor** > **profiles**.
2. You will see every registered student:
   - `email`: Student email address
   - `display_name`: Student full name
   - `last_seen_at`: Last active timestamp
   - `is_blocked`: Account access status (`false` = active, `true` = suspended)
   - `role`: Role (`student`, `admin`, `teacher`)

#### 3. How to Block or Unblock a User
- **To Block:** In **Table Editor** > **profiles**, find the user row, double-click `is_blocked`, check the box (`true`), and optionally enter a `blocked_reason` (e.g. *"Account suspended for exam policy violation"*). On their next launch or sync, their screen immediately locks with an "Access Suspended" message.
- **To Unblock:** Set `is_blocked` back to `false`. On their next refresh, normal access is automatically restored.

#### 4. GitHub Actions Keepalive (Automatic Inactivity Ping)
1. The workflow file is saved at [`.github/workflows/keepalive.yml`](file:///home/thoughtful/Documents/antigravity/brave-mendeleev/.github/workflows/keepalive.yml).
2. When you push this project to GitHub, go to your repository **Settings** > **Secrets and variables** > **Actions**.
3. Ensure repository secrets or default environment variables contain:
   - `VITE_SUPABASE_URL`: `https://wppnfezoqpcgmowdkofp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_Jv7t8irT0s7wTNheRXMUpQ_SrNOB-0n`
4. The workflow runs every 4 days at 06:00 UTC and pings Supabase PostgREST, resetting the 7-day inactivity pause automatically.
5. You can test it anytime under GitHub repository **Actions** > **Supabase Free Tier Keepalive Ping** > **Run workflow**.
