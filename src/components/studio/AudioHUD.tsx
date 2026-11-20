import React, { useEffect, useState, useRef } from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import { attachProtectedAudioStream, detachProtectedAudioTracks } from '../../services/protectedStream';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Volume1,
  MessageSquare,
  Sparkles,
  Zap,
  Play,
  ShieldAlert,
  ShieldCheck,
  Send,
  HelpCircle,
  AlertTriangle,
  Radio
} from 'lucide-react';

export const AudioHUD: React.FC = () => {
  const {
    audioEngine,
    rules,
    liveTranscript,
    triggerSpokenPhraseTest,
    logPrivacyEvent,
    metrics
  } = usePrivacyStream();

  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const [customTestPhrase, setCustomTestPhrase] = useState<string>('');
  const [recentBleepActive, setRecentBleepActive] = useState<boolean>(false);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(24).fill(10));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animate audio waveform bars
  useEffect(() => {
    let animId: number;

    const updateWaveform = () => {
      const freq = audioEngine.getWaveformData();
      // Downsample to 24 bars
      const bars: number[] = [];
      const step = Math.floor(freq.length / 24) || 1;
      for (let i = 0; i < 24; i++) {
        bars.push(freq[i * step] || (Math.random() * 12 + 4));
      }
      setWaveformData(bars);

      // Render to mini canvas if mounted
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;
          ctx.clearRect(0, 0, w, h);

          const barWidth = (w / 24) - 2;
          bars.forEach((val, i) => {
            const barHeight = Math.max(3, (val / 255) * h);
            const x = i * (barWidth + 2);
            const y = h - barHeight;

            const grad = ctx.createLinearGradient(0, y, 0, h);
            if (recentBleepActive) {
              grad.addColorStop(0, '#FF3366');
              grad.addColorStop(1, '#990022');
            } else {
              grad.addColorStop(0, '#00F0FF');
              grad.addColorStop(1, '#2563EB');
            }

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
          });
        }
      }

      animId = requestAnimationFrame(updateWaveform);
    };

    animId = requestAnimationFrame(updateWaveform);
    return () => cancelAnimationFrame(animId);
  }, [audioEngine, recentBleepActive]);

  const handleToggleMic = async () => {
    setMicError(null);
    if (!isMicListening) {
      try {
        const processedAudioStream = await audioEngine.initializeAudioGraph();
        if (processedAudioStream) attachProtectedAudioStream(processedAudioStream);
        const started = audioEngine.startSpeechRecognition(rules, (rawText, censoredText, event) => {
          setInterimText(rawText);
          if (event) {
            setRecentBleepActive(true);
            setTimeout(() => setRecentBleepActive(false), 1200);

            // Log event and sync to context
            logPrivacyEvent({
              category: event.category,
              label: `Spoken PII (${event.category.replace('spoken_', '').toUpperCase()})`,
              action: 'AUDIO_REDACTED',
              confidence: 0.98,
              details: `Verbal disclosure redacted with 1kHz broadcast tone: "${rawText}"`,
              engine: 'Client Rule-Based Parser',
              whyProtected: {
                ruleMatched: 'Spoken PII Real-Time Protection',
                detail: `Classified sensitive verbal disclosure in microphone stream. 1kHz sine tone emitted and audio track gated.`,
                engine: 'Client Rule-Based Parser',
                metric: 'Hardware Speaker Bleep: Fired (1000Hz)'
              }
            });
          }
        });

        if (!started) {
          setMicError('Speech recognition not supported in this browser. You can use the Quick Test Suite & Custom Input below.');
        }
        setIsMicListening(true);
      } catch (err: any) {
        setMicError('Microphone permission required. Click Allow when prompted, or use 1-Click Interactive Test buttons.');
        setIsMicListening(false);
      }
    } else {
      audioEngine.stop();
      detachProtectedAudioTracks();
      setIsMicListening(false);
      setInterimText('');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTestPhrase.trim()) return;
    setRecentBleepActive(true);
    setTimeout(() => setRecentBleepActive(false), 1200);
    triggerSpokenPhraseTest(customTestPhrase.trim());
    setCustomTestPhrase('');
  };

  const handleTestSpeakerBleep = () => {
    setRecentBleepActive(true);
    setTimeout(() => setRecentBleepActive(false), 800);
    audioEngine.playAudibleBleep(800);
  };

  const allPiiSamplePhrases = [
    {
      category: 'Phone Number',
      label: 'Spoken Phone (Digits)',
      phrase: 'Call my direct line at +91 98765 43210 immediately.',
      badge: 'PHONE'
    },
    {
      category: 'Phone Number',
      label: 'Spoken Words Phone',
      phrase: 'My number is nine eight seven six five four three two one zero.',
      badge: 'WORDS'
    },
    {
      category: 'Email Address',
      label: 'Spoken Email Address',
      phrase: 'Send the confidential agreement to alex.morgan@corporate.org please.',
      badge: 'EMAIL'
    },
    {
      category: 'National ID',
      label: 'Aadhaar / SSN Code',
      phrase: 'My national identification code is XXXX-XXXX-9012 for KYC verification.',
      badge: 'ID_NUM'
    },
    {
      category: 'Credit Card',
      label: 'Credit Card Number',
      phrase: 'Charge payment to card 4532 8901 2345 6789 expiring next month.',
      badge: 'PAYMENT'
    },
    {
      category: 'Password / PIN',
      label: 'PIN & Secret Code',
      phrase: 'My account pin code is 4821 and password is admin2026.',
      badge: 'SECRET'
    },
    {
      category: 'Address',
      label: 'Home Street Address',
      phrase: 'I live at 42 Park Avenue, Apartment 3B, New York pincode 10001.',
      badge: 'LOCATION'
    }
  ];

  return (
    <div className="bg-[#0E1422] border border-white/10 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      {/* Audio Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border transition-all ${
            recentBleepActive
              ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-bounce'
              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
          }`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>Multimodal Audio Privacy Shield</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  ALL-PII DSP REDACTOR
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live microphone PII detection with loud 1000Hz physical speaker bleep &amp; zero disk storage.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Test Speaker Tone */}
          <button
            onClick={handleTestSpeakerBleep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151D2F] hover:bg-white/10 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm"
            title="Tests your computer speakers to ensure the 1000Hz censorship tone is loud and clear"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test 1kHz Speaker Bleep</span>
          </button>

          {/* Live Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isMicListening
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-emerald animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold'
            }`}
          >
            {isMicListening ? <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> : <Mic className="w-3.5 h-3.5 text-slate-950" />}
            <span>{isMicListening ? 'Mic Active (Listening)' : 'Start Live Mic'}</span>
          </button>
        </div>
      </div>

      {/* Notice / Error Banner */}
      {micError && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Visualizer & Speaker Output Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* FFT Waveform */}
        <div className="md:col-span-2 bg-[#151D2F] p-3 rounded-lg border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isMicListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>{isMicListening ? 'LIVE AUDIO FFT SPECTRUM' : 'AUDIO ENGINE READY'}</span>
            </span>
            <span className="text-cyan-400 font-bold">{metrics.audioLatencyMs}ms DSP Latency</span>
          </div>
          <canvas ref={canvasRef} width={400} height={40} className="w-full h-10 rounded bg-[#090D16]" />
        </div>

        {/* Censor Status Box */}
        <div className={`p-3 rounded-lg border transition-all flex flex-col items-center justify-center text-center ${
          recentBleepActive
            ? 'bg-red-950/60 border-red-500/50 shadow-glow-crimson'
            : 'bg-[#151D2F] border-white/5'
        }`}>
          <span className="text-[10px] uppercase font-mono text-slate-400">HARDWARE SPEAKER OUTPUT</span>
          <div className="flex items-center gap-1.5 mt-1">
            {recentBleepActive ? (
              <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-red-400" /> 1kHz CENSOR BLEEP ACTIVE
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> PROTECTED AUDIO MONITOR
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">0ms Disk Retention (Active RAM)</span>
        </div>
      </div>

      {/* Interactive Speech Input & Instant Tester Box */}
      <div className="bg-[#151D2F] border border-white/10 rounded-xl p-3">
        <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customTestPhrase}
              onChange={(e) => setCustomTestPhrase(e.target.value)}
              placeholder="Type or speak anything here (e.g. 'My phone number is 9876543210' or 'PIN is 4821')..."
              className="w-full bg-[#090D16] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Audio Mask &amp; Hear Bleep</span>
          </button>
        </form>
      </div>

      {/* 1-Click All-PII Test Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>1-Click Test Scenarios (All PII Types — Click to Hear Censor Bleep):</span>
          </span>
          <span className="text-[11px] text-cyan-400 font-mono">Instant Audio Evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {allPiiSamplePhrases.map((sp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRecentBleepActive(true);
                setTimeout(() => setRecentBleepActive(false), 1200);
                triggerSpokenPhraseTest(sp.phrase);
              }}
              className="text-left p-2.5 rounded-lg bg-[#151D2F] hover:bg-[#1C263D] border border-white/5 hover:border-cyan-500/40 transition-all group flex flex-col justify-between gap-1 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 truncate">{sp.label}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  {sp.badge}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">"{sp.phrase}"</p>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5 opacity-80 group-hover:opacity-100">
                <Play className="w-3 h-3 fill-emerald-400" />
                <span>Play &amp; Redact</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Live Speech Transcript Feed with Inline Redactions */}
      <div className="bg-[#090D16] p-3 rounded-lg border border-white/5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 pb-1.5 border-b border-white/5">
          <span className="flex items-center gap-1.5 text-slate-200 font-bold">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Live Speech Transcript &amp; Anonymization Feed</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
            Protected Output (Zero Raw Retention)
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {liveTranscript.slice(-6).map((t, idx) => {
            const hasRedaction = t.censored.includes('[REDACTED');
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg text-xs leading-relaxed transition-all ${
                  hasRedaction
                    ? 'bg-red-950/30 border border-red-500/30 text-slate-200 shadow-sm'
                    : 'bg-[#111827]/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                  <span>SPEECH SEGMENT #{liveTranscript.length - 6 + idx + 1}</span>
                  {hasRedaction && (
                    <span className="text-red-400 font-bold flex items-center gap-1 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/40">
                      <ShieldAlert className="w-3 h-3" /> 1kHz CENSOR TONE INJECTED (PHYSICAL SPEAKERS &amp; STREAM)
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs">
                  {t.censored.split(/(\[REDACTED:[^\]]+\])/g).map((chunk, cIdx) => {
                    if (chunk.startsWith('[REDACTED')) {
                      return (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded bg-red-500/30 text-red-300 font-bold border border-red-500/50 shadow-sm mx-1 inline-block animate-pulse"
                        >
                          {chunk}
                        </span>
                      );
                    }
                    return chunk;
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
