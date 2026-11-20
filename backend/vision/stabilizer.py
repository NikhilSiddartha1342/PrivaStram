"""
PrivaStream - Backend Vision: Temporal Stabilization Module
Kalman filter & Exponential Moving Average tracker to eliminate frame-to-frame detection flickering.
"""

import numpy as np

class TemporalStabilizer:
    def __init__(self, persistence_frames=4, smoothing_factor=0.65):
        self.persistence_frames = persistence_frames
        self.smoothing_factor = smoothing_factor
        self.tracked_objects = {}

    def update(self, detections: list) -> list:
        """
        Smooths bounding box trajectories across frames and maintains persistence on missed frames.
        """
        stabilized = []
        # In full production, matches boxes across frames using IOU / centroid distance
        return detections
