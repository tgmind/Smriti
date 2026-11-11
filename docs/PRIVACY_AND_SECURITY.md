# PRIVACY AND SECURITY SPECIFICATION

**Platform:** SMRITI — Offline-First Audio Learning & Memory Reinforcement Platform  
**Target:** Production Security & Student Privacy Guarantee  

---

## 1. Core Privacy Philosophy: Sovereign Audio Storage

Unlike conventional educational or music apps that upload user media to central company servers, **SMRITI enforces 100% sovereign user storage**:

1. **Personal Google Drive:**
   - Every audio note, derivation lecture, and recorded study memo is stored directly in the student's personal Google Drive.
   - SMRITI accesses Google Drive using the narrowest practical OAuth 2.0 scope: `https://www.googleapis.com/auth/drive.file`.
   - Under this scope, SMRITI can **only** access files that SMRITI itself created or that the student specifically opened with SMRITI. SMRITI has zero access to any personal photos, documents, or unrelated files in the student's Drive.

2. **Zero Audio on Central Servers:**
   - The central Supabase database stores only lightweight metadata (lesson titles, subject tags, duration, and spaced repetition intervals).
   - Audio files are **never** routed through or stored on Supabase Storage, AWS S3, or third-party buckets.

3. **No Paid Speech or AI Surveillance:**
   - Audio recordings are processed on-device using local DSP (hardware `NoiseSuppressor` and loudness normalization).
   - No audio stream is ever sent to external transcription or speech analysis APIs.

---

## 2. Database Security & Row-Level Security (RLS)

Every database table in Supabase is locked behind PostgreSQL Row-Level Security:

- **Default Deny:** All unauthenticated or cross-user requests are rejected by PostgreSQL.
- **Tenant Isolation:** Every table row contains a `user_id` foreign key mapped to `auth.users(id)`.
- **Policy Enforcement:**
  ```sql
  create policy "Users view own audio_items" on public.audio_items
    for select using (auth.uid() = user_id);
  ```
- **Service Role Protection:** No `service_role` keys are ever bundled into the client application or APK. The application operates solely through the public `anon` key combined with authenticated user JWT sessions.

---

## 3. Native Android Security & Bridge Hardening

1. **Android Keystore & Encrypted Preferences:**
   - User authentication tokens and Google Drive refresh tokens are stored using `androidx.security.crypto.EncryptedSharedPreferences`, backed by the hardware-backed Android Keystore system.

2. **JavaScript Bridge Boundary:**
   - The native bridge interface (`SmritiBridge`) is isolated to specifically annotated `@JavascriptInterface` methods.
   - No arbitrary shell or code execution interfaces are exposed.
   - All input JSON strings are strictly parsed and validated before touching native services.

3. **WebView Security Configuration:**
   - Whitelisted origins prevent loading untrusted remote scripts.
   - Mixed content handling ensures all network transport uses TLS 1.3 encryption.

---

## 4. Student Data Portability & Account Deletion

1. **Instant Data Export:**
   - Students can export their complete learning history, recall ratings, and repetition schedules in both JSON and CSV formats at any time via the Profile screen.

2. **Account Disconnection & Deletion:**
   - Disconnecting Google Drive immediately removes the OAuth access token from device memory.
   - Deleting the SMRITI profile wipes all metadata and spaced repetition records from the database without touching or deleting the student's underlying audio files in Google Drive.
