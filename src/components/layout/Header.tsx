import React from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  Sliders,
  Users,
  Activity,
  BarChart3,
  Settings,
  Trash2,
  Cpu,
  Server,
  Zap,
  Lock
} from 'lucide-react';
import { ExecutionTier } from '../../types';

export const Header: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    executionTier,
    setExecutionTier,
    metrics,
    purgeAllSessionData,
    triggerFailSafeManualToggle
  } = usePrivacyStream();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'studio', label: 'Live Studio', icon: Radio, badge: 'LIVE' },
    { id: 'rules', label: 'Privacy Rules', icon: Sliders },
    { id: 'whitelist', label: 'Face Whitelist', icon: Users },
    { id: 'events', label: 'Event Logs', icon: ShieldCheck, count: metrics.totalEventsCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090D16]/90 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Caption */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 shadow-glow-cyan">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                PrivaStream
              </h1>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                v1.0 AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Protect Every Frame.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#0E1422] p-1.5 rounded-xl border border-white/5 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono font-bold rounded animate-pulse">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-800 border border-white/10 text-slate-300 text-[10px] font-mono rounded-full">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Indicators, Tier Switcher, & Memory Purge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Execution Tier Switcher */}
          <div className="flex items-center bg-[#0E1422] border border-white/10 rounded-lg p-1 text-xs">
            <button
              onClick={() => setExecutionTier('browser_client')}
              title="Runs Computer Vision & NLP heuristics client-side locally in WebGL/Canvas"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                executionTier === 'browser_client'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Browser Engine</span>
            </button>
            <button
              onClick={() => setExecutionTier('backend_ai')}
              title="Connects to Python Flask YOLOv8 + Faster-Whisper + DeBERTa-v3 model server"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                executionTier === 'backend_ai'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>Backend AI (YOLO/DeBERTa)</span>
            </button>
          </div>

          {/* Fail-Safe / Protection Status Pill */}
          <button
            onClick={triggerFailSafeManualToggle}
            title={metrics.isFailSafeActive ? 'Click to reset Fail-Safe Lock' : 'Click to test Emergency Fail-Safe Lock'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              metrics.isFailSafeActive
                ? 'bg-red-950/80 border-red-500/60 text-red-300 shadow-glow-crimson animate-pulse'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-glow-emerald'
            }`}
          >
            {metrics.isFailSafeActive ? (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>FAIL-SAFE ENGAGED</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>PROTECTED</span>
              </>
            )}
          </button>

          {/* Latency & Score Pill */}
          <div className="hidden xl:flex items-center gap-2 bg-[#0E1422] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-slate-400">LATENCY:</span>
            <span className={`font-bold ${metrics.latencyMs > 100 ? 'text-amber-400' : 'text-cyan-300'}`}>
              {metrics.latencyMs}ms
            </span>
            <span className="text-white/20">|</span>
            <span className="text-slate-400">SCORE:</span>
            <span className="font-bold text-emerald-400">{metrics.privacyScore}/100</span>
          </div>

          {/* Ephemeral Memory Purge */}
          <button
            onClick={purgeAllSessionData}
            title="Instant Ephemeral Data Purge (Zero Disk Guarantee)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Purge Memory</span>
          </button>
        </div>
      </div>
    </header>
  );
};
