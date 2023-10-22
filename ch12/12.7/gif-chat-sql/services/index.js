const { Room } = require('../models');
const { Chat } = require('../models');

exports.removeRoom = async (roomId) => {
  try {
    await Room.destroy({ where: {id: roomId} });
    await Chat.destroy({ where: { RoomId : roomId}  });
  } catch (error) {
    throw error;
  }
};
