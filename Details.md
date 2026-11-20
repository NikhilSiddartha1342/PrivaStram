# PrivaStream — Project Architecture & Implementation Details

**PrivaStream** is an AI-powered real-time multimodal privacy protection platform designed to prevent accidental exposure of Personally Identifiable Information (PII) during livestreams, video conferencing, screen sharing, and recordings. It processes both video and audio streams simultaneously to detect and anonymize sensitive information before it reaches viewers.

---

## 1. 📂 Project Directory Structure

```text
PrivaStream/
├── package.json                   # Project dependencies and run scripts
├── vite.config.ts                 # Vite bundler configuration & dev server
├── tsconfig.json                  # TypeScript compiler settings
├── tailwind.config.js             # Cybernetic dark theme & color tokens
├── index.html                     # HTML5 entry with Outfit & JetBrains Mono fonts
│
├── src/
│   ├── main.tsx                   # React root entry point
│   ├── App.tsx                    # Main layout, router & navigation coordinator
│   ├── index.css                  # Global glassmorphism, scanlines, and cyber styling
│   │
│   ├── types/
│   │   └── index.ts               # Core TypeScript interfaces & data contracts
│   │
│   ├── services/
│   │   ├── visionEngine.ts        # 3-Stage OCR PII, Face match, Kalman anti-flicker & masks
│   │   ├── audioEngine.ts         # Web Audio API DSP, 1kHz bleep tone, VAD & spoken PII
│   │   └── syntheticData.ts       # 100% synthetic testbeds (Aadhaar, Phone, Plate, Audio)
│   │
│   ├── context/
│   │   └── PrivacyStreamContext.tsx # Central state: metrics, rules, whitelist, memory purge
│   │
│   └── components/
│       ├── layout/
│       │   └── Header.tsx         # Top bar with status pill, score, tier switcher, purge button
│       ├── studio/
│       │   ├── LiveStudioView.tsx # Centerpiece: Canvas video, split-screen slider, recording
│       │   ├── AudioHUD.tsx       # Live FFT visualizer, speech transcript, bleep triggers
│       │   └── ExplainableInspector.tsx # Explainable AI popover ("Why was this protected?")
│       ├── dashboard/
│       │   └── DashboardView.tsx  # KPI cards, Multimodal Signal Flow diagram, alert feed
│       ├── rules/
│       │   └── PrivacyRulesView.tsx # Visual/Audio filters, mask style, anti-flicker tuning
│       ├── whitelist/
│       │   └── FaceWhitelistView.tsx # Face enrollment, similarity threshold, profile cards
│       ├── events/
│       │   └── EventLogView.tsx   # Audit table with search filter, reason chips & CSV export
│       ├── analytics/
│       │   └── AnalyticsView.tsx  # Recharts graphs: Latency vs FPS, Category distributions
│       └── settings/
│           └── SettingsView.tsx   # 0ms disk retention policy, engine mode & backend setup
│
└── backend/                       # Companion Python Deep Learning Pipeline
    ├── requirements.txt           # Python dependencies (Torch, YOLO, EasyOCR, Whisper)
    ├── app.py                     # Flask + SocketIO REST & WebSocket server
    ├── pipeline_manager.py        # Multimodal pipeline orchestrator
    ├── README.md                  # Backend documentation & quickstart
    ├── vision/
    │   ├── face_detector.py       # YOLOv8-Face / Haar detector & Whitelist matcher
    │   ├── plate_detector.py      # YOLOv8 license plate detector
    │   ├── ocr_pii_engine.py      # EasyOCR + regex/NER targeted word-level spans
    │   └── stabilizer.py          # Temporal Kalman filter anti-flicker algorithm
    └── audio/
        ├── vad_engine.py          # Silero VAD voice activity detection
        ├── whisper_engine.py      # Faster-Whisper speech-to-text inference
        ├── deberta_pii.py         # DeBERTa-v3 spoken PII token classifier
        └── audio_redactor.py      # Audio buffer PCM 1kHz tone splicer
```

