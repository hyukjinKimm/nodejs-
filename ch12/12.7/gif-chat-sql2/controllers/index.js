const { Room } = require('../models');
const { Chat } = require('../models');
const { removeRoom: removeRoomService } = require('../services'); 

exports.renderMain = async (req, res, next) => {
  try {
    const rooms = await Room.findAll({});
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
    const room = await Room.findOne({ where: {id: req.params.id } });
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
    const chats = await Chat.findAll({ where: {RoomId: room.id },      
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
    const chat = await Chat.create({
      RoomId: req.params.id,
      user: req.session.color,
      chat: req.body.chat,
    });
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.whisperChat = (req, res, next) => {
  const chat = {
    user: req.session.color,
    chat: req.body.chat,
  }
  const cs = req.app.get('cs')
  req.app.get('io').of('/chat').to(cs.get(req.session.color)).emit('chat', chat);
  req.app.get('io').of('/chat').to(cs.get(req.body.receiver)).emit('chat', chat);
  res.send('ok');
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

exports.kick = (req ,res, next) => {
  const cs = req.app.get('cs')

  const re = {
    message: '강퇴'
  }
  req.app.get('io').of('/chat').to(cs.get(req.body.victim)).emit('kick', re);

  res.send('ok')
}



