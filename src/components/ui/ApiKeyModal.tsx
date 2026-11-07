import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiHealthStatus } from '../../types';
import {
  saveAndVerifyGeminiKey,
  clearConfiguredGeminiKey,
  fetchApiHealth,
} from '../../services/apiClient';
import { SurfaceCard } from './SurfaceCard';
import { PillButton } from './PillButton';

interface ApiKeyModalProps {
  isOpen: boolean;
  reasonMessage?: string | null;
  healthStatus: ApiHealthStatus | null;
  onClose: () => void;
  onStatusUpdated: (nextStatus: ApiHealthStatus | null) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  reasonMessage,
  healthStatus,
  onClose,
  onStatusUpdated,
}) => {
  const [keyInput, setKeyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setKeyInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setErrorMsg('Please paste your Gemini API key from Google AI Studio.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await saveAndVerifyGeminiKey(trimmed);
    setIsVerifying(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Could not verify Gemini API key.');
      return;
    }

    const updatedHealth = await fetchApiHealth();
    onStatusUpdated(updatedHealth);
    setSuccessMsg('Connected! Saved to Node.js .env.local & ready for live AI.');
    setKeyInput('');
    window.setTimeout(() => {
      onClose();
    }, 750);
  };

  const handleClearKey = async () => {
    setIsVerifying(true);
    await clearConfiguredGeminiKey();
    const updatedHealth = await fetchApiHealth();
    onStatusUpdated(updatedHealth);
    setIsVerifying(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const isConnected = Boolean(healthStatus?.hasApiKey);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-[420px] bg-[#FAF9F6] rounded-t-[28px] sm:rounded-[28px] p-5 apple-shadow-md flex flex-col gap-3.5 z-10 safe-bottom"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[12px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
                <KeyRound className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-[16px] font-extrabold text-[#101E17] leading-tight">
                  Gemini AI Connection
                </h3>
                <span className="text-[11.5px] font-medium text-[#58645D]">
                  Node.js Express · Vision, Audio STT & SLA Coach
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI settings"
              className="w-8 h-8 rounded-full bg-[#EFEFEF] text-[#55625B] hover:text-[#101E17] flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {reasonMessage && !isConnected && (
            <div className="rounded-[14px] bg-amber-50 px-3.5 py-2.5 flex items-start gap-2 text-[12px] font-semibold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{reasonMessage}</span>
            </div>
          )}

          {/* Current Connection Status Card */}
          <SurfaceCard
            tone={isConnected ? 'sage' : 'muted'}
            radius="lg"
            padding="sm"
            className="px-3.5 py-3 flex items-center justify-between gap-2"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#101E17]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-[#148343]' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {isConnected
                    ? `Active (${healthStatus?.maskedKey || 'Configured'})`
                    : 'No Gemini API Key Configured'}
                </span>
              </span>
              <span className="text-[11px] text-[#55625B]">
                {isConnected
                  ? `Models: ${healthStatus?.models.vision || 'gemini-2.5-flash'} · Source: ${healthStatus?.keySource}`
                  : 'Paste a key below or set GEMINI_API_KEY in .env.local'}
              </span>
            </div>

            {isConnected && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={isVerifying}
                className="h-7 px-2.5 rounded-full bg-white text-[#9E2B25] text-[11px] font-bold inline-flex items-center gap-1 apple-shadow-xs cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </SurfaceCard>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gemini-key-input"
                className="text-[12px] font-bold text-[#14201A]"
              >
                {isConnected ? 'Switch Gemini API Key' : 'Paste Gemini API Key'}
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] font-bold text-[#148343] inline-flex items-center gap-1 hover:underline"
              >
                <span>Get key in AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              id="gemini-key-input"
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveKey();
              }}
              placeholder="AIzaSy..."
              autoComplete="off"
              className="w-full h-11 rounded-[14px] bg-white px-3.5 text-[13.5px] font-semibold text-[#101E17] apple-shadow-xs focus:outline-none focus:ring-2 focus:ring-[#148343]/30"
            />
          </div>

          {errorMsg && (
            <div className="rounded-[14px] bg-[#FDECE9] text-[#9E2B25] px-3.5 py-2.5 flex items-start gap-2 text-[12px] font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-[14px] bg-[#EAF6EE] text-[#148343] px-3.5 py-2.5 flex items-center gap-2 text-[12px] font-bold">
              <Check className="w-4 h-4 stroke-[2.8] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <PillButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={isVerifying}
            onClick={handleSaveKey}
            leftIcon={
              isVerifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              )
            }
          >
            {isVerifying ? 'Verifying with Gemini...' : 'Verify & Save API Key'}
          </PillButton>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
