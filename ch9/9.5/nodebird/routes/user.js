const express = require('express');

const { isLoggedIn } = require('../middlewares');
const { follow, unfollow, update } = require('../controllers/user');

const router = express.Router();

// POST /user/:id/follow

router.post('/update', isLoggedIn, update);
router.post('/:id/follow', isLoggedIn, follow);
router.post('/:id/unfollow', isLoggedIn, unfollow);
module.exports = router;
