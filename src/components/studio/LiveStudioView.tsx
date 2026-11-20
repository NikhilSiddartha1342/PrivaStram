import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import { SYNTHETIC_SCENARIOS, SyntheticScenario } from '../../services/syntheticData';
import { ExplainableInspector } from './ExplainableInspector';
import { AudioHUD } from './AudioHUD';
import { screenOcrEngine } from '../../services/screenOcrEngine';
import { DetectionBox } from '../../types';
import { getProtectedMediaStream, publishProtectedCanvas, stopProtectedMediaStream } from '../../services/protectedStream';
import {
  Camera,
  Monitor,
  Sparkles,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Download,
  Video,
  Eye,
  EyeOff,
  Layers,
  SplitSquareVertical,
  CheckCircle2,
  Lock,
  UserPlus,
  RefreshCw,
  HelpCircle,
  Zap,
  Info,
  Check,
  X,
  Users,
  Radio,
  Upload
} from 'lucide-react';

export const LiveStudioView: React.FC = () => {
  const {
    videoSourceType,
    setVideoSourceType,
    selectedScenario,
    setSelectedScenario,
    activeDetections,
    setActiveDetections,
    rules,
    updateRules,
    metrics,
    updateMetrics,
    logPrivacyEvent,
    selectedBoxForInspection,
    setSelectedBoxForInspection,
    addFaceToWhitelist,
    faceWhitelist,
    visionEngine,
    executionTier
  } = usePrivacyStream();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [splitMode, setSplitMode] = useState<'protected_only' | 'raw_only' | 'split_slider' | 'side_by_side'>('protected_only');
  const [splitSliderPos, setSplitSliderPos] = useState<number>(50); // 0% to 100%
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(true);
  const [uploadedDocument, setUploadedDocument] = useState<HTMLImageElement | null>(null);

  // Dynamic Whitelist set for detected faces (empty by default, driven by visual avatar recognition)
  const [blurAllFaces, setBlurAllFaces] = useState<boolean>(false);

  // References
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const protectedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const documentUrlRef = useRef<string | null>(null);
  const activeDetectionsRef = useRef(activeDetections);
  activeDetectionsRef.current = activeDetections;

  useEffect(() => {
    const canvas = protectedCanvasRef.current;
    if (canvas) publishProtectedCanvas(canvas, 30);
    return stopProtectedMediaStream;
  }, []);

  useEffect(() => () => {
    if (documentUrlRef.current) URL.revokeObjectURL(documentUrlRef.current);
  }, []);

  // Stop active stream when source changes
  const stopCurrentMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Handle Video Source Selection
  useEffect(() => {
    let isCancelled = false;

    const setupSource = async () => {
      stopCurrentMediaStream();

      if (videoSourceType === 'webcam') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            audio: false,
          });
          if (!isCancelled) {
            mediaStreamRef.current = stream;
            if (videoElementRef.current) {
              videoElementRef.current.srcObject = stream;
              videoElementRef.current.play().catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Webcam not accessible, falling back to Synthetic Testbed.', err);
          setVideoSourceType('synthetic');
        }
      } else if (videoSourceType === 'screen') {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30 } },
            audio: false,
          });
          if (!isCancelled) {
            mediaStreamRef.current = stream;
            if (videoElementRef.current) {
              videoElementRef.current.srcObject = stream;
              videoElementRef.current.play().catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Screen share cancelled or not permitted, switching to synthetic.', err);
          setVideoSourceType('synthetic');
        }
      }
    };

    setupSource();

    return () => {
      isCancelled = true;
      stopCurrentMediaStream();
    };
  }, [videoSourceType, stopCurrentMediaStream, setVideoSourceType]);

  // Main Render & Detection Animation Loop
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();
    let isProcessingWebcam = false;

    const processFrame = async () => {
      const now = performance.now();
      const frameDelta = now - lastFrameTime;
      lastFrameTime = now;

      const rawCanvas = rawCanvasRef.current;
      const protectedCanvas = protectedCanvasRef.current;
      const compositeCanvas = compositeCanvasRef.current;

      if (rawCanvas && protectedCanvas && compositeCanvas) {
        const width = 1280;
        const height = 720;

        rawCanvas.width = width;
        rawCanvas.height = height;
        protectedCanvas.width = width;
        protectedCanvas.height = height;
        compositeCanvas.width = width;
        compositeCanvas.height = height;

        const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
        const protCtx = protectedCanvas.getContext('2d', { willReadFrequently: true });
        const compCtx = compositeCanvas.getContext('2d');

        if (rawCtx && protCtx && compCtx) {
          const captureStartTime = performance.now();
          // 1. Draw source onto Raw Canvas
          if ((videoSourceType === 'webcam' || videoSourceType === 'screen')) {
            if (videoElementRef.current && videoElementRef.current.readyState >= 2) {
              rawCtx.drawImage(videoElementRef.current, 0, 0, width, height);
            } else {
              // Draw connecting screen instead of synthetic background to avoid flickering
              rawCtx.fillStyle = '#090D16';
              rawCtx.fillRect(0, 0, width, height);
              rawCtx.fillStyle = '#FFFFFF';
              rawCtx.font = '24px "JetBrains Mono", monospace';
              rawCtx.textAlign = 'center';
              rawCtx.fillText('Waiting for stream...', width / 2, height / 2);
            }
          } else if (uploadedDocument?.complete && uploadedDocument.naturalWidth > 0) {
            rawCtx.fillStyle = '#090D16';
            rawCtx.fillRect(0, 0, width, height);
            const scale = Math.min(width / uploadedDocument.naturalWidth, height / uploadedDocument.naturalHeight);
            const drawWidth = uploadedDocument.naturalWidth * scale;
            const drawHeight = uploadedDocument.naturalHeight * scale;
            rawCtx.drawImage(uploadedDocument, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
          } else {
            // Draw Synthetic Testbed Frame with high-detail realistic faces & documents
            drawSyntheticBackground(rawCtx, width, height, selectedScenario, now);
          }

          // 2. Clone Raw Frame into Protected Canvas
          protCtx.drawImage(rawCanvas, 0, 0);

          // 3. Compute Detections
          let currentDetections: DetectionBox[] = [];

          if (videoSourceType === 'synthetic') {
            const isOcrDocument = selectedScenario.category === 'id_ocr_pii';
            // The document fixture is synthetic, but detections come from the same OCR engine as live screen share.
            currentDetections = isOcrDocument ? activeDetectionsRef.current : selectedScenario.mockDetections.map((m, idx) => ({
              id: `${selectedScenario.id}_det_${idx}`,
              category: m.category,
              label: m.label,
              confidence: m.confidence,
              x: m.x,
              y: m.y,
              width: m.width,
              height: m.height,
              rawText: m.rawText,
              isWhitelisted: m.isWhitelisted,
              whyProtected: {
                ruleMatched: m.ruleMatched,
                detail: m.detail,
                engine: m.engine,
                metric: m.metric,
              },
              timestamp: Date.now(),
            }));

            if (isOcrDocument && !isProcessingWebcam) {
              isProcessingWebcam = true;
              const snapshotCanvas = document.createElement('canvas');
              snapshotCanvas.width = width;
              snapshotCanvas.height = height;
              snapshotCanvas.getContext('2d')?.drawImage(rawCanvas, 0, 0);
              screenOcrEngine.detectScreenPII(snapshotCanvas, rules)
                .then((ocrBoxes) => setActiveDetections(ocrBoxes))
                .catch((error) => console.warn('Document OCR demo failed:', error))
                .finally(() => { isProcessingWebcam = false; });
            }
          } else if (videoSourceType === 'screen' || videoSourceType === 'webcam') {
            // Live Unified Pipeline (Faces + OCR)
            currentDetections = activeDetectionsRef.current;
            if (!isProcessingWebcam) {
              isProcessingWebcam = true;
              
              // Run heavy ML in background promise chain without blocking the requestAnimationFrame loop
              Promise.resolve().then(async () => {
                try {
                  let visionBoxes: DetectionBox[] = [];
                  let ocrBoxes: DetectionBox[] = [];

                  // Create an offscreen canvas snapshot to avoid reading from a mutating rawCanvas
                  const snapshotCanvas = document.createElement('canvas');
                  snapshotCanvas.width = width;
                  snapshotCanvas.height = height;
                  const snapCtx = snapshotCanvas.getContext('2d');
                  if (snapCtx) snapCtx.drawImage(rawCanvas, 0, 0);

                  if (rules.protectFaces) {
                    visionBoxes = await visionEngine.detectWebcamFaces(
                      snapshotCanvas,
                      videoElementRef.current,
                      rules,
                      faceWhitelist,
                      new Set<string>(),
                      blurAllFaces
                    );
                  }

                  if (rules.protectSensitiveText || rules.protectCreditCards) {
                    ocrBoxes = await screenOcrEngine.detectScreenPII(snapshotCanvas, rules);
                  }

                  const newDetections = [...visionBoxes, ...ocrBoxes];
                  const stabilizedBoxes = rules.temporalStabilization
                    ? visionEngine.applyTemporalStabilization(newDetections, rules)
                    : newDetections;

                  setActiveDetections(stabilizedBoxes);
                } catch (e) {
                  // Ignore frame error
                } finally {
                  isProcessingWebcam = false;
                }
              });
            }
          }

          // In synthetic mode, currentDetections is updated synchronously above.
          // In live mode, we use the activeDetections from state which gets updated by the async ML loop.
          const stabilizedBoxes = currentDetections;

          // 4. Render Privacy Masks on Protected Canvas
          visionEngine.renderPrivacyMasks(
            protCtx,
            width,
            height,
            stabilizedBoxes,
            rules,
            metrics.isFailSafeActive || (
              (videoSourceType === 'webcam' || videoSourceType === 'screen') &&
              rules.protectFaces &&
              !visionEngine.getFaceModelStatus().hasDetectedFrame
            )
          );

          // 5. Draw Overlays (Bounding Boxes + HUD tags) if enabled
          if (showOverlays) {
            visionEngine.renderOverlays(protCtx, width, height, stabilizedBoxes, {
              showBoxes: true,
              showLabels: true,
              showConfidence: showConfidence,
              selectedBoxId: selectedBoxForInspection?.id || null,
            });
          }

          // 6. Draw Final Composite Canvas (Protected Only / Raw Only / Side-by-Side / Split Slider)
          if (splitMode === 'protected_only') {
            compCtx.drawImage(protectedCanvas, 0, 0);
          } else if (splitMode === 'raw_only') {
            compCtx.drawImage(rawCanvas, 0, 0);
          } else if (splitMode === 'side_by_side') {
            // Left Half: Raw Input, Right Half: Protected Output
            compCtx.drawImage(rawCanvas, 0, 0, width / 2, height, 0, 0, width / 2, height);
            compCtx.drawImage(protectedCanvas, width / 2, 0, width / 2, height, width / 2, 0, width / 2, height);

            // Divider Line & Headers
            compCtx.strokeStyle = '#00F0FF';
            compCtx.lineWidth = 3;
            compCtx.beginPath();
            compCtx.moveTo(width / 2, 0);
            compCtx.lineTo(width / 2, height);
            compCtx.stroke();

            // Left Header (RAW)
            compCtx.fillStyle = 'rgba(239, 68, 68, 0.85)';
            compCtx.fillRect(20, 20, 160, 28);
            compCtx.fillStyle = '#FFFFFF';
            compCtx.font = 'bold 12px "JetBrains Mono", monospace';
            compCtx.fillText('🔴 RAW CAMERA FEED', 30, 38);

            // Right Header (PROTECTED)
            compCtx.fillStyle = 'rgba(16, 185, 129, 0.85)';
            compCtx.fillRect(width / 2 + 20, 20, 200, 28);
            compCtx.fillStyle = '#FFFFFF';
            compCtx.font = 'bold 12px "JetBrains Mono", monospace';
            compCtx.fillText('🟢 SHIELDED OUTPUT', width / 2 + 30, 38);
          } else {
            // Draggable Split-Screen Slider
            const splitX = Math.floor((splitSliderPos / 100) * width);

            // Draw Raw Canvas on Left
            compCtx.drawImage(rawCanvas, 0, 0, splitX, height, 0, 0, splitX, height);
            // Draw Protected Canvas on Right
            compCtx.drawImage(protectedCanvas, splitX, 0, width - splitX, height, splitX, 0, width - splitX, height);

            // Cyber Split Line
            compCtx.strokeStyle = '#00F0FF';
            compCtx.lineWidth = 3;
            compCtx.beginPath();
            compCtx.moveTo(splitX, 0);
            compCtx.lineTo(splitX, height);
            compCtx.stroke();

            // Handle Glow Indicator
            compCtx.fillStyle = '#00F0FF';
            compCtx.beginPath();
            compCtx.arc(splitX, height / 2, 14, 0, Math.PI * 2);
            compCtx.fill();
            compCtx.fillStyle = '#090D16';
            compCtx.beginPath();
            compCtx.arc(splitX, height / 2, 6, 0, Math.PI * 2);
            compCtx.fill();
          }

          // Measure inference latency
          const latency = Math.round(performance.now() - captureStartTime);
          const ocrMetrics = screenOcrEngine.getMetrics();
          
          // Render FPS
          const currentRenderFps = Math.round(1000 / Math.max(1, frameDelta));
          
          updateMetrics({
            latencyMs: latency,
            renderFps: currentRenderFps,
            ocrFps: (videoSourceType === 'screen' || (videoSourceType === 'synthetic' && selectedScenario.category === 'id_ocr_pii')) ? ocrMetrics.fps : 0,
            detectionFps: (videoSourceType === 'webcam' || videoSourceType === 'screen') ? visionEngine.getDetectionFps() : 0
          });
        }
      }

      if (isPlaying) {
        animId = requestAnimationFrame(processFrame);
      }
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    videoSourceType,
    selectedScenario,
    splitMode,
    splitSliderPos,
    showOverlays,
    showConfidence,
    rules,
    metrics.isFailSafeActive,
    faceWhitelist,
    selectedBoxForInspection,
    visionEngine,
    updateMetrics,
    setActiveDetections,
    blurAllFaces,
    uploadedDocument
  ]);

  // Draw High-Contrast, Realistic Synthetic Faces & Documents
  const drawSyntheticBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scenario: SyntheticScenario,
    time: number
  ) => {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    if (scenario.category === 'face_whitelist') {
      ctx.save();

      // 1. STREAM HOST (LEFT) — Detailed Illustration
      const hx = width * 0.32;
      const hy = height * 0.44;

      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.ellipse(hx, hy + 180, 130, 90, 0, 0, Math.PI, true);
      ctx.fill();

      ctx.fillStyle = '#E2B18A';
      ctx.fillRect(hx - 24, hy + 60, 48, 50);

      ctx.fillStyle = '#F5C6A5';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 70, 90, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(hx, hy - 20, 75, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(hx - 42, hy - 26, 26, 6);
      ctx.fillRect(hx + 16, hy - 26, 26, 6);
      ctx.beginPath(); ctx.arc(hx - 28, hy - 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 28, hy - 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(hx - 26, hy - 12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 30, hy - 12, 3, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 3;
      ctx.strokeRect(hx - 44, hy - 22, 32, 24);
      ctx.strokeRect(hx + 12, hy - 22, 32, 24);
      ctx.beginPath(); ctx.moveTo(hx - 12, hy - 10); ctx.lineTo(hx + 12, hy - 10); ctx.stroke();

      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(hx, hy - 6); ctx.lineTo(hx + 5, hy + 14); ctx.lineTo(hx - 4, hy + 18); ctx.stroke();

      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy + 28, 22, 0.2, Math.PI - 0.2); ctx.stroke();

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ STREAM HOST (NIKHIL)', hx, hy + 240);
      ctx.fillStyle = '#6EE7B7';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('[WHITELISTED — UNMASKED]', hx, hy + 260);

      // 2. STRANGER / GUEST (RIGHT) — Detailed Illustration
      const sx = width * 0.72;
      const sy = height * 0.46;

      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 180, 125, 85, 0, 0, Math.PI, true);
      ctx.fill();

      ctx.fillStyle = '#D97706';
      ctx.fillRect(sx - 22, sy + 55, 44, 45);

      ctx.fillStyle = '#E5A67B';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 68, 86, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(sx, sy - 25, 78, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(sx - 38, sy - 22, 24, 6);
      ctx.fillRect(sx + 14, sy - 22, 24, 6);
      ctx.beginPath(); ctx.arc(sx - 26, sy - 8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 26, sy - 8, 7, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx - 6, sy + 16); ctx.lineTo(sx + 4, sy + 20); ctx.stroke();

      ctx.strokeStyle = '#450A0A';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy + 32, 18, 0, Math.PI); ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 STRANGER (UNAUTHORIZED GUEST)', sx, sy + 240);
      ctx.fillStyle = '#FCA5A5';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('[AUTOMATIC PRIVACY SHIELD ENGAGED]', sx, sy + 260);

      ctx.restore();
    } else if (scenario.category === 'id_ocr_pii' && scenario.syntheticDocumentText) {
      ctx.save();
      const cardX = width * 0.20;
      const cardY = height * 0.12;
      const cardW = width * 0.60;
      const cardH = height * 0.76;

      ctx.fillStyle = '#F8FAFC';
      ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
      ctx.shadowBlur = 24;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(cardX, cardY, cardW, 60);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scenario.syntheticDocumentText.header, cardX + cardW / 2, cardY + 38);

      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(cardX + 35, cardY + 80, 110, 140);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('PHOTO ID', cardX + 90, cardY + 155);

      ctx.textAlign = 'left';
      scenario.syntheticDocumentText.lines.forEach((line, idx) => {
        const textY = cardY + 95 + idx * 36;
        ctx.fillStyle = line.isSensitive ? '#DC2626' : '#0F172A';
        ctx.font = line.isSensitive ? 'bold 15px "JetBrains Mono", monospace' : '15px Inter, sans-serif';
        ctx.fillText(line.text, cardX + 170, textY);
      });
      ctx.restore();
    } else if (scenario.category === 'license_plate') {
      ctx.save();
      const carX = width * 0.5;
      const carY = height * 0.44;

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(carX - 250, carY - 90, 500, 180);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(carX - 200, carY - 150, 400, 80);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(carX - 180, carY - 140, 360, 60);

      ctx.fillStyle = '#FDE047';
      ctx.fillRect(carX - 230, carY - 30, 50, 30);
      ctx.fillRect(carX + 180, carY - 30, 50, 30);

      const plateW = width * 0.28;
      const plateH = height * 0.14;
      const plateX = width * 0.36;
      const plateY = height * 0.58;

      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 5;
      ctx.fillRect(plateX, plateY, plateW, plateH);
      ctx.strokeRect(plateX, plateY, plateW, plateH);

      ctx.fillStyle = '#090D16';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DL 01 AB 1234', plateX + plateW / 2, plateY + plateH / 2 + 10);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MULTIMODAL AUDIO PII REDACTION TESTBED', width / 2, height / 2 - 20);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px Inter, sans-serif';
      ctx.fillText('Speak into microphone or click 1-click test buttons in the Audio HUD below', width / 2, height / 2 + 18);
      ctx.restore();
    }
  };

  // Dedicated Popout Window for Zoom, Google Meet, Teams & OBS
  const handlePopoutStream = () => {
    const popout = window.open('', 'PrivaStreamProtectedOutput', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    if (!popout) {
      alert('Please allow popups in your browser to open the clean stream window for Zoom / OBS.');
      return;
    }
    popout.document.title = 'PrivaStream Protected Output (For Zoom / OBS / YouTube Live)';
    popout.document.body.style.margin = '0';
    popout.document.body.style.background = '#06090F';
    popout.document.body.style.display = 'flex';
    popout.document.body.style.alignItems = 'center';
    popout.document.body.style.justifyContent = 'center';
    popout.document.body.style.height = '100vh';
    popout.document.body.style.overflow = 'hidden';

    let outCanvas = popout.document.getElementById('outCanvas') as HTMLCanvasElement;
    if (!outCanvas) {
      outCanvas = popout.document.createElement('canvas');
      outCanvas.id = 'outCanvas';
      outCanvas.width = 1280;
      outCanvas.height = 720;
      outCanvas.style.width = '100%';
      outCanvas.style.height = '100%';
      outCanvas.style.objectFit = 'contain';
      popout.document.body.appendChild(outCanvas);
    }
    const outCtx = outCanvas.getContext('2d');

    const syncInterval = setInterval(() => {
      if (popout.closed) {
        clearInterval(syncInterval);
        return;
      }
      if (protectedCanvasRef.current && outCtx) {
        outCtx.drawImage(protectedCanvasRef.current, 0, 0, 1280, 720);
      }
    }, 33);
  };

  // Safe Snapshot Exporter
  const handleDownloadSnapshot = () => {
    if (!protectedCanvasRef.current) return;
    const dataUrl = protectedCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `privastream-protected-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Safe Stream Recording
  const handleToggleRecording = () => {
    if (!isRecording) {
      if (!protectedCanvasRef.current) return;
      const stream = getProtectedMediaStream() || protectedCanvasRef.current.captureStream(30);
      recordedChunksRef.current = [];

      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `privastream-protected-stream-${Date.now()}.webm`;
          a.click();
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.warn('Recording API fallback:', err);
      }
    } else {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  // Timer for recording
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Click on Canvas to inspect bounding box or toggle whitelist
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const found = activeDetections.find(
      (b) =>
        clickX >= b.x &&
        clickX <= b.x + b.width &&
        clickY >= b.y &&
        clickY <= b.y + b.height
    );

    if (found) {
      setSelectedBoxForInspection(found);
    } else {
      setSelectedBoxForInspection(null);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto">
      {/* Hidden processing source video & canvases */}
      <video ref={videoElementRef} playsInline muted autoPlay className="hidden" />
      <canvas ref={rawCanvasRef} className="hidden" />
      <canvas ref={protectedCanvasRef} className="hidden" />

      {/* 30-Second Quick Start Testing Guide */}
      {showQuickGuide && (
        <div className="bg-gradient-to-r from-cyan-950/60 via-[#0E1422] to-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 shadow-xl relative">
          <button
            onClick={() => setShowQuickGuide(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 p-1"
            title="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-sm font-display">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>How to Test PrivaStream in 30 Seconds:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-[#151D2F]/80 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-cyan-400 font-mono">1. Video Privacy &amp; Multi-Face Shield</span>
                <p className="mt-1 text-slate-400">
                  Live mode uses enrolled face embeddings and protects unknown faces. Synthetic mode displays labelled demo detections only.
                </p>
              </div>
            </div>

            <div className="bg-[#151D2F]/80 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-emerald-400 font-mono">2. Audio Phone &amp; PII Censor Bleep</span>
                <p className="mt-1 text-slate-400">
                  Click <strong>"Start Live Mic"</strong> or click <strong>"Spoken Phone (Digits)"</strong> below. Your computer speakers will play a loud <strong>1000Hz censor bleep</strong> and the text is redacted with zero disk storage!
                </p>
              </div>
            </div>

            <div className="bg-[#151D2F]/80 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-amber-400 font-mono">3. Document OCR &amp; Plates</span>
                <p className="mt-1 text-slate-400">
                  Click the <strong>"Document OCR"</strong> scenario to see selective masking of Aadhaar, Phone, and Email on ID cards!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio Top Control Bar */}
      <div className="bg-[#0E1422] border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Source Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase">Input:</span>

          <button
            onClick={() => setVideoSourceType('webcam')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              videoSourceType === 'webcam'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'bg-[#151D2F] text-slate-300 hover:bg-white/5 border border-white/5'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Webcam</span>
          </button>

          <button
            onClick={() => setVideoSourceType('synthetic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              videoSourceType === 'synthetic'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-emerald'
                : 'bg-[#151D2F] text-slate-300 hover:bg-white/5 border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Synthetic Testbeds</span>
          </button>

          <button
            onClick={() => {
              const documentScenario = SYNTHETIC_SCENARIOS.find(s => s.category === 'id_ocr_pii');
              if (documentScenario) setSelectedScenario(documentScenario);
              setUploadedDocument(null);
              setActiveDetections([]);
              setVideoSourceType('synthetic');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-200 border border-amber-400/40 hover:bg-amber-500/25"
            title="Runs real browser OCR against a synthetic test document"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Document OCR Test</span>
          </button>
          <button
            onClick={() => documentInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-500/15 text-violet-200 border border-violet-400/40 hover:bg-violet-500/25"
            title="Upload a document image and run browser OCR on it"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
          <input
            ref={documentInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (documentUrlRef.current) URL.revokeObjectURL(documentUrlRef.current);
              const url = URL.createObjectURL(file);
              documentUrlRef.current = url;
              const image = new Image();
              image.onload = () => {
                const documentScenario = SYNTHETIC_SCENARIOS.find(s => s.category === 'id_ocr_pii');
                if (documentScenario) setSelectedScenario(documentScenario);
                setUploadedDocument(image);
                setActiveDetections([]);
                setVideoSourceType('synthetic');
              };
              image.onerror = () => console.warn('Could not load the selected document image.');
              image.src = url;
              event.target.value = '';
            }}
          />

          <button
            onClick={() => setVideoSourceType('screen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              videoSourceType === 'screen'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : 'bg-[#151D2F] text-slate-300 hover:bg-white/5 border border-white/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span>Screen Share</span>
          </button>
        </div>

        {/* Stream Actions & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#151D2F] border border-white/10 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSplitMode('protected_only')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                splitMode === 'protected_only' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ Protected Stream
            </button>
            <button
              onClick={() => setSplitMode('side_by_side')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                splitMode === 'side_by_side' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Split Comparison
            </button>
          </div>

          {/* Dedicated Zoom / OBS Popout Button */}
          <button
            onClick={handlePopoutStream}
            title="Opens a clean full-screen stream window with zero UI clutter — ready to screen-share in Zoom/Meet or capture as a window in OBS Studio for YouTube Live!"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/25 to-blue-600/30 hover:from-cyan-500/35 hover:to-blue-600/40 text-cyan-200 border border-cyan-400/50 text-xs font-bold transition-all shadow-glow-cyan"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>🎥 Popout for Zoom / OBS / YouTube</span>
          </button>

          {/* Mask Style Selector */}
          <select
            value={rules.maskingMode}
            onChange={(e) => updateRules({ maskingMode: e.target.value as any })}
            className="bg-[#151D2F] border border-white/10 text-cyan-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 font-medium"
          >
            <option value="cyber_shield">Cyber Shield (Neon Grid)</option>
            <option value="gaussian_blur">Heavy Gaussian Blur</option>
            <option value="pixelate">Pixelate / Mosaic</option>
            <option value="solid_black">Solid Black Box</option>
          </select>

          {/* Bounding HUD Toggle */}
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            title="Toggle Green / Red detection boxes and confidence tags"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showOverlays
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-[#151D2F] text-slate-400 border-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>HUD Boxes</span>
          </button>

          {/* Protected Stream Recording */}
          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isRecording
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-glow-crimson animate-pulse'
                : 'bg-red-950/40 text-red-300 border border-red-500/30 hover:bg-red-900/40'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-red-400" />
            <span>{isRecording ? `Recording (${recordingSeconds}s)` : 'Record'}</span>
          </button>
        </div>
      </div>

      {/* Live Webcam Multi-Face Whitelist & Blur Controls Bar */}
      {videoSourceType === 'webcam' && (
        <div className="bg-[#0E1422] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">Live Webcam Faces Detected ({activeDetections.filter(d => d.category === 'face').length}):</span>
            <span className="text-[11px] text-slate-400">Enrolled profiles are recognized automatically; unknown faces stay masked.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeDetections.filter(d => d.category === 'face').map((f, idx) => {
              const isWhitelisted = f.isWhitelisted;
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                    isWhitelisted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-red-500/20 text-red-300 border-red-500/40 shadow-glow-crimson'
                  }`}
                >
                  {isWhitelisted ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                  <span>Face #{idx + 1} ({idx === 0 ? 'Left' : 'Right'}): {isWhitelisted ? '🟢 WHITELISTED (CLEAR)' : '🔴 MASKED (BLURRED)'}</span>
                </button>
              );
            })}

            {/* Master Blur All Faces Toggle */}
            <button
              onClick={() => setBlurAllFaces(!blurAllFaces)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                blurAllFaces
                  ? 'bg-red-950/90 text-red-300 border-red-500/50 shadow-glow-crimson'
                  : 'bg-[#151D2F] text-slate-300 hover:bg-white/5 border-white/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>{blurAllFaces ? 'Mask All Active' : 'Blur All Faces'}</span>
            </button>

            {/* Instant Snapshot Face & Register */}
            <button
              onClick={async () => {
                if (!rawCanvasRef.current) return;
                try {
                  const dataUrl = rawCanvasRef.current.toDataURL('image/jpeg', 0.85);
                  const embedding = await visionEngine.enrollFace(dataUrl);
                  addFaceToWhitelist('Host (Live Registered)', 'Host', 0.65, dataUrl, embedding);
                } catch (error) {
                  console.warn('Trusted face enrollment failed:', error);
                }
              }}
              title="Snapshot current stream and register face embedding"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>📸 Snapshot &amp; Set Me as Host</span>
            </button>
          </div>
        </div>
      )}

      {/* Synthetic Scenario Selector Tabs */}
      {videoSourceType === 'synthetic' && (
        <div className="bg-[#0E1422] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Test Scenario:</span>
            <span className="text-xs text-slate-400 hidden md:inline">
              1-Click evaluators for faculty &amp; reviewers
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            {SYNTHETIC_SCENARIOS.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              return (
                <button
                  key={sc.id}
              onClick={() => {
                setUploadedDocument(null);
                setActiveDetections([]);
                setSelectedScenario(sc);
              }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-[#151D2F] text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <span className="font-bold text-[11px] truncate">{sc.name}</span>
                  <span className="text-[9px] font-mono text-slate-500 truncate">{sc.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Studio Viewport (Large Video Canvas + HUD) */}
      <div className="relative bg-[#090D16] border border-white/10 rounded-2xl overflow-hidden shadow-2xl scanline-overlay">
        {/* Canvas Element */}
        <canvas
          ref={compositeCanvasRef}
          onClick={handleCanvasClick}
          className="w-full aspect-video block cursor-crosshair bg-black"
        />

        {/* Floating Top Left Stream HUD */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#090D16]/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-200 uppercase tracking-wider">{videoSourceType === 'synthetic' ? (uploadedDocument ? 'DOCUMENT OCR' : 'SYNTHETIC DEMO') : 'LIVE DETECTION'}</span>
            <span className="text-white/20">|</span>
            <span className="text-cyan-400 font-bold" title="Render FPS">{metrics.renderFps} FPS RENDER</span>
            <span className="text-slate-400" title="Detection FPS">({metrics.detectionFps} FPS DETECT)</span>
            <span className="text-emerald-400" title="OCR FPS">({metrics.ocrFps} FPS OCR)</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#090D16]/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-slate-400">MASKED REGIONS:</span>
            <span className="font-bold text-amber-400">{activeDetections.filter(d => !d.isWhitelisted).length}</span>
          </div>

          {videoSourceType === 'synthetic' && selectedScenario.category === 'id_ocr_pii' && (
            <div className="bg-[#090D16]/90 backdrop-blur-md border border-amber-400/40 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-200">
              OCR {screenOcrEngine.getStatus().state.toUpperCase()} · {activeDetections.length} MASK REGIONS
              {screenOcrEngine.getStatus().error ? ` · ${screenOcrEngine.getStatus().error}` : ''}
            </div>
          )}

          {metrics.isFailSafeActive && (
            <div className="flex items-center gap-1.5 bg-red-950/90 backdrop-blur-md border border-red-500/50 px-3 py-1.5 rounded-lg text-xs font-mono text-red-300 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>FAIL-SAFE LOCK ENGAGED</span>
            </div>
          )}
          {(videoSourceType === 'webcam' || videoSourceType === 'screen') && rules.protectFaces && !visionEngine.getFaceModelStatus().hasDetectedFrame && (
            <div className="flex items-center gap-1.5 bg-amber-950/95 border border-amber-500/60 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-200">
              <ShieldAlert className="w-4 h-4" />
              <span>{visionEngine.getFaceModelStatus().state === 'error' ? 'FACE MODEL FAILED — OUTPUT BLOCKED' : 'LOADING FACE MODEL — OUTPUT BLOCKED'}</span>
            </div>
          )}
        </div>

        {/* Floating Top Right Mode & Masking Pill */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <div className="bg-[#090D16]/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
            <span className="text-slate-400">MASK:</span>{' '}
            <span className="font-bold text-cyan-300 uppercase">{rules.maskingMode.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Draggable Split-Screen Slider Controls */}
        {splitMode === 'split_slider' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md bg-[#090D16]/90 backdrop-blur-md border border-cyan-500/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg">
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">RAW (0%)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={splitSliderPos}
              onChange={(e) => setSplitSliderPos(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-cyan-300 whitespace-nowrap">PROTECTED (100%)</span>
          </div>
        )}

        {/* Explainable AI Inspector Modal */}
        <ExplainableInspector
          box={selectedBoxForInspection}
          onClose={() => setSelectedBoxForInspection(null)}
        />
      </div>

      {/* Multimodal Audio HUD & Transcript Section */}
      <AudioHUD />
    </div>
  );
};
