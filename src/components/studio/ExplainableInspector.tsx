import React from 'react';
import { DetectionBox, PrivacyEvent } from '../../types';
import { ShieldAlert, Cpu, Sparkles, CheckCircle2, X, Terminal, HelpCircle } from 'lucide-react';

interface ExplainableInspectorProps {
  box: DetectionBox | null;
  onClose: () => void;
}

export const ExplainableInspector: React.FC<ExplainableInspectorProps> = ({ box, onClose }) => {
  if (!box) return null;

  return (
    <div className="absolute top-4 right-4 z-40 w-84 sm:w-96 bg-[#0E1422]/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-4 shadow-2xl shadow-cyan-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
              Explainable AI Inspector
            </h4>
            <p className="text-[11px] text-slate-400">Why was this region protected?</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Details */}
      <div className="mt-3 space-y-3">
        <div className="bg-[#151D2F] p-2.5 rounded-lg border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400">Detected Entity</span>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{box.label}</span>
              {box.isWhitelisted && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-mono">
                  Whitelisted
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400">Confidence</span>
            <div className="text-sm font-mono font-bold text-cyan-400">
              {(box.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Rule Matched */}
        <div className="bg-[#151D2F] p-2.5 rounded-lg border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rule Triggered:</span>
          </div>
          <p className="text-xs font-mono text-slate-200 bg-[#090D16] p-2 rounded border border-white/5">
            {box.whyProtected.ruleMatched}
          </p>
        </div>

        {/* Explanatory Rationale */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400">Protection Rationale</span>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#0E1422] p-2.5 rounded-lg border border-white/5">
            {box.whyProtected.detail}
          </p>
        </div>

        {/* Inference Engine & Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#151D2F] p-2 rounded border border-white/5">
            <span className="text-[10px] text-slate-400 block font-mono">EXECUTION ENGINE</span>
            <span className="font-medium text-slate-200 text-[11px]">{box.whyProtected.engine}</span>
          </div>
          <div className="bg-[#151D2F] p-2 rounded border border-white/5">
            <span className="text-[10px] text-slate-400 block font-mono">DECISION METRIC</span>
            <span className="font-mono text-cyan-300 text-[11px]">{box.whyProtected.metric}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
