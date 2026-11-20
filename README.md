# PrivaStream — AI-Powered Real-Time Multimodal Privacy Shield

> **Protect Every Frame.**

PrivaStream is an AI-powered real-time privacy protection platform that prevents users from accidentally exposing Personally Identifiable Information (PII) while livestreaming, video conferencing, screen sharing, or recording video.

---

## 📖 Quick Links & Documentation

* 🧪 **[Complete Testing Guide (Step-by-Step)](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/TESTING_GUIDE.md)** — Step-by-step walkthrough to test every single feature, split-screen slider, audio bleep, and demo scenario with zero confusion.
* 📑 **[Architecture & Implementation Details](file:///c:/Users/user/OneDrive/Desktop/PrivaStram/Details.md)** — Deep technical specification explaining what every file does and how each algorithm is implemented.

---

## ⚡ Quick Start

### 1. Run the Frontend (Live UI)
```bash
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### 2. (Optional) Run the Python Backend Server
```bash
pip install -r backend/requirements.txt
python backend/app.py
```
Backend API will start on **`http://localhost:5000/`**.

---

## 🎯 Key Features

* **Real-Time Video Masking Engine**: 3-Stage OCR $\to$ PII detection $\to$ targeted bounding box masking.
* **Original vs. Protected Split-Screen**: Interactive draggable slider comparing raw camera feed against anonymized output.
* **Face Whitelist**: Streamer stays visible while background faces are automatically blurred.
* **True Audio Stream Redaction**: Real-time Web Audio API DSP 1000Hz censorship tone injection and live transcript redaction.
* **Anti-Flicker Temporal Stabilization**: Kalman/EMA tracking filter eliminates flickering.
* **Explainable AI Inspector**: Click any masked region to inspect the exact detection rule, confidence score, and rationale.
* **Privacy Fail-Safe Lock**: Automatic emergency masking if inference latency exceeds 150ms.
* **Zero-Disk Ephemeral Policy**: All media processed purely in RAM with 0ms disk storage.
