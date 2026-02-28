const getSupabase = require('../config/supabase');

// @desc Get all budget allocations
const getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await getSupabase()
      .from('budget_allocations')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ message: 'Failed to fetch budgets' });
  }
};

// @desc Get budget for a specific month/year with actual expense data
const getBudgetByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const userId = req.user.id;

    // Get budget allocations for this month
    const { data: budgets, error: budErr } = await getSupabase()
      .from('budget_allocations')
      .select('*')
      .eq('month', parseInt(month))
      .eq('year', parseInt(year))
      .eq('user_id', userId)
      .order('category');

    if (budErr) throw budErr;

    // Get actual expenses for this month from monthly_records -> expenses
    const { data: records } = await getSupabase()
      .from('monthly_records')
      .select('id')
      .eq('month', parseInt(month))
      .eq('year', parseInt(year))
      .eq('user_id', userId)
      .maybeSingle();

    let actualExpenses = [];
    if (records) {
      const { data: expenses } = await getSupabase()
        .from('expenses')
        .select('name, amount')
        .eq('record_id', records.id);
      actualExpenses = expenses || [];
    }

    // Aggregate actual expenses by name
    const actualMap = {};
    const originalNamesMap = {};
    actualExpenses.forEach((e) => {
      const normalizedName = e.name.trim().toLowerCase();
      actualMap[normalizedName] = (actualMap[normalizedName] || 0) + Number(e.amount);
      if (!originalNamesMap[normalizedName]) {
        originalNamesMap[normalizedName] = e.name.trim(); // Keep a clean cased version
      }
    });

    // Merge budget with actual
    const merged = (budgets || []).map((b) => {
      const normalizedCategory = b.category.trim().toLowerCase();
      return {
        ...b,
        actual_amount: actualMap[normalizedCategory] || 0,
        difference: b.allocated_amount - (actualMap[normalizedCategory] || 0),
      };
    });

    // Add unbudgeted expenses
    Object.entries(actualMap).forEach(([normalizedName, amount]) => {
      const exists = (budgets || []).find((b) => b.category.trim().toLowerCase() === normalizedName);
      if (!exists) {
        merged.push({
          id: null,
          month: parseInt(month),
          year: parseInt(year),
          category: originalNamesMap[normalizedName] || normalizedName,
          allocated_amount: 0,
          actual_amount: amount,
          difference: -amount,
        });
      }
    });

    res.json(merged);
  } catch (error) {
    console.error('Get budget by month error:', error);
    res.status(500).json({ message: 'Failed to fetch budget' });
  }
};

// @desc Create/update budget allocations for a month
const saveBudget = async (req, res) => {
  try {
    const { month, year, allocations } = req.body;
    const userId = req.user.id;

    // Validate
    if (!month || !year || !allocations?.length) {
      return res.status(400).json({ message: 'Month, year, and allocations are required' });
    }

    // Delete existing allocations for this month/year
    await getSupabase()
      .from('budget_allocations')
      .delete()
      .eq('month', month)
      .eq('year', year)
      .eq('user_id', userId);

    // Insert new allocations
    const rows = allocations
      .filter((a) => a.category && a.allocated_amount > 0)
      .map((a) => ({
        user_id: userId,
        month,
        year,
        category: a.category,
        allocated_amount: Number(a.allocated_amount),
      }));

    if (rows.length > 0) {
      const { error } = await getSupabase().from('budget_allocations').insert(rows);
      if (error) throw error;
    }

    res.json({ message: 'Budget saved successfully', count: rows.length });
  } catch (error) {
    console.error('Save budget error:', error);
    res.status(500).json({ message: 'Failed to save budget' });
  }
};

// @desc Delete budget allocation
const deleteBudget = async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('budget_allocations')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ message: 'Failed to delete budget' });
  }
};

// @desc Delete entire budget for a month
const deleteBudgetByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const { error } = await getSupabase()
      .from('budget_allocations')
      .delete()
      .eq('month', parseInt(month))
      .eq('year', parseInt(year))
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ message: 'Monthly budget deleted successfully' });
  } catch (error) {
    console.error('Delete monthly budget error:', error);
    res.status(500).json({ message: 'Failed to delete monthly budget' });
  }
};

// @desc Get budget summary (grouped by month/year)
const getBudgetSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await getSupabase()
      .from('budget_allocations')
      .select('month, year, allocated_amount')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;

    // Group by month/year
    const grouped = {};
    (data || []).forEach((b) => {
      const key = `${b.year}-${b.month}`;
      if (!grouped[key]) {
        grouped[key] = { month: b.month, year: b.year, total_allocated: 0, categories: 0 };
      }
      grouped[key].total_allocated += Number(b.allocated_amount);
      grouped[key].categories += 1;
    });

    // Get actual expenses for each month
    for (const key of Object.keys(grouped)) {
      const g = grouped[key];
      const { data: records } = await getSupabase()
        .from('monthly_records')
        .select('id')
        .eq('month', g.month)
        .eq('year', g.year)
        .eq('user_id', userId)
        .maybeSingle();

      if (records) {
        const { data: expenses } = await getSupabase()
          .from('expenses')
          .select('amount')
          .eq('record_id', records.id);
        g.total_actual = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
      } else {
        g.total_actual = 0;
      }
      g.difference = g.total_allocated - g.total_actual;
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error('Get budget summary error:', error);
    res.status(500).json({ message: 'Failed to fetch budget summary' });
  }
};

module.exports = { getBudgets, getBudgetByMonth, saveBudget, deleteBudget, deleteBudgetByMonth, getBudgetSummary };
