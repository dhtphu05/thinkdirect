/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AppView,
  SceneData,
  SessionResultData,
  UserPreferences,
  SessionMode,
  PracticeContextKey,
  ApiHealthStatus,
} from './types';
import {
  getStoredPreferences,
  saveSessionToStorage,
} from './utils/storageUtils';
import { fetchApiHealth } from './services/apiClient';
import { getSceneForContextKey } from './data/sampleSceneData';

// Single Core Flow Screens: Camera -> Direct Labeling -> Speaking Practice -> Results
import { CameraHomeScreen } from './screens/CameraHomeScreen';
import { SceneExplorerScreen } from './screens/SceneExplorerScreen';
import { SpeakingWorkspace } from './components/SpeakingWorkspace';
import { SessionResultsScreen } from './screens/SessionResultsScreen';
import { ApiKeyModal } from './components/ui/ApiKeyModal';

export default function App() {
  const [preferences] = useState<UserPreferences>(getStoredPreferences);
  const [currentView, setCurrentView] = useState<AppView>('CAMERA_HOME');

  // Live Gemini Backend API Health & Key Modal State
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [apiModalReason, setApiModalReason] = useState<string | null>(null);

  const refreshApiHealth = useCallback(async () => {
    const status = await fetchApiHealth();
    if (status) {
      setApiHealth(status);
    }
  }, []);

  useEffect(() => {
    void refreshApiHealth();
  }, [refreshApiHealth]);

  useEffect(() => {
    const handleKeyNeeded = (evt: Event) => {
      const detail = (evt as CustomEvent<{ message?: string }>).detail;
      setApiModalReason(
        detail?.message ||
          'Add your Gemini API key to enable live photo analysis, speech recognition, and AI coaching.'
      );
      setIsApiModalOpen(true);
    };
    window.addEventListener('thinkdirect:apikey-needed', handleKeyNeeded);
    return () =>
      window.removeEventListener('thinkdirect:apikey-needed', handleKeyNeeded);
  }, []);

  const openApiSettings = useCallback((reason?: string) => {
    setApiModalReason(reason || null);
    setIsApiModalOpen(true);
  }, []);

  // Treat unknown initial state as true until health check returns to avoid flicker,
  // or false once health check confirms no key is configured.
  const apiKeyConnected = apiHealth ? Boolean(apiHealth.hasApiKey) : false;

  // Active single-flow workout state
  const [activeContextKey, setActiveContextKey] =
    useState<PracticeContextKey>('STUDY_WORKSPACE');
  const [initialRootThought, setInitialRootThought] = useState<
    string | undefined
  >(undefined);
  const [activeScene, setActiveScene] = useState<SceneData | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResultData | null>(
    null
  );

  const handleSceneCaptured = (
    scene: SceneData,
    _rawImage: string,
    _mode: SessionMode = 'real',
    contextKey: PracticeContextKey = 'STUDY_WORKSPACE'
  ) => {
    setActiveContextKey(contextKey);
    setActiveScene(scene);
    setInitialRootThought(scene.initialSuggestedThought);
    setSessionResult(null);
    setCurrentView('SCENE_DISCOVERY');
  };

  const handleStartSpeaking = (
    contextKey?: PracticeContextKey,
    rootThought?: string,
    resolvedScene?: SceneData
  ) => {
    if (contextKey) {
      setActiveContextKey(contextKey);
      if (resolvedScene) {
        setActiveScene(resolvedScene);
      } else if (!activeScene) {
        setActiveScene(getSceneForContextKey(contextKey));
      }
    }
    if (rootThought) {
      setInitialRootThought(rootThought);
    }
    setCurrentView('SPEAKING_WORKSPACE');
  };

  const handleSessionComplete = (result: SessionResultData) => {
    const updated = saveSessionToStorage(result);
    setSessionResult(updated[0] || result);
    setCurrentView('SESSION_RESULTS');
  };

  const handleResetToCamera = () => {
    setActiveScene(null);
    setSessionResult(null);
    setCurrentView('CAMERA_HOME');
  };

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-[#FAF9F6] sm:bg-[#ECEEE9]">
      {/* Native full-bleed on mobile phones; Apple-framed mobile viewport on tablet/desktop */}
      <div className="w-full max-w-[430px] min-h-[100dvh] sm:min-h-[calc(100dvh-2rem)] sm:my-4 sm:rounded-[38px] flex flex-col relative overflow-x-clip bg-[#FAF9F6] sm:shadow-[0_24px_80px_rgba(15,35,25,0.12)]">
        <main className="flex-1 flex flex-col w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="flex-1 flex flex-col w-full"
            >
              {currentView === 'CAMERA_HOME' && (
                <CameraHomeScreen
                  onSceneCaptured={(scene, raw, mode) =>
                    handleSceneCaptured(scene, raw, mode, 'STUDY_WORKSPACE')
                  }
                  userLevel={preferences.level}
                  apiKeyConnected={apiKeyConnected}
                  apiHealthLoaded={apiHealth !== null}
                  onOpenApiSettings={() => openApiSettings()}
                />
              )}

              {currentView === 'SCENE_DISCOVERY' && activeScene && (
                <SceneExplorerScreen
                  scene={activeScene}
                  userLevel={preferences.level}
                  apiKeyConnected={apiKeyConnected}
                  onOpenApiSettings={() => openApiSettings()}
                  onStartSpeaking={handleStartSpeaking}
                  onBack={handleResetToCamera}
                />
              )}

              {currentView === 'SPEAKING_WORKSPACE' && activeScene && (
                <SpeakingWorkspace
                  scene={activeScene}
                  contextKey={activeContextKey}
                  initialRootThought={initialRootThought}
                  userLevel={preferences.level}
                  canFastTrack={true}
                  apiKeyConnected={apiKeyConnected}
                  onOpenApiSettings={() => openApiSettings()}
                  onQuit={() => setCurrentView('SCENE_DISCOVERY')}
                  onCompleteSession={handleSessionComplete}
                />
              )}

              {currentView === 'SESSION_RESULTS' && sessionResult && (
                <SessionResultsScreen
                  result={sessionResult}
                  onStartNewSession={handleResetToCamera}
                  onSelectTopic={() => {
                    if (activeScene) {
                      setCurrentView('SCENE_DISCOVERY');
                    } else {
                      handleResetToCamera();
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Gemini API Key Setup & Status Sheet */}
        <ApiKeyModal
          isOpen={isApiModalOpen}
          reasonMessage={apiModalReason}
          healthStatus={apiHealth}
          onClose={() => setIsApiModalOpen(false)}
          onStatusUpdated={(nextStatus) => {
            setApiHealth(nextStatus);
            void refreshApiHealth();
          }}
        />
      </div>
    </div>
  );
}
