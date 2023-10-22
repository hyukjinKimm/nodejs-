const SocketIO = require("socket.io");
const { removeRoom } = require("./services");
const { Room } = require("./models");
module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: "/socket.io" });
  app.set("io", io);
  const room = io.of("/room");
  const chat = io.of("/chat");
  const cs = app.get("cs");
  const queMap = app.get("queMap");

  const wrap = (middleware) => (socket, next) =>
    middleware(socket.request, {}, next);
  chat.use(wrap(sessionMiddleware));

  room.on("connection", (socket) => {
    console.log("room 네임스페이스에 접속");
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  chat.on("connection", (socket) => {
    cs.set(socket.request.session.color, socket.id);

    console.log(socket.id);
    console.log("chat 네임스페이스에 접속");

    socket.on("join", (data) => {
      if (!queMap.get(data)) queMap.set(data, []);

      const users = queMap.get(data);

      users.push(socket.request.session.color);
      socket.join(data);

      const { referer } = socket.request.headers; // 브라우저 주소가 들어있음
      const roomId = new URL(referer).pathname.split("/").at(-1);

      const currentRoom = chat.adapter.rooms.get(roomId);

      const userCount = currentRoom?.size || 0;

      // socket.to(data).emit('join', { // 나를 제외한 사람들에게 broadcast
      //   user: 'system',
      //   chat: `${socket.request.session.color}님이 입장하셨습니다.`,
      //   userCount,
      //   enter : socket.request.session.color
      //  });

      // chat.to(roomId).emit()  chat 네임스페이스의 roomId 룸에 (나를포함)브로드 캐스트

      chat.to(roomId).emit("join", {
        // 나를포함 모두에게 브로드 캐스트
        user: "system",
        chat: `${socket.request.session.color}님이 입장하셨습니다.`,
        userCount,
        users,
      });
    });

    socket.on("disconnect", async () => {
      console.log("chat 네임스페이스 접속 해제");

      cs.delete(socket.request.session.color);

      const { referer } = socket.request.headers; // 브라우저 주소가 들어있음
      const roomId = new URL(referer).pathname.split("/").at(-1);
      const currentRoom = chat.adapter.rooms.get(roomId);
      const userCount = currentRoom?.size || 0;

      if (userCount === 0) {
        // 유저가 0명이면 방 삭제
        setTimeout(async () => {
          await removeRoom(roomId); // 컨트롤러 대신 서비스를 사용
          room.emit("removeRoom", roomId);
          console.log("방 제거 요청 성공");
        }, 1000);
      } else {
        const users = queMap.get(roomId);
        users.splice(users.indexOf(socket.request.session.color), 1);
        try {
          const room = await Room.findOne({ where: { id: roomId } });
          if (room.owner == socket.request.session.color) {
            await Room.update({ owner: users[0] }, { where: { id: roomId } });
          }
        } catch (e) {
          console.error(e);
        }

        socket.to(roomId).emit("exit", {
          user: "system",
          chat: `${socket.request.session.color}님이 퇴장하셨습니다.`,
          userCount,
          users,
        });
      }
    });
  });
};
