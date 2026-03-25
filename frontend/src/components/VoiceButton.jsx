import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Loader2, X, CheckCircle, AlertCircle, MessageSquare, Plus, Trash2, Pencil, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

// ── Daily welcome dialog helpers ──
const WELCOME_KEY = 'voice_welcome_date';
const getTodayString = () => new Date().toDateString();
const hasSeenWelcomeToday = () => localStorage.getItem(WELCOME_KEY) === getTodayString();
const markWelcomeSeenToday = () => localStorage.setItem(WELCOME_KEY, getTodayString());

const PAGE_CAPABILITIES = {
  record: [
    { Icon: Plus,        label: 'Add Expense',       example: '"Add food expense 500"' },
    { Icon: Trash2,      label: 'Delete Expense',     example: '"Delete rent expense"' },
    { Icon: Plus,        label: 'Add Income',         example: '"Add salary income 50000"' },
    { Icon: Trash2,      label: 'Delete Income',      example: '"Remove freelance income"' },
    { Icon: Pencil,      label: 'Set Savings Goal',   example: '"Set savings goal to 10000"' },
    { Icon: HelpCircle,  label: 'Ask Questions',      example: '"What is my biggest expense?"' },
  ],
  budget: [
    { Icon: Plus,        label: 'Add Category',       example: '"Add food budget 5000"' },
    { Icon: Pencil,      label: 'Update Category',    example: '"Update transport to 3000"' },
    { Icon: Trash2,      label: 'Delete Category',    example: '"Delete food budget"' },
    { Icon: HelpCircle,  label: 'Ask Questions',      example: '"Am I over budget?"' },
  ],
  notes: [
    { Icon: Plus,        label: 'Add Lending Note',   example: '"Lend Rahul 2000 for books"' },
    { Icon: Plus,        label: 'Add Personal Note',  example: '"Add note: investment idea"' },
    { Icon: Trash2,      label: 'Delete Note',        example: '"Delete lending to Rahul"' },
    { Icon: HelpCircle,  label: 'Ask Questions',      example: '"How much does John owe me?"' },
  ],
  chat: [
    { Icon: MessageSquare, label: 'Voice to Text',   example: '"Speak — your words get sent as a chat message"' },
  ],
};

/**
 * VoiceButton — Floating mic FAB with waveform + result panel
 *
 * Props:
 *   pageType       – 'record' | 'budget' | 'notes' | 'chat'
 *   pageContext    – object with current page data passed to backend
 *   onActionComplete(transcript, actions) – called after actions execute; refresh data here
 *   onTranscript(text) – called for 'chat' mode with transcribed text
 *   hints          – array of example voice commands shown to user
 */
