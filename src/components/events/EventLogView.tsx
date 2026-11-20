import React, { useState } from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  ShieldCheck,
  Search,
  Download,
  Trash2,
  Filter,
  Eye,
  Volume2,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { ExplainableInspector } from '../studio/ExplainableInspector';
import { DetectionBox } from '../../types';

export const EventLogView: React.FC = () => {
  const { eventsLog, purgeAllSessionData } = usePrivacyStream();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectedBox, setInspectedBox] = useState<DetectionBox | null>(null);

  const filteredEvents = eventsLog.filter((evt) => {
    const matchesSearch =
      evt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.whyProtected.ruleMatched.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'visual' && !evt.category.startsWith('spoken')) ||
      (selectedCategory === 'audio' && evt.category.startsWith('spoken')) ||
      evt.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Category', 'Label', 'Action', 'Confidence', 'Engine', 'RuleMatched'];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      e.category,
      `"${e.label.replace(/"/g, '""')}"`,
      e.action,
      (e.confidence * 100).toFixed(1) + '%',
      e.engine,
      `"${e.whyProtected.ruleMatched.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `privastream-audit-log-${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Privacy Event Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time explainable audit trail of all detected and anonymized multimodal entities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151D2F] hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={purgeAllSessionData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0E1422] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules, PII labels, or reasons..."
            className="w-full bg-[#151D2F] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'visual', 'audio', 'face', 'phone_number', 'aadhaar_id'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium uppercase font-mono transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#151D2F] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#0E1422] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151D2F] text-slate-400 font-mono text-[11px] uppercase border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Entity Label</th>
                <th className="py-3 px-4">Action Taken</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Rule / Rationale</th>
                <th className="py-3 px-4 text-right">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No privacy events logged in current memory session.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isVisual = !evt.category.startsWith('spoken');
                  return (
                    <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {evt.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                          {isVisual ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
                          <span className="uppercase">{evt.category.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {evt.label}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            evt.action === 'BLURRED' || evt.action === 'MASKED'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : evt.action === 'AUDIO_REDACTED'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400">
                        {(evt.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {evt.whyProtected.ruleMatched}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            setInspectedBox({
                              id: evt.id,
                              category: evt.category,
                              label: evt.label,
                              confidence: evt.confidence,
                              x: 0.5,
                              y: 0.5,
                              width: 0.3,
                              height: 0.3,
                              whyProtected: evt.whyProtected,
                              timestamp: evt.rawTimestamp,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 hover:border-cyan-500/40 font-mono text-[10px] transition-all"
                        >
                          Explain
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExplainableInspector box={inspectedBox} onClose={() => setInspectedBox(null)} />
    </div>
  );
};
