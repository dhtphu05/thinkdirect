/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AppTab,
  AppView,
  SceneData,
  SessionResultData,
  UserPreferences,
  SessionMode,
  PracticeContextKey,
} from './types';
import {
  getStoredPreferences,
  saveStoredPreferences,
  getStoredSessions,
  saveSessionToStorage,
  computePortfolioSummary,
} from './utils/storageUtils';
import {
  SAMPLE_STUDY_SCENE,
  SAMPLE_COFFEE_SCENE,
  SAMPLE_PLANNING_SCENE,
  getSceneForContextKey,
} from './data/sampleSceneData';

// Screens & Unified 4-Method Workspace
import { OnboardingScreen } from './screens/OnboardingScreen';
import { CameraHomeScreen } from './screens/CameraHomeScreen';
import { CameraPracticeScreen } from './screens/CameraPracticeScreen';
import { SceneExplorerScreen } from './screens/SceneExplorerScreen';
import { SpeakingWorkspace } from './components/SpeakingWorkspace';
import { TransferChallengeScreen } from './screens/TransferChallengeScreen';
import { SessionResultsScreen } from './screens/SessionResultsScreen';
import { MyEnglishScreen } from './screens/MyEnglishScreen';
import { ThinkScreen } from './screens/ThinkScreen';

// Navigation
import { BottomNavigation } from './components/BottomNavigation';

