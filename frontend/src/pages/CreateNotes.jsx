import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createNotes, updateNotes, getNotesById } from '../services/api';
import { MONTH_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateNotes() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  // Note entry input
  const [noteInput, setNoteInput] = useState({
    title: '',
    description: '',
    type: 'general',
    personName: '',
    amount: '',
  });
  const [addedNotes, setAddedNotes] = useState([]);

  // Fetch notes data if editing
  useEffect(() => {
    if (isEdit) {
      setFetchLoading(true);
      getNotesById(editId)
        .then((res) => {
          const n = res.data;
          setMonth(n.month);
          setYear(n.year);
          setAddedNotes((n.note_entries || []).map((entry) => ({
            title: entry.title,
            description: entry.description,
            type: entry.type || 'general',
            personName: entry.person_name || '',
            amount: entry.amount ? String(entry.amount) : '',
          })));
        })
        .catch(() => navigate('/notes'))
        .finally(() => setFetchLoading(false));
    }
  }, [editId, isEdit, navigate]);

  const addNote = () => {
    if (!noteInput.title || !noteInput.description) {
      toast.error('Please fill in title and description');
      return;
    }
    if (noteInput.type === 'lending' && (!noteInput.personName || !noteInput.amount)) {
      toast.error('For lending notes, please fill in person name and amount');
      return;
    }
    setAddedNotes([...addedNotes, { ...noteInput }]);
    setNoteInput({
      title: '',
      description: '',
      type: 'general',
      personName: '',
      amount: '',
    });
  };

  const removeNote = (i) => setAddedNotes(addedNotes.filter((_, idx) => idx !== i));

  const handleTypeChange = (type) => {
    setNoteInput({ ...noteInput, type, personName: '', amount: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (addedNotes.length === 0) {
      return toast.error('Please add at least one note');
    }

    setLoading(true);
    try {
      const payload = {
        month,
        year,
        notes: addedNotes.map((n) => ({
          title: n.title,
          description: n.description,
          type: n.type,
          personName: n.type === 'lending' ? n.personName : null,
          amount: n.type === 'lending' && n.amount ? Number(n.amount) : null,
        })),
      };
      if (isEdit) {
        await updateNotes(editId, payload);
        toast.success('Notes updated successfully!');
        navigate(`/notes/${editId}`);
      } else {
        await createNotes(payload);
        toast.success('Notes created successfully!');
        navigate('/notes');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} notes`);
    } finally {
      setLoading(false);
    }
  };

  const years = [];
  for (let y = 2020; y <= 2030; y++) years.push(y);

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate(isEdit ? `/notes/${editId}` : '/notes')}
          className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          {isEdit ? 'Back to notes' : 'Back to notes'}
        </button>
        <h1 className="text-2xl font-bold text-fg tracking-tight">
          {isEdit ? 'Edit Monthly Notes' : 'Create Monthly Notes'}
        </h1>
        <p className="text-sm text-muted-fg mt-1">
          {isEdit
            ? 'Update your lending tracker and personal notes'
            : 'Add lending tracker, personal notes, ideas, or investments for a specific month'}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Period */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <h2 className="text-[15px] font-semibold text-fg mb-5">Period</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-fg">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="input-base w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-fg">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input-base w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Type Selection */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
          <h2 className="text-[15px] font-semibold text-fg mb-5">Note Type</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="general"
                checked={noteInput.type === 'general'}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-muted-fg">Personal Note</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="lending"
                checked={noteInput.type === 'lending'}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-muted-fg">Lending Tracker</span>
            </label>
          </div>
        </motion.div>

        {/* Note Input */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
          <h2 className="text-[15px] font-semibold text-fg mb-5">Add {noteInput.type === 'lending' ? 'Lending' : 'Personal'} Note</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-fg">Title *</label>
              <input
                type="text"
                value={noteInput.title}
                onChange={(e) => setNoteInput({ ...noteInput, title: e.target.value })}
                placeholder="e.g., Money lent to John, Future investment idea"
                className="input-base w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-fg">Description *</label>
              <textarea
                value={noteInput.description}
                onChange={(e) => setNoteInput({ ...noteInput, description: e.target.value })}
                placeholder="Add detailed notes..."
                className="input-base w-full px-4 py-3 rounded-xl text-sm min-h-[100px] resize-none"
              />
            </div>

            {noteInput.type === 'lending' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-fg">Person Name *</label>
                  <input
                    type="text"
                    value={noteInput.personName}
                    onChange={(e) => setNoteInput({ ...noteInput, personName: e.target.value })}
                    placeholder="Name of the person"
                    className="input-base w-full px-4 py-3 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-fg">Amount *</label>
                  <input
                    type="number"
                    value={noteInput.amount}
                    onChange={(e) => setNoteInput({ ...noteInput, amount: e.target.value })}
                    placeholder="Amount lent"
                    step="0.01"
                    min="0"
                    className="input-base w-full px-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={addNote}
              className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Note
            </button>
          </div>
        </motion.div>

        {/* Added Notes */}
        {addedNotes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
            <h2 className="text-[15px] font-semibold text-fg mb-5">Notes ({addedNotes.length})</h2>
            <div className="space-y-3">
              {addedNotes.map((note, i) => (
                <div key={i} className="border border-themed rounded-xl p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium mb-2 ${
                        note.type === 'lending'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {note.type === 'lending' ? 'Lending' : 'Personal'}
                      </span>
                      <h3 className="font-semibold text-fg text-sm">{note.title}</h3>
                      {note.type === 'lending' && note.personName && (
                        <p className="text-xs text-muted-fg mt-1">
                          Lent to: <span className="text-fg font-medium">{note.personName}</span> | Amount:{' '}
                          <span className="text-fg font-medium">₹{Number(note.amount).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNote(i)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-fg line-clamp-2">{note.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={loading}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="btn-primary w-full py-4 rounded-xl text-[15px] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Save size={18} />
              {isEdit ? 'Update Notes' : 'Create Notes'}
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
