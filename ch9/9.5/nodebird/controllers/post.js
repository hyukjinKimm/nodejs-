const { User, Post, Hashtag } = require('../models');
const {sequelize} = require('../models')

exports.delet = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });

    if (user) { // req.user.id가 followerId, req.params.id가 followingId
      const post = await Post.findOne({ where: { id: req.params.postId } });
      if (post) { // like 한 post 가 없음
        if (req.user.id == post.UserId){
          await post.destroy({where:{id:parseInt(req.params.postId, 10)}});
          res.send('delete success');
        }
        else{
          res.send('너 게시물이 아니잖아');
        }

      } else {
        res.status(404).send('no post');
      }
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};
exports.like = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });

    if (user) { // req.user.id가 followerId, req.params.id가 followingId
      const post = await Post.findOne({ where: { id: req.params.postId } });
      if (post) { // like 한 post 가 없음
        console.log(req.params.postId)
        await user.addLikings(parseInt(req.params.postId, 10));

        res.send('Like success');
      } else {
        res.status(404).send('no post');
      }
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.unlike = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });

    if (user) { // req.user.id가 followerId, req.params.id가 followingId
      const post = await Post.findOne({ where: { id: req.params.postId } });
      if (post) { // like 한 post 가 없음
        const user = await sequelize.models.Like.destroy({ where: { UserId: req.user.id, PostId: req.params.postId } });
        res.send('unLike success');
      } else {
        res.status(404).send('no post');
      }
    } else {
      res.status(404).send('no user');
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};




exports.afterUploadImage = (req, res) => {
  console.log(req.file);
  res.json({ url: `/img/${req.file.filename}` });
};

exports.uploadPost = async (req, res, next) => {
  try {
    const post = await Post.create({
      content: req.body.content,
      img: req.body.url,
      UserId: req.user.id,
    });
    const hashtags = req.body.content.match(/#[^\s#]*/g);
    if (hashtags) {
      const result = await Promise.all(
        hashtags.map(tag => {
          return Hashtag.findOrCreate({
            where: { title: tag.slice(1).toLowerCase() },
          })
        }),
      );
      await post.addHashtags(result.map(r => r[0]));
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    next(error);
  }
};