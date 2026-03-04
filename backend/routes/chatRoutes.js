const express = require('express');
const {
  createChat,
  getChats,
  getChatById,
  sendMessage,
  deleteChat,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getChats).post(protect, createChat);
router.route('/:id').get(protect, getChatById).delete(protect, deleteChat);
router.route('/:id/messages').post(protect, sendMessage);

module.exports = router;
