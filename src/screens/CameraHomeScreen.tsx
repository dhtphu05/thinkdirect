import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Zap,
  ZapOff,
  Mic,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Upload,
  Sparkles,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/audioUtils';
import { apiFetch } from '../services/apiClient';
import { SceneData, SessionMode, UserLevel } from '../types';
import { RadiantRays } from '../components/RadiantRays';
import { AmbientMintArc } from '../components/ui/BrandMark';
import { PracticeHeader } from '../components/ui/PracticeHeader';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { MethodGuideSheet } from '../components/ui/MethodGuideSheet';

interface CameraHomeScreenProps {
  onSceneCaptured: (
    scene: SceneData,
    rawImageDataUrl: string,
    mode: SessionMode
  ) => void;
  onOpenCameraPractice?: (scene: SceneData, mode: SessionMode) => void;
  userLevel?: UserLevel;
  streakDays?: number;
  apiKeyConnected?: boolean;
  onOpenApiSettings?: () => void;
}

export const CameraHomeScreen: React.FC<CameraHomeScreenProps> = ({
  onSceneCaptured,
  onOpenCameraPractice,
  userLevel = 'B1',
  streakDays = 1,
  apiKeyConnected = true,
  onOpenApiSettings,
}) => {
  const [cameraState, setCameraState] = useState<
    'starting' | 'active' | 'unavailable'
  >('starting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'journey' | 'quick_talk'>(
    'journey'
  );
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);
  const [userGoal, setUserGoal] = useState<string>('');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (preferredFacing: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCapturedPreviewUrl(null);
      setAnalysisError(null);
      setCameraState('starting');

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API unavailable');
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: preferredFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState('active');
      } catch {
        setCameraState('unavailable');
      }
    },
    [facingMode, stopCamera]
  );

  useEffect(() => {
    void startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (
      cameraState === 'active' &&
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setFlashOn(false);
    void startCamera(nextMode);
  };

  const handleToggleFlash = async () => {
    const nextFlash = !flashOn;
    setFlashOn(nextFlash);
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextFlash } as MediaTrackConstraintSet],
      });
    } catch {
      // Torch constraint unsupported on desktop / front camera
    }
  };

  const routeToDestination = (scene: SceneData, rawDataUrl: string) => {
    if (cameraMode === 'quick_talk' && onOpenCameraPractice) {
      onOpenCameraPractice(scene, 'real');
    } else {
      onSceneCaptured(scene, rawDataUrl, 'real');
    }
  };

  const analyzeCapturedImage = async (compressedDataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCapturedPreviewUrl(compressedDataUrl);

    try {
      const response = await apiFetch('/api/analyze-scene', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: compressedDataUrl,
          mimeType: 'image/jpeg',
          userGoal: userGoal.trim(),
          userLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsAnalyzing(false);
        setAnalysisError(
          data?.message ||
            'Could not analyze this photo. Check your Gemini API key and try again.'
        );
        return;
      }

      const realScene: SceneData = {
        title: data.title || 'Captured Scene',
        description: data.description || '',
        imageUrl: compressedDataUrl,
        objects: Array.isArray(data.objects) ? data.objects : [],
        suggestedExpressions: Array.isArray(data.suggestedExpressions)
          ? data.suggestedExpressions
          : [],
        openingQuestion:
          data.openingQuestion || 'What is happening right here?',
        initialSuggestedThought:
          data.initialSuggestedThought || "I'm right here.",
        suggestedFramework:
          data.suggestedFramework === 'IDEA_REASON_EXAMPLE'
            ? 'IDEA_REASON_EXAMPLE'
            : '5W1H',
        userGoal: data.userGoal,
        practiceBlueprint: data.practiceBlueprint,
        isSample: false,
      };

      setIsAnalyzing(false);
      routeToDestination(realScene, compressedDataUrl);
    } catch {
      setIsAnalyzing(false);
      setAnalysisError(
        'Network error while analyzing photo. Check your backend connection and tap Retry.'
      );
    }
  };

  const captureFrame = async () => {
    if (isAnalyzing) return;

    // If user already picked/captured an image that failed due to missing API key, re-analyze it
    if (capturedPreviewUrl) {
      await analyzeCapturedImage(capturedPreviewUrl);
      return;
    }

    if (cameraState !== 'active' || !videoRef.current) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 960;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const compressedDataUrl = await compressImage(rawDataUrl, 1100, 0.84);
      stopCamera();
      await analyzeCapturedImage(compressedDataUrl);
    } catch {
      setAnalysisError(
        'Could not capture camera frame. Try uploading a photo from your device.'
      );
    }
  };

  const processUploadedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please choose an image file (JPG, PNG, WEBP, HEIC).');
      return;
    }
    try {
      setIsAnalyzing(true);
      stopCamera();
      const compressedDataUrl = await compressImage(file, 1100, 0.84);
      await analyzeCapturedImage(compressedDataUrl);
    } catch {
      setIsAnalyzing(false);
      setAnalysisError('Could not read that image file. Try another photo.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processUploadedFile(file);
  };

  // Support Ctrl+V / Cmd+V paste any screenshot or photo on desktop
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            void processUploadedFile(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isAnalyzing, userGoal, userLevel]);

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-2.5 safe-top select-none overflow-x-clip">
      <AmbientMintArc />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative z-10 flex flex-col gap-2.5">
        <PracticeHeader
          rightMode="streak"
          streakDays={streakDays}
          apiKeyConnected={apiKeyConnected}
          onOpenApiSettings={onOpenApiSettings}
        />

        <div className="mt-0.5">
          <h1 className="text-[26px] sm:text-[29px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-[1.14] inline-flex items-start">
            <span>Snap any scene & speak.</span>
            <RadiantRays className="w-6 h-6 -mt-2.5 ml-0.5" />
          </h1>
          <p className="text-[13px] text-[#55625B] leading-[1.4] mt-1">
            Point your camera or upload any real photo — Gemini builds all 5 speaking methods around it.
          </p>
        </div>

        {/* Live Camera / Photo Dropzone Viewfinder */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void processUploadedFile(file);
          }}
          className={`relative w-full aspect-[4/3.05] rounded-[24px] overflow-hidden bg-[#16201B] apple-shadow-md transition-all ${
            isDraggingOver ? 'ring-4 ring-[#148343]' : ''
          }`}
        >
          {capturedPreviewUrl ? (
            <img
              src={capturedPreviewUrl}
              alt="Captured preview"
              className="w-full h-full object-cover"
            />
          ) : cameraState === 'active' ? (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center text-white gap-3 bg-gradient-to-br from-[#1A2A22] to-[#0F1914]">
              <div className="w-12 h-12 rounded-full bg-white/12 flex items-center justify-center text-emerald-300">
                {cameraState === 'starting' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 stroke-[2.1]" />
                )}
              </div>
              <div>
                <h3 className="text-[15px] font-bold">
                  {cameraState === 'starting'
                    ? 'Starting Live Camera...'
                    : 'Camera off or permission blocked'}
                </h3>
                <p className="text-[12px] text-white/75 mt-0.5 leading-snug">
                  {cameraState === 'starting'
                    ? 'Allow camera access in your browser, or upload any photo.'
                    : 'Enable camera access, upload any photo, or paste (Cmd+V).'}
                </p>
              </div>
              {cameraState === 'unavailable' && (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => void startCamera(facingMode)}
                    className="h-9 px-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Enable Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-3.5 rounded-full bg-[#148343] hover:bg-[#19964E] text-white text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Optical Focus Reticle when Live Camera Active */}
          {cameraState === 'active' && !capturedPreviewUrl && (
            <div
              className="absolute inset-[18%] pointer-events-none"
              aria-hidden="true"
            >
              <span className="absolute top-0 left-0 w-5 h-[2.5px] bg-white/85 rounded-full" />
              <span className="absolute top-0 left-0 w-[2.5px] h-5 bg-white/85 rounded-full" />
              <span className="absolute top-0 right-0 w-5 h-[2.5px] bg-white/85 rounded-full" />
              <span className="absolute top-0 right-0 w-[2.5px] h-5 bg-white/85 rounded-full" />
              <span className="absolute bottom-0 left-0 w-5 h-[2.5px] bg-white/85 rounded-full" />
              <span className="absolute bottom-0 left-0 w-[2.5px] h-5 bg-white/85 rounded-full" />
              <span className="absolute bottom-0 right-0 w-5 h-[2.5px] bg-white/85 rounded-full" />
              <span className="absolute bottom-0 right-0 w-[2.5px] h-5 bg-white/85 rounded-full" />
            </div>
          )}

          {/* Top-Left: Flash / Retake */}
          {capturedPreviewUrl ? (
            <button
              type="button"
              onClick={() => void startCamera(facingMode)}
              className="absolute top-3.5 left-3.5 h-9 px-3 rounded-full bg-black/55 backdrop-blur-md text-white text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-black/70 transition-colors z-20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleToggleFlash()}
              className="absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20 cursor-pointer"
              aria-label="Toggle flash"
            >
              {flashOn ? (
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300 stroke-[2]" />
              ) : (
                <ZapOff className="w-4 h-4 text-white stroke-[2]" />
              )}
            </button>
          )}

          {/* Top-Right: Flip Camera */}
          {!capturedPreviewUrl && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20 cursor-pointer"
              aria-label="Flip camera"
            >
              <RefreshCw className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Bottom-Right: Upload Any Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3.5 right-3.5 h-9 px-3 rounded-full bg-black/55 backdrop-blur-md text-white text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-black/70 transition-colors z-20 cursor-pointer"
            aria-label="Upload photo from gallery"
          >
            <ImageIcon className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Upload photo</span>
          </button>

          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center text-white"
              >
                <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
                <h3 className="text-[15.5px] font-bold mb-1">
                  Gemini Vision Analyzing Photo...
                </h3>
                <p className="text-xs text-white/80 max-w-xs">
                  Detecting real objects, natural phrases, and building your 5-method speaking workout.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Optional Error Banner with Direct Retry / Set API Key */}
        {analysisError && (
          <div className="rounded-[16px] bg-[#FDECE9] text-[#9E2B25] px-3.5 py-2.5 flex items-start justify-between gap-2.5 text-[12px]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{analysisError}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!apiKeyConnected && onOpenApiSettings && (
                <button
                  type="button"
                  onClick={onOpenApiSettings}
                  className="px-2.5 py-1 rounded-full bg-white text-[#9E2B25] font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  Set Key
                </button>
              )}
              {capturedPreviewUrl && (
                <button
                  type="button"
                  onClick={() => void analyzeCapturedImage(capturedPreviewUrl)}
                  className="px-2.5 py-1 rounded-full bg-[#9E2B25] text-white font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Optional Use-Case / Speaking Context Input for Any Photo */}
        <SurfaceCard
          tone="elevated"
          radius="lg"
          padding="sm"
          className="px-3 py-2 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-[10px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
          <input
            type="text"
            value={userGoal}
            onChange={(e) => setUserGoal(e.target.value)}
            placeholder="Optional context: ordering food, client meeting, cooking..."
            className="flex-1 min-w-0 bg-transparent text-[12.5px] font-semibold text-[#101E17] placeholder:text-[#7A8780] focus:outline-none"
          />
        </SurfaceCard>

        {/* Explicit 5-Method Pipeline Strip */}
        <div className="rounded-[15px] bg-[#EEF5F0] px-2.5 py-1.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center flex-wrap gap-0.5 min-w-0 text-[10.5px] font-bold text-[#14231B]">
            <span className="text-[#148343] font-extrabold">Label</span>
            <ArrowRight className="w-2 h-2 text-[#7A8780] shrink-0" />
            <span>Expand</span>
            <ArrowRight className="w-2 h-2 text-[#7A8780] shrink-0" />
            <span>5W1H</span>
            <ArrowRight className="w-2 h-2 text-[#7A8780] shrink-0" />
            <span>Self-Talk</span>
            <ArrowRight className="w-2 h-2 text-[#7A8780] shrink-0" />
            <span>Recall</span>
          </div>

          <button
            type="button"
            onClick={() => setShowMethodGuide(true)}
            className="h-6 px-2 rounded-full bg-white text-[#148343] text-[10px] font-extrabold inline-flex items-center gap-1 apple-shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <BookOpen className="w-2.5 h-2.5 stroke-[2.4] shrink-0" />
            <span>5 Methods</span>
          </button>
        </div>
      </div>

      {/* Bottom Shutter Orb + Mode Segmented Pill */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 pt-1 pb-1">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-full bg-white apple-shadow-sm ring-[8px] ring-[#EAF6EE]">
            <motion.button
              whileTap={{ scale: 0.93 }}
              type="button"
              onClick={() => void captureFrame()}
              disabled={isAnalyzing}
              className="w-[66px] h-[66px] rounded-full bg-gradient-to-br from-[#239956] via-[#157B43] to-[#0B572E] text-white flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] cursor-pointer disabled:opacity-50"
              aria-label={
                capturedPreviewUrl
                  ? 'Analyze photo with Gemini'
                  : cameraState === 'active'
                    ? 'Capture live photo'
                    : 'Choose photo to analyze'
              }
            >
              {capturedPreviewUrl ? (
                <Sparkles className="w-7 h-7 stroke-[2.1]" />
              ) : (
                <Camera className="w-7 h-7 stroke-[2.1]" />
              )}
            </motion.button>
          </div>
        </div>

        <div className="bg-[#F2F3F1] p-1 rounded-full flex items-center">
          <button
            type="button"
            onClick={() => setCameraMode('journey')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              cameraMode === 'journey'
                ? 'bg-[#E2F4E9] text-[#138041]'
                : 'text-[#55615A] hover:text-[#101E17]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
            <span>5-Method Journey</span>
          </button>

          <span
            className="w-[1px] h-4 bg-black/[0.08] mx-1 shrink-0"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => setCameraMode('quick_talk')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              cameraMode === 'quick_talk'
                ? 'bg-[#E2F4E9] text-[#138041] font-bold'
                : 'text-[#55615A] hover:text-[#101E17]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 stroke-[2.1] shrink-0" />
            <span>90s Sprint</span>
          </button>
        </div>
      </div>

      <MethodGuideSheet
        isOpen={showMethodGuide}
        onClose={() => setShowMethodGuide(false)}
      />
    </div>
  );
};
