const express = require('express');
const {
  getBudgets,
  getBudgetByMonth,
  saveBudget,
  deleteBudget,
  deleteBudgetByMonth,
  getBudgetSummary,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, getBudgetSummary);
router.route('/').get(protect, getBudgets).post(protect, saveBudget);
router.get('/:month/:year', protect, getBudgetByMonth);
router.delete('/:id', protect, deleteBudget);
router.delete('/month/:month/:year', protect, deleteBudgetByMonth);

module.exports = router;
