const express = require('express');
const {
  createNotes,
  getNotes,
  getNotesById,
  getNotesByMonth,
  updateNotes,
  deleteNotes,
} = require('../controllers/notesController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getNotes).post(protect, createNotes);
router.route('/:id').get(protect, getNotesById).put(protect, updateNotes).delete(protect, deleteNotes);
router.route('/month/:month/:year').get(protect, getNotesByMonth);

module.exports = router;
