# 🧪 PrivaStream — Complete Step-by-Step Testing Guide

Welcome to the **PrivaStream** testing guide! This guide is written so that **anyone—even a completely new user, faculty member, or evaluator—can test every single feature of the project with zero prior setup or confusion.**

---

## ⚡ Quick Start (Running the Application)

### Step 1: Open the Frontend (Browser Application)
1. Open your terminal in the project folder (`c:\Users\user\OneDrive\Desktop\PrivaStram`).
2. Run:
   ```bash
   npm run dev
   ```
3. Open your browser and go to:
   👉 **`http://localhost:5173/`**

### Step 2: (Optional) Start the Python Backend
If you want to run the companion Python backend pipeline:
1. Open a second terminal window.
2. Run:
   ```bash
   python backend/app.py
   ```
3. You will see: `[PrivaStream] Backend Pipeline starting on http://localhost:5000`.

---

# 🎯 Feature-by-Feature Testing Walkthrough

---

## Feature 1: The Live Studio (Main Working Screen)

**Where to go**: Click **"Live Studio"** in the top navigation bar.

### What to do:
1. **Test Input Sources**: Look at the top control bar labeled `Input Source:`.
   * Click **"Live Webcam"**: The system will request camera permission and display your real-time webcam feed with the privacy shield applied.
   * Click **"Screen Share"**: Select any window or browser tab to test live screen privacy masking.
   * Click **"Synthetic Evaluator Testbeds"**: Perfect for offline testing without needing a physical camera or documents.

---

## Feature 2: Original vs. Protected Split-Screen Slider

**Where to go**: In **Live Studio**, look at the top-right view mode buttons.

### What to do:
1. Make sure **"Split Slider"** is selected.
2. Look at the bottom center of the video screen for the **Draggable Slider bar** (`RAW (0%) ────●──── PROTECTED (100%)`).
3. **Drag the slider left and right**:
   * **Left side**: Shows the raw, unmasked camera input.
   * **Right side**: Shows the protected stream with AI privacy masking in real time.
4. Click **"Side-by-Side"**: Splitted 50/50 view comparing raw and protected feeds simultaneously.
5. Click **"Protected View"**: Shows the clean, broadcast-ready viewer stream.

---

## Feature 3: The 4 Built-In Evaluator Scenarios (1-Click Demos)

**Where to go**: In **Live Studio**, with `Synthetic Evaluator Testbeds` selected, look at the 4 scenario buttons below the top bar.

---

### 🟢 Scenario 1: Face Privacy & Whitelist
* **Click**: **"Face Privacy & Whitelist"**
* **What you see**: Two people on screen:
  * **Left (Stream Host - Nikhil)**: Clean and visible (because he is registered in the Face Whitelist).
  * **Right (Stranger / Guest)**: Automatically blurred/masked by the AI.
* **Why this is important**: Shows that PrivaStream is smart—it does **not** blindly blur the streamer, only unauthorized people.

---

### 🟢 Scenario 2: Document OCR & Selective Text PII
* **Click**: **"Document OCR Test"** in the Live Studio input bar for the built-in fixture, or **"Upload Document"** to run OCR on a document image of your choice. You can also select **"Synthetic Testbeds"** and then **"Document OCR & Targeted PII"**.
* **What you see**: A Government ID Card containing:
  * Name: `Rohan Sharma` (Visible & Clean)
  * Role: `Authorized Software Evaluator` (Visible & Clean)
  * Aadhaar / ID No: `XXXX-XXXX-9012` (**Masked / Blurred**)
  * Emergency Phone: `+91 98765 43210` (**Masked / Blurred**)
  * Official Email: `demo.user@example.test` (**Masked / Blurred**)
  * Validity: `2026 - 2030` (Visible & Clean)
* **What to verify**: The card is a synthetic fixture, but its text is processed by the browser OCR worker. The HUD shows OCR status and active mask regions. If the worker is still loading, wait briefly; if it reports an error, check browser console/network access for Tesseract worker and language files.
* **Why this is important**: Demonstrates the OCR $\to$ PII matching $\to$ masking pipeline. Ordinary words should remain visible while sensitive values are covered.

