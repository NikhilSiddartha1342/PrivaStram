import { createWorker, Worker } from 'tesseract.js';
import { DetectionBox, PrivacyRulesConfig } from '../types';

interface TokenInfo {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
  lineKey?: string;
}

export class ScreenOCREngine {
  private worker: Worker | null = null;
  private isInitializing: boolean = false;
  private isProcessing: boolean = false;
  private cachedBoxes: DetectionBox[] = [];
  private lastRunTime: number = 0;
  private completionTimes: number[] = [];
  private processingLatencyMs = 0;
  private lastFrameSignature = '';
  private frameProbeCanvas: HTMLCanvasElement | null = null;
  private initializationError: string | null = null;

  public getStatus(): { state: 'loading' | 'ready' | 'error'; error: string | null } {
    return { state: this.worker ? 'ready' : this.isInitializing ? 'loading' : this.initializationError ? 'error' : 'loading', error: this.initializationError };
  }

  public getMetrics(): { fps: number; latencyMs: number } {
    const cutoff = Date.now() - 10000;
    this.completionTimes = this.completionTimes.filter(time => time >= cutoff);
    const duration = this.completionTimes.length > 1
      ? (this.completionTimes[this.completionTimes.length - 1] - this.completionTimes[0]) / 1000
      : 0;
    return { fps: duration > 0 ? Math.round((this.completionTimes.length - 1) / duration) : 0, latencyMs: this.processingLatencyMs };
  }

  // Comprehensive Regex Patterns for On-Screen Sensitive Data
  // Allow spaces between tokens for merged text
  private phoneRegex = /(?:\+?\d{1,3}[\s().-]*)?(?:\d[\s().-]*){9,14}\d/g;
  private emailRegex = /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g;
  private aadhaarRegex = /\b\d{4}(?:[-\s]?\d{4}){2}\b|\b[X]{4}-[X]{4}-\d{4}\b/g;
  private apiKeyRegex = /\b(?:AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{20,}|sk-[A-Za-z0-9_-]{20,}|sk_live_[0-9A-Za-z]{16,})\b/g;
  private bearerRegex = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
  private passwordRegex = /\b(?:password|passwd|passcode|security\s+pin|pin)\s*[:=]\s*[^\s,;]{3,}/gi;
  private labeledApiKeyRegex = /\bapi[_ -]?key\s*[:=]\s*[^\s,;]{4,}/gi;
  private accessTokenRegex = /\baccess[_ -]?token\s*[:=]\s*[^\s,;]{4,}/gi;
  private secretRegex = /\bsecret(?:[_ -]?key)?\s*[:=]\s*[^\s,;]{4,}/gi;
  private creditCardRegex = /\b(?:\d[ -]*?){13,19}\b/g;

  constructor() {
    this.initWorker();
  }

