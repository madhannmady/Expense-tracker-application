const getSupabase = require('../config/supabase');

// @desc Get all categories for the user (auto-seeds from existing expenses on first call)
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: saved, error } = await getSupabase()
      .from('user_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // First-time use: auto-populate from existing expenses + budget allocations
    if ((saved || []).length === 0) {
      const distinctNames = new Set();

      // From budget_allocations
      const { data: budgetCats } = await getSupabase()
        .from('budget_allocations')
        .select('category')
        .eq('user_id', userId);
      (budgetCats || []).forEach((b) => {
        const c = (b.category || '').trim().toLowerCase();
        if (c && c !== 'other') distinctNames.add(c);
      });

      // From expenses via monthly_records
      const { data: records } = await getSupabase()
        .from('monthly_records')
        .select('id')
        .eq('user_id', userId)
        .limit(50);
      if (records && records.length > 0) {
        const { data: expenses } = await getSupabase()
          .from('expenses')
          .select('category')
          .in('record_id', records.map((r) => r.id));
        (expenses || []).forEach((e) => {
          const c = (e.category || '').trim().toLowerCase();
          if (c && c !== 'other') distinctNames.add(c);
        });
      }

      if (distinctNames.size > 0) {
        const rows = [...distinctNames].map((name) => ({ user_id: userId, name }));
        const { data: seeded } = await getSupabase()
          .from('user_categories')
          .upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: true })
          .select()
          .order('created_at', { ascending: true });
        return res.json(seeded || []);
      }
    }

    res.json(saved || []);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// @desc Create a new category (idempotent — returns existing if duplicate)
const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const normalized = name.trim().toLowerCase();
    if (normalized === 'other') {
      return res.status(400).json({ message: 'Cannot create reserved category "other"' });
    }

    // Try to insert
    const { data, error } = await getSupabase()
      .from('user_categories')
      .insert({ user_id: userId, name: normalized })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already exists — return the existing row
        const { data: existing, error: fetchErr } = await getSupabase()
          .from('user_categories')
          .select('*')
          .eq('user_id', userId)
          .eq('name', normalized)
          .single();
        if (fetchErr) throw fetchErr;
        return res.json(existing);
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// @desc Delete a category by id (also removes related budget allocations)
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    // Get category name before deleting (needed to clean up budget allocations)
    const { data: categoryData, error: fetchErr } = await getSupabase()
      .from('user_categories')
      .select('name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !categoryData) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryName = categoryData.name;

    // Delete the category
    const { error: deleteErr } = await getSupabase()
      .from('user_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (deleteErr) throw deleteErr;

    // Clean up related budget allocations for this category
    await getSupabase()
      .from('budget_allocations')
      .delete()
      .eq('user_id', userId)
      .eq('category', categoryName);

    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

module.exports = { getCategories, createCategory, deleteCategory };
