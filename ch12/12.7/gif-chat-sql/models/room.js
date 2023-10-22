const Sequelize = require('sequelize');

class Room extends Sequelize.Model {
  static initiate(sequelize) {
    Room.init({
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      max: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 2,
          max: 10
        }
      },
      owner: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'local',
      },
      password: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },


    }, {
      sequelize,
      modelName: 'Room',
      tableName: 'rooms',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    db.Room.hasMany(db.Chat, {
      onDelete: 'CASCADE',
    });

  }
};

module.exports = Room;
