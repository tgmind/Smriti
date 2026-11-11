# SMRITI (स्मृति)
### Premium Offline-First Audio Learning & Memory Reinforcement Platform
> **"Listen. Repeat. Recall. Remember."**

SMRITI is an educational audio platform designed for high-school, university, and competitive examination students who need to memorize complex formulas, scientific derivations, historical chronologies, and foundational academic concepts through active listening, retrieval practice, and scientifically grounded spaced repetition.

---

## 1. Core Architectural Pillars

- **100% Zero-Cost Infrastructure:** Operates entirely on Cloudflare Pages Free, Supabase Free, personal Google Drive storage, and open-source Android libraries. No credit cards or paid subscriptions required.
- **Sovereign Student Storage:** Audio files reside in each student's personal Google Drive (`My Drive/Smriti/`). The platform incurs zero central storage fees and never inspects private files.
- **Tripartite Cognitive Model:** Strictly distinguishes between **Exposure** (listening duration), **Recall** (immediate retrieval performance), and **Retention** (long-term memory stability over time). Never invents fabricated "Retention Percentages" from audio play counts.
- **Offline-First 3-Tier Storage:**
  - **Layer A:** Android Room SQLite database for instant, zero-latency offline operations.
  - **Layer B:** Supabase PostgreSQL with strict Row Level Security (RLS) for cross-device metadata sync and aggregate statistics.
  - **Layer C:** Student Google Drive via Google Drive API (`drive.file` scope) for audio payloads.
- **Native Precision Audio Engine:** Background audio persistence via AndroidX Media3 / ExoPlayer, MediaSessionService, A-B repeating loops for formula memorization, variable speeds (0.5x–2.5x), sleep timers, and hardware noise suppression.

---

## 2. Directory Structure

```
.
├── frontend/               # React 18, TypeScript, Vite, Tailwind CSS PWA
│   ├── src/
│   │   ├── components/     # Home, Library, Progress, Record, Profile, Players, Modals
│   │   ├── services/       # Bridge, Learning Engine (SM-2), Google Drive, Supabase
│   │   └── types/          # Core TypeScript definitions
│   └── dist/               # Production build output
├── android/                # Native Android application (Kotlin, AndroidX Media3)
│   ├── app/src/main/
│   │   ├── assets/dist/    # Bundled offline production frontend
│   │   └── kotlin/com/smriti/app/
│   │       ├── bridge/     # SmritiWebBridge (@JavascriptInterface)
│   │       ├── data/       # Room Database, DAOs, Entities
│   │       ├── media/      # Media3 MediaSessionService
│   │       └── recorder/   # Hardware DSP Voice Recorder
├── supabase/               # Database migrations & PostgreSQL RLS policies
│   └── migrations/         # 20261111000001_initial_smriti_schema.sql
├── docs/                   # Full Technical Specifications
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── FREE_TIER_COMPLIANCE.md
│   ├── MANUAL_SETUP_REQUIREMENTS.md
│   ├── PRIVACY_AND_SECURITY.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── KNOWN_LIMITATIONS.md
└── .github/workflows/      # Automated Cloudflare Pages deployment CI/CD
```

---

## 3. Quick Start & Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev        # Launches local development server at http://localhost:3000
npm run test       # Executes Vitest suite for SM-2 and completed-play rules
npm run build      # Compiles production TypeScript bundle into dist/
```

### Android Native Build
```bash
cd android
export JAVA_HOME=/path/to/jdk-21
./gradlew assembleDebug   # Generates app-debug.apk
```

---

## 4. Spaced Repetition Algorithm (SuperMemo SM-2)
When students test their active recall, they rate their ease of retrieval:
- **Again (0):** Complete lapse $\rightarrow$ repetition count resets to 0, interval resets to 1 day.
- **Hard (1):** Struggled recall $\rightarrow$ interval resets to 1 day.
- **Good (2):** Successful recall $\rightarrow$ interval advances geometrically based on the Ease Factor ($EF$).
- **Easy (3):** Instant confident recall $\rightarrow$ interval advances with a 1.3x bonus multiplier.

Ease Factor adjustment:
$$EF' = \max\left(1.3, EF + (0.1 - (3 - q) \times (0.08 + (3 - q) \times 0.02))\right)$$

---

## 5. License
Open source under Apache 2.0 / MIT.
