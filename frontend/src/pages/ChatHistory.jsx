import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats, createChat, deleteChat } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BotMessageSquare, Trash2, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function ChatHistory() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getChats()
      .then((res) => setChats(res.data))
      .catch(() => toast.error('Failed to load chat history'))
      .finally(() => setLoading(false));
  }, []);

  const handleNewChat = async () => {
    setCreating(true);
    try {
      const res = await createChat('New Chat');
      navigate(`/ai/${res.data.id}`);
    } catch {
      toast.error('Failed to create chat');
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChat(deleteTarget);
      setChats((prev) => prev.filter((c) => c.id !== deleteTarget));
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <BotMessageSquare size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">AI Assistant</h1>
            <p className="text-sm text-muted-fg mt-0.5">Ask anything about your expenses</p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          disabled={creating}
          className="btn-primary px-5 py-3 rounded-xl text-sm flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto disabled:opacity-60"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
          New Chat
        </button>
      </motion.div>

      {/* Chat List */}
      {chats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6">
            <BotMessageSquare size={36} className="text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-fg mb-2">No conversations yet</h2>
          <p className="text-sm text-muted-fg mb-8 max-w-sm">
            Start a new chat to ask questions about your expenses, get spending insights, or receive financial advice.
          </p>
          <button
            onClick={handleNewChat}
            disabled={creating}
            className="px-6 py-3 rounded-xl text-sm font-medium bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
            Start your first chat
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {chats.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: 0.03 * i }}
                className="card group cursor-pointer hover:ring-1 hover:ring-violet-500/20 transition-all"
                onClick={() => navigate(`/ai/${chat.id}`)}
              >
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare size={18} className="text-violet-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-fg truncate">
                      {chat.title || 'New Chat'}
                    </h3>
                    <p className="text-xs text-muted-fg mt-0.5">
                      {chat.message_count || 0} message{(chat.message_count || 0) !== 1 ? 's' : ''}
                      <span className="mx-1.5">·</span>
                      {formatTime(chat.updated_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(chat.id);
                      }}
                      className="p-2 rounded-lg text-muted-fg hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ArrowRight size={16} className="text-muted-fg group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Chat?"
        description="This will permanently delete this conversation and all its messages."
        isLoading={deleting}
      />
    </div>
  );
}