---

## 2. 📑 File-by-File Explanation & Feature Implementation

### 1. Type Definitions & Contracts

#### [`src/types/index.ts`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/types/index.ts)
* **Purpose**: Defines strict TypeScript interfaces for all data structures across the application.
* **Key Interfaces**:
  * `DetectionBox`: Represents a bounding box in normalized coordinates (`0.0` to `1.0`), category (`face`, `phone_number`, `aadhaar_id`, `license_plate`), confidence score, whitelist status, and explainable reason.
  * `ExplainableReason`: Holds the exact trigger rule (e.g., regex string), explanatory text, engine name, and decision metric.
  * `PrivacyRulesConfig`: Controls which visual and audio filters are active, sensitivity level, masking mode, and fail-safe thresholds.
  * `StreamMetrics`: Real-time telemetry (FPS, Latency ms, Stream health %, Privacy score).

---

### 2. Computer Vision & Audio Processing Engines

#### [`src/services/visionEngine.ts`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/services/visionEngine.ts)
* **Purpose**: In-browser Computer Vision and Video Privacy Engine.
* **How Features Are Implemented**:
  1. **3-Stage Visual Text Pipeline (`extractTextPIIBoundingBoxes`)**:
     * *Stage 1*: Receives extracted text lines and bounding geometry.
     * *Stage 2*: Runs regular expressions/NER heuristics to classify sensitive entities (`Phone`, `Email`, `Aadhaar / National ID`, `Credit Card`).
     * *Stage 3*: Calculates precise character sub-span coordinates and generates targeted bounding boxes strictly over the sensitive text, preserving surrounding non-sensitive text.
  2. **Anti-Flicker Temporal Stabilization (`applyTemporalStabilization`)**:
     * Maintains a Map of tracked bounding boxes across frames.
     * Computes centroid distance between current detections and previous frames.
     * Applies Exponential Moving Average (EMA) smoothing to coordinates (`x`, `y`, `w`, `h`).
     * If a detection drops for $1-4$ frames (common in real-time video), the tracker maintains the mask using `persistenceFrames` to prevent flickering.
  3. **Multi-Mode Privacy Mask Rendering (`renderPrivacyMasks`)**:
     * `gaussian_blur`: Extracts sub-canvas, applies native 2D canvas blur filter ($18\text{px}$ radius), and clips to the bounding box.
     * `pixelate`: Downscales the sub-region to an un-smoothed tiny canvas (e.g. $14\text{px}$ blocks) and draws it back enlarged.
     * `solid_black`: Fills with solid dark color and renders a `█ REDACTED █` stamp.
     * `cyber_shield`: Combines low-res pixelation with neon cyan brackets and diagonal scanlines.
  4. **Emergency Fail-Safe Lock**:
     * If latency exceeds $150\text{ms}$, it renders a full-frame protective shield to guarantee zero data leakage.

#### [`src/services/audioEngine.ts`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/services/audioEngine.ts)
* **Purpose**: Web Audio API DSP and Spoken PII Redaction Engine.
* **How Features Are Implemented**:
  1. **True Web Audio Stream Redaction (`initializeAudioGraph` & `triggerAudioStreamRedaction`)**:
     * Creates an `AudioContext` DSP graph: `Microphone` $\to$ `AnalyserNode` $\to$ `MainGainNode` $\to$ `MediaStreamDestinationNode`.
     * Spawns a parallel `OscillatorNode` generating a continuous $1000\text{Hz}$ censorship sine tone connected to a `BleepGainNode`.
     * When spoken PII is detected, `mainGain` ramps to $0.0$ (muting speech) while `bleepGain` ramps to $0.25$ (injecting the tone) for the exact duration.
  2. **Speech Recognition & Transcript Redaction (`processSpokenText`)**:
     * Connects to the Web Speech API / transcript stream.
     * Matches spoken patterns (e.g., telephone digits, emails, ID sequences).
     * Automatically masks the transcript string with `[REDACTED: PHONE]` and triggers the DSP bleep tone.
  3. **Live Waveform Visualizer (`getWaveformData`)**:
     * Samples the FFT frequency byte data ($256$ bins) to drive the real-time equalizer bars.

