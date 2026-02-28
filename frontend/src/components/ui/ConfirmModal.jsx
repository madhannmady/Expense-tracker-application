import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md overflow-hidden bg-card border border-themed rounded-xl shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 mt-1">
                    <h2 className="text-lg font-semibold text-fg">{title}</h2>
                    <p className="mt-2 text-sm text-muted-fg">{description}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-muted/40 border-t border-themed flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary-soft hover:opacity-80 rounded-xl transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onConfirm}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive bg-destructive-soft hover:opacity-80 rounded-xl transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
