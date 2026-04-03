import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getNotesById, deleteNotes, updateNoteEntryStatus } from '../services/api';
import { MONTH_NAMES } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

const formatNoteDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Status badge shown on the money card banner
function StatusBadge({ status, remainingAmount }) {
  if (!status || status === 'open') return null;
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        Completed
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        ~ ₹{Number(remainingAmount).toLocaleString('en-IN')} left
      </span>
    );
  }
  return null;
}

// Per-card ticket panel (shown when expanded)
function TicketPanel({ entry, isLent, onStatusSaved }) {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [pendingAmount, setPendingAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const isOpen = !entry.status || entry.status === 'open';

  const handleSave = async () => {
    if (!selectedMode) return;
    if (selectedMode === 'partial' && !pendingAmount) {
      toast.error('Please enter the pending amount');
      return;
    }
    setSaving(true);
    try {
      await updateNoteEntryStatus(entry.id, {
        status: selectedMode,
        remaining_amount: selectedMode === 'partial' ? Number(pendingAmount) : null,
      });
      onStatusSaved(entry.id, selectedMode, selectedMode === 'partial' ? Number(pendingAmount) : null);
      setShowOptions(false);
      setSelectedMode(null);
      setPendingAmount('');
      toast.success('Ticket updated');
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    setSaving(true);
    try {
      await updateNoteEntryStatus(entry.id, { status: 'open', remaining_amount: null });
      onStatusSaved(entry.id, 'open', null);
      toast.success('Ticket reopened');
    } catch {
      toast.error('Failed to reopen ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-themed pt-4 mt-4">
      {isOpen ? (
        !showOptions ? (
          <button
            onClick={() => setShowOptions(true)}
            className="text-xs font-medium text-muted-fg hover:text-fg border border-themed rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            Close Ticket
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-fg">Mark this ticket as:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setSelectedMode('completed'); setPendingAmount(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                  selectedMode === 'completed'
                    ? 'bg-green-500/20 text-green-400 border-green-500/40'
                    : 'border-themed text-muted-fg hover:text-fg'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                Completed
              </button>
              <button
                onClick={() => setSelectedMode('partial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  selectedMode === 'partial'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                    : 'border-themed text-muted-fg hover:text-fg'
                }`}
              >
                ~ Partially Completed
              </button>
            </div>

            {selectedMode === 'partial' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-fg">
                  {isLent ? 'Amount left to receive (₹)' : 'Amount left to give (₹)'}
                </label>
                <input
                  type="number"
                  value={pendingAmount}
                  onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="Enter pending amount"
                  min="0"
                  step="0.01"
                  className="input-base w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
            )}

            {selectedMode && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-fg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                  Save
                </button>
                <button
                  onClick={() => { setShowOptions(false); setSelectedMode(null); setPendingAmount(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-themed text-muted-fg hover:text-fg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <button
          onClick={handleReopen}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-fg hover:text-fg border border-themed rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          Reopen Ticket
        </button>
      )}
    </div>
  );
}

export default function NoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('lent_out');
  const [expandedIds, setExpandedIds] = useState(new Set());

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

  const toggleExpanded = (entryId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const handleStatusSaved = (entryId, status, remaining_amount) => {
    setNote((prev) => ({
      ...prev,
      note_entries: prev.note_entries.map((e) =>
        e.id === entryId ? { ...e, status, remaining_amount } : e
      ),
    }));
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

  const isLentTo = (e) => e.type === 'lent_to' || e.type === 'lending';
  const isBorrowedFrom = (e) => e.type === 'borrowed_from';
  const isLendingEntry = (e) => isLentTo(e) || isBorrowedFrom(e);

  const lentToEntries = (note.note_entries || []).filter((e) => isLentTo(e) && e.amount);
  const borrowedFromEntries = (note.note_entries || []).filter((e) => isBorrowedFrom(e) && e.amount);
  const personalEntries = (note.note_entries || []).filter((e) => !isLendingEntry(e));
  const hasLendingEntries = lentToEntries.length > 0 || borrowedFromEntries.length > 0;
  const visibleEntries = activeTab === 'lent_out' ? lentToEntries : borrowedFromEntries;

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
              className="w-full sm:w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer bg-primary-soft text-primary hover:opacity-80 transition-opacity sm:flex-shrink-0"
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

      {/* Lending / Borrowing Section */}
      {hasLendingEntries && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 w-full"
        >
          {/* Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl max-w-sm mx-auto w-full">
            <button
              onClick={() => setActiveTab('lent_out')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'lent_out'
                  ? 'bg-card text-blue-400 shadow-sm'
                  : 'text-muted-fg hover:text-fg'
              }`}
            >
              Lent Out{lentToEntries.length > 0 ? ` (${lentToEntries.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('borrowed')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'borrowed'
                  ? 'bg-card text-amber-400 shadow-sm'
                  : 'text-muted-fg hover:text-fg'
              }`}
            >
              Borrowed{borrowedFromEntries.length > 0 ? ` (${borrowedFromEntries.length})` : ''}
            </button>
          </div>

          {/* Individual entry cards — centered, narrower */}
          <AnimatePresence mode="wait">
            {visibleEntries.length === 0 ? (
              <motion.div
                key={activeTab + '-empty'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 text-muted-fg text-sm"
              >
                No {activeTab === 'lent_out' ? 'lent out' : 'borrowed'} entries this month
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 max-w-sm mx-auto w-full"
              >
                {visibleEntries.map((entry, i) => {
                  const isLent = isLentTo(entry);
                  const expanded = expandedIds.has(entry.id);
                  const borderColor = isLent ? 'border-blue-500/25' : 'border-amber-500/25';
                  const bgGrad = isLent
                    ? 'linear-gradient(135deg, rgba(30,58,138,0.35) 0%, rgba(17,24,39,0.9) 60%)'
                    : 'linear-gradient(135deg, rgba(120,53,15,0.35) 0%, rgba(17,24,39,0.9) 60%)';
                  const iconColor = isLent ? 'text-blue-300' : 'text-amber-300';
                  const amountColor = isLent ? 'text-blue-300' : 'text-amber-300';
                  const labelColor = isLent ? 'text-blue-300/80' : 'text-amber-300/80';
                  const personColor = isLent ? 'text-blue-400/80' : 'text-amber-400/80';

                  return (
                    <motion.div
                      key={entry.id || i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`overflow-hidden rounded-xl border ${borderColor}`}
                    >
                      {/* Money card banner */}
                      <div
                        onClick={() => toggleExpanded(entry.id)}
                        className="relative overflow-hidden p-5 cursor-pointer transition-opacity hover:opacity-90"
                        style={{ background: bgGrad }}
                      >
                        {/* Watermark icon */}
                        <div className={`pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 rotate-[20deg] opacity-[0.16] ${iconColor}`}>
                          {isLent
                            ? <BanknoteArrowUp size={100} strokeWidth={1} />
                            : <BanknoteArrowDown size={100} strokeWidth={1} />
                          }
                        </div>

                        {/* Date — top right */}
                        {entry.created_at && (
                          <p className={`absolute top-3 right-4 text-[10px] font-medium ${labelColor} tabular-nums`}>
                            {formatNoteDate(entry.created_at)}
                          </p>
                        )}

                        {/* Content */}
                        <div className="relative z-10 pr-8 mt-2">
                          <p className={`text-[10px] font-medium uppercase tracking-wider mb-2 ${labelColor}`}>
                            {isLent ? 'Lent Out' : 'Borrowed'}
                          </p>
                          <p className={`text-2xl font-bold tabular-nums leading-none ${amountColor}`}>
                            ₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm font-semibold mt-1.5 ${personColor}`}>
                            {entry.person_name || 'Unknown'}
                          </p>
                          {/* Status badge */}
                          {entry.status && entry.status !== 'open' && (
                            <div className="mt-2">
                              <StatusBadge status={entry.status} remainingAmount={entry.remaining_amount} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded note content */}
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 sm:p-5">
                              <h3 className="font-semibold text-fg mb-2">{entry.title}</h3>
                              <p className="text-sm text-muted-fg whitespace-pre-line">{entry.description}</p>
                              <TicketPanel
                                entry={entry}
                                isLent={isLent}
                                onStatusSaved={handleStatusSaved}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Personal Notes */}
      {personalEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 w-full max-w-sm mx-auto"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-fg mb-4 sm:mb-5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            Personal Notes
          </h2>
          <div className="space-y-4 w-full">
            {personalEntries.map((entry, i) => (
              <div key={i} className="border border-themed rounded-xl p-3 sm:p-4 hover:bg-muted/30 transition-colors w-full">
                <h3 className="font-semibold text-fg mb-2 truncate">{entry.title}</h3>
                <p className="text-sm text-muted-fg whitespace-pre-line">{entry.description}</p>
                {entry.created_at && (
                  <p className="text-xs text-muted-fg/50 mt-3 text-right">
                    {formatNoteDate(entry.created_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {note.note_entries?.length === 0 && (
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
