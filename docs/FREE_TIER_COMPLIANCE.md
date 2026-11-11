# FREE-TIER COMPLIANCE & ZERO-COST GUARANTEE

**Platform:** SMRITI — Audio Learning & Spaced Repetition Platform  
**Status:** 100% Free-Tier & Open Source Compliant  
**Credit Card Required:** **NO** (Zero credit card or payment method required)

---

## 1. External Services Inventory & Compliance Verification

| Service | Role | Free Plan Limits | Billing / Credit Card Policy | Inactivity / Expiration Policy | Safeguards Against Costs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cloudflare Pages** | Web Frontend Hosting | - Unlimited bandwidth<br>- Unlimited requests<br>- 500 builds/month<br>- 100 custom domains | No credit card required during sign-up or usage. | No pause or shutdown for inactivity. Sites remain live permanently. | Cannot incur charges unless user manually upgrades to Pro plan. |
| **Supabase** | Backend Database, Auth & Sync | - 500 MB PostgreSQL database<br>- 50,000 monthly active users<br>- 5 GB egress bandwidth/month<br>- 2 free projects | Free tier does NOT require a credit card. | Free tier databases pause after 7 days of inactivity. SMRITI provides simple 1-click restore or periodic sync ping to prevent pausing. | Projects cannot incur overage charges; queries simply fail/soft-limit if quota exceeded. |
| **Google Drive API** | Personal Audio Storage | - 15 GB free storage per personal Google account<br>- Standard API quota: 12,000 requests/minute | Google Cloud project free tier (OAuth Client ID) requires no billing account or credit card for standard API access. | Audio files reside permanently in the student's personal Google Drive. | Storage is hosted on the user's personal Google account, meaning zero hosting bills for the SMRITI platform. |
| **GitHub** | Code Hosting & CI/CD | - Unlimited public/private repos<br>- 2,000 GitHub Actions minutes/month | Free forever, no credit card required. | No expiration. | CI/CD build steps run well under 50 minutes/month. |
| **Android Open Source Libraries** | Native Android Client | - Apache 2.0 / MIT Open Source<br>- AndroidX Media3 / ExoPlayer<br>- Room SQLite, WorkManager | 100% local on-device execution. | Indefinite lifetime. | Zero server cost. Runs on student hardware. |

---

## 2. Strict Architectural Safeguards Against Incurring Costs

1. **Audio Bypasses Central Servers:**
   - Audio files are stored directly in the student's personal Google Drive under `My Drive/Smriti/`.
   - Audio files are **never** uploaded to Supabase Storage or any cloud S3 bucket.
   - SMRITI backend only synchronizes lightweight JSON metadata (subject, title, duration, tags, playback events, spaced-repetition schedules).

2. **Compact Database Footprint:**
   - 1 playback event ≈ 200 bytes.
   - 10,000 playback events ≈ 2 MB.
   - Aggregated lifetime statistics rollup ensures that even years of daily study consume less than 15 MB per student, fitting thousands of users into the 500 MB Supabase free tier.

3. **On-Device Audio Processing:**
   - Noise suppression and loudness normalization utilize Android hardware DSP (`NoiseSuppressor`) and local client-side DSP algorithms.
   - No external paid speech or audio APIs (e.g. OpenAI Whisper, Google Speech API, ElevenLabs) are utilized.

4. **Zero Paid Infrastructure Migration Required:**
   - The platform architecture is designed to remain permanently operational on the specified free services without requiring a forced upgrade to paid tiers.
