let protectedStream: MediaStream | null = null;

/** Returns the reusable video-only stream composited from the protected canvas. */
export function getProtectedMediaStream(): MediaStream | null {
  return protectedStream;
}

/** Starts the protected canvas output. Call after the canvas has been mounted. */
export function publishProtectedCanvas(canvas: HTMLCanvasElement, fps = 30): MediaStream | null {
  if (typeof canvas.captureStream !== 'function') return null;
  if (protectedStream && protectedStream.getVideoTracks().some(track => track.readyState === 'live')) return protectedStream;
  protectedStream = canvas.captureStream(fps);
  return protectedStream;
}

/** Adds the browser-side redacted audio track to the protected video stream. */
export function attachProtectedAudioStream(audioStream: MediaStream): void {
  if (!protectedStream) return;
  for (const oldTrack of protectedStream.getAudioTracks()) {
    protectedStream.removeTrack(oldTrack);
  }
  for (const track of audioStream.getAudioTracks()) {
    protectedStream.addTrack(track);
  }
}

export function detachProtectedAudioTracks(): void {
  if (!protectedStream) return;
  for (const track of protectedStream.getAudioTracks()) {
    protectedStream.removeTrack(track);
  }
}

export function stopProtectedMediaStream(): void {
  protectedStream?.getTracks().forEach(track => track.stop());
  protectedStream = null;
}
