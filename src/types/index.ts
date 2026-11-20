export type ExecutionTier = 'browser_client' | 'backend_ai' | 'synthetic_demo';

export type PIICategory = 
  | 'face' 
  | 'license_plate' 
  | 'id_document' 
  | 'sensitive_text' 
  | 'phone_number' 
  | 'email_address' 
  | 'credit_card' 
  | 'aadhaar_id' 
  | 'api_key'
  | 'bearer_token'
  | 'password'
  | 'secret_key'
  | 'access_token'
  | 'spoken_phone' 
  | 'spoken_email' 
  | 'spoken_address' 
  | 'spoken_id' 
  | 'spoken_name';

export type MaskingMode = 'gaussian_blur' | 'pixelate' | 'solid_black' | 'cyber_shield';

export type PrivacySensitivity = 'low' | 'balanced' | 'high' | 'strict';

export interface DetectionBox {
  id: string;
  category: PIICategory;
  label: string;
  confidence: number;
  // Relative coordinates [0.0 - 1.0] for responsive canvas scaling
  x: number;
  y: number;
  width: number;
  height: number;
  rawText?: string;
  isWhitelisted?: boolean;
  whyProtected: ExplainableReason;
  timestamp: number;
}

export interface ExplainableReason {
  ruleMatched: string;
  detail: string;
  engine: 'Client Rule-Based Parser' | 'Backend YOLOv8-Face' | 'Backend YOLOv8-Plate' | 'Backend EasyOCR + Regex' | 'Backend DeBERTa-v3 NLP' | 'Client Face Matcher';
  metric: string;
}

export interface PrivacyEvent {
  id: string;
  timestamp: string;
  rawTimestamp: number;
  category: PIICategory;
  label: string;
  action: 'BLURRED' | 'PIXELATED' | 'MASKED' | 'AUDIO_REDACTED' | 'ALLOWED_WHITELIST';
  confidence: number;
  details: string;
  engine: string;
  whyProtected: ExplainableReason;
  thumbnailSnippet?: string;
}

export interface FaceProfile {
  id: string;
  name: string;
  role: 'Host' | 'Co-Host' | 'Guest';
  isWhitelisted: boolean;
  avatarUrl?: string;
  embedding?: number[];
  embeddings?: number[][];
  similarityThreshold: number; // e.g. 0.65
  registeredAt: string;
  descriptorLength: number;
}

export interface PrivacyRulesConfig {
  // Visual Toggles
  protectFaces: boolean;
  enableFaceWhitelist: boolean;
  protectLicensePlates: boolean;
  protectIdDocuments: boolean;
  protectSensitiveText: boolean;
  protectCreditCards: boolean;

  // Audio Toggles
  protectSpokenPhones: boolean;
  protectSpokenEmails: boolean;
  protectSpokenAddresses: boolean;
  protectSpokenIDs: boolean;
  protectSpokenNames: boolean;

  // Global Engine Controls
  sensitivity: PrivacySensitivity;
  maskingMode: MaskingMode;
  blurRadius: number; // 5 to 40
  pixelateBlockSize: number; // 8 to 32

  // Temporal Stabilization
  temporalStabilization: boolean;
  persistenceFrames: number; // frames to keep box active if detection drops
  smoothingFactor: number; // 0.1 to 0.9 for Kalman/EMA interpolation

  // Fail-Safe Latency Guard
  enableFailSafeGuard: boolean;
  failSafeLatencyThresholdMs: number; // default 150ms

  // Experimental Multi-modal Sync
  enableMouthSyncIndicator: boolean;
}

export interface StreamMetrics {
  streamFps: number;
  detectionFps: number;
  ocrFps: number;
  renderFps: number;
  latencyMs: number;
  audioLatencyMs: number;
  streamHealth: number; // 0 - 100%
  privacyScore: number; // 0 - 100
  totalEventsCount: number;
  visualEventsCount: number;
  audioEventsCount: number;
  activeDetectionsCount: number;
  isFailSafeActive: boolean;
}

export interface AudioRedactionEvent {
  id: string;
  timestamp: number;
  category: PIICategory;
  phrase: string;
  redactedPhrase: string;
  startTime: number;
  endTime: number;
  action: '1kHz Tone Injected' | 'PCM Zero-Mute';
}
