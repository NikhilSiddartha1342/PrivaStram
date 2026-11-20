import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExecutionTier,
  PrivacyRulesConfig,
  FaceProfile,
  PrivacyEvent,
  StreamMetrics,
  DetectionBox,
  AudioRedactionEvent,
  MaskingMode,
  PrivacySensitivity
} from '../types';
import { INITIAL_FACE_WHITELIST, SYNTHETIC_SCENARIOS, SyntheticScenario } from '../services/syntheticData';
import { VisionProcessingEngine } from '../services/visionEngine';
import { AudioProcessingEngine } from '../services/audioEngine';

interface PrivacyStreamContextType {
  // Navigation & Modes
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  executionTier: ExecutionTier;
  setExecutionTier: (tier: ExecutionTier) => void;

  // Video Source
  videoSourceType: 'webcam' | 'screen' | 'synthetic';
  setVideoSourceType: (type: 'webcam' | 'screen' | 'synthetic') => void;
  selectedScenario: SyntheticScenario;
  setSelectedScenario: (scenario: SyntheticScenario) => void;
  activeDetections: DetectionBox[];
  setActiveDetections: (boxes: DetectionBox[]) => void;

  // Audio Engine & Transcripts
  audioEngine: AudioProcessingEngine;
  liveTranscript: { raw: string; censored: string; timestamp: number }[];
  triggerSpokenPhraseTest: (rawPhrase: string) => void;

  // Rules & Configuration
  rules: PrivacyRulesConfig;
  updateRules: (partial: Partial<PrivacyRulesConfig>) => void;
  resetRulesToDefault: () => void;

  // Face Whitelist
  faceWhitelist: FaceProfile[];
  addFaceToWhitelist: (name: string, role: 'Host' | 'Co-Host' | 'Guest', similarity?: number, avatarUrl?: string, embedding?: number[]) => void;
  toggleFaceWhitelistStatus: (id: string) => void;
  removeFaceFromWhitelist: (id: string) => void;

  // Metrics & Fail-Safe
  metrics: StreamMetrics;
  updateMetrics: (partial: Partial<StreamMetrics>) => void;
  triggerFailSafeManualToggle: () => void;

  // Events & Explainable AI
  eventsLog: PrivacyEvent[];
  logPrivacyEvent: (event: Omit<PrivacyEvent, 'id' | 'timestamp' | 'rawTimestamp'>) => void;
  selectedBoxForInspection: DetectionBox | null;
  setSelectedBoxForInspection: (box: DetectionBox | null) => void;

  // Ephemeral Data Lifecycle Controls
  purgeAllSessionData: () => void;

  // Vision Engine Instance
  visionEngine: VisionProcessingEngine;
}

const DEFAULT_RULES: PrivacyRulesConfig = {
  protectFaces: true,
  enableFaceWhitelist: true,
  protectLicensePlates: true,
  protectIdDocuments: true,
  protectSensitiveText: true,
  protectCreditCards: true,

  protectSpokenPhones: true,
  protectSpokenEmails: true,
  protectSpokenAddresses: true,
  protectSpokenIDs: true,
  protectSpokenNames: true,

  sensitivity: 'high',
  maskingMode: 'cyber_shield',
  blurRadius: 20,
  pixelateBlockSize: 14,

  temporalStabilization: true,
  persistenceFrames: 4,
  smoothingFactor: 0.65,

  enableFailSafeGuard: true,
  failSafeLatencyThresholdMs: 150,

  enableMouthSyncIndicator: false,
};

const PrivacyStreamContext = createContext<PrivacyStreamContextType | undefined>(undefined);

