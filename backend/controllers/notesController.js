const getSupabase = require('../config/supabase');

// @desc Create monthly notes with entries
const createNotes = async (req, res) => {
  try {
    const { month, year, notes: noteEntries } = req.body;
    const userId = req.user.id;

    // Check duplicate
    const { data: existing } = await getSupabase()
      .from('monthly_notes')
      .select('id')
      .eq('month', month)
      .eq('year', year)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: `Notes for ${month}/${year} already exist.` });
    }

    // Create monthly notes record
    const { data: notesRecord, error: notesErr } = await getSupabase()
      .from('monthly_notes')
      .insert({ month, year, user_id: userId })
      .select()
      .single();

    if (notesErr) throw notesErr;

    // Insert note entries
    if (noteEntries?.length > 0) {
      const noteRows = noteEntries.map((n) => ({
        notes_id: notesRecord.id,
        title: n.title,
        description: n.description,
        type: n.type || 'general',
        person_name: n.personName || null,
        amount: n.amount || null,
      }));
      const { error: noteErr } = await getSupabase()
        .from('note_entries')
        .insert(noteRows);
      if (noteErr) throw noteErr;
    }

    // Return full record
    const full = await fetchFullNotes(notesRecord.id, userId);
    res.status(201).json(full);
  } catch (error) {
    console.error('Create notes error:', error);
    res.status(500).json({ message: 'Failed to create notes', detail: error.message || error });
  }
};

// @desc Get all notes
const getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: notes, error } = await getSupabase()
      .from('monthly_notes')
      .select('*, note_entries(*)')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    res.json(notes || []);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

// @desc Get single notes record
const getNotesById = async (req, res) => {
  try {
    const full = await fetchFullNotes(req.params.id, req.user.id);
    if (!full) return res.status(404).json({ message: 'Notes not found' });
    res.json(full);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

// @desc Get notes for specific month/year
const getNotesByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const userId = req.user.id;

    const { data: notes, error } = await getSupabase()
      .from('monthly_notes')
      .select('*, note_entries(*)')
      .eq('month', parseInt(month))
      .eq('year', parseInt(year))
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!notes) return res.status(404).json({ message: 'Notes not found' });

    res.json(notes);
  } catch (error) {
    console.error('Get notes by month error:', error);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

// @desc Update notes
const updateNotes = async (req, res) => {
  try {
    const { month, year, notes: noteEntries } = req.body;
    const id = req.params.id;
    const userId = req.user.id;

    // Update monthly_notes
    const { error: notesErr } = await getSupabase()
      .from('monthly_notes')
      .update({ month, year })
      .eq('id', id)
      .eq('user_id', userId);

    if (notesErr) throw notesErr;

    // Delete old entries and re-insert
    const { error: delErr } = await getSupabase()
      .from('note_entries')
      .delete()
      .eq('notes_id', id);

    if (delErr) console.error('Delete entries error:', delErr);

    if (noteEntries?.length > 0) {
      const noteRows = noteEntries.map((n) => ({
        notes_id: id,
        title: n.title,
        description: n.description,
        type: n.type || 'general',
        person_name: n.personName || null,
        amount: n.amount || null,
      }));
      const { error: noteErr } = await getSupabase()
        .from('note_entries')
        .insert(noteRows);
      if (noteErr) throw noteErr;
    }

    const full = await fetchFullNotes(id, userId);
    res.json(full);
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ message: 'Failed to update notes', detail: error.message || error });
  }
};

// @desc Delete notes (cascades to entries)
const deleteNotes = async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('monthly_notes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Notes deleted' });
  } catch (error) {
    console.error('Delete notes error:', error);
    res.status(500).json({ message: 'Failed to delete notes' });
  }
};

// Helper function to fetch full notes with entries
const fetchFullNotes = async (notesId, userId) => {
  const { data: notes, error } = await getSupabase()
    .from('monthly_notes')
    .select('*, note_entries(*)')
    .eq('id', notesId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return notes;
};

module.exports = {
  createNotes,
  getNotes,
  getNotesById,
  getNotesByMonth,
  updateNotes,
  deleteNotes,
};