---

### 🟢 Scenario 3: Vehicle License Plate Anonymization
* **Click**: **"License Plate Privacy"**
* **What you see**: A vehicle with license plate `DL 01 AB 1234`.
* **What happens**: The license plate is automatically detected and covered with a targeted privacy mosaic.
* **Why this is important**: Protects against accidental outdoor or dashcam vehicular leaks.

---

### 🟢 Scenario 4: Spoken PII & Audio Redaction
* **Click**: **"Spoken PII & Audio Redaction"**
* **What to do**: Look at the **Multimodal Audio Shield** panel below the video.
* **Click any of the 3 test buttons**:
  1. *"Spoken Phone Number"* (`"My primary contact number is +91 98765 43210..."`)
  2. *"Spoken Email Address"* (`"Please forward to demo.user@example.test..."`)
  3. *"Spoken ID / Aadhaar"* (`"My identity code is XXXX-XXXX-9012..."`)
* **What happens**:
  * You will hear a **1000Hz censorship bleep tone** injected into the Web Audio stream.
  * In the **Live Speech Transcript**, the sensitive words are instantly replaced with a red glowing badge: `[REDACTED: PHONE]` or `[REDACTED: EMAIL]`.
  * The **FFT Equalizer Waveform** animates in real time.

---

## Feature 4: Explainable AI Inspector ("Why was this protected?")

**Where to go**: In **Live Studio** or **Event Logs**.

### What to do:
1. In the video canvas, **click directly on any masked bounding box** (e.g., on the blurred phone number or face).
2. An **Explainable AI Inspector** card pops up in the top right:
   * **Rule Triggered**: Shows the exact regular expression or metric (e.g., `E.164 Contact Number Regex`).
   * **Protection Rationale**: Explains why the AI flagged this data.
   * **Execution Engine**: E.g., `Client Rule-Based Parser` or `Backend YOLOv8-Face`.
   * **Confidence Score**: Exact probability (e.g., `96.2%`).
3. Click the `✕` button to close the inspector.

---

## Feature 5: Face Whitelist & Trusted Profiles

**Where to go**: Click **"Face Whitelist"** in the top navigation.

### What to do:
1. **View Profiles**: See existing profiles for `Nikhil (Streamer / Host)` and `Dr. Sarah`.
2. **Add a New Trusted Face**:
   * Type a name (e.g., `"Alex (Co-Host)"`).
   * Select role: `"Co-Host"`.
   * Adjust the match threshold slider.
   * Click **"+ Add to Trusted Whitelist"**.
3. **Toggle Protection**: Click **"✓ Whitelist Active"** to temporarily disable or enable whitelist protection for any person.

---

## Feature 6: Privacy Rules & Masking Styles

**Where to go**: Click **"Privacy Rules"** in the top navigation.

### What to do:
1. **Change Masking Style**:
   * Click between **"Cyber Shield"**, **"Gaussian Blur"**, **"Pixelate Mosaic"**, and **"Solid Redaction"**.
   * Go back to **Live Studio** and observe the visual change immediately!
2. **Test Anti-Flicker Temporal Stabilization**:
   * Adjust the **"Persistence Frames"** slider ($1$ to $8$ frames). This eliminates camera flickering when someone moves fast.
3. **Toggle Privacy Categories**:
   * Turn specific filters on or off (e.g., uncheck *License Plates* or *Spoken Emails*).

---

## Feature 7: Emergency Privacy Fail-Safe Lock

**Where to go**: Top navigation bar status pill (`PROTECTED`).

### What to do:
1. Click the green **`PROTECTED`** button in the header.
2. It switches to a pulsing red **`FAIL-SAFE ENGAGED`** alert.
3. Go to **Live Studio**: The entire frame is instantly shielded with a dark security layer and warning message.
4. **Why this is important**: Guarantees **Zero Data Leakage** if processing latency ever exceeds 150ms.
5. Click **`FAIL-SAFE ENGAGED`** again to restore normal protection.

