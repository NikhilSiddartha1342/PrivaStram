import { DetectionBox, PrivacyRulesConfig, FaceProfile, ExplainableReason } from '../types';
import { Human, Config } from '@vladmandic/human';
import { v4 as uuidv4 } from 'uuid';

export interface StabilizedDetection {
  box: DetectionBox;
  disappearedFrames: number;
  smoothedX: number;
  smoothedY: number;
  smoothedW: number;
  smoothedH: number;
  faceEmbedding?: number[];
  whitelisted?: boolean;
}

const humanConfig: Partial<Config> = {
  modelBasePath: 'https://vladmandic.github.io/human/models',
  face: {
    enabled: true,
    detector: { return: true, rotation: true },
    mesh: { enabled: false },
    attention: { enabled: false },
    iris: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false }
};

export class VisionProcessingEngine {
  private trackedDetections: Map<string, StabilizedDetection> = new Map();
  private processingLatency: number = 0;
  private avatarDescriptors: Map<string, number[]> = new Map();
  private human: Human;
  private isProcessing: boolean = false;
  private lastRunTime: number = 0;
  private cachedBoxes: DetectionBox[] = [];
  private whitelistVotes = new Map<string, { profileId: string; votes: number }>();
  private modelState: 'loading' | 'ready' | 'error' = 'loading';
  private modelError: string | null = null;
  private modelReady: Promise<void>;
  private hasCompletedDetection = false;
  private maskSourceCanvas: HTMLCanvasElement | null = null;
  private detectionCompletionTimes: number[] = [];

  constructor() {
    this.human = new Human(humanConfig);
    this.modelReady = this.human.load().then(() => {
      this.modelState = 'ready';
      console.log('Human ML models loaded');
    }).catch((error: unknown) => {
      this.modelState = 'error';
      this.modelError = error instanceof Error ? error.message : String(error);
      console.error('Face detection models failed to load:', error);
      throw error;
    });
    // Avoid an unhandled rejection before the first inference request.
    this.modelReady.catch(() => undefined);
  }

  public getFaceModelStatus(): { state: 'loading' | 'ready' | 'error'; error: string | null; hasDetectedFrame: boolean } {
    return { state: this.modelState, error: this.modelError, hasDetectedFrame: this.hasCompletedDetection };
  }

  public getProcessingLatency(): number {
    return this.processingLatency;
  }

  public getDetectionFps(): number {
    const cutoff = Date.now() - 10000;
    this.detectionCompletionTimes = this.detectionCompletionTimes.filter(time => time >= cutoff);
    return this.detectionCompletionTimes.length > 1
      ? Math.round((this.detectionCompletionTimes.length - 1) / ((this.detectionCompletionTimes[this.detectionCompletionTimes.length - 1] - this.detectionCompletionTimes[0]) / 1000))
      : 0;
  }

  public computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async enrollFace(avatarUrl: string): Promise<number[]> {
    try {
      await this.modelReady;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = avatarUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const res = await this.human.detect(img);
      if (!res.face || res.face.length === 0) {
        throw new Error('No face detected in the image.');
      }
      if (res.face.length > 1) {
        throw new Error('Multiple faces detected. Please ensure only one person is in the frame.');
      }
      if (!res.face[0].embedding) {
        throw new Error('Could not generate face embedding.');
      }
      const embedding: number[] = res.face[0].embedding;
      const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
      if (!magnitude || !Number.isFinite(magnitude)) throw new Error('Invalid face embedding.');
      return embedding.map(value => value / magnitude);
    } catch (e: any) {
      throw new Error(`Enrollment failed: ${e.message}`);
    }
  }

  public async updateWhitelistAvatarDescriptors(profiles: FaceProfile[]) {
    for (const p of profiles) {
      if (p.embedding && !this.avatarDescriptors.has(p.id)) {
        this.avatarDescriptors.set(p.id, p.embedding);
      } else if (p.avatarUrl && !this.avatarDescriptors.has(p.id)) {
        try {
          const embedding = await this.enrollFace(p.avatarUrl);
          this.avatarDescriptors.set(p.id, embedding);
        } catch (e) {
          console.error('Failed to generate embedding for', p.id, e);
        }
      }
    }
  }
  private computeIoU(boxA: {x: number, y: number, w: number, h: number}, boxB: {x: number, y: number, w: number, h: number}) {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
    const yB = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.w * boxA.h;
    const boxBArea = boxB.w * boxB.h;
    return interArea / (boxAArea + boxBArea - interArea);
  }

