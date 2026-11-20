"""
PrivaStream - Flask REST & Socket.IO Streaming Server
Exposes multimodal privacy APIs and real-time WebRTC / WebSocket frame pipelines.
"""

import sys
import os
import base64
import json
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit

# Ensure workspace root and backend directory are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for p in [current_dir, parent_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.pipeline_manager import PipelineManager
except (ImportError, ModuleNotFoundError):
    from pipeline_manager import PipelineManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'privastream_secret_key_2026'
socketio = SocketIO(app, cors_allowed_origins="*")

pipeline = PipelineManager()

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

# Default in-memory rules
current_rules = {
    "protectFaces": True,
    "enableFaceWhitelist": True,
    "protectLicensePlates": True,
    "protectIdDocuments": True,
    "protectSensitiveText": True,
    "protectSpokenPhones": True,
    "protectSpokenEmails": True,
    "failSafeLatencyThresholdMs": 150
}

@app.route('/api/status', methods=['GET'])
def get_status():
    """Health check & pipeline capabilities"""
    return jsonify({
        "status": "online",
        "service": "PrivaStream Multimodal AI Shield",
        "version": "1.0.0",
        "tier": "Tier 2: Backend AI Pipeline",
        "models": {
            "vision": "YOLOv8-Face / YOLOv8-Plate / EasyOCR",
            "audio": "Silero VAD / Faster-Whisper / DeBERTa-v3",
            "stabilization": "Temporal Kalman Filter"
        },
        "ephemeral_storage": "0ms Disk Retention (Active RAM Only)"
    })

@app.route('/api/rules', methods=['GET', 'POST'])
def manage_rules():
    global current_rules
    if request.method == 'POST':
        data = request.get_json() or {}
        current_rules.update(data)
        return jsonify({"status": "updated", "rules": current_rules})
    return jsonify(current_rules)

@app.route('/api/process_frame', methods=['POST', 'OPTIONS'])
def process_frame():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    """Processes base64 encoded frame and returns targeted detection bounding boxes"""
    data = request.get_json() or {}
    image_b64 = data.get('image', '')
    
    if not image_b64:
        return jsonify({"error": "No image provided"}), 400

    try:
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        result = pipeline.process_video_frame(frame, current_rules)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "is_fail_safe_active": True}), 500

@socketio.on('stream_frame')
def handle_stream_frame(data):
    """Real-time WebSocket frame processing"""
    try:
        image_b64 = data.get('image', '')
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        result = pipeline.process_video_frame(frame, current_rules)
        emit('frame_processed', result)
    except Exception as e:
        emit('frame_processed', {"error": str(e), "is_fail_safe_active": True})

if __name__ == '__main__':
    print("[PrivaStream] Backend Pipeline starting on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