export function VoiceButton({ pageType, pageContext, onActionComplete, onTranscript, hints = [] }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const panelRef = useRef(null);

  // Waveform bars
  const BAR_COUNT = 20;
  const initialBars = useMemo(() => Array(BAR_COUNT).fill(0), []);
  const [bars, setBars] = useState(initialBars);

  const handleActionComplete = (transcript, actions) => {
    setResults(actions || []);
    setPanelOpen(true);

    // For chat mode, send transcript only
    if (pageType === 'chat' && onTranscript) {
      const transcriptAction = actions.find((a) => a.type === 'TRANSCRIBE_ONLY');
      onTranscript(transcript, transcriptAction?.message || transcript);
      return;
    }

    if (onActionComplete) {
      onActionComplete(transcript, actions);
    }
  };

  const { isListening, isProcessing, transcript, error, audioLevel, isSupported, toggle, stopRecording } =
    useVoiceRecorder({
      pageType,
      pageContext,
      onActionComplete: handleActionComplete,
    });

  // Animate waveform bars from audioLevel
  useEffect(() => {
    if (!isListening) {
      setBars(Array(BAR_COUNT).fill(0));
      return;
    }
    const newBars = Array(BAR_COUNT).fill(0).map((_, i) => {
      const center = (BAR_COUNT - 1) / 2;
      const dist = Math.abs(i - center) / center;
      const base = audioLevel * (1 - dist * 0.6);
      return Math.max(0.05, base + (Math.random() * 0.1 * audioLevel));
    });
    setBars(newBars);
  }, [audioLevel, isListening]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const fab = document.getElementById('voice-fab-btn');
        if (fab && fab.contains(e.target)) return;
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isSupported) return null;

  const handleFabClick = () => {
    if (!isListening && !isProcessing) {
      setResults([]);
      setPanelOpen(false);
    }
    if (panelOpen && !isListening && !isProcessing) {
      setPanelOpen(false);
      return;
    }
    if (!isListening && !isProcessing) {
      if (!hasSeenWelcomeToday()) {
        setShowWelcome(true);
        return;
      }
      setPanelOpen(true);
    }
    toggle();
  };

  const handleWelcomeConfirm = () => {
    markWelcomeSeenToday();
    setShowWelcome(false);
    setPanelOpen(true);
    toggle();
  };

  const handleWelcomeCancel = () => {
    setShowWelcome(false);
  };

  const fabColor = isListening
    ? 'bg-red-500 hover:bg-red-600'
    : isProcessing
    ? 'bg-amber-500 hover:bg-amber-600'
    : 'bg-primary hover:bg-primary/90';

  const defaultHints =
    pageType === 'record'
      ? ['Add food expense 500', 'Delete rent expense', 'Add salary income 50000', 'What is my biggest expense?']
      : pageType === 'budget'
      ? ['Add food budget 5000', 'Update transport to 3000', 'Delete food budget', 'Am I over budget?']
      : pageType === 'notes'
      ? ['Add lending to Rahul 2000 for books', 'Add personal note investment idea', 'Delete lending to Rahul']
      : ['Ask a question about my expenses', 'Summarize my spending this month'];

  const activeHints = hints.length > 0 ? hints : defaultHints;

  return (
    <>
      {/* ── First-use-of-day welcome dialog (portalled to body to escape stacking contexts) ── */}
      {createPortal(
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
              onClick={handleWelcomeCancel}
            >
              <motion.div
                initial={{ scale: 0.9, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 16, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Mic size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-fg text-base leading-tight">Voice Assistant</h2>
                    <p className="text-xs text-muted-fg mt-0.5">Here's what I can do on this page</p>
                  </div>
                  <button
                    onClick={handleWelcomeCancel}
                    className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-fg transition-colors shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Capabilities list */}
                <div className="space-y-2 mb-5">
                  {(PAGE_CAPABILITIES[pageType] || PAGE_CAPABILITIES.record).map(({ Icon, label, example }, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40"
                    >
                      <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={13} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-fg">{label}</p>
                        <p className="text-xs text-muted-fg mt-0.5 truncate">e.g. {example}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleWelcomeCancel}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm text-muted-fg border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    Maybe later
                  </button>
                  <button
                    onClick={handleWelcomeConfirm}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
                  >
                    Got it, let's go!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-[92px] md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
        {/* Result / hint panel */}
        <AnimatePresence>
          {(panelOpen || isListening || isProcessing) && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="voice-panel w-72 sm:w-80 rounded-2xl p-4 shadow-2xl"
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-fg uppercase tracking-wider">
                  {isListening ? 'Listening…' : isProcessing ? 'Processing…' : 'Voice Assistant'}
                </span>
                {!isListening && !isProcessing && (
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted/50 text-muted-fg transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Waveform while listening */}
              {isListening && (
                <div className="flex items-end justify-center gap-[3px] h-10 mb-3">
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: `${Math.max(4, h * 40)}px` }}
                      transition={{ duration: 0.08 }}
                      className="w-[4px] rounded-full bg-primary"
                    />
                  ))}
                </div>
              )}

              {/* Processing spinner */}
              {isProcessing && (
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={16} className="animate-spin text-amber-500" />
                  <span className="text-sm text-muted-fg">Analyzing command…</span>
                </div>
              )}

              {/* Transcript */}
              {transcript && !isListening && !isProcessing && (
                <div className="text-sm mb-3">
                  <p className="font-medium text-green-400">{transcript}</p>
                </div>
              )}

              {/* Error */}
              {error && !isListening && !isProcessing && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 mb-3 border border-red-500/20">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action results */}
              {results.length > 0 && !isListening && !isProcessing && (
                <div className="space-y-2 mb-3">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 border ${
                        r.success
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      } ${r.isAnswer ? '!text-fg !bg-muted/30 !border-border/50' : ''}`}
                    >
                      {r.success ? (
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      )}
                      <span className={r.isAnswer ? 'text-fg text-xs leading-relaxed' : ''}>{r.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hints — shown when idle */}
              {!isListening && !isProcessing && results.length === 0 && !error && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-fg mb-2">Try saying:</p>
                  {activeHints.slice(0, 3).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-fg">
                      <MessageSquare size={11} />
                      <span>"{h}"</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          id="voice-fab-btn"
          whileTap={{ scale: 0.9 }}
          onClick={handleFabClick}
          className={`relative w-12 md:w-14 h-12 md:h-14 rounded-full flex items-center justify-center
            transition-all duration-200 cursor-pointer text-white ${fabColor}`}
          title={isListening ? 'Stop recording' : isProcessing ? 'Processing…' : 'Voice command'}
        >
          {/* Pulse rings when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
              <span className="absolute inset-[-6px] rounded-full border border-red-500/30 animate-ping" style={{ animationDelay: '0.2s' }} />
            </>
          )}
          {isProcessing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isListening ? (
            <MicOff size={22} />
          ) : (
            <Mic size={22} />
          )}
        </motion.button>
      </div>
    </>
  );
}