#### [`src/services/syntheticData.ts`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/services/syntheticData.ts)
* **Purpose**: Provides 100% fictitious, compliant test scenarios for evaluators.
* **Scenarios Included**:
  * **Scenario 1 (Face Whitelist)**: Host (Nikhil) vs. Stranger face.
  * **Scenario 2 (ID Document OCR)**: Synthetic ID card (`XXXX-XXXX-9012`, `+91 98765 43210`, `demo.user@example.test`).
  * **Scenario 3 (License Plate)**: Vehicle plate `DL 01 AB 1234`.
  * **Scenario 4 (Spoken PII)**: Spoken phone, email, and ID test phrases.

---

### 3. Global State Management

#### [`src/context/PrivacyStreamContext.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/context/PrivacyStreamContext.tsx)
* **Purpose**: Centralized React Context providing global state and actions.
* **Key Features**:
  * Tracks active tab, execution tier (`browser_client` / `backend_ai`), and video input source.
  * Stores active `rules`, `faceWhitelist`, `eventsLog`, and `metrics`.
  * **`purgeAllSessionData()`**: Instantly clears active detections, transcript history, and event logs from RAM to enforce the $0\text{ms}$ disk retention policy.

---

### 4. UI Components

#### [`src/components/studio/LiveStudioView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/studio/LiveStudioView.tsx)
* **Purpose**: The centerpiece working studio of PrivaStream.
* **How Features Are Implemented**:
  * **Source Switcher**: Allows toggling between Live Webcam (`navigator.mediaDevices.getUserMedia`), Screen Sharing (`navigator.mediaDevices.getDisplayMedia`), and the 4 Synthetic Testbed Scenarios.
  * **Original vs. Protected Split-Screen**:
    * Maintains an internal `rawCanvas` and a `protectedCanvas`.
    * In **Split Slider** mode, it slices both canvases dynamically based on the slider percentage ($0\%$ to $100\%$) and renders a glowing cyan divider handle.
    * In **Side-by-Side** mode, it renders the raw input on the left half and the masked output on the right half.
  * **Protected-Only Recording & Snapshots**:
    * `handleDownloadSnapshot` exports strictly from `protectedCanvasRef`.
    * `handleToggleRecording` binds `MediaRecorder` exclusively to `protectedCanvasRef.captureStream(30)`. Raw unmasked video has no recording sink.

#### [`src/components/studio/ExplainableInspector.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/studio/ExplainableInspector.tsx)
* **Purpose**: Explainable AI popover inspector ("Why was this protected?").
* **Implementation**:
  * Displays the exact rule matched, confidence percentage, execution engine, decision metric, and human-readable explanation when any bounding box is clicked.

#### [`src/components/studio/AudioHUD.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/studio/AudioHUD.tsx)
* **Purpose**: Real-time multimodal audio control panel.
* **Implementation**:
  * Animates a 24-bar audio equalizer canvas using FFT data from `AudioProcessingEngine`.
  * Renders the real-time transcript stream with red glowing `[REDACTED: PHONE]` badges.
  * Provides 1-click test buttons for spoken phone, email, and ID test phrases.

#### [`src/components/layout/Header.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/layout/Header.tsx)
* **Purpose**: Top navigation and system health bar.
* **Implementation**:
  * Features the glowing shield logo with *"Protect Every Frame."* caption.
  * Displays live status pills: `● PROTECTED` (or pulsing red `FAIL-SAFE LOCK`), Latency ($38\text{ms}$), and Privacy Score ($97/100$).
  * Houses the Execution Tier switcher and the *"Purge Memory"* button.

