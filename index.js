import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.get("/health", (_, res) => res.json({ ok: true, service: "باهم ببینیم" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = new Map();

function roomState(roomCode) {
  const room = rooms.get(roomCode);
  return room ? { users: [...room.users.values()] } : { users: [] };
}

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomCode, name }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const cleanName = String(name || "").trim().slice(0, 30);

    if (!code || !cleanName) return socket.emit("room-error", "نام و کد روم الزامی است.");

    let room = rooms.get(code);
    if (!room) {
      room = { users: new Map(), playback: { playing: false, time: 0, at: Date.now() } };
      rooms.set(code, room);
    }

    if (room.users.size >= 2) {
      return socket.emit("room-error", "این روم در حال حاضر دو نفر دارد.");
    }

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.name = cleanName;
    room.users.set(socket.id, { id: socket.id, name: cleanName });

    socket.emit("joined-room", {
      roomCode: code,
      playback: room.playback,
      users: [...room.users.values()]
    });

    socket.to(code).emit("peer-joined", { name: cleanName });
    io.to(code).emit("room-users", roomState(code));
  });

  socket.on("playback", (payload) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    const room = rooms.get(code);
    const time = Number(payload?.time);
    if (!Number.isFinite(time)) return;

    room.playback = {
      playing: Boolean(payload?.playing),
      time,
      at: Date.now()
    };

    socket.to(code).emit("playback", room.playback);
  });

  socket.on("chat", (text) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    const message = String(text || "").trim().slice(0, 500);
    if (!message) return;

    io.to(code).emit("chat", {
      id: `${socket.id}-${Date.now()}`,
      name: socket.data.name,
      text: message,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    const room = rooms.get(code);
    room.users.delete(socket.id);
    io.to(code).emit("room-users", roomState(code));

    if (room.users.size === 0) rooms.delete(code);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
