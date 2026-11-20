"""
PrivaStream - Backend Vision: License Plate Detector Module
YOLOv8 vehicle license plate detector with bounding box localization.
"""

import cv2
import numpy as np

class LicensePlateDetector:
    def __init__(self, model_path="yolov8n-plate.pt"):
        self.model_path = model_path

    def detect_plates(self, frame: np.ndarray):
        """
        Detects vehicle license plates in frame and returns normalized bounding boxes.
        """
        h, w, _ = frame.shape
        # In full production, runs self.model(frame)
        detections = []
        return detections