#### [`src/components/dashboard/DashboardView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/dashboard/DashboardView.tsx)
* **Purpose**: High-level overview and system status.
* **Implementation**:
  * Displays 4 KPI cards: Stream Protection Status, Stream Health ($99\%$), Latency, and Privacy Score.
  * **Multimodal Signal Flow Diagram**: An interactive architectural diagram showing real-time signal flow across Camera/Mic $\to$ Video/Audio Pipelines $\to$ Fail-Safe Guard $\to$ Protected Output.

#### [`src/components/rules/PrivacyRulesView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/rules/PrivacyRulesView.tsx)
* **Purpose**: Granular configuration panel for visual and audio privacy rules.
* **Implementation**:
  * Checkbox toggles for Faces, Whitelist bypass, License Plates, ID Documents, and OCR Text.
  * Checkbox toggles for Spoken Phones, Emails, IDs, Addresses, and Mouth-Sync.
  * Visual Masking style picker (Cyber Shield, Gaussian Blur, Pixelate, Solid Black).
  * Persistence Frames ($1-8$) and Fail-Safe latency threshold sliders ($100-300\text{ms}$).

#### [`src/components/whitelist/FaceWhitelistView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/whitelist/FaceWhitelistView.tsx)
* **Purpose**: Face Whitelist & Trusted Profiles management.
* **Implementation**:
  * Form to enroll trusted individuals (Host, Co-Host, Guest) with custom cosine similarity thresholds ($0.40 - 0.90$).
  * Profile cards with live toggles to exempt or enforce blurring per individual.

#### [`src/components/events/EventLogView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/events/EventLogView.tsx)
* **Purpose**: Real-time explainable audit log.
* **Implementation**:
  * Searchable and filterable table displaying every detection event with timestamp, category, action taken, and confidence.
  * *Explain* button opens the Explainable AI Inspector.
  * *Export CSV* generates a downloadable audit report.

#### [`src/components/analytics/AnalyticsView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/analytics/AnalyticsView.tsx)
* **Purpose**: Telemetry and metrics dashboard.
* **Implementation**:
  * Uses **Recharts** to render:
    * Categorical detection distribution bar chart.
    * Stream FPS vs. Multimodal Inference Latency performance line chart.
    * Privacy Grade badge ($97/100, \text{A+}$).

#### [`src/components/settings/SettingsView.tsx`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/src/components/settings/SettingsView.tsx)
* **Purpose**: Ephemeral data lifecycle controls and backend configuration.
* **Implementation**:
  * Outlines the Zero-Disk Ephemeral Storage Guarantee.
  * Provides quick CLI instructions to start the Python Flask backend.

---

### 5. Modular Python Backend (`backend/`)

* [`backend/app.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/app.py): Flask + Flask-SocketIO server exposing `/api/status`, `/api/rules`, `/api/process_frame`, and WebSocket streams.
* [`backend/pipeline_manager.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/pipeline_manager.py): Coordinates the vision and audio pipelines.
* [`backend/vision/face_detector.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/vision/face_detector.py): YOLOv8-Face and Cascade detector with Whitelist matching.
* [`backend/vision/plate_detector.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/vision/plate_detector.py): YOLOv8 vehicle license plate detector.
* [`backend/vision/ocr_pii_engine.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/vision/ocr_pii_engine.py): EasyOCR text extractor with regex/NER PII filtering.
* [`backend/vision/stabilizer.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/vision/stabilizer.py): Kalman filter temporal stabilization.
* [`backend/audio/vad_engine.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/audio/vad_engine.py): Silero VAD energy gating.
* [`backend/audio/whisper_engine.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/audio/whisper_engine.py): Faster-Whisper speech-to-text inference.
* [`backend/audio/deberta_pii.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/audio/deberta_pii.py): DeBERTa-v3 spoken PII token classifier.
* [`backend/audio/audio_redactor.py`](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/backend/audio/audio_redactor.py): PCM audio buffer splicer (1kHz tone or zero-energy silence).

---

## 3. 🚀 How to Run the Project

### Running the Frontend (Active Now)
The frontend is running at:
👉 **`http://localhost:5173/`**

To restart if needed:
```bash
npm run dev
```

### Running the Backend
```bash
python backend/app.py
```