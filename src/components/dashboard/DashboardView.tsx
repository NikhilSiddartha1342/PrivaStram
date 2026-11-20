import React from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Zap,
  Lock,
  Eye,
  Volume2,
  Radio,
  Cpu,
  Server,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart2
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    metrics,
    setCurrentTab,
    rules,
    eventsLog,
    executionTier
  } = usePrivacyStream();

  const kpis = [
    {
      label: 'Stream Shield Status',
      value: metrics.isFailSafeActive ? 'FAIL-SAFE LOCK' : 'ACTIVE & PROTECTED',
      subtext: metrics.isFailSafeActive ? 'Emergency frame mask active' : 'Multimodal AI active',
      icon: metrics.isFailSafeActive ? ShieldAlert : ShieldCheck,
      color: metrics.isFailSafeActive ? 'text-red-400' : 'text-emerald-400',
      bgColor: metrics.isFailSafeActive ? 'bg-red-950/40 border-red-500/30' : 'bg-emerald-950/40 border-emerald-500/30',
    },
    {
      label: 'Stream Health',
      value: `${metrics.streamHealth}%`,
      subtext: '30/60 FPS Stabilized',
      icon: Activity,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/30',
    },
    {
      label: 'Multimodal Latency',
      value: `${metrics.latencyMs} ms`,
      subtext: `${metrics.audioLatencyMs}ms audio DSP`,
      icon: Zap,
      color: metrics.latencyMs > 100 ? 'text-amber-400' : 'text-cyan-300',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
    },
    {
      label: 'Privacy Score',
      value: `${metrics.privacyScore} / 100`,
      subtext: 'High Compliance Grade',
      icon: Lock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E1422] via-[#151D2F] to-[#0A0E17] border border-white/10 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
              REAL-TIME PRIVACY SHIELD
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Running in: <strong className="text-slate-200 capitalize">{executionTier.replace('_', ' ')}</strong>
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
            Protect Every Frame in Real-Time
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            PrivaStream prevents accidental exposure of Personally Identifiable Information (Faces, License Plates, ID Documents, Sensitive Text, and Spoken Audio) before it reaches your live viewers.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('studio')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
            >
              <Radio className="w-4 h-4" />
              <span>Open Live Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentTab('rules')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#090D16] hover:bg-white/5 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
            >
              <span>Configure Privacy Rules</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border backdrop-blur-md transition-all hover:translate-y-[-2px] ${kpi.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">{kpi.label}</span>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold font-display mt-2 ${kpi.color}`}>
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{kpi.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Architectural Multimodal Signal Flow Diagram */}
      <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            <h3 className="text-base font-bold font-display text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Multimodal Architecture Signal Flow</span>
            </h3>
            <p className="text-xs text-slate-400">
              Parallel Vision & Audio pipelines with zero-disk ephemeral memory
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            ALL ENGINES ONLINE
          </span>
        </div>

        {/* Interactive Flow Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
          {/* Node 1: Input */}
          <div className="bg-[#151D2F] border border-white/10 p-4 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
              <Radio className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase">Input Capture</h4>
            <p className="text-[11px] text-slate-400">1080p Webcam + Live Mic Stream</p>
          </div>

          {/* Node 2: Video Pipeline */}
          <div className="bg-[#151D2F] border border-cyan-500/30 p-4 rounded-xl text-center space-y-2 relative shadow-glow-cyan">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
              <Eye className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase">Video Pipeline</h4>
            <p className="text-[11px] text-slate-400">Face / Plate / 3-Stage OCR PII</p>
            <span className="text-[9px] font-mono text-emerald-400 block">Temporal Kalman Active</span>
          </div>

          {/* Node 3: Audio Pipeline */}
          <div className="bg-[#151D2F] border border-blue-500/30 p-4 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
              <Volume2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold font-mono text-blue-300 uppercase">Audio Pipeline</h4>
            <p className="text-[11px] text-slate-400">Silero VAD + Speech Entity Parser</p>
            <span className="text-[9px] font-mono text-cyan-400 block">1kHz Tone DSP Splicer</span>
          </div>

          {/* Node 4: Fail-Safe Guard */}
          <div className="bg-[#151D2F] border border-emerald-500/30 p-4 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold font-mono text-emerald-300 uppercase">Fail-Safe Guard</h4>
            <p className="text-[11px] text-slate-400">&lt;150ms Latency Safety Monitor</p>
          </div>

          {/* Node 5: Output */}
          <div className="bg-[#151D2F] border border-white/10 p-4 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold font-mono text-purple-300 uppercase">Protected Output</h4>
            <p className="text-[11px] text-slate-400">Viewer Stream &amp; Recorders</p>
          </div>
        </div>
      </div>

      {/* Recent Privacy Detections Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0E1422] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 className="text-sm font-bold font-display text-slate-200">
              Live Privacy Shield Activity Feed
            </h3>
            <button
              onClick={() => setCurrentTab('events')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
            >
              View Full Audit Log →
            </button>
          </div>

          <div className="space-y-2.5">
            {eventsLog.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="bg-[#151D2F] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#090D16] border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">{evt.label}</span>
                    <p className="text-[11px] text-slate-400">{evt.details}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    {evt.action}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 mt-1">
                    {evt.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Protection Summary Breakdown */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-display text-slate-200 pb-3 border-b border-white/10 mb-4">
              Protection Active Rules
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#151D2F]">
                <span className="text-slate-300">Face Anonymization</span>
                <span className="text-emerald-400 font-mono font-bold">ENABLED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#151D2F]">
                <span className="text-slate-300">Host Whitelist Override</span>
                <span className="text-emerald-400 font-mono font-bold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#151D2F]">
                <span className="text-slate-300">Targeted OCR Text PII</span>
                <span className="text-emerald-400 font-mono font-bold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#151D2F]">
                <span className="text-slate-300">Audio 1kHz Tone Redaction</span>
                <span className="text-emerald-400 font-mono font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Ephemeral Mode</span>
            <span className="font-mono text-cyan-300">0ms Disk Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
