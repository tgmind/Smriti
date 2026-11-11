# SMRITI KNOWN LIMITATIONS & HONEST ARCHITECTURAL BOUNDS

**Platform:** SMRITI — Offline-First Audio Learning & Memory Reinforcement Platform  
**Target:** Product Owner & Engineering Reference  

---

## 1. Google Drive Integration Bounds
- **Narrow OAuth Scope (`drive.file`):** SMRITI deliberately requests the minimal permissions necessary. It can only read and manage files it creates or files explicitly opened through Google Picker by the student. It cannot inspect the student's entire Drive root or unrelated folders.
- **Quota:** Audio storage is bounded by the student's personal Google account (15 GB free by default across Gmail, Drive, and Photos). If a student completely exhausts their personal 15 GB, new Drive uploads will fail until they free up space or choose to save only to on-device offline storage.

---

## 2. Supabase Free Tier Behavior
- **Inactivity Pause:** Free Supabase databases automatically pause after 7 consecutive days of zero traffic. If paused, a student opening the app will experience a brief delay while Supabase wakes up, or the owner can restore it with a single click in the dashboard. SMRITI local Room database prevents students from losing offline access even if the remote database is paused.
- **Row Limits:** The 500 MB database free limit comfortably holds millions of audio metadata rows and compact daily study rollups.

---

## 3. On-Device DSP Audio Enhancement
- **Hardware Variation:** SMRITI utilizes Android's native `NoiseSuppressor` audio effects. While all modern Android devices support it, some ultra-budget chipsets lack hardware noise suppression algorithms in their firmware. On such devices, SMRITI safely falls back to standard high-bitrate AAC recording without crashing.

---

## 4. Spaced Repetition Transparency
- **Exposure ≠ Retention:** SMRITI strictly prohibits converting listening duration into a fabricated "Memory IQ" or "Mastery Percentage". Exposure measures how much time you spent listening. Retention is exclusively updated when the student actively answers recall checks (Again / Hard / Good / Easy).
