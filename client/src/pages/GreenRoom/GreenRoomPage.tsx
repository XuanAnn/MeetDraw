import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Settings,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useUser } from '../../stores/user.store';

export const GreenRoomPage: React.FC = () => {
  const { id: roomId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { displayName, userColor, currentUser } = useUser();

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Media state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100

  // Devices list
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [selectedCam, setSelectedCam] = useState<string>('');

  // Virtual Background & AI options
  const [virtualBg, setVirtualBg] = useState<'none' | 'blur' | 'strong-blur' | 'tech'>('blur');
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Initialize Media Stream & Web Audio API Live Meter
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: {
            echoCancellation: true,
            noiseSuppression: noiseSuppression,
            autoGainControl: true,
          },
        });

        if (!active) {
          userStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }

        // Setup Web Audio Analyser for Live Audio Meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(userStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            // Scale and smooth
            const level = Math.min(Math.round((average / 128) * 100), 100);
            setAudioLevel(isAudioMuted ? 0 : level);
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        } catch (err) {
          console.warn('Web Audio API Live Meter init error:', err);
        }

        // Query available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setAudioInputDevices(mics);
        setVideoInputDevices(cams);
        if (mics[0]) setSelectedMic(mics[0].deviceId);
        if (cams[0]) setSelectedCam(cams[0].deviceId);
      } catch (err) {
        console.warn('Media access failed in Green Room:', err);
      }
    }

    initMedia();

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [noiseSuppression]);

  // Handle Mute Mic
  const handleToggleAudio = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isAudioMuted;
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Handle Toggle Cam
  const handleToggleVideo = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // Transition to Room
  const handleJoinRoom = () => {
    // Stop local preview tracks so WhiteboardRoom can acquire media cleanly
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="h-16 px-6 glass-panel border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-navy-850"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-[1px] bg-navy-800" />
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white">Green Room</span>
            <span className="text-[10px] bg-indigo-accent/20 text-indigo-glow px-2 py-0.5 rounded-full font-semibold">
              Pre-Call Check
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <span>Room Code:</span>
          <span className="font-mono bg-navy-900 px-2 py-0.5 rounded-md text-slate-200 border border-navy-800">
            {roomId}
          </span>
        </div>
      </header>

      {/* Main Pre-call Stage */}
      <main className="max-w-5xl w-full mx-auto p-6 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left: Camera Preview Box */}
        <div className="w-full lg:w-3/5 space-y-4">
          <div className="relative aspect-video bg-navy-900 rounded-2xl overflow-hidden border border-navy-800 shadow-2xl flex items-center justify-center group">
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
                isVideoMuted ? 'hidden' : ''
              } ${
                virtualBg === 'blur'
                  ? 'blur-sm'
                  : virtualBg === 'strong-blur'
                  ? 'blur-md'
                  : virtualBg === 'tech'
                  ? 'contrast-125 saturate-125'
                  : ''
              }`}
            />

            {/* Video Muted Placeholder */}
            {isVideoMuted && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-xl ring-4 ring-navy-800"
                  style={{ backgroundColor: userColor }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-300">Camera đang tắt</span>
              </div>
            )}

            {/* Bottom floating media controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-navy-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-navy-700/80 shadow-xl">
              <button
                onClick={handleToggleAudio}
                className={`p-3 rounded-xl transition ${
                  isAudioMuted
                    ? 'bg-rose-alert text-white shadow-lg shadow-rose-alert/30'
                    : 'bg-navy-800 text-slate-200 hover:bg-navy-700'
                }`}
                title={isAudioMuted ? 'Bật Micro' : 'Tắt Micro'}
              >
                {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`p-3 rounded-xl transition ${
                  isVideoMuted
                    ? 'bg-rose-alert text-white shadow-lg shadow-rose-alert/30'
                    : 'bg-navy-800 text-slate-200 hover:bg-navy-700'
                }`}
                title={isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
              >
                {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            </div>

            {/* Virtual Background Badge */}
            <div className="absolute top-4 left-4 bg-navy-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] text-slate-300 border border-navy-800 flex items-center space-x-1.5">
              <Sparkles size={12} className="text-indigo-glow" />
              <span>
                {virtualBg === 'none'
                  ? 'Nền gốc'
                  : virtualBg === 'blur'
                  ? 'Mờ nhẹ'
                  : virtualBg === 'strong-blur'
                  ? 'Mờ nhiều'
                  : 'Studio'}
              </span>
            </div>
          </div>

          {/* Live Audio Meter (Web Audio API) */}
          <div className="glass-card p-3.5 rounded-xl flex items-center space-x-3 border border-navy-800">
            <Mic size={16} className={audioLevel > 10 ? 'text-emerald-active' : 'text-slate-500'} />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Mức tín hiệu âm thanh Micro</span>
                <span className={audioLevel > 10 ? 'text-emerald-active font-semibold' : 'text-slate-500'}>
                  {isAudioMuted ? 'Đã tắt tiếng' : `${audioLevel}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-navy-900 rounded-full overflow-hidden flex space-x-0.5 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-active via-cyan-accent to-rose-alert"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Peripherals & Join Control Card */}
        <div className="w-full lg:w-2/5 glass-panel p-6 rounded-2xl border border-navy-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Sẵn sàng tham gia?</h2>
            <p className="text-xs text-slate-400">
              Kiểm tra thiết bị của bạn trước khi vào phòng họp.
            </p>
          </div>

          {/* Authenticated User Identity */}
          <div className="p-3 bg-navy-900/90 rounded-xl border border-navy-700/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-md"
                style={{ backgroundColor: userColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{displayName}</div>
                <div className="text-[11px] text-slate-400">{currentUser?.email}</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-active px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30 flex items-center space-x-1">
              <Check size={10} />
              <span>Đã xác thực</span>
            </span>
          </div>

          <div className="space-y-3">
            {/* Peripheral Dropdowns */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nguồn Microphone</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-light"
              >
                {audioInputDevices.length > 0 ? (
                  audioInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Microphone mặc định</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nguồn Camera</label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-light"
              >
                {videoInputDevices.length > 0 ? (
                  videoInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Camera mặc định</option>
                )}
              </select>
            </div>
          </div>

          {/* Virtual Background Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Hiệu ứng nền camera</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'Không' },
                { id: 'blur', label: 'Mờ nhẹ' },
                { id: 'strong-blur', label: 'Mờ nhiều' },
                { id: 'tech', label: 'Studio' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setVirtualBg(bg.id as any)}
                  className={`text-[11px] py-1.5 px-2 rounded-xl border transition ${
                    virtualBg === bg.id
                      ? 'bg-indigo-accent text-white border-indigo-accent font-bold'
                      : 'bg-navy-900 text-slate-400 border-navy-700 hover:text-white'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Noise Suppression */}
          <div className="flex items-center justify-between p-3 bg-navy-900/60 rounded-xl border border-navy-800">
            <div className="flex items-center space-x-2">
              <Shield size={16} className="text-indigo-glow" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Khử tiếng ồn & tiếng vang</div>
                <div className="text-[10px] text-slate-400">Lọc tạp âm và tiếng vang môi trường</div>
              </div>
            </div>
            <button
              onClick={() => setNoiseSuppression(!noiseSuppression)}
              className={`w-10 h-5 rounded-full p-0.5 transition ${
                noiseSuppression ? 'bg-indigo-accent' : 'bg-navy-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition transform ${
                  noiseSuppression ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Join Button */}
          <button
            onClick={handleJoinRoom}
            className="w-full bg-indigo-accent hover:bg-indigo-light text-white font-bold text-sm py-3.5 rounded-xl transition shadow-xl shadow-indigo-accent/30 flex items-center justify-center space-x-2"
          >
            <span>Vào phòng họp</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-navy-900">
        MeetDraw • Không gian họp trực tuyến & Bảng vẽ cộng tác
      </footer>
    </div>
  );
};
