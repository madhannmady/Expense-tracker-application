import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptIndianRupee } from 'lucide-react';

const MESSAGES = [
  "Hold tight, we're cooking ...",
  "Warming up the servers 🍳",
  "Almost there, just a sec ...",
  "Crunching your numbers 🔢",
  "Brewing some magic ✨",
  "Good things take a moment ...",
];

function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setDisplayed('');
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (charIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed((prev) => prev + text[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 45);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, text]);

  return (
    <span>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-[1em] bg-primary ml-0.5 align-text-bottom"
      />
    </span>
  );
}

export function ColdStartLoader() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState(0);

  // Cycle through messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Animated progress dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-8"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20"
        >
          <ReceiptIndianRupee size={40} className="text-primary" strokeWidth={1.5} />
        </motion.div>

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Typewriter message */}
      <div className="text-center space-y-3 min-h-20 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg sm:text-xl font-semibold text-fg"
          >
            <TypewriterText text={MESSAGES[msgIndex]} />
          </motion.div>
        </AnimatePresence>

        <p className="text-sm text-muted-fg">
          Free servers need a moment to wake up{'.'.repeat(dots)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-primary/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary/60 rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '40%' }}
        />
      </div>
    </div>
  );
}
