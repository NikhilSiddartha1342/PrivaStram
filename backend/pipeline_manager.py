"""
PrivaStream - Multimodal Orchestration Pipeline
Coordinates Vision (YOLO/OCR/Stabilization) and Audio (Silero VAD/Whisper/DeBERTa/Redactor).
"""

import time
import os
import sys
import numpy as np

# Ensure local directories are in search path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for p in [current_dir, parent_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.vision.face_detector import FaceDetector
    from backend.vision.plate_detector import LicensePlateDetector
    from backend.vision.ocr_pii_engine import OCRPIIEngine
    from backend.vision.stabilizer import TemporalStabilizer
    from backend.audio.vad_engine import VADEngine
    from backend.audio.whisper_engine import WhisperEngine
    from backend.audio.deberta_pii import DeBERTaPIIClassifier
    from backend.audio.audio_redactor import AudioRedactor
except (ImportError, ModuleNotFoundError):
    from vision.face_detector import FaceDetector
    from vision.plate_detector import LicensePlateDetector
    from vision.ocr_pii_engine import OCRPIIEngine
    from vision.stabilizer import TemporalStabilizer
    from audio.vad_engine import VADEngine
    from audio.whisper_engine import WhisperEngine
    from audio.deberta_pii import DeBERTaPIIClassifier
    from audio.audio_redactor import AudioRedactor

class PipelineManager:
    def __init__(self):
        # Vision Modules
        self.face_detector = FaceDetector()
        self.plate_detector = LicensePlateDetector()
        self.ocr_engine = OCRPIIEngine()
        self.stabilizer = TemporalStabilizer()

        # Audio Modules
        self.vad_engine = VADEngine()
        self.whisper_engine = WhisperEngine()
        self.deberta_classifier = DeBERTaPIIClassifier()
        self.audio_redactor = AudioRedactor()

        # Ephemeral Session Cache (0ms Disk Retention)
        self.session_events = []

    def process_video_frame(self, frame: np.ndarray, rules: dict) -> dict:
        """
        Executes vision pipeline on incoming camera frame.
        """
        start_time = time.time()
        detections = []

        # 1. Face Detection
        if rules.get("protectFaces", True):
            faces = self.face_detector.detect_faces(frame)
            detections.extend(faces)

        # 2. License Plate Detection
        if rules.get("protectLicensePlates", True):
            plates = self.plate_detector.detect_plates(frame)
            detections.extend(plates)

        # 3. Document / Aadhaar Card / ID Detection (Handheld size, never overlapping faces)
        if rules.get("protectIdDocuments", True):
            docs = self.ocr_engine.detect_physical_documents(frame)
            valid_docs = []
            for d in docs:
                if d.get("width", 1.0) <= 0.35 and d.get("height", 1.0) <= 0.32:
                    overlap_face = False
                    for f in faces:
                        dx = max(0, min(d["x"] + d["width"], f["x"] + f["width"]) - max(d["x"], f["x"]))
                        dy = max(0, min(d["y"] + d["height"], f["y"] + f["height"]) - max(d["y"], f["y"]))
                        if dx * dy > 0.01:
                            overlap_face = True
                            break
                    if not overlap_face:
                        valid_docs.append(d)
            detections.extend(valid_docs)

        # 4. Sensitive Text OCR PII Detection (Phone numbers, Emails, Aadhaar on screen)
        if rules.get("protectSensitiveText", True):
            text_pii = self.ocr_engine.detect_text_pii(frame)
            detections.extend(text_pii)

        # 3. Temporal Stabilization
        stabilized = self.stabilizer.update(detections)
        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "detections": stabilized,
            "latency_ms": latency_ms,
            "is_fail_safe_active": latency_ms > rules.get("failSafeLatencyThresholdMs", 150)
        }

    def process_audio_chunk(self, audio_chunk: np.ndarray, rules: dict) -> dict:
        """
        Executes audio pipeline on incoming audio chunk.
        """
        is_speech = self.vad_engine.is_speech(audio_chunk)
        if not is_speech:
            return {"has_speech": False, "redacted": False, "transcript": ""}

        # Whisper Transcription
        segments = self.whisper_engine.transcribe(audio_chunk)
        transcript = " ".join([s["text"] for s in segments])

        # DeBERTa PII Token Classification
        pii_entities = self.deberta_classifier.classify_tokens(transcript)

        # Buffer Redaction
        redacted_audio = audio_chunk
        if len(pii_entities) > 0:
            redacted_audio = self.audio_redactor.redact_interval(audio_chunk, 0.0, 1.2, mode="tone")

        return {
            "has_speech": True,
            "transcript": transcript,
            "pii_entities": pii_entities,
            "redacted": len(pii_entities) > 0
        }
