const express = require('express');
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getDashboardStats,
} = require('../controllers/recordController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.route('/').get(protect, getRecords).post(protect, createRecord);
router
  .route('/:id')
  .get(protect, getRecordById)
  .put(protect, updateRecord)
  .delete(protect, deleteRecord);

module.exports = router;
