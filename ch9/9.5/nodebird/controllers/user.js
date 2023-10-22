const User = require('../models/user');
const {sequelize} = require('../models')

exports.update = async (req, res, next) => {
  try {
    const user = await User.update( {nick: req.body.nick}, { where: { id: req.user.id } });
    if (user) { // req.user.id가 followerId, req.params.id가 followingId
      res.redirect('/profile')
     
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.follow = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (user) { // req.user.id가 followerId, req.params.id가 followingId
      await user.addFollowing(parseInt(req.params.id, 10));
      res.send('success');
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};


exports.unfollow = async (req, res, next) => {
  try {
    const user = await sequelize.models.Follow.destroy({ where: { FollowerId: req.user.id, FollowingId: req.params.id } });
    return res.redirect('/')
  } catch (error) {
    console.error(error);
    next(error);
  }
};