  private async initWorker() {
    if (this.worker || this.isInitializing) return;
    this.isInitializing = true;
    try {
      this.worker = await createWorker('eng');
      // PSM 11 = SPARSE_TEXT: find as much text as possible without assuming structure.
      // This is best for screen sharing where UI elements and text are mixed.
      // DPI hint prevents Tesseract hunting for sub-pixel-scale text regions.
      await (this.worker as any).setParameters({
        tessedit_pageseg_mode: '11',
        user_defined_dpi: '96',
      });
      console.log('PrivaStream Screen OCR Worker initialized successfully.');
    } catch (err) {
      this.initializationError = err instanceof Error ? err.message : String(err);
      console.warn('Tesseract OCR worker initialization failed:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  private checkLuhn(cardNo: string): boolean {
    const digits = cardNo.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let nCheck = 0, bEven = false;
    for (let n = digits.length - 1; n >= 0; n--) {
      let cDigit = digits.charAt(n),
          nDigit = parseInt(cDigit, 10);
      if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
      nCheck += nDigit;
      bEven = !bEven;
    }
    return (nCheck % 10) == 0;
  }

  private frameSignature(source: HTMLCanvasElement): string {
    if (!this.frameProbeCanvas) this.frameProbeCanvas = document.createElement('canvas');
    const probe = this.frameProbeCanvas;
    probe.width = 24;
    probe.height = 14;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return `${Date.now()}`;
    context.drawImage(source, 0, 0, probe.width, probe.height);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let hash = 2166136261;
    for (let i = 0; i < pixels.length; i += 4) {
      hash ^= pixels[i] + (pixels[i + 1] << 8) + (pixels[i + 2] << 16);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  private processRegex(
    regex: RegExp, 
    fullText: string, 
    tokens: TokenInfo[], 
    scanW: number, 
    scanH: number, 
    category: any, 
    labelPrefix: string,
    ruleMatched: string,
    now: number,
    validator?: (match: string) => boolean
  ): DetectionBox[] {
    const foundBoxes: DetectionBox[] = [];
    let match;
    regex.lastIndex = 0; // reset
    while ((match = regex.exec(fullText)) !== null) {
      const matchText = match[0];
      if (validator && !validator(matchText)) {
        continue;
      }
      
      const startIndex = match.index;
      const endIndex = startIndex + matchText.length;

      // Find which tokens are covered by this match
      let currentLen = 0;
      const matchedTokens: TokenInfo[] = [];
      for (const token of tokens) {
        const tokenStart = currentLen;
        const tokenEnd = currentLen + token.text.length;
        // Check if token overlaps with the match
        if (tokenStart < endIndex && tokenEnd > startIndex) {
          matchedTokens.push(token);
        }
        currentLen += token.text.length + 1; // +1 for the space we joined with
      }

      if (matchedTokens.length > 0) {
        // Merge bounding boxes
        const minLeft = Math.min(...matchedTokens.map(t => t.left));
        const minTop = Math.min(...matchedTokens.map(t => t.top));
        const maxRight = Math.max(...matchedTokens.map(t => t.left + t.width));
        const maxBottom = Math.max(...matchedTokens.map(t => t.top + t.height));
        
        // Add dynamic padding
        const textHeight = Math.max(...matchedTokens.map(t => t.height));
        const padding = Math.max(2, textHeight * 0.2);
        const x = Math.max(0, (minLeft - padding) / scanW);
        const y = Math.max(0, (minTop - padding) / scanH);
        const confidence = Math.max(0, Math.min(1, matchedTokens.reduce((sum, t) => sum + Math.max(0, t.conf), 0) / (matchedTokens.length * 100)));

        foundBoxes.push({
          id: `screen_${category}_${minLeft}_${minTop}`,
          category: category,
          label: `${labelPrefix} (Masked)`,
          confidence,
          x,
          y,
          width: Math.min(1 - x, (maxRight - minLeft + padding * 2) / scanW),
          height: Math.min(1 - y, (maxBottom - minTop + padding * 2) / scanH),
          rawText: matchText,
          isWhitelisted: false,
          whyProtected: {
            ruleMatched: ruleMatched,
            detail: `Identified ${category} "${matchText}". Region shielded.`,
            engine: 'Client Rule-Based Parser',
            metric: `OCR token confidence: ${Math.round(confidence * 100)}%`
          },
          timestamp: now
        });
      }
    }
    return foundBoxes;
  }

  public async detectScreenPII(
    canvas: HTMLCanvasElement,
    rules: PrivacyRulesConfig
  ): Promise<DetectionBox[]> {
    if (!rules.protectSensitiveText && !rules.protectCreditCards) {
      return [];
    }

    const now = Date.now();
    const cWidth = canvas.width || 1280;
    const cHeight = canvas.height || 720;
    const signature = this.frameSignature(canvas);
    if (signature === this.lastFrameSignature && this.cachedBoxes.length) {
      this.cachedBoxes = this.cachedBoxes.map(box => ({ ...box, timestamp: now }));
      return this.cachedBoxes;
    }
    this.lastFrameSignature = signature;

    // Remove stale detections (e.g., after 2 seconds)
    this.cachedBoxes = this.cachedBoxes.filter(b => now - b.timestamp < 1200);

    // Run OCR asynchronously based on OCR FPS (e.g. max 5 FPS => 200ms)
    if (this.worker && !this.isProcessing && (now - this.lastRunTime > 400)) {
      this.lastRunTime = now;
      this.isProcessing = true;
      const ocrStart = performance.now();

      // Upscale 2x before passing to Tesseract.
      // This prevents Tesseract WASM from generating "Image too small" warnings
      // for thin UI elements (borders, separators) that appear as 1-2px in the
      // original frame but become ≥3px (Tesseract minimum) after upscaling.
      // TSV coordinates from Tesseract will be in the scaled space, so we divide
      // by scanW/scanH (which reflects the scaled canvas) during normalization.
      const SCALE = 2;
      const scanW = Math.min(1280, cWidth) * SCALE;
      const scanH = Math.round(scanW * (cHeight / cWidth));
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = scanW;
      scanCanvas.height = scanH;
      const sCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      if (sCtx) {
        // Use high-quality upscaling for better OCR character clarity
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, scanW, scanH);

        this.worker
          .recognize(scanCanvas, {}, { tsv: true } as any)
          .then((res: any) => {
            const tsvText = res?.data?.tsv;
            if (typeof tsvText === 'string') this.completionTimes.push(Date.now());
            if (typeof tsvText === 'string') {
              const lines = tsvText.trim().split('\n');
              const tokens: TokenInfo[] = [];

              for (let i = 1; i < lines.length; i++) { // Skip header
                const parts = lines[i].split('\t');
                if (parts.length >= 12 && parts[0] === '5') { // Word level
                  const left = parseInt(parts[6], 10);
                  const top = parseInt(parts[7], 10);
                  const width = parseInt(parts[8], 10);
                  const height = parseInt(parts[9], 10);
                  const conf = parseFloat(parts[10]);
                  const text = parts[11]?.trim();

                  // Skip tokens that are too small or low-confidence — these are the
                  // source of "Image too small to scale" Tesseract LSTM warnings.
                  // Minimum 4px wide, 8px tall, and conf > 10 (0-100 scale).
                  if (!text || text.length === 0) continue;
                  if (width < 4 || height < 8) continue;
                  if (conf >= 0 && conf < 10) continue; // conf == -1 means unscored (keep)

                  tokens.push({ text, left, top, width, height, conf, lineKey: parts.slice(1, 6).join(':') });
                }
              }

              // Reconstruct full text with single spaces
              const groups = new Map<string, TokenInfo[]>();
              for (const token of tokens) {
                const key = token.lineKey || `${Math.round(token.top / Math.max(12, token.height * 1.4))}`;
                groups.set(key, [...(groups.get(key) || []), token]);
              }
              const linesOrdered = [...groups.values()].map(line => line.sort((a, b) => a.left - b.left)).sort((a, b) => a[0].top - b[0].top);
              const tokensForText: TokenInfo[] = [];
              const lineTexts: string[] = [];
              for (const line of linesOrdered) {
                lineTexts.push(line.map(t => t.text).join(' '));
                // Keep regex matching inside a single OCR line; the NUL separator cannot match `\s`.
                tokensForText.push(...line, { text: '\u0000', left: 0, top: line[0].top, width: 0, height: 0, conf: 100 });
              }
              const fullText = lineTexts.join(' \u0000 ');
              let newBoxes: DetectionBox[] = [];

              if (rules.protectSensitiveText) {
                newBoxes.push(...this.processRegex(this.phoneRegex, fullText, tokensForText, scanW, scanH, 'phone_number', 'Phone', 'Phone number pattern', now, m => m.replace(/\D/g, '').length >= 10 && m.replace(/\D/g, '').length <= 15));
                newBoxes.push(...this.processRegex(this.emailRegex, fullText, tokensForText, scanW, scanH, 'email_address', 'Email', 'Email address pattern', now));
                newBoxes.push(...this.processRegex(this.aadhaarRegex, fullText, tokensForText, scanW, scanH, 'aadhaar_id', 'National ID', 'National ID pattern', now));
                newBoxes.push(...this.processRegex(this.apiKeyRegex, fullText, tokensForText, scanW, scanH, 'api_key', 'API Key', 'API key pattern', now));
                newBoxes.push(...this.processRegex(this.bearerRegex, fullText, tokensForText, scanW, scanH, 'bearer_token', 'Bearer Token', 'Bearer token', now));
                newBoxes.push(...this.processRegex(this.passwordRegex, fullText, tokensForText, scanW, scanH, 'password', 'Password / PIN', 'Password or PIN label and value', now));
                newBoxes.push(...this.processRegex(this.labeledApiKeyRegex, fullText, tokensForText, scanW, scanH, 'api_key', 'API Key', 'Labeled API key and value', now));
                newBoxes.push(...this.processRegex(this.accessTokenRegex, fullText, tokensForText, scanW, scanH, 'access_token', 'Access Token', 'Labeled access token and value', now));
                newBoxes.push(...this.processRegex(this.secretRegex, fullText, tokensForText, scanW, scanH, 'secret_key', 'Secret Key', 'Labeled secret and value', now));
              }
              if (rules.protectCreditCards) {
                newBoxes.push(...this.processRegex(this.creditCardRegex, fullText, tokensForText, scanW, scanH, 'credit_card', 'Credit Card', 'Luhn Checksum validated PAN', now, this.checkLuhn));
              }

              this.cachedBoxes = newBoxes;
            }
          })
          .catch((e) => {
            console.warn('Screen OCR frame recognition error:', e);
          })
          .finally(() => {
            this.processingLatencyMs = performance.now() - ocrStart;
            this.isProcessing = false;
          });
      } else {
        this.isProcessing = false;
      }
    }

    return this.cachedBoxes;
  }
}

export const screenOcrEngine = new ScreenOCREngine();
