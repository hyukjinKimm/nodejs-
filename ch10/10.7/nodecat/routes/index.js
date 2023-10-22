const express = require('express');
const { searchByHashtag, getMyPosts, renderMain, getMyFollowings, getMyFollowers } = require('../controllers');

const router = express.Router();


router.get('/search/followings', getMyFollowings);
router.get('/search/followers', getMyFollowers);


router.get('/myposts', getMyPosts);
router.get('/search/:hashtag', searchByHashtag);



router.get('/', renderMain);

module.exports = router;
