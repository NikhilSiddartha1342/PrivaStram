import React from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import { MaskingMode, PrivacySensitivity } from '../../types';
import {
  Sliders,
  Eye,
  Volume2,
  Shield,
  Layers,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

export const PrivacyRulesView: React.FC = () => {
  const { rules, updateRules, resetRulesToDefault } = usePrivacyStream();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Privacy Protection Rules</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure multimodal AI detection thresholds, masking styles, and temporal stabilization.
          </p>
        </div>

        <button
          onClick={resetRulesToDefault}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual Privacy Controls */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-cyan-400">
            <Eye className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Visual Privacy Filters
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Face Anonymization</span>
                <span className="text-[11px] text-slate-400">Blurs detected human faces in frame</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectFaces}
                onChange={(e) => updateRules({ protectFaces: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Face Whitelist Bypass</span>
                <span className="text-[11px] text-slate-400">Keeps registered Host/Speakers clean &amp; visible</span>
              </div>
              <input
                type="checkbox"
                checked={rules.enableFaceWhitelist}
                onChange={(e) => updateRules({ enableFaceWhitelist: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">License Plate Detection</span>
                <span className="text-[11px] text-slate-400">Masks automotive registration plates</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectLicensePlates}
                onChange={(e) => updateRules({ protectLicensePlates: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Identity Document Detection</span>
                <span className="text-[11px] text-slate-400">Passports, Aadhaar, Driver's Licenses</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectIdDocuments}
                onChange={(e) => updateRules({ protectIdDocuments: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Targeted OCR Sensitive Text</span>
                <span className="text-[11px] text-slate-400">Only blurs phone numbers, emails, and IDs</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectSensitiveText}
                onChange={(e) => updateRules({ protectSensitiveText: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Audio Privacy Controls */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-blue-400">
            <Volume2 className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Spoken Audio Privacy Filters
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Spoken Phone Numbers</span>
                <span className="text-[11px] text-slate-400">Injects 1kHz tone over spoken digits</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectSpokenPhones}
                onChange={(e) => updateRules({ protectSpokenPhones: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Spoken Email Addresses</span>
                <span className="text-[11px] text-slate-400">Censors email names and domains</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectSpokenEmails}
                onChange={(e) => updateRules({ protectSpokenEmails: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Spoken ID &amp; Aadhaar Numbers</span>
                <span className="text-[11px] text-slate-400">Censors 12-digit UIDAI / SSN sequences</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectSpokenIDs}
                onChange={(e) => updateRules({ protectSpokenIDs: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Spoken Addresses &amp; Locations</span>
                <span className="text-[11px] text-slate-400">Mutes residential address disclosures</span>
              </div>
              <input
                type="checkbox"
                checked={rules.protectSpokenAddresses}
                onChange={(e) => updateRules({ protectSpokenAddresses: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#151D2F] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <span className="font-semibold text-slate-200 block">Experimental Mouth / Speech Sync</span>
                <span className="text-[11px] text-slate-400">Highlights mouth region during spoken PII</span>
              </div>
              <input
                type="checkbox"
                checked={rules.enableMouthSyncIndicator}
                onChange={(e) => updateRules({ enableMouthSyncIndicator: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Masking Style Picker & Temporal Stabilization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Masking Mode */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
            Visual Anonymization Style
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'cyber_shield', label: 'Cyber Shield', desc: 'Neon grid + mosaic' },
              { id: 'gaussian_blur', label: 'Gaussian Blur', desc: 'Smooth heavy blur' },
              { id: 'pixelate', label: 'Pixelate Mosaic', desc: 'Blocky pixelation' },
              { id: 'solid_black', label: 'Solid Redaction', desc: 'Censorship bar' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateRules({ maskingMode: mode.id as MaskingMode })}
                className={`p-3 rounded-xl text-left border transition-all ${
                  rules.maskingMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-[#151D2F] text-slate-300 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs">{mode.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Temporal Stabilization Tuning */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
            Temporal Stabilization (Anti-Flicker)
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Persistence Frames (Anti-Drop)</span>
                <span className="font-mono text-cyan-400 font-bold">{rules.persistenceFrames} frames</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={rules.persistenceFrames}
                onChange={(e) => updateRules({ persistenceFrames: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Maintains blur across momentary missed frames to prevent visual flickering.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Fail-Safe Latency Guard Threshold</span>
                <span className="font-mono text-red-400 font-bold">{rules.failSafeLatencyThresholdMs} ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                step="10"
                value={rules.failSafeLatencyThresholdMs}
                onChange={(e) => updateRules({ failSafeLatencyThresholdMs: Number(e.target.value) })}
                className="w-full accent-red-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Automatically masks active zones if AI inference latency exceeds safety threshold.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
