import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RefreshCw,
  ArrowRight,
  Keyboard,
  AlertCircle,
  Timer,
  Check,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blobToBase64, playPronunciation } from '../utils/audioUtils';
import { apiFetch } from '../services/apiClient';
import { InputMode, VoiceInputState } from '../types';

export interface VoiceDraft {
  text: string;
  source: InputMode;
  durationSeconds: number;
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceInputProps {
  onSubmit: (text: string, source: InputMode, durationSeconds: number) => void;
  sceneContext?: string;
  hintVocabulary?: string[];
  placeholder?: string;
  isSubmitting?: boolean;
  targetDurationLabel?: string;
  maxDurationSeconds?: number;
  size?: 'compact' | 'medium' | 'hero';
  idleLabel?: string;
  hideInlineActions?: boolean;
  hideUtilityPills?: boolean;
  onDraftChange?: (draft: VoiceDraft | null) => void;
  resetSignal?: number;
  typingSignal?: number;
  typingPrefill?: string;
}

const COMPACT_BARS = [5, 11, 7, 17, 10, 22, 12, 18, 8, 13, 5];
const MEDIUM_BARS = [6, 13, 22, 12, 26, 16, 20, 11, 6];
const HERO_BARS = [7, 15, 25, 13, 30, 18, 22, 12, 7];

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onSubmit,
  sceneContext = '',
  hintVocabulary = [],
  placeholder = 'Speak your thought in English...',
  isSubmitting = false,
  targetDurationLabel,
  size = 'compact',
  idleLabel,
  hideInlineActions = false,
  hideUtilityPills = false,
  onDraftChange,
  resetSignal = 0,
  typingSignal = 0,
  typingPrefill = '',
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('microphone');
  const [voiceState, setVoiceState] = useState<VoiceInputState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [livePreviewText, setLivePreviewText] = useState<string>('');
  const [typedText, setTypedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const browserSttRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const browserTranscriptRef = useRef<string>('');
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeAttemptIdRef = useRef<number>(0);

  const isHero = size === 'hero';
  const isMedium = size === 'medium';
  const baseBars = isHero ? HERO_BARS : isMedium ? MEDIUM_BARS : COMPACT_BARS;

  useEffect(() => {
    if (voiceState !== 'TRANSCRIPT_REVIEW' || !transcriptTextareaRef.current) {
      return;
    }
    const el = transcriptTextareaRef.current;
    const syncHeight = () => {
      el.style.height = 'auto';
      el.style.height = `${Math.max(44, el.scrollHeight)}px`;
    };
    let lastWidth = el.clientWidth;
    syncHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (el.clientWidth !== lastWidth) {
          lastWidth = el.clientWidth;
          syncHeight();
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [voiceState, transcript]);

  useEffect(() => {
    if (isSubmitting) {
      setVoiceState('EVALUATING');
    } else if (voiceState === 'EVALUATING') {
      setVoiceState(transcript ? 'TRANSCRIPT_REVIEW' : 'IDLE');
    }
  }, [isSubmitting]);

  useEffect(() => {
    if (resetSignal > 0) {
      handleRetry();
    }
  }, [resetSignal]);

  useEffect(() => {
    if (typingSignal > 0) {
      switchToTyping(typingPrefill);
    }
  }, [typingSignal, typingPrefill]);

  // Recording elapsed timer
  useEffect(() => {
    if (voiceState === 'RECORDING' && !isPaused) {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [voiceState, isPaused]);

  // Sync draft upstream
  useEffect(() => {
    if (!onDraftChange) return;
    const activeText =
      inputMode === 'typing'
        ? typedText.trim()
        : (transcript || livePreviewText).trim();
    if (activeText) {
      onDraftChange({
        text: activeText,
        source: inputMode,
        durationSeconds:
          elapsedSeconds ||
          Math.max(3, Math.round(activeText.split(/\s+/).length / 2.2)),
      });
    } else {
      onDraftChange(null);
    }
  }, [transcript, livePreviewText, typedText, inputMode, elapsedSeconds]);

  const stopAudioAnalyser = () => {
    if (analyserRafRef.current) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        // Ignore close error
      }
      audioCtxRef.current = null;
    }
    setLiveLevels([]);
  };

  const startAudioAnalyser = (stream: MediaStream, barCount: number) => {
    stopAudioAnalyser();
    if (typeof window === 'undefined') return;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const updateLevels = () => {
        analyser.getByteFrequencyData(freqData);
        const nextLevels: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const binIdx = Math.min(
            freqData.length - 1,
            Math.floor(((i + 1) / (barCount + 1)) * Math.min(18, freqData.length))
          );
          const norm = freqData[binIdx] / 255;
          nextLevels.push(0.45 + norm * 1.45);
        }
        setLiveLevels(nextLevels);
        analyserRafRef.current = requestAnimationFrame(updateLevels);
      };

      analyserRafRef.current = requestAnimationFrame(updateLevels);
    } catch {
      // Fallback gracefully if AudioContext is restricted
    }
  };

  useEffect(() => {
    return () => {
      stopAudioAnalyser();
      if (browserSttRef.current) {
        try {
          browserSttRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  const startBrowserSpeechBackup = () => {
    browserTranscriptRef.current = '';
    setLivePreviewText('');
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += `${event.results[i][0]?.transcript || ''} `;
        }
        const cleaned = combined.trim();
        browserTranscriptRef.current = cleaned;
        setLivePreviewText(cleaned);
      };
      recognition.onerror = () => {};
      recognition.start();
      browserSttRef.current = recognition;
    } catch {
      browserSttRef.current = null;
    }
  };

  const stopBrowserSpeechBackup = () => {
    if (browserSttRef.current) {
      try {
        browserSttRef.current.stop();
      } catch {
        // Ignore
      }
      browserSttRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);
    setLivePreviewText('');
    audioChunksRef.current = [];
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    const currentAttemptId = Date.now();
    activeAttemptIdRef.current = currentAttemptId;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startAudioAnalyser(stream, baseBars.length);
      startBrowserSpeechBackup();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
              ? 'audio/ogg;codecs=opus'
              : '';

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopAudioAnalyser();
        stopBrowserSpeechBackup();
        if (activeAttemptIdRef.current !== currentAttemptId) return;

        if (audioChunksRef.current.length === 0) {
          setVoiceState('IDLE');
          return;
        }

        const effectiveMime =
          mimeType || recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, {
          type: effectiveMime,
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);

        setVoiceState('PROCESSING');
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const response = await apiFetch('/api/transcribe-audio', {
            method: 'POST',
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: effectiveMime,
              sceneContext,
              hintVocabulary,
            }),
          });

          let recognizedText = '';
          let apiErrorMsg = '';
          if (response.ok) {
            const data = await response.json();
            recognizedText = data.transcript?.trim() || '';
          } else {
            try {
              const errData = await response.json();
              apiErrorMsg = errData?.message || '';
            } catch {
              // Ignore parse error
            }
          }

          if (!recognizedText && browserTranscriptRef.current) {
            recognizedText = browserTranscriptRef.current;
          }

          if (activeAttemptIdRef.current !== currentAttemptId) return;

          if (recognizedText) {
            setTranscript(recognizedText);
            setLivePreviewText('');
            setVoiceState('TRANSCRIPT_REVIEW');
          } else {
            setErrorMessage(
              apiErrorMsg ||
                "Couldn't hear clear English speech. Speak closer to the mic or tap Type instead."
            );
            setVoiceState('ERROR');
          }
        } catch {
          if (activeAttemptIdRef.current !== currentAttemptId) return;
          if (browserTranscriptRef.current) {
            setTranscript(browserTranscriptRef.current);
            setLivePreviewText('');
            setVoiceState('TRANSCRIPT_REVIEW');
          } else {
            setErrorMessage(
              "Couldn't transcribe audio right now. Try again or type below."
            );
            setVoiceState('ERROR');
          }
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      };

      recorder.start(250);
      setElapsedSeconds(0);
      setIsPaused(false);
      setVoiceState('RECORDING');
    } catch (err: unknown) {
      stopAudioAnalyser();
      stopBrowserSpeechBackup();
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission was blocked. Allow mic access in your browser bar, or tap Type instead.'
          : 'No microphone detected on this device. Tap Type instead to enter your English sentence.';
      setErrorMessage(msg);
      setVoiceState('ERROR');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && voiceState === 'RECORDING' && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setVoiceState('PAUSED');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setVoiceState('RECORDING');
    }
  };

  const finishRecording = () => {
    if (
      mediaRecorderRef.current &&
      (voiceState === 'RECORDING' || voiceState === 'PAUSED')
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayPreview = async () => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(true);

    if (recordedAudioUrl) {
      try {
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
        }
        const audio = new Audio(recordedAudioUrl);
        previewAudioRef.current = audio;
        audio.onended = () => setIsPlayingPreview(false);
        audio.onerror = () => setIsPlayingPreview(false);
        await audio.play();
        return;
      } catch {
        // Fallback to SpeechSynthesis
      }
    }

    await playPronunciation(transcript);
    window.setTimeout(() => setIsPlayingPreview(false), 1800);
  };

  const handleRetry = () => {
    activeAttemptIdRef.current = Date.now();
    stopAudioAnalyser();
    stopBrowserSpeechBackup();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setErrorMessage(null);
    setTranscript('');
    setLivePreviewText('');
    setTypedText('');
    setElapsedSeconds(0);
    setIsPaused(false);
    setVoiceState('IDLE');
  };

  const switchToTyping = (prefillText?: string | React.MouseEvent) => {
    handleRetry();
    setErrorMessage(null);
    if (typeof prefillText === 'string' && prefillText.trim()) {
      setTypedText(`${prefillText.trim()} `);
    }
    setInputMode('typing');
  };

  const switchToMic = () => {
    setErrorMessage(null);
    setInputMode('microphone');
    setVoiceState('IDLE');
  };

  const handleSubmit = () => {
    const textToSubmit =
      inputMode === 'typing' ? typedText.trim() : transcript.trim();
    if (!textToSubmit) return;

    const spokenDuration =
      elapsedSeconds ||
      Math.max(3, Math.round(textToSubmit.split(/\s+/).length / 2.2));

    setVoiceState('EVALUATING');
    onSubmit(textToSubmit, inputMode, spokenDuration);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const defaultIdleText =
    idleLabel || (isHero ? 'Tap to start speaking' : 'Tap to speak');

  const renderWaveformWing = (reverse = false) => {
    const bars = reverse ? [...baseBars].reverse() : baseBars;
    const levels = reverse ? [...liveLevels].reverse() : liveLevels;
    return (
      <div
        className={`flex items-center ${
          isHero ? 'gap-[5px]' : isMedium ? 'gap-[4.5px]' : 'gap-[3.5px]'
        } select-none`}
        aria-hidden="true"
      >
        {bars.map((h, i) => {
          const isLive = voiceState === 'RECORDING' && !isPaused;
          const liveFactor = isLive ? levels[i] || 0.7 : 1;
          return (
            <span
              key={i}
              className={`rounded-full transition-all duration-100 ${
                isHero || isMedium ? 'w-[3.5px]' : 'w-[3px]'
              } ${
                isLive
                  ? 'bg-[#158445]'
                  : isHero || isMedium
                    ? 'bg-[#94E0B4]'
                    : 'bg-[#7ED4A0]'
              }`}
              style={{
                height: `${Math.max(5, Math.round(h * liveFactor))}px`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Error Banner */}
      <AnimatePresence>
        {voiceState === 'ERROR' && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full mb-3 bg-[#FDECE9] text-[#9E2B25] text-xs p-3.5 rounded-[18px] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="font-medium leading-relaxed">
                {errorMessage}
              </span>
              <div className="flex items-center gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="font-bold underline text-xs cursor-pointer"
                >
                  Try again
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => switchToTyping(typingPrefill)}
                  className="font-bold underline text-xs cursor-pointer"
                >
                  Type instead
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRANSCRIPT REVIEW STATE (Real Recorded Playback + Editable Transcript) */}
      {voiceState === 'TRANSCRIPT_REVIEW' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className={`w-full rounded-[18px] flex flex-col gap-2 ${
            hideInlineActions
              ? 'bg-white apple-shadow-xs p-3'
              : 'bg-white apple-shadow-sm p-3.5'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold text-[#148343] flex items-center gap-1 whitespace-nowrap shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[2.6] shrink-0" />
              <span>Your Spoken Transcript</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePlayPreview}
                className="px-2.5 py-0.5 rounded-full bg-[#EAF6EE] hover:bg-[#DEF0E4] text-[#148343] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer tabular-nums whitespace-nowrap"
              >
                <Volume2
                  className={`w-3 h-3 shrink-0 ${
                    isPlayingPreview ? 'scale-110' : ''
                  }`}
                />
                <span>
                  {isPlayingPreview
                    ? 'Playing...'
                    : `Hear my voice · ${Math.max(1, elapsedSeconds || 2)}s`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRetry}
                className="text-[11px] font-semibold text-[#647069] hover:text-[#14201A] flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>Redo</span>
              </button>
            </div>
          </div>

          <textarea
            ref={transcriptTextareaRef}
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${Math.max(44, e.currentTarget.scrollHeight)}px`;
            }}
            rows={hideInlineActions ? 1 : 2}
            aria-label="Review and edit spoken transcript"
            className="w-full rounded-[12px] px-3 py-2 text-[13.5px] font-semibold text-[#14201A] bg-[#F5F7F5] focus:outline-none focus:ring-2 focus:ring-[#148343]/25 transition-all resize-none overflow-hidden leading-snug"
          />

          {!hideInlineActions && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetry}
                className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-full text-[13px] font-semibold text-[#46524B] bg-[#F3F4F2] hover:bg-[#E9ECE8] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>{size === 'compact' ? 'Retry' : 'Record again'}</span>
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                disabled={isSubmitting || !transcript.trim()}
                onClick={handleSubmit}
                className="h-10 sm:h-11 px-5 sm:px-6 rounded-full bg-gradient-to-b from-[#137A47] to-[#0B5A34] text-white text-[13.5px] sm:text-[14px] font-semibold flex items-center gap-1.5 sm:gap-2 apple-shadow-cta transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      {/* TYPING MODE */}
      {inputMode === 'typing' && voiceState !== 'TRANSCRIPT_REVIEW' && (
        <div className="w-full rounded-[20px] p-3.5 flex flex-col gap-2.5 bg-white apple-shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-[#5A665F]">
              Type in English
            </span>
            <button
              type="button"
              onClick={switchToMic}
              className="text-xs font-bold text-[#148343] flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Use Microphone</span>
            </button>
          </div>

          <textarea
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={placeholder}
            rows={hideInlineActions ? 2 : 3}
            autoFocus
            className="w-full rounded-[14px] p-3 text-[14px] font-medium text-[#14201A] bg-[#F5F7F5] focus:outline-none focus:ring-2 focus:ring-[#148343]/25 transition-all resize-none"
          />

          {!hideInlineActions && (
            <div className="flex items-center justify-end pt-0.5">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                disabled={isSubmitting || !typedText.trim()}
                onClick={handleSubmit}
                className="h-10 px-5 rounded-full bg-gradient-to-b from-[#137A47] to-[#0B5A34] text-white text-[13.5px] font-semibold flex items-center gap-1.5 apple-shadow-cta cursor-pointer disabled:opacity-50"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* PRIMARY REAL MICROPHONE ORB + LIVE WEB AUDIO WAVEFORM WINGS */}
      {inputMode === 'microphone' && voiceState !== 'TRANSCRIPT_REVIEW' && (
        <div
          className={`flex flex-col items-center w-full ${
            isHero ? 'py-2' : isMedium ? 'py-1' : 'pt-2 pb-0.5'
          }`}
        >
          <div
            className={`flex items-center justify-center ${
              isHero
                ? 'gap-5 sm:gap-6'
                : isMedium
                  ? 'gap-4 sm:gap-5'
                  : 'gap-3.5 sm:gap-4'
            }`}
          >
            {renderWaveformWing(false)}

            {voiceState === 'IDLE' && (
              <div
                className={`rounded-full flex items-center justify-center ${
                  isHero
                    ? 'p-3 bg-white shadow-[0_12px_36px_rgba(18,112,62,0.15)] ring-[10px] ring-[#ECF7F0]'
                    : isMedium
                      ? 'p-2.5 bg-white shadow-[0_10px_28px_rgba(18,112,62,0.14)] ring-[8px] ring-[#EDF7F1]'
                      : 'p-2 bg-white/85 shadow-[0_6px_20px_rgba(18,112,62,0.14)] ring-[6px] ring-white/55'
                }`}
              >
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  type="button"
                  disabled={isSubmitting}
                  onClick={startRecording}
                  aria-label="Start speaking"
                  className={`rounded-full bg-gradient-to-br from-[#239956] via-[#157B43] to-[#0B572E] text-white flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] cursor-pointer ${
                    isHero
                      ? 'w-[96px] h-[96px]'
                      : isMedium
                        ? 'w-[76px] h-[76px]'
                        : 'w-[60px] h-[60px]'
                  }`}
                >
                  <Mic
                    className={
                      isHero
                        ? 'w-10 h-10 stroke-[2]'
                        : isMedium
                          ? 'w-8 h-8 stroke-[2]'
                          : 'w-7 h-7 stroke-[2]'
                    }
                  />
                </motion.button>
              </div>
            )}

            {(voiceState === 'RECORDING' || voiceState === 'PAUSED') && (
              <div className="flex items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                  className="w-10 h-10 rounded-full bg-white apple-shadow-xs text-[#18221D] flex items-center justify-center cursor-pointer"
                >
                  {isPaused ? (
                    <Play className="w-4 h-4 ml-0.5 fill-[#148343] text-[#148343]" />
                  ) : (
                    <Pause className="w-4 h-4 text-[#5A665F]" />
                  )}
                </motion.button>

                <div
                  className={`rounded-full flex items-center justify-center ${
                    isHero
                      ? 'p-3 bg-white shadow-[0_12px_36px_rgba(225,29,72,0.18)] ring-[10px] ring-rose-500/10'
                      : isMedium
                        ? 'p-2.5 bg-white shadow-[0_10px_28px_rgba(225,29,72,0.16)] ring-[8px] ring-rose-500/10'
                        : 'p-2 bg-white/90 shadow-[0_6px_20px_rgba(225,29,72,0.16)] ring-[6px] ring-rose-500/10'
                  }`}
                >
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    type="button"
                    onClick={finishRecording}
                    aria-label="Stop recording"
                    className={`rounded-full bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center animate-pulse cursor-pointer ${
                      isHero
                        ? 'w-[96px] h-[96px]'
                        : isMedium
                          ? 'w-[76px] h-[76px]'
                          : 'w-[60px] h-[60px]'
                    }`}
                  >
                    <Square
                      className={
                        isHero
                          ? 'w-8 h-8 fill-white'
                          : isMedium
                            ? 'w-6 h-6 fill-white'
                            : 'w-5 h-5 fill-white'
                      }
                    />
                  </motion.button>
                </div>
              </div>
            )}

            {(voiceState === 'PROCESSING' || voiceState === 'EVALUATING') && (
              <div
                className={`rounded-full bg-white apple-shadow-xs flex items-center justify-center ${
                  isHero
                    ? 'w-[108px] h-[108px]'
                    : isMedium
                      ? 'w-[88px] h-[88px]'
                      : 'w-[72px] h-[72px]'
                }`}
              >
                <RefreshCw className="w-7 h-7 text-[#148343] animate-spin" />
              </div>
            )}

            {renderWaveformWing(true)}
          </div>

          {/* Live Interim Speech Preview while recording */}
          {voiceState === 'RECORDING' && livePreviewText && (
            <p className="mt-2 px-3 py-1 rounded-[12px] bg-white/90 text-[12px] font-semibold text-[#148343] max-w-[300px] text-center leading-snug apple-shadow-xs">
              “{livePreviewText}”
            </p>
          )}

          {/* Caption & Duration Pill */}
          <div
            className={`flex flex-col items-center text-center ${
              isHero ? 'mt-3.5' : isMedium ? 'mt-2.5' : 'mt-2'
            }`}
          >
            <span
              className={`${
                isHero
                  ? 'text-[15px] font-medium text-[#525E57]'
                  : isMedium
                    ? 'text-[13.5px] font-medium text-[#525E57]'
                    : 'text-[12.5px] font-medium text-[#4E5B53]'
              } tabular-nums`}
            >
              {voiceState === 'IDLE' && defaultIdleText}
              {voiceState === 'RECORDING' &&
                `Recording ${formatTime(elapsedSeconds)} · Tap square to finish`}
              {voiceState === 'PAUSED' && `Paused ${formatTime(elapsedSeconds)}`}
              {voiceState === 'PROCESSING' && 'Transcribing with Gemini...'}
              {voiceState === 'EVALUATING' && 'Gemini Coach evaluating...'}
            </span>

            {isHero && targetDurationLabel && voiceState === 'IDLE' && (
              <div className="mt-2.5 px-4 py-1.5 rounded-full bg-[#F3F4F2] inline-flex items-center gap-2 text-[12.5px] font-medium text-[#47534C]">
                <Timer className="w-3.5 h-3.5 text-[#47534C] stroke-[1.9]" />
                <span>{targetDurationLabel}</span>
              </div>
            )}

            {!hideInlineActions && !hideUtilityPills && voiceState === 'IDLE' && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => switchToTyping(typingPrefill)}
                  className="h-8 px-3 rounded-full bg-[#F3F4F2] hover:bg-[#EAECE9] text-[#4E5A53] text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[#67736C] shrink-0" />
                  <span>Type instead</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
