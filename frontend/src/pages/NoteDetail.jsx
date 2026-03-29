import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getNotesById, deleteNotes } from '../services/api';
import { MONTH_NAMES, formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { VoiceButton } from '../components/VoiceButton';

const BanknoteArrowUp = ({ size = 24, className = '', strokeWidth = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="8" width="16" height="10" rx="2" />
    <circle cx="10" cy="13" r="2" />
    <path d="M6 13h.01M14 13h.01" />
    <path d="M20 8V3" />
    <path d="M18 5l2-2 2 2" />
  </svg>
);

const BanknoteArrowDown = ({ size = 24, className = '', strokeWidth = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="6" width="16" height="10" rx="2" />
    <circle cx="10" cy="11" r="2" />
    <path d="M6 11h.01M14 11h.01" />
    <path d="M20 16v5" />
    <path d="M18 19l2 2 2-2" />
  </svg>
);

export default function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchNote = useCallback(() => {
    getNotesById(id)
      .then((res) => setNote(res.data))
      .catch(() => {
        toast.error('Failed to load notes');
        navigate('/notes');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  const handleVoiceAction = useCallback((transcript, actions) => {
    const hasCRUD = (actions || []).some(
      (a) => a.success && !['ASK_QUESTION', 'UNKNOWN'].includes(a.type)
    );
    if (hasCRUD) {
      fetchNote();
      toast.success('Notes updated via voice');
    }
  }, [fetchNote]);

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
      <div className="w-full max-w-3xl space-y-6">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!note) return null;

  // Backward compat: old 'lending' type is treated as 'lent_to'
  const isLentTo = (e) => e.type === 'lent_to' || e.type === 'lending';
  const isBorrowedFrom = (e) => e.type === 'borrowed_from';
  const isLendingEntry = (e) => isLentTo(e) || isBorrowedFrom(e);

  const lentToEntries = (note.note_entries || []).filter((e) => isLentTo(e) && e.amount);
  const borrowedFromEntries = (note.note_entries || []).filter((e) => isBorrowedFrom(e) && e.amount);
  const totalLent = lentToEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBorrowed = borrowedFromEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to notes
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight truncate">
              {MONTH_NAMES[note.month - 1]} {note.year}
            </h1>
            <p className="text-sm text-muted-fg mt-1">
              {note.note_entries?.length || 0} note{(note.note_entries?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/notes/${id}/edit`)}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer bg-primary-soft text-primary hover:opacity-80 transition-opacity flex-shrink-0"
            title="Edit notes"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-60 whitespace-nowrap"
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

      {/* Lending Summary Banners */}
      {(lentToEntries.length > 0 || borrowedFromEntries.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">

          {/* Lent To — blue */}
          {lentToEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-xl border border-blue-500/25 p-5"
              style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.35) 0%, rgba(17,24,39,0.9) 60%)' }}
            >
              {/* Large icon — right side, rotated */}
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-[20deg] opacity-[0.16] text-blue-300">
                <BanknoteArrowUp size={140} strokeWidth={1} />
              </div>

              {/* Content */}
              <div className="relative z-10 max-w-[62%]">
                <p className="text-xs font-medium text-blue-300/80 uppercase tracking-wider mb-3">Lent Out</p>
                <p className="text-2xl font-bold text-blue-300 tabular-nums leading-none">
                  ₹{totalLent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-400/60 mt-1.5">
                  {lentToEntries.length} {lentToEntries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Borrowed From — amber */}
          {borrowedFromEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative overflow-hidden rounded-xl border border-amber-500/25 p-5"
              style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.35) 0%, rgba(17,24,39,0.9) 60%)' }}
            >
              {/* Large icon — right side, rotated */}
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-[20deg] opacity-[0.16] text-amber-300">
                <BanknoteArrowDown size={140} strokeWidth={1} />
              </div>

              {/* Content */}
              <div className="relative z-10 max-w-[62%]">
                <p className="text-xs font-medium text-amber-300/80 uppercase tracking-wider mb-3">Borrowed</p>
                <p className="text-2xl font-bold text-amber-300 tabular-nums leading-none">
                  ₹{totalBorrowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-amber-400/60 mt-1.5">
                  {borrowedFromEntries.length} {borrowedFromEntries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </motion.div>
          )}

        </div>
      )}
      {note.note_entries && note.note_entries.length > 0 ? (
        <div className="space-y-4 w-full">
          {/* Lent To */}
          {lentToEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-4 sm:p-6 w-full"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4 sm:mb-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Lent To
              </h2>
              <div className="space-y-4 w-full">
                {lentToEntries.map((entry, i) => (
                  <div key={i} className="border border-blue-500/20 rounded-xl p-3 sm:p-4 hover:bg-blue-500/5 transition-colors w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-fg truncate">{entry.title}</h3>
                        <p className="text-sm text-muted-fg mt-1 truncate">
                          Lent to:{' '}
                          <span className="text-fg font-medium">{entry.person_name || 'N/A'}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg sm:text-xl font-bold text-blue-400 tabular-nums">
                          ₹{Number(entry.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-fg">Amount</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-fg whitespace-pre-line">{entry.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Borrowed From */}
          {borrowedFromEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card p-4 sm:p-6 w-full"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4 sm:mb-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                Borrowed From
              </h2>
              <div className="space-y-4 w-full">
                {borrowedFromEntries.map((entry, i) => (
                  <div key={i} className="border border-amber-500/20 rounded-xl p-3 sm:p-4 hover:bg-amber-500/5 transition-colors w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-fg truncate">{entry.title}</h3>
                        <p className="text-sm text-muted-fg mt-1 truncate">
                          Borrowed from:{' '}
                          <span className="text-fg font-medium">{entry.person_name || 'N/A'}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
                          ₹{Number(entry.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-fg">Amount</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-fg whitespace-pre-line">{entry.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Personal Notes */}
          {note.note_entries.filter((e) => !isLendingEntry(e)).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4 sm:p-6 w-full"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4 sm:mb-5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Personal Notes
              </h2>
              <div className="space-y-4 w-full">
                {note.note_entries
                  .filter((e) => !isLendingEntry(e))
                  .map((entry, i) => (
                    <div key={i} className="border border-themed rounded-xl p-3 sm:p-4 hover:bg-muted/30 transition-colors w-full">
                      <h3 className="font-semibold text-fg mb-2 truncate">{entry.title}</h3>
                      <p className="text-sm text-muted-fg whitespace-pre-line">{entry.description}</p>
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

      {/* Voice Assistant FAB */}
      <VoiceButton
        pageType="notes"
        pageContext={{
          noteId: id || note?.id,
          month: note.month,
          year: note.year,
          month_name: MONTH_NAMES[note.month - 1],
          note_entries: note.note_entries || [],
        }}
        onActionComplete={handleVoiceAction}
      />
    </div>
  );
}
