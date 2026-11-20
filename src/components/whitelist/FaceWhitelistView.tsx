import React, { useState, useRef, useEffect } from 'react';
import { usePrivacyStream } from '../../context/PrivacyStreamContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Camera,
  Sliders,
  Sparkles,
  Info,
  Check,
  Zap,
  Upload,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const FaceWhitelistView: React.FC = () => {
  const {
    faceWhitelist,
    addFaceToWhitelist,
    toggleFaceWhitelistStatus,
    removeFaceFromWhitelist,
    visionEngine
  } = usePrivacyStream();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Host' | 'Co-Host' | 'Guest'>('Host');
  const [similarity, setSimilarity] = useState(0.65);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedAvatar, setCapturedAvatar] = useState<string | null>(null);
  const [capturedSamples, setCapturedSamples] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manage camera stream lifecycle with proper useEffect
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (!isCancelled && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.warn);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setCameraError('Camera access required. Please allow camera permissions in your browser or upload a photo below.');
          setIsCameraActive(false);
        }
      }
    };

    if (isCameraActive) {
      startCamera();
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraActive]);

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 480;
        const size = Math.min(vw, vh);
        const sx = (vw - size) / 2;
        const sy = (vh - size) / 2;
        ctx.drawImage(videoRef.current, sx, sy, size, size, 0, 0, 240, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        setCapturedAvatar(dataUrl);
        setCapturedSamples(prev => [...prev, dataUrl]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCapturedAvatar(reader.result);
          setCapturedSamples(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      if (capturedSamples.length === 0) throw new Error('Capture or upload at least one face sample before activating this profile.');
      const embeddings: number[][] = [];
      for (const sample of capturedSamples) embeddings.push(await visionEngine.enrollFace(sample));
      const averaged = embeddings[0].map((_, index) => embeddings.reduce((sum, vector) => sum + vector[index], 0) / embeddings.length);
      const magnitude = Math.sqrt(averaged.reduce((sum, value) => sum + value * value, 0));
      const embedding = averaged.map(value => value / (magnitude || 1));
      addFaceToWhitelist(newName.trim(), newRole, similarity, capturedAvatar || undefined, embedding);
      setNewName('');
      setCapturedAvatar(null);
      setCapturedSamples([]);
      setCameraError(null);
      setIsCameraActive(false);
    } catch (err: any) {
      setCameraError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Face Whitelist &amp; Trusted Profiles</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Register yourself and trusted co-hosts so your faces stay clear while unauthorized guests &amp; strangers are automatically blurred.
          </p>
        </div>

        <span className="px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold self-start">
          {faceWhitelist.filter((f) => f.isWhitelisted).length} ACTIVE TRUSTED PROFILES
        </span>
      </div>

      {/* How Facial Identification Works Card */}
      <div className="bg-gradient-to-r from-[#0E1422] via-[#151D2F] to-[#0E1422] border border-cyan-500/30 rounded-2xl p-4 shadow-lg flex items-start gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <h3 className="font-bold font-mono text-cyan-300 uppercase tracking-wider">
            How PrivaStream Identifies Who is Who:
          </h3>
          <p className="text-slate-400 leading-relaxed">
            1. <strong>Multi-Face Localization:</strong> PrivaStream continuously locates all faces in your camera feed (Person 1 on the left, Person 2 on the right, etc.).<br/>
            2. <strong>Facial Matching:</strong> Each face is compared against your registered Trusted Profiles below.<br/>
            3. <strong>Automatic Protection:</strong> The registered Streamer remains <strong>crystal-clear</strong>, while any unrecognized person or stranger is <strong>automatically heavily blurred or cyber-shielded</strong>!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Register New Face Form */}
        <div className="bg-[#0E1422] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-cyan-400">
            <UserPlus className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
              Register Trusted Face
            </h3>
          </div>

          {cameraError && (
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs">
              {cameraError}
            </div>
          )}

          <form onSubmit={handleAddFace} className="space-y-3 text-xs">
            {/* Camera / Photo Snapshot Box */}
            <div className="bg-[#151D2F] p-3 rounded-xl border border-white/5 flex flex-col items-center gap-2.5">
              {isCameraActive ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="relative w-full aspect-square max-h-48 rounded-lg overflow-hidden bg-black border border-cyan-500/40">
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-cyan-400/50 rounded-lg pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-glow-emerald transition-all"
                  >
                    📸 Capture Snapshot &amp; Save
                  </button>
                  <div className="text-[10px] text-cyan-200">{capturedSamples.length} face sample{capturedSamples.length === 1 ? '' : 's'} captured · capture different angles or lighting</div>
                  <button type="button" onClick={() => setIsCameraActive(false)} className="text-[10px] text-slate-400 underline">Finish capturing</button>
                </div>
              ) : capturedAvatar ? (
                <div className="flex items-center gap-3 w-full p-2 rounded-lg bg-[#090D16] border border-emerald-500/30">
                  <img src={capturedAvatar} alt="Captured Face" className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400" />
                  <div className="flex-1">
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Face Photo Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCapturedAvatar(null); setCapturedSamples([]); setIsCameraActive(true); }}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 underline mt-0.5 block"
                    >
                      Add / retake samples
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/40 flex items-center justify-center gap-2 font-bold transition-all shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>📸 Snapshot Face from Webcam</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Or Upload Photo File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Profile / Person Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Nikhil (Host Streamer)"
                className="w-full bg-[#151D2F] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Stream Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-[#151D2F] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 font-medium"
              >
                <option value="Host">Host (Primary Streamer)</option>
                <option value="Co-Host">Co-Host (Authorized Speaker)</option>
                <option value="Guest">Authorized Guest</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Match Threshold</span>
                <span className="font-mono text-cyan-400 font-bold">{similarity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={similarity}
                onChange={(e) => setSimilarity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
            >
              + Add to Trusted Whitelist
            </button>
          </form>
        </div>

        {/* Active Face Profiles Gallery */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-200">
            Registered Trusted Profiles ({faceWhitelist.length})
          </h3>

          {faceWhitelist.length === 0 ? (
            <div className="bg-[#0E1422] border border-dashed border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">No Trusted Faces Enrolled Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Click <strong>"📸 Snapshot Face from Webcam"</strong> on the left or upload a photo to enroll yourself as the authenticated Stream Host!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {faceWhitelist.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    profile.isWhitelisted
                      ? 'bg-[#151D2F] border-cyan-500/30 shadow-sm'
                      : 'bg-[#0E1422] border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center font-bold text-cyan-300 text-base overflow-hidden">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{profile.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                            {profile.role}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            &gt;{profile.similarityThreshold.toFixed(2)} sim
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFaceFromWhitelist(profile.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Remove Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">
                      Status: {profile.isWhitelisted ? '🟢 Trusted (Clear)' : '🔴 Masked (Blurred)'}
                    </span>
                    <button
                      onClick={() => toggleFaceWhitelistStatus(profile.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        profile.isWhitelisted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {profile.isWhitelisted ? 'Whitelisted' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