export default function App() {
  const [preferences, setPreferences] =
    useState<UserPreferences>(getStoredPreferences);
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const prefs = getStoredPreferences();
    return prefs.hasCompletedOnboarding ? 'CAMERA_HOME' : 'ONBOARDING';
  });

  // Active workout session mode & context
  const [sessionMode, setSessionMode] = useState<SessionMode>('demo');
  const [activeContextKey, setActiveContextKey] =
    useState<PracticeContextKey>('STUDY_WORKSPACE');
  const [initialRootThought, setInitialRootThought] = useState<
    string | undefined
  >(undefined);

  // Active workout session state
  const [activeScene, setActiveScene] = useState<SceneData | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResultData | null>(
    null
  );
  const [transferConfig, setTransferConfig] = useState<{
    scene: SceneData;
    challengeMode: 'transfer' | 'blind_recall';
    originSessionId?: string;
    priorInitialThought?: string;
  } | null>(null);

  // Video-ready scripted voice capture always active for smooth narration & 1-take recording
  const [preferAutoDemoMic, setPreferAutoDemoMic] = useState<boolean>(true);

  const handleUpdateAutoDemoMic = (next: boolean) => {
    setPreferAutoDemoMic(next);
  };

  // Stored completed sessions
  const [savedSessions, setSavedSessions] =
    useState<SessionResultData[]>(getStoredSessions);

  useEffect(() => {
    setSavedSessions(getStoredSessions());
  }, [currentView]);

  const portfolio = useMemo(
    () => computePortfolioSummary(savedSessions),
    [savedSessions]
  );

  const handleOnboardingComplete = (newPrefs: UserPreferences) => {
    const merged: UserPreferences = {
      ...preferences,
      ...newPrefs,
      preferAutoDemoMic: true,
      hideSampleSessions: false,
    };
    saveStoredPreferences(merged);
    setPreferences(merged);
    setCurrentView('CAMERA_HOME');
    setActiveTab('camera');
  };

  const handleToggleUserLevel = () => {
    const nextLevel = preferences.level === 'A2' ? 'B1' : 'A2';
    const nextPrefs = saveStoredPreferences({ level: nextLevel });
    setPreferences(nextPrefs);
  };

  const handleToggleHideSamples = () => {
    const nextHide = !preferences.hideSampleSessions;
    const nextPrefs = saveStoredPreferences({ hideSampleSessions: nextHide });
    setPreferences(nextPrefs);
  };

  const handleStartGuidedDemo = (
    contextKey: PracticeContextKey = 'STUDY_WORKSPACE',
    overrideLevel?: UserPreferences['level']
  ) => {
    if (overrideLevel) {
      const nextPrefs = saveStoredPreferences({
        level: overrideLevel,
        hasCompletedOnboarding: true,
      });
      setPreferences(nextPrefs);
    }
    const scene = getSceneForContextKey(contextKey);
    setSessionMode('demo');
    setPreferAutoDemoMic(true);
    setActiveContextKey(contextKey);
    setActiveScene(scene);
    setInitialRootThought(scene.initialSuggestedThought);
    setSessionResult(null);
    setCurrentView('SCENE_DISCOVERY');
  };

  const handleSceneCaptured = (
    scene: SceneData,
    _rawImage: string,
    _mode: SessionMode = 'demo',
    contextKey: PracticeContextKey = 'STUDY_WORKSPACE'
  ) => {
    setSessionMode('demo');
    setPreferAutoDemoMic(true);
    setActiveContextKey(contextKey);
    setActiveScene(scene);
    setInitialRootThought(scene.initialSuggestedThought);
    setSessionResult(null);
    setCurrentView('SCENE_DISCOVERY');
  };

  const handleOpenCameraPractice = (
    scene: SceneData = SAMPLE_STUDY_SCENE,
    _mode: SessionMode = 'demo'
  ) => {
    setSessionMode('demo');
    setPreferAutoDemoMic(true);
    setActiveContextKey('STUDY_WORKSPACE');
    setActiveScene(scene);
    setSessionResult(null);
    setActiveTab('camera');
    setCurrentView('CAMERA_PRACTICE');
  };

  const handleOpenSampleScene = () => {
    handleStartGuidedDemo('STUDY_WORKSPACE');
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

  const handlePracticeExpression = (phrase: string, sceneTitle = '') => {
    const lowerTitle = sceneTitle.toLowerCase();
    const matchedContext: PracticeContextKey = lowerTitle.includes('coffee')
      ? 'MORNING_COFFEE'
      : lowerTitle.includes('plan')
        ? 'PLANNING_DAY'
        : 'STUDY_WORKSPACE';
    const baseScene = getSceneForContextKey(matchedContext);
    const cleanPhrase = phrase.trim().replace(/[.!?]+$/, '');
    const customStarter = /^(i'm|i am|i'll|i )/i.test(cleanPhrase)
      ? `${cleanPhrase}.`
      : `I want to ${cleanPhrase}.`;

    setSessionMode('demo');
    setPreferAutoDemoMic(true);
    setActiveContextKey(matchedContext);
    setActiveScene({
      ...baseScene,
      initialSuggestedThought: customStarter,
    });
    setInitialRootThought(customStarter);
    setSessionResult(null);
    setCurrentView('SPEAKING_WORKSPACE');
  };

  const handleStartTransferChallenge = () => {
    const lastTitle = (
      sessionResult?.sceneTitle ||
      activeScene?.title ||
      ''
    ).toLowerCase();
    const unseenScene = lastTitle.includes('coffee')
      ? SAMPLE_PLANNING_SCENE
      : SAMPLE_COFFEE_SCENE;

    setTransferConfig({
      scene: unseenScene,
      challengeMode: 'transfer',
      priorInitialThought:
        sessionResult?.thoughtJourney?.initialThought || "I'm coding.",
    });
    setCurrentView('TRANSFER_CHALLENGE');
  };

  const handleStartBlindRecall = (session: SessionResultData) => {
    const recallScene: SceneData = {
      title: session.sceneTitle.replace(
        / · (Transfer|24h Recall|90s Sprint)$/i,
        ''
      ),
      description: 'Delayed recall check without visual labels or hints.',
      imageUrl: session.sceneImageUrl,
      objects: session.objectsLearned || [],
      suggestedExpressions: session.expressionsLearned || [],
      openingQuestion: 'Recall and express your full thought independently.',
      suggestedFramework: session.frameworkUsed || '5W1H',
      isSample: true,
      initialSuggestedThought: session.thoughtJourney?.initialThought,
    };

    setTransferConfig({
      scene: recallScene,
      challengeMode: 'blind_recall',
      originSessionId: session.id,
      priorInitialThought: session.thoughtJourney?.initialThought,
    });
    setCurrentView('TRANSFER_CHALLENGE');
  };

  const handleSessionComplete = (result: SessionResultData) => {
    const updated = saveSessionToStorage(result);
    setSavedSessions(updated);
    setSessionResult(updated[0] || result);
    setCurrentView('SESSION_RESULTS');
  };

  const handleQuitActiveWorkout = () => {
    setActiveScene(null);
    setCurrentView('CAMERA_HOME');
  };

  const handleSelectHistorySession = (session: SessionResultData) => {
    setSessionResult(session);
    setCurrentView('SESSION_RESULTS');
  };

  const showBottomNav = currentView === 'CAMERA_HOME';

  const activeTransitionKey =
    currentView === 'CAMERA_HOME' ? `tab-${activeTab}` : currentView;

  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-[#FAF9F6] sm:bg-[#ECEEE9]">
      {/* Native full-bleed on mobile phones; Apple-framed mobile viewport on tablet/desktop */}
      <div className="w-full max-w-[430px] min-h-[100dvh] sm:min-h-[calc(100dvh-2rem)] sm:my-4 sm:rounded-[38px] flex flex-col relative overflow-x-clip bg-[#FAF9F6] sm:shadow-[0_24px_80px_rgba(15,35,25,0.12)]">
        <main className="flex-1 flex flex-col w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTransitionKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="flex-1 flex flex-col w-full"
            >
              {currentView === 'ONBOARDING' && (
                <OnboardingScreen
                  initialLevel={preferences.level}
                  onComplete={handleOnboardingComplete}
                  onStartDemo={(chosenLevel) =>
                    handleStartGuidedDemo('STUDY_WORKSPACE', chosenLevel)
                  }
                />
              )}

              {currentView === 'CAMERA_HOME' &&
                (activeTab === 'camera' ||
                  activeTab === 'explore' ||
                  activeTab === 'home') && (
                  <CameraHomeScreen
                    onSceneCaptured={(scene, raw, mode) =>
                      handleSceneCaptured(scene, raw, mode, 'STUDY_WORKSPACE')
                    }
                    onOpenCameraPractice={handleOpenCameraPractice}
                    onOpenSampleScene={handleOpenSampleScene}
                    onStartGuidedDemo={(ctxKey) =>
                      handleStartGuidedDemo(ctxKey || 'STUDY_WORKSPACE')
                    }
                    lastSession={savedSessions[0] || null}
                    onContinueLastSession={handleSelectHistorySession}
                    streakDays={portfolio.streakDays}
                  />
                )}

              {currentView === 'CAMERA_PRACTICE' && activeScene && (
                <CameraPracticeScreen
                  scene={activeScene}
                  sessionMode={sessionMode}
                  userLevel={preferences.level}
                  autoMode={preferAutoDemoMic}
                  onToggleAuto={() =>
                    handleUpdateAutoDemoMic(!preferAutoDemoMic)
                  }
                  streakDays={portfolio.streakDays}
                  onBack={() => setCurrentView('CAMERA_HOME')}
                  onCompleteSession={handleSessionComplete}
                />
              )}

              {currentView === 'SCENE_DISCOVERY' && activeScene && (
                <SceneExplorerScreen
                  scene={activeScene}
                  userLevel={preferences.level}
                  autoMode={preferAutoDemoMic}
                  onToggleAuto={() =>
                    handleUpdateAutoDemoMic(!preferAutoDemoMic)
                  }
                  onStartSpeaking={handleStartSpeaking}
                  onBack={() => setCurrentView('CAMERA_HOME')}
                />
              )}

              {currentView === 'SPEAKING_WORKSPACE' && activeScene && (
                <SpeakingWorkspace
                  scene={activeScene}
                  sessionMode={sessionMode}
                  contextKey={activeContextKey}
                  initialRootThought={initialRootThought}
                  userLevel={preferences.level}
                  canFastTrack={portfolio.zeroHintSessionsCount >= 2}
                  initialAutoMode={preferAutoDemoMic}
                  onAutoModeChange={handleUpdateAutoDemoMic}
                  onQuit={handleQuitActiveWorkout}
                  onCompleteSession={handleSessionComplete}
                />
              )}

              {currentView === 'TRANSFER_CHALLENGE' && transferConfig && (
                <TransferChallengeScreen
                  scene={transferConfig.scene}
                  challengeMode={transferConfig.challengeMode}
                  originSessionId={transferConfig.originSessionId}
                  sessionMode={sessionMode}
                  initialAutoMode={preferAutoDemoMic}
                  onAutoModeChange={handleUpdateAutoDemoMic}
                  priorInitialThought={transferConfig.priorInitialThought}
                  onBack={() => {
                    if (sessionResult) {
                      setCurrentView('SESSION_RESULTS');
                    } else {
                      setCurrentView('CAMERA_HOME');
                    }
                  }}
                  onCompleteTransfer={handleSessionComplete}
                />
              )}

              {currentView === 'SESSION_RESULTS' && sessionResult && (
                <SessionResultsScreen
                  result={sessionResult}
                  onStartNewSession={() => {
                    setCurrentView('CAMERA_HOME');
                    setActiveTab('camera');
                  }}
                  onGoToMyEnglish={() => {
                    setCurrentView('CAMERA_HOME');
                    setActiveTab('progress');
                  }}
                  onSelectTopic={() => {
                    handleStartGuidedDemo(activeContextKey);
                  }}
                  onNextTopicHub={() => {
                    setCurrentView('CAMERA_HOME');
                    setActiveTab('practice');
                  }}
                  onStartTransferChallenge={handleStartTransferChallenge}
                />
              )}

              {currentView === 'CAMERA_HOME' &&
                (activeTab === 'practice' || activeTab === 'think') && (
                  <ThinkScreen
                    latestResult={sessionResult || savedSessions[0] || null}
                    streakDays={portfolio.streakDays}
                    onStartTransferChallenge={handleStartTransferChallenge}
                    onStartDailySprint={(sprintScene) =>
                      handleOpenCameraPractice(
                        sprintScene || SAMPLE_STUDY_SCENE,
                        preferAutoDemoMic ? 'demo' : 'real'
                      )
                    }
                    onSelectScene={(scene, ctxKey) => {
                      handleSceneCaptured(
                        scene,
                        scene.imageUrl,
                        preferAutoDemoMic ? 'demo' : 'real',
                        ctxKey || 'STUDY_WORKSPACE'
                      );
                    }}
                    onStartFreeSelfTalk={() => {
                      handleSceneCaptured(
                        SAMPLE_STUDY_SCENE,
                        SAMPLE_STUDY_SCENE.imageUrl,
                        preferAutoDemoMic ? 'demo' : 'real',
                        'STUDY_WORKSPACE'
                      );
                      setCurrentView('SPEAKING_WORKSPACE');
                    }}
                  />
                )}

              {currentView === 'CAMERA_HOME' &&
                (activeTab === 'progress' ||
                  activeTab === 'my-english' ||
                  activeTab === 'profile') && (
                  <MyEnglishScreen
                    sessions={savedSessions}
                    userPreferences={preferences}
                    autoDemoMic={preferAutoDemoMic}
                    onToggleAutoDemoMic={() =>
                      handleUpdateAutoDemoMic(!preferAutoDemoMic)
                    }
                    onToggleLevel={handleToggleUserLevel}
                    onToggleHideSamples={handleToggleHideSamples}
                    onSelectSession={handleSelectHistorySession}
                    onStartBlindRecall={handleStartBlindRecall}
                    onPracticeExpression={handlePracticeExpression}
                    onStartNewWorkout={() => {
                      setActiveTab('camera');
                      setCurrentView('CAMERA_HOME');
                    }}
                    onClearHistory={() => setSavedSessions([])}
                  />
                )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Clean 3-Tab Apple Bottom Navigation: Camera · Practice · My English */}
        {showBottomNav && (
          <BottomNavigation
            activeTab={activeTab}
            isDarkTheme={false}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (currentView !== 'CAMERA_HOME') {
                setCurrentView('CAMERA_HOME');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
