const Sequelize = require('sequelize');

class Chat extends Sequelize.Model {
  static initiate(sequelize) {
    Chat.init({
      user: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      chat: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      gif: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    }, {
      sequelize,
      modelName: 'Chat',
      tableName: 'chats',
      paranoid: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_general_ci',
      
    });
  }
  
  static associate(db) {
    db.Chat.belongsTo(db.Room, {
      onDelete: 'CASCADE',
    });
  }
}

module.exports = Chat;