  public async detectWebcamFaces(
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement | null,
    rules: PrivacyRulesConfig,
    faceWhitelist: FaceProfile[],
    whitelistedFaceIds: Set<string>, // UI-toggled whitelist overrides
    blurAllFaces: boolean
  ): Promise<DetectionBox[]> {
    if (!rules.protectFaces && !blurAllFaces) {
      return [];
    }

    const now = Date.now();
    
    // Asynchronous face detection running at separate FPS
    if (!this.isProcessing && (now - this.lastRunTime > 100)) { // ~10 FPS
      this.isProcessing = true;
      const start = performance.now();
      
      try {
        await this.modelReady;
        await this.updateWhitelistAvatarDescriptors(faceWhitelist);
        const res = await this.human.detect(canvas);
        this.hasCompletedDetection = true;
        this.detectionCompletionTimes.push(Date.now());
        
        // Human's boxRaw is already normalized [x, y, width, height] (box is pixel based).
        const currentDetections = res.face.map(f => {
          return {
            x: f.boxRaw[0],
            y: f.boxRaw[1],
            w: f.boxRaw[2],
            h: f.boxRaw[3],
            confidence: f.score,
            embedding: f.embedding
          };
        });

        const newTracked = new Map<string, StabilizedDetection>();
        const claimedTrackIds = new Set<string>();

        // Match with previous tracks
        for (const det of currentDetections) {
          let bestMatchId: string | null = null;
          let bestIoU = 0.2;

          for (const [id, track] of this.trackedDetections.entries()) {
            if (claimedTrackIds.has(id)) continue;
            const iou = this.computeIoU(det, {
              x: track.smoothedX, 
              y: track.smoothedY, 
              w: track.smoothedW, 
              h: track.smoothedH
            });
            const oldCx = track.smoothedX + track.smoothedW / 2;
            const oldCy = track.smoothedY + track.smoothedH / 2;
            const distance = Math.hypot((det.x + det.w / 2) - oldCx, (det.y + det.h / 2) - oldCy);
            const score = iou + Math.max(0, 0.25 - distance);
            if (score > bestIoU) {
              bestIoU = score;
              bestMatchId = id;
            }
          }

          const trackId = bestMatchId || uuidv4();
          if (bestMatchId) claimedTrackIds.add(bestMatchId);
          
          let smoothedX = det.x;
          let smoothedY = det.y;
          let smoothedW = det.w;
          let smoothedH = det.h;
          // EMA smoothing for stable bounding box rendering
          const existingTrack = this.trackedDetections.get(trackId);
          if (existingTrack) {
            const alpha = rules.smoothingFactor || 0.5;
            smoothedX = existingTrack.smoothedX * alpha + det.x * (1 - alpha);
            smoothedY = existingTrack.smoothedY * alpha + det.y * (1 - alpha);
            smoothedW = existingTrack.smoothedW * alpha + det.w * (1 - alpha);
            smoothedH = existingTrack.smoothedH * alpha + det.h * (1 - alpha);
          }

          // Evaluate whitelist status. Priority (lowest → highest):
          //   masked by default → embedding match → UI click-toggle → blurAllFaces
          let whitelisted = false;
          let maxSim = 0;
          let matchedProfile: FaceProfile | null = null;

          // Step 1: Embedding-based auto-whitelist (if enabled, embeddings available)
          if (rules.enableFaceWhitelist && det.embedding && det.embedding.length > 0) {
            for (const profile of faceWhitelist.filter(p => p.isWhitelisted)) {
              const embeddings = profile.embeddings?.length ? profile.embeddings : profile.embedding ? [profile.embedding] : [];
              for (const profileEmbedding of embeddings) {
                const sim = this.computeCosineSimilarity(det.embedding, profileEmbedding);
                if (sim > maxSim) { maxSim = sim; matchedProfile = profile; }
              }
            }
            const prev = this.whitelistVotes.get(trackId);
            const qualifies = !!matchedProfile && maxSim >= matchedProfile.similarityThreshold;
            const votes = qualifies && prev?.profileId === matchedProfile!.id ? prev.votes + 1 : qualifies ? 1 : 0;
            this.whitelistVotes.set(trackId, { profileId: qualifies ? matchedProfile!.id : '', votes });
            whitelisted = qualifies && votes >= 3;
          }

          // Step 2: UI click-toggle override — always wins over embedding result.
          // This lets users manually whitelist a face even when no profiles are enrolled.
          // Manual per-frame overrides were intentionally removed: identity must be enrolled and verified.

          // Step 3: Hard mask override — blurAllFaces beats everything.
          if (blurAllFaces) whitelisted = false;


          const box: DetectionBox = {
            id: trackId,
            category: 'face',
            label: whitelisted ? `Whitelisted (${Math.round(maxSim*100)}%)` : `Face (${Math.round(det.confidence*100)}%)`,
            confidence: det.confidence,
            x: Math.max(0, Math.min(1, smoothedX)),
            y: Math.max(0, Math.min(1, smoothedY)),
            width: Math.max(0, Math.min(1 - Math.max(0, smoothedX), smoothedW)),
            height: Math.max(0, Math.min(1 - Math.max(0, smoothedY), smoothedH)),
            isWhitelisted: whitelisted,
            whyProtected: {
              ruleMatched: 'Biometric Face Detected',
              detail: whitelisted ? 'Face matched to trusted profile.' : 'Unknown face detected. Identity concealed.',
              engine: 'Client Face Matcher',
              metric: `Confidence: ${Math.round(det.confidence * 100)}%`
            },
            timestamp: now
          };

          newTracked.set(trackId, {
            box,
            disappearedFrames: 0,
            smoothedX,
            smoothedY,
            smoothedW,
            smoothedH,
            faceEmbedding: det.embedding,
            whitelisted
          });
        }

        // Handle disappeared tracks
        const persistFrames = rules.persistenceFrames || 5;
        for (const [id, track] of this.trackedDetections.entries()) {
          if (!newTracked.has(id)) {
            if (track.disappearedFrames < persistFrames) {
              track.disappearedFrames += 1;
              track.box.timestamp = now; // keep it alive
              newTracked.set(id, track);
            }
          }
        }

        this.trackedDetections = newTracked;
        this.cachedBoxes = Array.from(this.trackedDetections.values()).map(t => t.box);
        
        this.processingLatency = performance.now() - start;
      } catch (e) {
        console.error('Face detection error', e);
      } finally {
        this.isProcessing = false;
        this.lastRunTime = now;
      }
    } else {
       // Age the cache boxes that are not being updated continuously if we're between frames
       // But keeping track of them in trackedDetections is better.
    }

    return this.cachedBoxes;
  }

