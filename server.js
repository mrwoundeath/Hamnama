const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.get("/health", (_, res) => res.json({ ok: true, app: "باهم ببینیم" }));

const rooms = new Map();

io.on("connection", socket => {
  socket.on("join-room", ({ roomCode, name }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const cleanName = String(name || "").trim().slice(0, 30);
    if (!code || !cleanName) return socket.emit("room-error", "نام و کد روم الزامی است.");

    let room = rooms.get(code);
    if (!room) {
      room = {
        users: new Map(),
        playback: { playing: false, time: 0, at: Date.now() }
      };
      rooms.set(code, room);
    }

    if (room.users.size >= 2)
      return socket.emit("room-error", "این روم در حال حاضر دو نفر دارد.");

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.name = cleanName;
    room.users.set(socket.id, { id: socket.id, name: cleanName });

    socket.emit("joined-room", {
      roomCode: code,
      users: [...room.users.values()],
      playback: room.playback
    });
    io.to(code).emit("room-users", { users: [...room.users.values()] });
  });

  socket.on("playback", data => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const time = Number(data?.time);
    if (!room || !Number.isFinite(time)) return;

    room.playback = {
      playing: !!data.playing,
      time,
      at: Date.now()
    };
    socket.to(code).emit("playback", room.playback);
  });

  socket.on("chat", text => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    const message = String(text || "").trim().slice(0, 500);
    if (!message) return;

    io.to(code).emit("chat", {
      id: socket.id + Date.now(),
      name: socket.data.name,
      text: message,
      time: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    room.users.delete(socket.id);
    if (room.users.size === 0) rooms.delete(code);
    else io.to(code).emit("room-users", { users: [...room.users.values()] });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("باهم ببینیم روی پورت " + PORT + " اجرا شد"));