---

## Feature 8: Real-Time Event Audit Log & CSV Export

**Where to go**: Click **"Event Logs"** in the top navigation.

### What to do:
1. **Search**: Type `"phone"` or `"face"` in the search bar.
2. **Filter by Category**: Click `VISUAL`, `AUDIO`, `FACE`, or `PHONE NUMBER`.
3. **Click "Explain"**: On any row to see why that item was protected.
4. **Export CSV**: Click **"Export CSV"** to download a spreadsheet audit report of all events.

---

## Feature 9: Telemetry & Analytics Dashboard

**Where to go**: Click **"Analytics"** in the top navigation.

### What to do:
1. View the **Detection Distribution Bar Chart** (Faces vs. Text PII vs. Plates vs. Audio).
2. View the **Stream FPS vs. Latency Line Chart** (real-time telemetry benchmark).
3. Check the **Overall Privacy Grade**: `97/100 (A+)`.

---

## Feature 10: Ephemeral Data Lifecycle (Zero-Disk Guarantee)

**Where to go**: Header button or **Settings** tab.

### What to do:
1. Look at the top right of the header and click **"Purge Memory"** (Trash icon).
2. All in-memory detection buffers, transcripts, and event logs are wiped clean in $0\text{ms}$.
3. No data is ever saved to persistent disk storage.

---

## Feature 11: Protected-Only Recording & Snapshot Export

**Where to go**: In **Live Studio**, top-right controls.

### What to do:
1. Click **"Snapshot"**: Downloads an immediate PNG image of the **protected output canvas only**.
2. Click **"Record Protected Stream"**: Starts recording a WebM video stream. Click again to stop and download.
3. **Security Guarantee**: Raw unmasked video is physically disconnected from the recorder.

---

# ⏱️ The 60-Second Faculty / Evaluator Demo Script

If you are presenting this project to a professor or evaluator in **1 minute**, follow these exact steps:

1. **Open Live Studio**: Point out the live stream status and 60 FPS counter in the header.
2. **Show Scenario 1 (Face Whitelist)**: *"Here, the AI detects faces in the stream. The registered host Nikhil stays visible, while background strangers are blurred."*
3. **Show Scenario 2 (ID Document OCR)**: *"This is our 3-stage visual pipeline. The AI extracts text from the ID card, detects the Aadhaar number, phone, and email, and masks only the sensitive digits while keeping the rest of the document readable."*
4. **Drag the Split-Screen Slider**: *"The evaluator can slide left and right to compare raw versus protected video in real time."*
5. **Click a Spoken PII Phrase**: *"For audio, when a sensitive number is spoken, our DSP engine injects a 1000Hz bleep into the audio stream and redacts the live transcript."*
6. **Click on any Masked Box**: *"Every detection is explainable—clicking any box shows the exact rule, confidence percentage, and rationale."*
7. **Show Analytics & Export**: *"Finally, all events are logged with 0ms disk retention and can be exported as a CSV audit trail."*

---

# ✅ Summary Checklist

- [x] Tested Live Webcam & Screen Sharing
- [x] Tested Draggable Split-Screen Slider
- [x] Tested Scenario 1 (Face Whitelist)
- [x] Tested Scenario 2 (Document OCR PII)
- [x] Tested Scenario 3 (License Plate)
- [x] Tested Scenario 4 (Audio 1kHz Tone Redaction)
- [x] Tested Explainable AI Inspector
- [x] Tested Privacy Rules & Masking Styles
- [x] Tested Face Whitelist Enrollment
- [x] Tested Fail-Safe Emergency Lock
- [x] Tested Event Audit Log & CSV Export
- [x] Tested Recharts Analytics Graphs
- [x] Tested Ephemeral Memory Purge
- [x] Tested Protected-Only Snapshot Download
