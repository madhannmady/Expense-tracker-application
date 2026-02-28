import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getNotesById, deleteNotes } from '../services/api';
import { MONTH_NAMES, formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, Loader2, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    getNotesById(id)
      .then((res) => setNote(res.data))
      .catch(() => {
        toast.error('Failed to load notes');
        navigate('/notes');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteNotes(id);
      toast.success('Notes deleted successfully');
      navigate('/notes');
    } catch (error) {
      toast.error('Failed to delete notes');
      console.error(error);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!note) return null;

  const totalLent = (note.note_entries || [])
    .filter((e) => e.type === 'lending' && e.amount)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to notes
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg tracking-tight">
              {MONTH_NAMES[note.month - 1]} {note.year}
            </h1>
            <p className="text-sm text-muted-fg mt-1">
              {note.note_entries?.length || 0} note{(note.note_entries?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/notes/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
          >
            <Edit size={16} /> Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-60"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
          </button>
        </div>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Notes?"
        description="Are you sure you want to delete these notes? This action cannot be undone."
        isLoading={deleting}
      />

      {/* Stats */}
      {totalLent > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-fg mb-1">Total Lent This Month</p>
              <h2 className="text-3xl font-bold text-fg">₹{totalLent.toFixed(2)}</h2>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <IndianRupee size={28} className="text-blue-500" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Notes Sections */}
      {note.note_entries && note.note_entries.length > 0 ? (
        <div className="space-y-4">
          {/* Lending Notes */}
          {note.note_entries.filter((e) => e.type === 'lending').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold text-fg mb-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Lending Tracker
              </h2>
              <div className="space-y-4">
                {note.note_entries
                  .filter((e) => e.type === 'lending')
                  .map((entry, i) => (
                    <div key={i} className="border border-themed rounded-xl p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-fg">{entry.title}</h3>
                          <p className="text-sm text-muted-fg mt-1">
                            Lent to:{' '}
                            <span className="text-fg font-medium">{entry.person_name || 'N/A'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-400">₹{Number(entry.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-fg">Amount</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-fg">{entry.description}</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Personal Notes */}
          {note.note_entries.filter((e) => e.type === 'general').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold text-fg mb-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Personal Notes
              </h2>
              <div className="space-y-4">
                {note.note_entries
                  .filter((e) => e.type === 'general')
                  .map((entry, i) => (
                    <div key={i} className="border border-themed rounded-xl p-4 hover:bg-muted/30 transition-colors">
                      <h3 className="font-semibold text-fg mb-2">{entry.title}</h3>
                      <p className="text-sm text-muted-fg">{entry.description}</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-fg">
          <p>No notes added yet</p>
        </div>
      )}
    </div>
  );
}
