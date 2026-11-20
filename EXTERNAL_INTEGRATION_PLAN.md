# PrivaStream External Application Integration Architecture

## Overview
PrivaStream processes webcam and screen-share streams locally in the browser to detect and redact sensitive PII and unauthorized faces. To feed this protected stream into external applications (like Google Meet, Zoom Web, or OBS), we employ different strategies based on whether the target application is browser-based or a native desktop application.

**IMPORTANT CLARIFICATION:** A normal web page cannot directly replace the outgoing camera of a native desktop application (e.g., Zoom Desktop). Native apps require a Virtual Camera driver installed at the OS level.

## A. Browser-Based Integration (Google Meet, Zoom Web, WebRTC)

For browser-based video conferencing, PrivaStream can intercept the camera/screen stream using a **Browser Extension Architecture**.

### 1. Extension Components
- **Content Script:** Injected into the target website (e.g., `meet.google.com`). It overrides `navigator.mediaDevices.getUserMedia` and `getDisplayMedia`.
- **Background Service Worker:** Manages extension state, handles cross-origin messaging, and manages ML model loading.
- **Offscreen Document / PrivaStream Engine:** Since ML processing requires DOM access (Canvas APIs) and heavy Web Worker usage, an Offscreen Document runs the PrivaStream core engine.

### 2. Data Flow
1. **User joins a Google Meet call.** The Meet app calls `navigator.mediaDevices.getUserMedia()`.
2. **Content Script Intercepts:** Instead of returning the raw webcam stream, the content script requests the raw stream, but forwards the video track to the PrivaStream Offscreen Document via a `MediaStreamTrackProcessor` or standard WebRTC `RTCPeerConnection` (for cross-context stream sharing).
3. **PrivaStream Processing:** The Offscreen Document runs the `@vladmandic/human` face detector and OCR engine on an internal `<canvas>`.
4. **Output Generation:** The protected canvas generates a new stream via `canvas.captureStream(30)`.
5. **Stream Return:** The protected stream is returned to the original `getUserMedia` Promise in the Google Meet context. Meet broadcasts the protected stream.

## B. Native Desktop App Integration (Zoom Desktop, OBS, Teams)

For native applications, web-based interception is impossible. We must use one of the following methods:

### 1. Popout Capture (Recommended for OBS / Screen Sharing)
- PrivaStream provides a "Popout" or "Clean Output" window containing *only* the protected `<video>` or `<canvas>` element with no UI controls.
- The user shares this specific window in Zoom or adds it as a "Window Capture" source in OBS.

### 2. Virtual Camera Driver (Advanced)
- To appear as a native "Camera" device in Zoom Desktop, a native helper application (e.g., using OBS Virtual Cam API, macOS CoreMediaIO, or DirectShow on Windows) must be installed.
- PrivaStream (running in an Electron wrapper or sending frames via WebSockets/WebRTC to a local daemon) streams the protected frames to the virtual camera driver.

## Current Implementation
The frontend exposes a reusable stream from the protected canvas through `getProtectedMediaStream()` in `src/services/protectedStream.ts`. The studio starts its video track at 30 FPS. When the user starts the Audio HUD microphone, the processed Web Audio destination track is attached to this stream; it is removed when the microphone stops. Recording uses the reusable protected stream, including audio when the microphone is active. Camera/display capture itself requests video only.

The current face detector and OCR engines run asynchronously on the browser main thread. Detection calls do not block the React render loop, but they are not yet hosted in Web Workers. Face embeddings are produced by `@vladmandic/human`; the browser must be able to download its model files from the configured model host. If model loading fails, face enrollment and live recognition cannot be claimed as available.

The extension bullets above are an architecture plan, not a shipped Chrome extension. No content script currently replaces `getUserMedia` for Meet or Zoom Web. The exposed stream can be consumed by an integrating page or extension engine, subject to browser security and user-granted capture permissions. Native Zoom Desktop still requires a virtual camera driver or window sharing.
