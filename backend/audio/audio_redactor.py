"""
PrivaStream - Backend Audio: Audio Buffer PCM Redactor
Splices and overwrites raw PCM audio intervals with a 1kHz censorship sine tone or zero-energy silence.
"""

import numpy as np

class AudioRedactor:
    def __init__(self, tone_freq=1000, sample_rate=16000):
        self.tone_freq = tone_freq
        self.sample_rate = sample_rate

    def redact_interval(self, audio_buffer: np.ndarray, start_sec: float, end_sec: float, mode='tone') -> np.ndarray:
        """
        Modifies raw audio buffer interval [start_sec, end_sec] in-place before streaming to listeners.
        """
        start_idx = int(start_sec * self.sample_rate)
        end_idx = min(len(audio_buffer), int(end_sec * self.sample_rate))
        length = end_idx - start_idx

        if length <= 0:
            return audio_buffer

        if mode == 'tone':
            # Generate 1kHz sine wave
            t = np.linspace(0, length / self.sample_rate, length, endpoint=False)
            sine_wave = 0.3 * np.sin(2 * np.pi * self.tone_freq * t)
            audio_buffer[start_idx:end_idx] = sine_wave
        else:
            # Zero-energy mute
            audio_buffer[start_idx:end_idx] = 0.0

        return audio_buffer