  public applyTemporalStabilization(boxes: DetectionBox[], rules: PrivacyRulesConfig): DetectionBox[] {
    // Already stabilized inside detectWebcamFaces for faces.
    // For other types, return as is.
    return boxes;
  }

  public extractTextPIIBoundingBoxes(rawEntries: any[], rules: PrivacyRulesConfig): DetectionBox[] {
    return rawEntries.map((l, i) => ({
      id: `synth_text_${i}`,
      category: 'sensitive_text',
      label: 'Sensitive Text',
      confidence: 0.99,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rawText: l.text,
      isWhitelisted: false,
      whyProtected: {
        ruleMatched: 'Synthetic Text Rule',
        detail: 'Synthetic text matched.',
        engine: 'Client Rule-Based Parser',
        metric: 'Confidence: 99%'
      },
      timestamp: Date.now()
    }));
  }

  public renderPrivacyMasks(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    boxes: DetectionBox[],
    rules: PrivacyRulesConfig,
    isFailSafeActive: boolean
  ) {
    if (isFailSafeActive) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    for (const box of boxes) {
      if (box.isWhitelisted) continue;

      const x = box.x * width;
      const y = box.y * height;
      const w = box.width * width;
      const h = box.height * height;
      if (w <= 0 || h <= 0) continue;

      if (box.category === 'face') {
        if (rules.maskingMode === 'gaussian_blur') {
          if (!this.maskSourceCanvas) this.maskSourceCanvas = document.createElement('canvas');
          if (this.maskSourceCanvas.width !== width || this.maskSourceCanvas.height !== height) {
            this.maskSourceCanvas.width = width;
            this.maskSourceCanvas.height = height;
          }
          const sourceCtx = this.maskSourceCanvas.getContext('2d');
          sourceCtx?.drawImage(ctx.canvas, 0, 0, width, height);
          ctx.save();
          ctx.filter = `blur(${rules.blurRadius || 20}px)`;
          ctx.drawImage(this.maskSourceCanvas, x, y, w, h, x, y, w, h);
          ctx.restore();
        } else if (rules.maskingMode === 'pixelate') {
          ctx.save();
          const blockSize = rules.pixelateBlockSize || 16;
          for (let py = y; py < y + h; py += blockSize) {
            for (let px = x; px < x + w; px += blockSize) {
              const imgData = ctx.getImageData(px, py, 1, 1).data;
              ctx.fillStyle = `rgb(${imgData[0]}, ${imgData[1]}, ${imgData[2]})`;
              ctx.fillRect(px, py, blockSize, blockSize);
            }
          }
          ctx.restore();
        } else {
          ctx.fillStyle = 'black';
          ctx.fillRect(x, y, w, h);
        }
      } else {
        // Text/PII - Opaque redaction
        ctx.fillStyle = '#111827';
        ctx.fillRect(x, y, w, h);
        
        ctx.fillStyle = '#374151';
        ctx.font = '10px monospace';
        ctx.fillText('REDACTED', x + 4, y + 12);
      }
    }
  }

  public renderOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    boxes: DetectionBox[],
    options: { showBoxes: boolean, showLabels: boolean, showConfidence: boolean, selectedBoxId: string | null }
  ) {
    if (!options.showBoxes) return;
    for (const box of boxes) {
      const x = box.x * width;
      const y = box.y * height;
      const w = box.width * width;
      const h = box.height * height;
      const isSelected = box.id === options.selectedBoxId;

      ctx.strokeStyle = box.isWhitelisted ? '#10B981' : (isSelected ? '#F59E0B' : '#EF4444');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      if (options.showLabels) {
        ctx.fillStyle = box.isWhitelisted ? '#10B981' : (isSelected ? '#F59E0B' : '#EF4444');
        const text = options.showConfidence ? `${box.label} ${Math.round(box.confidence * 100)}%` : box.label;
        ctx.font = '12px Inter, sans-serif';
        const tW = ctx.measureText(text).width + 8;
        ctx.fillRect(x, Math.max(0, y - 20), tW, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(text, x + 4, Math.max(0, y - 6));
      }
    }
  }
}

export const visionEngine = new VisionProcessingEngine();
