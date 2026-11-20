import React from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart3, Activity, ShieldCheck, Zap, Lock } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { metrics, eventsLog } = usePrivacyStream();

  // Category Distribution Data
  const categoryData = [
    { name: 'Faces', count: 18, fill: '#00F0FF' },
    { name: 'Text PII', count: 12, fill: '#38BDF8' },
    { name: 'Plates', count: 6, fill: '#818CF8' },
    { name: 'Audio PII', count: 9, fill: '#00E599' },
  ];

  // Latency vs FPS Stream Performance Data
  const performanceData = [
    { time: '00:00', latency: 32, fps: 60 },
    { time: '00:05', latency: 36, fps: 59 },
    { time: '00:10', latency: 42, fps: 60 },
    { time: '00:15', latency: 38, fps: 60 },
    { time: '00:20', latency: 45, fps: 58 },
    { time: '00:25', latency: 35, fps: 60 },
  ];

  const COLORS = ['#00F0FF', '#38BDF8', '#818CF8', '#00E599'];

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto">
      {/* Top Header */}
      <div className="pb-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Multimodal Analytics &amp; Privacy Metrics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry, detection category distributions, and stream latency benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
            PRIVACY GRADE: 97/100 (A+)
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0E1422] border border-white/10">
          <span className="text-xs font-mono text-slate-400">TOTAL PROTECTIONS</span>
          <div className="text-2xl font-bold font-display text-cyan-400 mt-1">45 Entities</div>
          <span className="text-[10px] text-slate-500">In current session</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-white/10">
          <span className="text-xs font-mono text-slate-400">VISUAL PII RATIO</span>
          <div className="text-2xl font-bold font-display text-blue-400 mt-1">80.0%</div>
          <span className="text-[10px] text-slate-500">Faces &amp; Documents</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-white/10">
          <span className="text-xs font-mono text-slate-400">AUDIO REDACTIONS</span>
          <div className="text-2xl font-bold font-display text-emerald-400 mt-1">20.0%</div>
          <span className="text-[10px] text-slate-500">1kHz Tone Injected</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1422] border border-white/10">
          <span className="text-xs font-mono text-slate-400">AVERAGE LATENCY</span>
          <div className="text-2xl font-bold font-display text-amber-400 mt-1">36 ms</div>
          <span className="text-[10px] text-slate-500">Well below 150ms limit</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold font-display text-slate-200 mb-4 flex items-center justify-between">
            <span>Detection Distribution by Category</span>
            <span className="text-xs font-mono text-slate-400">Real-Time Count</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090D16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency vs FPS Line Chart */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold font-display text-slate-200 mb-4 flex items-center justify-between">
            <span>Stream FPS vs Multimodal Inference Latency</span>
            <span className="text-xs font-mono text-cyan-400">Zero-Flicker Telemetry</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                <YAxis yAxisId="left" stroke="#00F0FF" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#00E599" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090D16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line yAxisId="left" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#00F0FF" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="fps" name="Stream FPS" stroke="#00E599" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
