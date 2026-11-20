# PrivaStream — Backend AI Pipeline

Multimodal Python processing backend for real-time video and audio privacy anonymization.

## Architecture

```
                    ┌─────────────────────────┐
                    │    Flask + Socket.IO    │
                    │   (REST & WebSockets)   │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
    VIDEO PIPELINE                              AUDIO PIPELINE
    ├── vision/face_detector.py                 ├── audio/vad_engine.py (Silero VAD)
    │   (YOLOv8-Face + Whitelist)               ├── audio/whisper_engine.py (Faster-Whisper)
    ├── vision/plate_detector.py                ├── audio/deberta_pii.py (DeBERTa-v3 NLP)
    │   (YOLOv8 License Plates)                 └── audio/audio_redactor.py
    ├── vision/ocr_pii_engine.py                    (PCM 1kHz Tone Redaction)
    │   (EasyOCR + Targeted Spans)
    └── vision/stabilizer.py
        (Temporal Kalman Filter)
```

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Launch Server**:
   ```bash
   python app.py
   ```
   The server runs on `http://localhost:5000`.

## Zero-Disk Ephemeral Privacy Policy
All frame buffers, facial embeddings, and audio chunks are processed strictly in volatile RAM. No unmasked data is ever persisted to disk.
