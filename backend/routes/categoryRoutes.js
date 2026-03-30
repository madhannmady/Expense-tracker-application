const express = require('express');
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getCategories);
router.post('/', protect, createCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;
