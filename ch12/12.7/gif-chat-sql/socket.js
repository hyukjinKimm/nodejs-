const SocketIO = require('socket.io');
const { removeRoom } = require('./services');
const  Chat  = require('./models/chat')
const  Room  = require('./models/room')
module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, { path: '/socket.io' });
  app.set('io', io);
  const room = io.of('/room');
  const chat = io.of('/chat');
  const sc = app.get('sc')
  const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
  chat.use(wrap(sessionMiddleware));

  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', (socket) => {
    console.log(socket.id)
    
    console.log('chat 네임스페이스에 접속');

    socket.on('join', async (data) => {
      if (!sc.get(data)) sc.set(data, [])

      const users = sc.get(data)
      users.push([socket.request.session.color, socket.id])
  
      socket.join(data);
      const { rooms } = chat.adapter;
      const people_num = rooms.get(data).size
      socket.emit('join', { // 본인에게만 보냄
        user: 'system',
        chat: `${socket.request.session.color}님이 입장하셨습니다.`,
        number: people_num,
        owner: users[0][0],
        users: users.slice(1, )

      });
      socket.to(data).emit('join', { // 본인 제외하고 브로드 캐스트 
        user: 'system',
        chat: `${socket.request.session.color}님이 입장하셨습니다.`,
        number: people_num,
        id: socket.request.session.color,
        owner: users[0][0],
        users: users.slice(1, )
      });
      try {
        await Chat.create({
          room: data,
          user: 'system',
          chat: `${socket.request.session.color}님이 입장하셨습니다.`,
          RoomId: data
        });
      } catch (error) {
        console.error(error);
        throw error;
      }

      
    });

    socket.on('disconnect', async () => {
      console.log('chat 네임스페이스 접속 해제');

     
      const { rooms } = chat.adapter;
      const { referer } = socket.request.headers; // 브라우저 주소가 들어있음
      const roomId = new URL(referer).pathname.split('/').at(-1);
      const users = sc.get(roomId)
     
      users.forEach((user, i) => {
        if (user[0] == socket.request.session.color){
            users.splice(i, 1)
        }
      
      });

      const currentRoom = chat.adapter.rooms.get(roomId);
      const userCount = currentRoom?.size || 0;
      if (userCount === 0) { // 유저가 0명이면 방 삭제
        sc.delete(roomId)
        await removeRoom(roomId); // 컨트롤러 대신 서비스를 사용
        setTimeout(() => {
                  room.emit('removeRoom', roomId);
        },500);

        console.log('방 제거 요청 성공');
      } else {

        try {
          const users = sc.get(roomId)
          await Room.update({
            owner: users[0][0],
          }, {
            where: { id: roomId },
          })

          await Chat.create({
            room: roomId,
            user: 'system',
            chat: `${socket.request.session.color}님이 퇴장하셨습니다.`,
            RoomId: roomId,
          });
          socket.to(roomId).emit('exit', {
            user: 'system',
            chat: `${socket.request.session.color}님이 퇴장하셨습니다.`,
            number: rooms.get(roomId).size,
            id: socket.request.session.color,
            owner: users[0][0],
          });

        } catch (error) {
          console.error(error);
          throw error;
        }

      }
    });
  });
};
