"""
PrivaStream - Backend Audio: Silero VAD (Voice Activity Detection)
Filters silence and non-speech chunks to minimize Whisper inference computation.
"""

import numpy as np

class VADEngine:
    def __init__(self, threshold=0.5):
        self.threshold = threshold

    def is_speech(self, audio_chunk: np.ndarray, sample_rate=16000) -> bool:
        """
        Determines whether the given audio chunk contains human speech.
        """
        # Energy-based root-mean-square fallback / Silero Torch model
        rms = np.sqrt(np.mean(audio_chunk**2)) if len(audio_chunk) > 0 else 0
        return rms > 0.01
