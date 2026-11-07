import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Zap,
  ZapOff,
  Mic,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils/audioUtils';
import {
  SAMPLE_STUDY_SCENE,
  getSceneForContextKey,
} from '../data/sampleSceneData';
import {
  SceneData,
  SessionResultData,
  PracticeContextKey,
  SessionMode,
} from '../types';
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
  onContinueLastSession?: (session: SessionResultData) => void;
  lastSession?: SessionResultData | null;
  onOpenSampleScene: () => void;
  onStartGuidedDemo?: (contextKey?: PracticeContextKey) => void;
  streakDays?: number;
}

const SCENE_OPTIONS: {
  key: PracticeContextKey;
  shortLabel: string;
}[] = [
  { key: 'STUDY_WORKSPACE', shortLabel: 'Study Workspace' },
  { key: 'MORNING_COFFEE', shortLabel: 'Morning Coffee' },
  { key: 'PLANNING_DAY', shortLabel: 'Study Plan' },
];

export const CameraHomeScreen: React.FC<CameraHomeScreenProps> = ({
  onSceneCaptured,
  onOpenCameraPractice,
  onOpenSampleScene,
  onStartGuidedDemo,
  streakDays = 3,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'journey' | 'quick_talk'>(
    'journey'
  );
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [showMethodGuide, setShowMethodGuide] = useState<boolean>(false);
  const [selectedSceneKey, setSelectedSceneKey] =
    useState<PracticeContextKey>('STUDY_WORKSPACE');

  const previewScene = getSceneForContextKey(selectedSceneKey);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      stopCamera();
    } else {
      void startCamera();
    }
  };

  const routeToDestination = (
    scene: SceneData,
    rawDataUrl: string,
    mode: SessionMode
  ) => {
    if (cameraMode === 'quick_talk' && onOpenCameraPractice) {
      onOpenCameraPractice(scene, mode);
    } else {
      onSceneCaptured(scene, rawDataUrl, mode);
    }
  };

  const analyzeCapturedImage = async (compressedDataUrl: string) => {
    try {
      const response = await fetch('/api/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedDataUrl,
          mimeType: 'image/jpeg',
          isSample: false,
        }),
      });

      if (response.ok) {
        const parsed = await response.json();
        const isRealVision = !parsed.usedFallback && !parsed.isSample;
        const enrichedScene: SceneData = {
          title: parsed.title || previewScene.title,
          description: parsed.description || previewScene.description,
          imageUrl: isRealVision
            ? compressedDataUrl
            : compressedDataUrl || previewScene.imageUrl,
          objects:
            Array.isArray(parsed.objects) && parsed.objects.length > 0
              ? parsed.objects
              : previewScene.objects,
          suggestedExpressions:
            Array.isArray(parsed.suggestedExpressions) &&
            parsed.suggestedExpressions.length > 0
              ? parsed.suggestedExpressions
              : previewScene.suggestedExpressions,
          openingQuestion:
            parsed.openingQuestion || previewScene.openingQuestion,
          initialSuggestedThought:
            parsed.initialSuggestedThought ||
            previewScene.initialSuggestedThought,
          suggestedFramework:
            parsed.suggestedFramework === 'IDEA_REASON_EXAMPLE'
              ? 'IDEA_REASON_EXAMPLE'
              : '5W1H',
          isSample: !isRealVision,
        };

        setIsAnalyzing(false);
        routeToDestination(
          enrichedScene,
          compressedDataUrl,
          isRealVision ? 'real' : 'demo'
        );
        return;
      }
    } catch {
      // Seamless fallback
    }

    const fallbackScene: SceneData = {
      ...previewScene,
      imageUrl: compressedDataUrl || previewScene.imageUrl,
    };
    setIsAnalyzing(false);
    routeToDestination(fallbackScene, fallbackScene.imageUrl, 'demo');
  };

  const captureFrame = async () => {
    if (isAnalyzing) return;

    if (!cameraActive || !videoRef.current) {
      setIsAnalyzing(true);
      window.setTimeout(() => {
        setIsAnalyzing(false);
        routeToDestination(previewScene, previewScene.imageUrl, 'demo');
      }, 420);
      return;
    }

    try {
      setIsAnalyzing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const compressedDataUrl = await compressImage(rawDataUrl, 1000, 0.82);
      stopCamera();
      await analyzeCapturedImage(compressedDataUrl);
    } catch {
      setIsAnalyzing(false);
      routeToDestination(previewScene, previewScene.imageUrl, 'demo');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      stopCamera();
      const compressedDataUrl = await compressImage(file, 1000, 0.82);
      await analyzeCapturedImage(compressedDataUrl);
    } catch {
      setIsAnalyzing(false);
      onOpenSampleScene();
    }
  };

  const handleOpenSelectedScene = () => {
    if (cameraMode === 'quick_talk' && onOpenCameraPractice) {
      onOpenCameraPractice(previewScene, 'demo');
      return;
    }
    if (onStartGuidedDemo) {
      onStartGuidedDemo(selectedSceneKey);
    } else {
      onOpenSampleScene();
    }
  };

  return (
    <div className="relative w-full flex-1 bg-[#FAF9F6] text-[#0F1F18] px-4 sm:px-5 pt-3 pb-5 flex flex-col justify-between gap-3 safe-top select-none overflow-x-clip">
      <AmbientMintArc />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative z-10 flex flex-col gap-3">
        <PracticeHeader rightMode="streak" streakDays={streakDays} />

        <div className="mt-0.5">
          <h1 className="text-[27px] sm:text-[30px] font-extrabold tracking-[-0.028em] text-[#0D1F17] leading-[1.14] inline-flex items-start">
            <span>Look around and speak.</span>
            <RadiantRays className="w-6 h-6 -mt-2.5 ml-0.5" />
          </h1>
          <p className="text-[13.5px] text-[#55625B] leading-[1.42] mt-1">
            Point at what’s in front of you — tap objects in English, then build your sentence.
          </p>
        </div>

        {/* Clean Scene Switcher Pills Bound Live to Viewfinder */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SCENE_OPTIONS.map((opt) => {
            const active = selectedSceneKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedSceneKey(opt.key)}
                className={`h-8 px-3 rounded-full text-[12px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#148343] text-white shadow-xs'
                    : 'bg-white hover:bg-[#EAF6EE] text-[#35423B] apple-shadow-xs'
                }`}
              >
                <span>{opt.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Clean Borderless Apple Viewfinder Card */}
        <div className="relative w-full aspect-[4/3.05] rounded-[24px] overflow-hidden bg-[#1D2621] apple-shadow-md">
          {cameraActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={previewScene.imageUrl}
              alt={previewScene.title}
              className="w-full h-full object-cover transition-all duration-300"
            />
          )}

          <div className="absolute inset-0 bg-black/[0.06] pointer-events-none" />

          {/* Optical Focus Reticle */}
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

          {/* Flash Toggle (Top-Left) */}
          <button
            type="button"
            onClick={() => setFlashOn(!flashOn)}
            className="absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20 cursor-pointer"
            aria-label="Toggle flash"
          >
            {flashOn ? (
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300 stroke-[2]" />
            ) : (
              <ZapOff className="w-4 h-4 text-white stroke-[2]" />
            )}
          </button>

          {/* Camera Flip (Top-Right) */}
          <button
            type="button"
            onClick={toggleFacingMode}
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20 cursor-pointer"
            aria-label="Flip camera"
          >
            <RefreshCw className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Gallery Picker (Bottom-Right) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3.5 right-3.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20 cursor-pointer"
            aria-label="Pick photo from gallery"
          >
            <ImageIcon className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Live Scene Object Detection Chips */}
          {!cameraActive &&
            previewScene.objects.slice(0, 4).map((obj) => (
              <div
                key={obj.name}
                style={{
                  left: `${Math.min(78, Math.max(22, obj.xPercent || 50))}%`,
                  top: `${Math.min(78, Math.max(20, obj.yPercent || 50))}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
              >
                <div className="bg-white/96 backdrop-blur-md text-[#101E17] text-[11.5px] font-bold px-2.5 py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.14)] flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#148343]" />
                  <span>{obj.name.toLowerCase()}</span>
                </div>
              </div>
            ))}

          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/65 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center text-white"
              >
                <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
                <h3 className="text-[15.5px] font-bold mb-1">
                  Analyzing Scene...
                </h3>
                <p className="text-xs text-white/80 max-w-xs">
                  Finding English labels and your starting thought.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Explicit 5-Method Pipeline Strip (Always Visible on Launch) */}
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

        {/* Single Clean Active Scene Card */}
        <SurfaceCard
          tone="elevated"
          radius="lg"
          padding="sm"
          interactive
          onClick={handleOpenSelectedScene}
          className="flex items-center justify-between gap-3 px-3.5 py-2.5"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[12px] bg-[#EAF6EE] text-[#148343] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-bold text-[#101E17] leading-snug">
                {previewScene.title}
              </span>
              <span className="text-[12px] text-[#58645D] leading-[1.35]">
                Start from “{previewScene.initialSuggestedThought || "I'm coding."}” → grow with 5 methods
              </span>
            </div>
          </div>
          <ChevronRight className="w-[18px] h-[18px] text-[#69756E] shrink-0" />
        </SurfaceCard>
      </div>

      {/* Bottom Shutter Orb + Single Clean Mode Segmented Pill */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 pt-1 pb-1">
        <div className="p-2 rounded-full bg-white apple-shadow-sm ring-[8px] ring-[#EAF6EE]">
          <motion.button
            whileTap={{ scale: 0.93 }}
            type="button"
            onClick={captureFrame}
            disabled={isAnalyzing}
            className="w-[66px] h-[66px] rounded-full bg-gradient-to-br from-[#239956] via-[#157B43] to-[#0B572E] text-white flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] cursor-pointer"
            aria-label={
              cameraMode === 'quick_talk'
                ? 'Capture scene for 90s Sprint'
                : 'Capture scene'
            }
          >
            <Camera className="w-7 h-7 stroke-[2.1]" />
          </motion.button>
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
            <span>4-Step Journey</span>
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
