import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { Film, MessageCircle, Send, Upload, Play, Pause, RotateCcw, RotateCw, Users, Wifi, WifiOff } from "lucide-react";

const API_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

function Intro({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="logo-mark"
        initial={{ scale: .7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 14 }}
      >
        <Film size={34} />
      </motion.div>
      <motion.h1 initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }}>
        باهم ببینیم
      </motion.h1>
      <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .45 }}>
        فیلم دیدن، کنار هم
      </motion.p>
      <div className="intro-loader"><span /></div>
    </motion.div>
  );
}

function Login({ onJoin }) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return setError("نام و کد روم را وارد کنید.");
    setError("");
    onJoin(name.trim(), room.trim());
  }

  return (
    <main className="login-page">
      <motion.div className="login-card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand-small"><span>باهم</span> ببینیم</div>
        <p className="muted">یک روم بسازید و با دوستتان فیلم ببینید.</p>
        <form onSubmit={submit}>
          <label>نام شما</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً Taha" maxLength={30} />
          <label>کد روم</label>
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="مثلاً FRIEND42" maxLength={20} dir="ltr" />
          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit">ورود به روم <span>←</span></button>
        </form>
        <div className="login-note"><Users size={15}/> هر روم فقط برای دو نفر است</div>
      </motion.div>
    </main>
  );
}

function VideoPanel({ videoUrl, videoName, onFile, socket, remotePlayback, isConnected }) {
  const videoRef = useRef(null);
  const suppress = useRef(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !remotePlayback) return;
    suppress.current = true;
    const target = Number(remotePlayback.time || 0);
    const apply = () => {
      try { v.currentTime = Math.min(Math.max(target, 0), v.duration || target); } catch {}
      if (remotePlayback.playing) v.play().catch(() => {});
      else v.pause();
      setTimeout(() => { suppress.current = false; }, 80);
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
  }, [remotePlayback]);

  function emitPlayback(playing, time = videoRef.current?.currentTime || 0) {
    if (!socket || suppress.current) return;
    socket.emit("playback", { playing, time });
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => emitPlayback(true)).catch(() => {});
    else { v.pause(); emitPlayback(false); }
  }

  function seek(delta) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration || Infinity);
    emitPlayback(!v.paused, v.currentTime);
  }

  function onLoaded() {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setCurrent(videoRef.current?.currentTime || 0);
  }

  return (
    <section className="video-panel">
      <div className="video-stage">
        {!videoUrl ? (
          <div className="video-empty">
            <div className="empty-icon"><Film /></div>
            <h2>ویدئوی خودت را انتخاب کن</h2>
            <p>فایل روی همین دستگاه باقی می‌ماند و فقط زمان پخش با نفر دوم هماهنگ می‌شود.</p>
            <label className="upload-button">
              <Upload size={18}/> انتخاب ویدئو
              <input type="file" accept="video/*" onChange={onFile} hidden />
            </label>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            onLoadedMetadata={onLoaded}
            onTimeUpdate={() => setCurrent(videoRef.current?.currentTime || 0)}
            onPlay={() => { setLocalPlaying(true); emitPlayback(true); }}
            onPause={() => { setLocalPlaying(false); emitPlayback(false); }}
            onSeeking={() => { if (!suppress.current) emitPlayback(!videoRef.current?.paused, videoRef.current?.currentTime || 0); }}
          />
        )}
      </div>

      <div className="video-toolbar">
        <div className="video-file">
          <strong>{videoName || "ویدئو انتخاب نشده"}</strong>
          <span>{duration ? `${fmt(current)} / ${fmt(duration)}` : "آماده پخش"}</span>
        </div>
        <div className="controls">
          <button onClick={() => seek(10)} aria-label="10 ثانیه جلو"><RotateCw size={19}/><small>۱۰</small></button>
          <button className="play" onClick={togglePlay} disabled={!videoUrl}>{localPlaying ? <Pause size={22}/> : <Play size={22}/>}</button>
          <button onClick={() => seek(-10)} aria-label="10 ثانیه عقب"><RotateCcw size={19}/><small>۱۰</small></button>
        </div>
        <label className="change-video">
          <Upload size={16}/> تغییر ویدئو
          <input type="file" accept="video/*" onChange={onFile} hidden />
        </label>
      </div>
      <div className="sync-status">
        {isConnected ? <><Wifi size={14}/> اتصال همگام‌سازی فعال است</> : <><WifiOff size={14}/> اتصال به سرور برقرار نیست</>}
      </div>
    </section>
  );
}

function Chat({ messages, onSend, users }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div><MessageCircle size={19}/><strong>چت روم</strong></div>
        <span className="people"><Users size={14}/> {users.length}/۲</span>
      </header>
      <div className="messages">
        {messages.length === 0 && <div className="chat-empty">پیامی وجود ندارد.<br/>گفت‌وگو را شروع کنید.</div>}
        {messages.map(m => (
          <div className="message" key={m.id}>
            <div className="message-meta"><strong>{m.name}</strong><time>{new Date(m.time).toLocaleTimeString("fa-IR", {hour:"2-digit", minute:"2-digit"})}</time></div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="پیامتان را بنویسید..." maxLength={500}/>
        <button type="submit" aria-label="ارسال"><Send size={18}/></button>
      </form>
    </section>
  );
}

function App() {
  const [intro, setIntro] = useState(true);
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [remotePlayback, setRemotePlayback] = useState(null);
  const [roomError, setRoomError] = useState("");

  function join(n, r) {
    const s = io(API_URL, { transports: ["websocket", "polling"] });
    s.on("connect", () => {
      setConnected(true);
      s.emit("join-room", { name: n, roomCode: r });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("joined-room", data => {
      setName(n); setRoomCode(data.roomCode); setUsers(data.users || []);
      setRemotePlayback(data.playback);
      setJoined(true);
    });
    s.on("room-users", data => setUsers(data.users || []));
    s.on("chat", msg => setMessages(prev => [...prev, msg]));
    s.on("playback", data => setRemotePlayback(data));
    s.on("room-error", msg => { setRoomError(msg); s.disconnect(); });
    setSocket(s);
  }

  function chooseVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
  }

  function sendChat(text) {
    socket?.emit("chat", text);
  }

  useEffect(() => () => socket?.disconnect(), [socket]);

  if (intro) return <AnimatePresence><Intro onDone={() => setIntro(false)} /></AnimatePresence>;
  if (!joined) return <Login onJoin={join} />;
  if (roomError) return <div className="fatal-error"><h2>خطا</h2><p>{roomError}</p><button className="primary" onClick={() => location.reload()}>بازگشت</button></div>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="app-brand"><span>باهم</span> ببینیم</div>
        <div className="room-pill">روم: <b dir="ltr">{roomCode}</b></div>
        <div className="connection">{connected ? "● متصل" : "○ قطع"}</div>
      </header>

      <div className="portrait-layout">
        <Chat messages={messages} onSend={sendChat} users={users}/>
        <VideoPanel videoUrl={videoUrl} videoName={videoName} onFile={chooseVideo} socket={socket} remotePlayback={remotePlayback} isConnected={connected}/>
      </div>

      <div className="landscape-layout">
        <VideoPanel videoUrl={videoUrl} videoName={videoName} onFile={chooseVideo} socket={socket} remotePlayback={remotePlayback} isConnected={connected}/>
        <Chat messages={messages} onSend={sendChat} users={users}/>
      </div>
    </main>
  );
}

function fmt(sec) {
  if (!Number.isFinite(sec)) return "00:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}

export default App;
