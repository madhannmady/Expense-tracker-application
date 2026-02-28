const getSupabase = require('../config/supabase');

// @desc Create monthly record with incomes and expenses
const createRecord = async (req, res) => {
  try {
    const { month, year, incomes, expenses, savingsGoal, notes } = req.body;
    const userId = req.user.id;

    // Check duplicate
    const { data: existing } = await getSupabase()
      .from('monthly_records')
      .select('id')
      .eq('month', month)
      .eq('year', year)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: `Record for ${month}/${year} already exists.` });
    }

    // Create monthly record
    const { data: record, error: recErr } = await getSupabase()
      .from('monthly_records')
      .insert({ month, year, savings_goal: savingsGoal || 0, notes: notes || '', user_id: userId })
      .select()
      .single();

    if (recErr) throw recErr;

    // Insert incomes
    if (incomes?.length > 0) {
      const incomeRows = incomes.map((i) => ({
        record_id: record.id,
        source: i.source,
        amount: i.amount,
      }));
      const { error: incErr } = await getSupabase().from('incomes').insert(incomeRows);
      if (incErr) throw incErr;
    }

    // Insert expenses
    if (expenses?.length > 0) {
      const expenseRows = expenses.map((e) => ({
        record_id: record.id,
        name: e.name,
        amount: e.amount,
      }));
      const { error: expErr } = await getSupabase().from('expenses').insert(expenseRows);
      if (expErr) throw expErr;
    }

    // Return full record
    const full = await fetchFullRecord(record.id, userId);
    res.status(201).json(full);
  } catch (error) {
    console.error('Create record error:', error);
    res.status(500).json({ message: 'Failed to create record' });
  }
};

// @desc Get all records
const getRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: records, error } = await getSupabase()
      .from('monthly_records')
      .select('*, incomes(*), expenses(*)')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    res.json(records || []);
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ message: 'Failed to fetch records' });
  }
};

// @desc Get single record
const getRecordById = async (req, res) => {
  try {
    const full = await fetchFullRecord(req.params.id, req.user.id);
    if (!full) return res.status(404).json({ message: 'Record not found' });
    res.json(full);
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({ message: 'Failed to fetch record' });
  }
};

// @desc Update record
const updateRecord = async (req, res) => {
  try {
    const { month, year, incomes, expenses, savingsGoal, notes } = req.body;
    const id = req.params.id;
    const userId = req.user.id;

    // Update monthly_record (only columns that exist in the table)
    const { error: recErr } = await getSupabase()
      .from('monthly_records')
      .update({ month, year, savings_goal: savingsGoal || 0, notes: notes || '' })
      .eq('id', id)
      .eq('user_id', userId);
    if (recErr) {
      console.error('Update monthly_record error:', recErr);
      throw recErr;
    }

    // Delete old incomes/expenses and re-insert
    const { error: delIncErr } = await getSupabase().from('incomes').delete().eq('record_id', id);
    if (delIncErr) console.error('Delete incomes error:', delIncErr);

    const { error: delExpErr } = await getSupabase().from('expenses').delete().eq('record_id', id);
    if (delExpErr) console.error('Delete expenses error:', delExpErr);

    if (incomes?.length > 0) {
      const incomeRows = incomes.map((i) => ({ record_id: id, source: i.source, amount: i.amount }));
      const { error: incErr } = await getSupabase().from('incomes').insert(incomeRows);
      if (incErr) {
        console.error('Insert incomes error:', incErr);
        throw incErr;
      }
    }
    if (expenses?.length > 0) {
      const expenseRows = expenses.map((e) => ({ record_id: id, name: e.name, amount: e.amount }));
      const { error: expErr } = await getSupabase().from('expenses').insert(expenseRows);
      if (expErr) {
        console.error('Insert expenses error:', expErr);
        throw expErr;
      }
    }

    const full = await fetchFullRecord(id, userId);
    res.json(full);
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ message: 'Failed to update record', detail: error.message || error });
  }
};

// @desc Delete record (cascades to incomes/expenses)
const deleteRecord = async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('monthly_records')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ message: 'Failed to delete record' });
  }
};

// @desc Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: records, error } = await getSupabase()
      .from('monthly_records')
      .select('*, incomes(*), expenses(*)')
      .eq('user_id', userId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) throw error;

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};
    const monthlyTrend = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    (records || []).forEach((rec) => {
      const recIncome = (rec.incomes || []).reduce((s, i) => s + Number(i.amount), 0);
      const recExpense = (rec.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
      totalIncome += recIncome;
      totalExpense += recExpense;

      (rec.expenses || []).forEach((exp) => {
        categoryMap[exp.name] = (categoryMap[exp.name] || 0) + Number(exp.amount);
      });

      monthlyTrend.push({
        label: `${monthNames[rec.month - 1]} ${rec.year}`,
        month: rec.month,
        year: rec.year,
        income: recIncome,
        expense: recExpense,
        savings: recIncome - recExpense,
      });
    });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const allExpenses = [];
    (records || []).forEach((rec) => {
      (rec.expenses || []).forEach((exp) => {
        allExpenses.push({
          ...exp,
          month: rec.month,
          year: rec.year,
          recordId: rec.id,
        });
      });
    });
    const recentExpenses = allExpenses.slice(-10).reverse();

    const totalSavings = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;

    res.json({
      totalIncome,
      totalExpense,
      totalSavings,
      savingRate: Number(savingRate),
      categoryBreakdown,
      monthlyTrend,
      recentExpenses,
      totalRecords: (records || []).length,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

// Helper: fetch full record with relations
async function fetchFullRecord(id, userId) {
  const { data, error } = await getSupabase()
    .from('monthly_records')
    .select('*, incomes(*), expenses(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

module.exports = { createRecord, getRecords, getRecordById, updateRecord, deleteRecord, getDashboardStats };
