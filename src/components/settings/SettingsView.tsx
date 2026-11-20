import React from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  Settings,
  Shield,
  Trash2,
  Cpu,
  Server,
  Lock,
  Zap,
  Terminal,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    purgeAllSessionData,
    executionTier,
    setExecutionTier,
    rules,
    updateRules
  } = usePrivacyStream();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>System Settings &amp; Data Privacy Lifecycle</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage local memory retention, execution engine modes, and strict ephemeral privacy policies.
        </p>
      </div>

      {/* Ephemeral Privacy Data Lifecycle Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-[#0E1422] to-blue-950/40 border border-cyan-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-base font-bold font-display text-white">
              Zero-Disk Retention Ephemeral Guarantee
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              PrivaStream processes all video frames and audio chunks purely in volatile RAM. No unmasked media streams, raw facial embeddings, or unredacted speech transcripts are ever written to persistent disk storage or uploaded to third-party tracking services.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={purgeAllSessionData}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Instant Purge of Session Memory</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Engine & Performance Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-cyan-400">
            <Cpu className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Execution Architecture Tier
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <button
              onClick={() => setExecutionTier('browser_client')}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                executionTier === 'browser_client'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#151D2F] text-slate-400 border-white/5'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Tier 1: In-Browser Client Engine</span>
                {executionTier === 'browser_client' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                WebGL/Canvas CV + Web Audio DSP + Local regex/NER entity parser. Zero install required.
              </p>
            </button>

            <button
              onClick={() => setExecutionTier('backend_ai')}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                executionTier === 'backend_ai'
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                  : 'bg-[#151D2F] text-slate-400 border-white/5'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Tier 2: Backend AI Pipeline</span>
                {executionTier === 'backend_ai' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Connects to Python Flask with YOLOv8, EasyOCR, Silero VAD, Faster-Whisper, and DeBERTa-v3.
              </p>
            </button>
          </div>
        </div>

        {/* Backend Quick Instructions */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-emerald-400">
            <Terminal className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Modular Python Backend Service
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-400 text-[11px]">
              To run the deep-learning backend pipeline locally:
            </p>
            <div className="bg-[#090D16] p-3 rounded-xl border border-white/5 font-mono text-[11px] text-cyan-300 space-y-1">
              <div># 1. Install dependencies</div>
              <div className="text-slate-300">pip install -r backend/requirements.txt</div>
              <div className="pt-1"># 2. Launch Flask + SocketIO</div>
              <div className="text-slate-300">python backend/app.py</div>
            </div>
            <p className="text-[10px] text-slate-500">
              Server binds to <code className="text-cyan-400">http://localhost:5000</code> with WebRTC / SocketIO support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