export const PrivacyStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('studio');
  const [executionTier, setExecutionTier] = useState<ExecutionTier>('browser_client');
  const [videoSourceType, setVideoSourceType] = useState<'webcam' | 'screen' | 'synthetic'>('synthetic');
  const [selectedScenario, setSelectedScenario] = useState<SyntheticScenario>(SYNTHETIC_SCENARIOS[0]);
  const [activeDetections, setActiveDetections] = useState<DetectionBox[]>([]);
  const [rules, setRules] = useState<PrivacyRulesConfig>(DEFAULT_RULES);
  const [faceWhitelist, setFaceWhitelist] = useState<FaceProfile[]>(INITIAL_FACE_WHITELIST);
  const [selectedBoxForInspection, setSelectedBoxForInspection] = useState<DetectionBox | null>(null);

  const [liveTranscript, setLiveTranscript] = useState<{ raw: string; censored: string; timestamp: number }[]>([
    { raw: 'Welcome to the live stream broadcast.', censored: 'Welcome to the live stream broadcast.', timestamp: Date.now() - 15000 },
    { raw: 'PrivaStream multimodal AI shield is currently active.', censored: 'PrivaStream multimodal AI shield is currently active.', timestamp: Date.now() - 8000 }
  ]);

  const [eventsLog, setEventsLog] = useState<PrivacyEvent[]>([]);

  const [metrics, setMetrics] = useState<StreamMetrics>({
    streamFps: 0,
    detectionFps: 0,
    ocrFps: 0,
    renderFps: 0,
    latencyMs: 0,
    audioLatencyMs: 0,
    streamHealth: 0,
    privacyScore: 0,
    totalEventsCount: 0,
    visualEventsCount: 0,
    audioEventsCount: 0,
    activeDetectionsCount: 0,
    isFailSafeActive: false,
  });

  const visionEngine = useMemo(() => new VisionProcessingEngine(), []);
  const audioEngine = useMemo(() => new AudioProcessingEngine(), []);

  // Update Metrics & Check Fail-Safe Threshold
  const updateMetrics = useCallback((partial: Partial<StreamMetrics>) => {
    setMetrics((prev) => {
      const next = { ...prev, ...partial };
      const isFailSafe = rules.enableFailSafeGuard && next.latencyMs > rules.failSafeLatencyThresholdMs;
      return {
        ...next,
        isFailSafeActive: isFailSafe,
        streamHealth: isFailSafe ? 62 : Math.min(100, Math.max(85, 100 - Math.round(next.latencyMs / 6))),
      };
    });
  }, [rules.enableFailSafeGuard, rules.failSafeLatencyThresholdMs]);

  const triggerFailSafeManualToggle = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      isFailSafeActive: !prev.isFailSafeActive,
    }));
  }, []);

  const updateRules = useCallback((partial: Partial<PrivacyRulesConfig>) => {
    setRules((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetRulesToDefault = useCallback(() => {
    setRules(DEFAULT_RULES);
  }, []);

  const addFaceToWhitelist = useCallback((name: string, role: 'Host' | 'Co-Host' | 'Guest', similarity = 0.65, avatarUrl?: string, embedding?: number[]) => {
    if (!embedding?.length) throw new Error('A validated face embedding is required before activation.');
    const newProfile: FaceProfile = {
      id: `face_${Date.now()}`,
      name,
      role,
      isWhitelisted: true,
      avatarUrl,
      embedding,
      embeddings: [embedding],
      similarityThreshold: similarity,
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      descriptorLength: embedding ? embedding.length : 128,
    };
    setFaceWhitelist((prev) => [newProfile, ...prev]);
  }, []);

  const toggleFaceWhitelistStatus = useCallback((id: string) => {
    setFaceWhitelist((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isWhitelisted: !f.isWhitelisted } : f))
    );
  }, []);

  const removeFaceFromWhitelist = useCallback((id: string) => {
    setFaceWhitelist((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const logPrivacyEvent = useCallback((eventData: Omit<PrivacyEvent, 'id' | 'timestamp' | 'rawTimestamp'>) => {
    const newEvent: PrivacyEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      rawTimestamp: Date.now(),
    };

    setEventsLog((prev) => [newEvent, ...prev.slice(0, 150)]); // Limit history to last 150 in memory

    setMetrics((prev) => {
      const isVisual = !eventData.category.startsWith('spoken');
      return {
        ...prev,
        totalEventsCount: prev.totalEventsCount + 1,
        visualEventsCount: isVisual ? prev.visualEventsCount + 1 : prev.visualEventsCount,
        audioEventsCount: !isVisual ? prev.audioEventsCount + 1 : prev.audioEventsCount,
      };
    });
  }, []);

  // Trigger synthetic/demo audio spoken phrase test
  const triggerSpokenPhraseTest = useCallback((rawPhrase: string) => {
    const result = audioEngine.processSpokenText(rawPhrase, rules);
    setLiveTranscript((prev) => [
      ...prev,
      { raw: rawPhrase, censored: result.censored, timestamp: Date.now() }
    ]);

    if (result.hasPII && result.event) {
      const categoryNames: Record<string, string> = {
        spoken_phone: 'Spoken Phone Number',
        spoken_email: 'Spoken Email Address',
        spoken_id: 'Spoken ID / Secret Code',
        spoken_address: 'Spoken Residential Address',
        spoken_name: 'Spoken Name Identifier',
      };
      const catLabel = categoryNames[result.event.category] || 'Spoken Sensitive PII';

      logPrivacyEvent({
        category: result.event.category,
        label: catLabel,
        action: 'AUDIO_REDACTED',
        confidence: 0.98,
        details: `Spoken PII redacted with 1kHz tone: "${rawPhrase}"`,
        engine: 'Client Rule-Based Parser',
        whyProtected: {
          ruleMatched: 'Spoken PII Entity Detected',
          detail: `Classified sensitive verbal disclosure. 1kHz sine tone emitted to physical speakers & stream track muted.`,
          engine: 'Client Rule-Based Parser',
          metric: 'Hardware Speaker Bleep: Fired (1000Hz)'
        }
      });
    }
  }, [audioEngine, rules, logPrivacyEvent]);

  // Ephemeral Data Lifecycle: Instant purge of memory and session event logs
  const purgeAllSessionData = useCallback(() => {
    setActiveDetections([]);
    setEventsLog([]);
    setLiveTranscript([]);
    setSelectedBoxForInspection(null);
    setMetrics((prev) => ({
      ...prev,
      totalEventsCount: 0,
      visualEventsCount: 0,
      audioEventsCount: 0,
      activeDetectionsCount: 0,
    }));
  }, []);

  return (
    <PrivacyStreamContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        executionTier,
        setExecutionTier,
        videoSourceType,
        setVideoSourceType,
        selectedScenario,
        setSelectedScenario,
        activeDetections,
        setActiveDetections,
        audioEngine,
        liveTranscript,
        triggerSpokenPhraseTest,
        rules,
        updateRules,
        resetRulesToDefault,
        faceWhitelist,
        addFaceToWhitelist,
        toggleFaceWhitelistStatus,
        removeFaceFromWhitelist,
        metrics,
        updateMetrics,
        triggerFailSafeManualToggle,
        eventsLog,
        logPrivacyEvent,
        selectedBoxForInspection,
        setSelectedBoxForInspection,
        purgeAllSessionData,
        visionEngine,
      }}
    >
      {children}
    </PrivacyStreamContext.Provider>
  );
};

export const usePrivacyStream = () => {
  const context = useContext(PrivacyStreamContext);
  if (!context) {
    throw new Error('usePrivacyStream must be used within a PrivacyStreamProvider');
  }
  return context;
};
