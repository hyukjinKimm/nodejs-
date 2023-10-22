const { Room, Chat } = require('../models');
const { removeRoom: removeRoomService } = require('../services'); 

exports.renderMain = async (req, res, next) => {
  try {
    const rooms = await Room.findAll();
    res.render('main', { rooms, title: 'GIF 채팅방' });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.renderRoom = (req, res) => {
  res.render('room', { title: 'GIF 채팅방 생성' });
};

exports.createRoom = async (req, res, next) => {
  try {
    const newRoom = await Room.create({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
      password: req.body.password,
    });
    const io = req.app.get('io');
    io.of('/room').emit('newRoom', newRoom);
    if (req.body.password) { // 비밀번호가 있는 방이면
      res.redirect(`/room/${newRoom.id}?password=${req.body.password}`);
    } else {
      res.redirect(`/room/${newRoom.id}`);
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.enterRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ where: { id: parseInt(req.params.id)} });
  
    if (!room) {
      return res.redirect('/?error=존재하지 않는 방입니다.');
    }
    if (room.password && room.password !== req.query.password) {
      return res.redirect('/?error=비밀번호가 틀렸습니다.');
    }
    const io = req.app.get('io');
    
    const { rooms } = io.of('/chat').adapter;
    
    console.log(rooms, rooms.get(req.params.id));
    if (room.max <= rooms.get(req.params.id)?.size) {
      return res.redirect('/?error=허용 인원이 초과하였습니다.');
    }
    const chats = await Chat.findAll({ where: {RoomId: room.id, whisperTo: null, },
      order: [
        ['createdAt', 'ASC'],
    ],
    })
    
    return res.render('chat', {
      room,
      title: room.title,
      chats,
      user: req.session.color,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.removeRoom = async (req, res, next) => {
  try {
    await removeRoomService(req.params.id);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.sendChat = async (req, res, next) => {
  try {
    
    console.log(req.body)
    const chat = await Chat.create({
      RoomId: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
      whisperTo: req.body.whisperTo
    });
    if (req.body.whisperTo){
      //console.log(req.app.get('sc').get(req.body.whisperTo))
      const users = req.app.get('sc').get(req.params.id)
      console.log(users)
      users.forEach((user, i) => {
        if(user[0] == req.body.whisperTo || user[0] == req.session.color)
        {
          req.app.get('io').of('/chat').to(user[1]).emit('chat', chat)
          //io.of.to(socket.id).emit 귓속말

        }
      });
    } else{
      req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
      // io.of.to(roomId).emit 특정 room 에 브로드 캐스트
    }

    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.sendGif = async (req, res, next) => {
  try {
    const chat = await Chat.create({
      RoomId: req.params.id,
      user: req.session.color,
      gif: req.file.filename,
    });
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
};
