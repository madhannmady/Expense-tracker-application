import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChatById, sendChatMessage } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, BotMessageSquare, User, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/Skeleton';

// ─── Simple markdown-like renderer for AI responses ───
function FormattedMessage({ content }) {
  // Process markdown: bold, bullet points, headers, code
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-bold text-fg mt-3 mb-1 text-base">{processInline(line.slice(4))}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-fg mt-3 mb-1 text-base">{processInline(line.slice(3))}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="font-bold text-fg mt-3 mb-1 text-lg">{processInline(line.slice(2))}</h2>;
        }

        // Bullet points
        if (line.match(/^\s*[-*•]\s/)) {
          const indent = line.match(/^(\s*)/)[1].length;
          const text = line.replace(/^\s*[-*•]\s/, '');
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: `${Math.min(indent, 4) * 8}px` }}>
              <span className="text-violet-400 mt-0.5 shrink-0">•</span>
              <span>{processInline(text)}</span>
            </div>
          );
        }

        // Numbered lists
        if (line.match(/^\s*\d+[.)]\s/)) {
          const match = line.match(/^\s*(\d+[.)])\s(.*)/);
          if (match) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-violet-400 font-medium shrink-0">{match[1]}</span>
                <span>{processInline(match[2])}</span>
              </div>
            );
          }
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }

        // Regular text
        return <p key={i}>{processInline(line)}</p>;
      })}
    </div>
  );
}

// Process inline markdown (bold, italic, code, currency)
function processInline(text) {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    const matches = [
      boldMatch && { type: 'bold', match: boldMatch },
      codeMatch && { type: 'code', match: codeMatch },
    ].filter(Boolean);

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    // Pick the earliest match
    matches.sort((a, b) => a.match.index - b.match.index);
    const earliest = matches[0];

    // Add text before the match
    if (earliest.match.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliest.match.index)}</span>);
    }

    // Add the formatted text
    if (earliest.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-fg">{earliest.match[1]}</strong>);
    } else if (earliest.type === 'code') {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 text-xs font-mono">
          {earliest.match[1]}
        </code>
      );
    }

    remaining = remaining.slice(earliest.match.index + earliest.match[0].length);
  }

  return parts;
}

// ─── Typing indicator ───
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-4 sm:px-0"
    >
      <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <BotMessageSquare size={16} className="text-violet-400" />
      </div>
      <div className="bg-violet-500/10 border border-violet-500/15 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Suggested prompts for empty chat ───
const SUGGESTED_PROMPTS = [
  "What's my most unnecessary expense I should cut?",
  "How are my savings trending month over month?",
  "Which month did I spend the most and why?",
  "Give me a monthly budget plan based on my habits",
  "Who do I have pending lending with?",
  "Compare my income vs expenses this year",
];

export default function ChatDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getChatById(id)
      .then((res) => {
        setChat(res.data);
        setMessages(res.data.messages || []);
      })
      .catch(() => {
        toast.error('Failed to load chat');
        navigate('/ai');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput('');
    setSending(true);

    // Optimistically add user message
    const tempUserMsg = { role: 'user', content: msg, id: 'temp-user-' + Date.now() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(id, msg);

      // Replace temp message and add AI response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          { role: 'user', content: res.data.userMessage.content },
          { role: 'assistant', content: res.data.aiMessage.content },
        ];
      });

      // Update chat title if it was auto-generated
      if (chat?.title === 'New Chat') {
        getChatById(id).then((res) => setChat(res.data));
      }
    } catch (err) {
      toast.error('Failed to get AI response. Try again.');
      // Remove the temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100dvh-160px)] lg:h-[calc(100dvh-85px)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 pb-4 border-b border-themed mb-4"
      >
        <button
          onClick={() => navigate('/ai')}
          className="flex items-center gap-2 text-sm mb-3 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to chats
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <BotMessageSquare size={18} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-fg truncate">
              {chat?.title || 'New Chat'}
            </h1>
            <p className="text-xs text-muted-fg">Expense AI Assistant</p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 scrollbar-thin px-1 sm:px-2">
        {messages.length === 0 && !sending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
              <Sparkles size={28} className="text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-fg mb-1.5">How can I help you?</h2>
            <p className="text-sm text-muted-fg mb-8 max-w-md">
              I have full access to your expense data. Ask me about spending patterns, savings advice, budget analysis, or anything financial.
            </p>

            {/* Suggested prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => handleSend(prompt)}
                  className="text-left p-3 rounded-xl text-xs sm:text-sm text-muted-fg bg-violet-500/5 border border-violet-500/10 hover:bg-violet-500/10 hover:text-fg transition-colors cursor-pointer"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-primary-soft'
                    : 'bg-violet-500/15'
                }`}
              >
                {msg.role === 'user' ? (
                  <User size={15} className="text-primary" />
                ) : (
                  <BotMessageSquare size={15} className="text-violet-400" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'max-w-[85%] sm:max-w-[70%] bg-primary text-primary-fg rounded-tr-md'
                    : 'max-w-[90%] sm:max-w-[85%] bg-violet-500/10 border border-violet-500/15 text-fg rounded-tl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <FormattedMessage content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 pt-3 border-t border-themed pb-1"
      >
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your expenses..."
              rows={1}
              className="input-base w-full px-4 py-3 rounded-xl text-sm resize-none max-h-32 scrollbar-thin"
              style={{ minHeight: '46px' }}
              disabled={sending}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-fg text-center mt-1.5">
          AI analyzes your actual expense data to provide personalized insights
        </p>
      </motion.div>
    </div>
  );
}
