/**
 * ThinkDirect V3 Core Types — DevFest 2026 MVP
 * Complete session state models, dual-mode adapters, and observable SLA metrics.
 */

export type UserLevel = 'A2' | 'B1' | 'B2' | 'Not sure';

export type HardestPart =
  | "I know what I mean, but I can't say it quickly."
  | "I can say short sentences, but I don't know how to continue."
  | 'I pause too much.'
  | 'I want to express my ideas more naturally.';

export type AppTab =
  | 'home'
  | 'practice'
  | 'camera'
  | 'progress'
  | 'profile'
  | 'explore'
  | 'think'
  | 'my-english';

export type AppView =
  | 'ONBOARDING'
  | 'CAMERA_HOME'
  | 'CAMERA_PRACTICE'
  | 'SCENE_DISCOVERY'
  | 'SPEAKING_WORKSPACE'
  | 'TRANSFER_CHALLENGE'
  | 'SESSION_RESULTS';

export type LearningStage = AppView;

export type LearningStageKey =
  | 'EXPANSION'
  | 'IDEA_DEVELOPMENT'
  | 'GUIDED_SELF_TALK'
  | 'INDEPENDENT_RECALL';

export type FrameworkType = '5W1H' | 'IDEA_REASON_EXAMPLE';

export type IdeaQuestionKey = 'Why' | 'How' | 'Point' | 'Reason' | 'Example';

export type SessionMode = 'real' | 'demo';

export type InputMode = 'microphone' | 'typing' | 'demo_sample';

export type VoiceInputState =
  | 'IDLE'
  | 'RECORDING'
  | 'PAUSED'
  | 'PROCESSING'
  | 'TRANSCRIPT_REVIEW'
  | 'EVALUATING'
  | 'ERROR';

export type MicrophoneStatus = VoiceInputState;

export type ThinkingPromptCategory = 'NOTICE' | 'QUESTION' | 'CONSIDER' | 'DECIDE';

export interface ThinkingPrompt {
  category: ThinkingPromptCategory;
  categoryLabel: string;
  question: string;
  helperText?: string;
}

export type PracticeContextKey = 'STUDY_WORKSPACE' | 'MORNING_COFFEE' | 'PLANNING_DAY';

export interface PracticeContextData {
  key: PracticeContextKey;
  title: string;
  topicLabel: string;
  initialThought: string;
  expansion1Prompt: string;
  expansion1Sample: string;
  expansion1IncorrectSample: string;
  expansion1IncorrectFeedback: string;
  expansion2Prompt: string;
  expansion2Sample: string;
  whyPrompt: string;
  whySample: string;
  howPrompt: string;
  howSample: string;
  pointPrompt?: string;
  pointSample?: string;
  reasonPrompt?: string;
  reasonSample?: string;
  examplePrompt?: string;
  exampleSample?: string;
  selfTalkPrompt: string;
  selfTalkMonologue: string;
  independentRecallPrompt: string;
  independentRecallSample: string;
  thinkingPrompts: ThinkingPrompt[];
  speakingStrength: string;
  actionableImprovement: string;
  nextPracticeSuggestion: string;
}

export type ExpansionOutcome =
  | 'VALID_EXPANSION'
  | 'REPEAT'
  | 'OFF_TOPIC'
  | 'UNCLEAR'
  | 'TRANSCRIPTION_ERROR';

export type IdeaValidationOutcome =
  | 'VALID_WHY'
  | 'VALID_HOW'
  | 'VALID_POINT'
  | 'VALID_REASON'
  | 'VALID_EXAMPLE'
  | 'REPEATED_WHY_AS_HOW'
  | 'REPEATED_REASON_AS_EXAMPLE'
  | 'INVALID_INTENT'
  | 'UNCLEAR';

export interface DetectedObject {
  name: string;
  definition: string;
  contextualSentence: string;
  actionChunk?: string;
  xPercent?: number;
  yPercent?: number;
  phonetic?: string;
  category?: string;
  vietnameseMeaning?: string;
}

export interface ContextualExpression {
  phrase: string;
  meaning: string;
  example: string;
  vietnameseMeaning?: string;
}

export interface ExpansionRungBlueprint {
  stepNum: 1 | 2 | 3;
  focusCue: string;
  exampleChunk: string;
  sampleSentence: string;
}

export interface ScenePracticeBlueprint {
  expansionRungs: [
    ExpansionRungBlueprint,
    ExpansionRungBlueprint,
    ExpansionRungBlueprint
  ];
  fiveWOneH: {
    whyPrompt: string;
    whySample: string;
    howPrompt: string;
    howSample: string;
  };
  preOpinion: {
    pointPrompt: string;
    pointSample: string;
    reasonPrompt: string;
    reasonSample: string;
    examplePrompt: string;
    exampleSample: string;
  };
  selfTalk: {
    situationPrompt: string;
    beat1Notice: string;
    beat2Hypothesize: string;
    beat3Decide: string;
    fullMonologue: string;
  };
  recall: {
    prompt: string;
    sampleSpeech: string;
    sprintStep1Sample: string;
    sprintStep2Sample: string;
  };
  quickVietnameseBridgeChips: string[];
}

export interface ApiHealthStatus {
  status: 'ok' | 'error';
  hasApiKey: boolean;
  keySource: 'env' | 'runtime' | 'header' | 'none';
  maskedKey?: string;
  models: {
    vision: string;
    stt: string;
    coach: string;
    tts: string;
  };
  timestamp: number;
}

export interface SceneData {
  title: string;
  description: string;
  imageUrl: string;
  objects: DetectedObject[];
  suggestedExpressions: ContextualExpression[];
  openingQuestion: string;
  suggestedFramework: FrameworkType;
  isSample: boolean;
  initialSuggestedThought?: string;
  userGoal?: string;
  practiceBlueprint?: ScenePracticeBlueprint;
}

export interface SpeakingAttempt {
  attemptId: string;
  questionId: string;
  stageKey: LearningStageKey;
  source: InputMode;
  userText: string;
  transcriptText?: string;
  isValid: boolean;
  outcome: ExpansionOutcome | IdeaValidationOutcome | 'VALID_SELF_TALK' | 'VALID_RECALL';
  feedback: string;
  addedInformation?: string;
  durationSeconds?: number;
  timestamp: number;
}

export interface HintEvent {
  stageKey: LearningStageKey;
  questionId: string;
  hintLevel: 1 | 2 | 3;
  isVietnameseRescue: boolean;
  timestamp: number;
}

/**
 * 6 Observable MVP Success Metrics (Project Overview Section 9)
 * Strictly observable from learner utterances, turn counts, hint logs, and recording duration.
 */
export interface SessionMetrics {
  meaningfulIdeaUnits: number;
  expansionSuccess: {
    acceptedSteps: number;
    totalAttempts: number;
    addedDetailsCount: number;
    ratePercent: number;
  };
  hintUsage: {
    totalHintsUsed: number;
    maxHintLevel: 0 | 1 | 2 | 3;
    vietnameseRescueUsed: boolean;
    recallHintUsed: boolean;
    dependencyLabel: 'Independent' | 'Light support' | 'Guided support';
  };
  speechContinuity: {
    totalSpeakingSeconds: number;
    selfTalkSeconds: number;
    recallSeconds: number;
    recallWordCount: number;
    initialWordCount: number;
    spokenTurnsCount: number;
    typedTurnsCount: number;
  };
  independentRecall: {
    recalledUnits: number;
    targetUnits: number;
    coveragePercent: number;
    ideasIdentified: string[];
    usedWithoutHints: boolean;
  };
  sessionCompletion: {
    stagesCompleted: number;
    totalStages: 4;
    completedCoreJourney: boolean;
  };
}

export interface SessionData {
  sessionId: string;
  sessionMode: SessionMode;
  sourceScene: SceneData;
  rootThought: string;
  expansionAttempts: SpeakingAttempt[];
  acceptedExpansions: string[];
  whyAttempt?: SpeakingAttempt;
  howAttempt?: SpeakingAttempt;
  selfTalkAttempt?: SpeakingAttempt;
  independentRecallAttempt?: SpeakingAttempt;
  hintEvents: HintEvent[];
  currentStageKey: LearningStageKey;
  currentSubStep: number;
  synthesizedThoughtSoFar: string;
  frameworkType: FrameworkType;
}

export type SessionType =
  | 'core_journey'
  | 'transfer_challenge'
  | 'blind_recall'
  | 'daily_sprint';

export interface ThoughtChainNode {
  id: 'action' | 'context' | 'purpose' | 'problem' | 'decision';
  label: string;
  isComplete: boolean;
  matchedSnippet?: string;
}

export interface ConceptBridgeResult {
  vietnameseIdea: string;
  englishChunk: string;
  contextAnchor: string;
  selfBuildPrompt: string;
}

export interface NaturalPhrasingUpgrade {
  learnerOriginal: string;
  naturalPhrasing: string;
  upgradedChunk: string;
  whyItHelps: string;
}

export interface TransferEvaluationResult {
  isValid: boolean;
  isTransferVerified: boolean;
  pillarsTransferred: number;
  totalPillars: 4;
  nodes: ThoughtChainNode[];
  feedback: string;
  missingPillarPrompt?: string;
  independentExpressionsUsed: string[];
}

export interface ScaffoldingDecayStep {
  id: string;
  shortLabel: string;
  sceneTitle: string;
  hintsUsed: number;
  dependencyLabel: 'Independent' | 'Light support' | 'Guided support';
  sessionType: SessionType;
  independencePercent: number;
}

export interface SessionResultData {
  id: string;
  timestamp: number;
  sceneTitle: string;
  sceneImageUrl: string;
  isDemoSession: boolean;
  isSeededSample?: boolean;
  isNewlyCompleted?: boolean;
  sessionType?: SessionType;
  originSessionId?: string;
  srsStage?: 0 | 1 | 2 | 3;
  nextReviewAt?: number;
  lastReviewedAt?: number;
  frameworkUsed?: FrameworkType;
  objectsLearned: DetectedObject[];
  expressionsLearned: ContextualExpression[];
  thoughtJourney: {
    initialThought: string;
    expandedThought: string;
    purposeWhy: string;
    methodHow: string;
    selfTalkMonologue: string;
    independentRecall: string;
  };
  metrics?: SessionMetrics;
  naturalUpgrade?: NaturalPhrasingUpgrade;
  selfTalkDuration: number;
  totalHintsUsed: number;
  ideasExpressedCount: number;
  independentExpressionsUsed: string[];
  communicationStrength: string;
  oneThingToImprove: string;
  suggestedNextPractice: string;
  initialThought?: string;
  finalThought?: string;
}

export interface CoachingDecision {
  isUnderstandable: boolean;
  isAlreadyComplete: boolean;
  isRelevant: boolean;
  feedback: string;
  synthesizedThought: string;
  nextPrompt: string;
  hintL1: string;
  hintL2: string;
  hintL3: string;
  vietnameseRescue: string;
  detectedTopic: string;
  suggestedFramework: string;
}

export interface UserPreferences {
  level: UserLevel;
  hardestPart: HardestPart;
  hasCompletedOnboarding: boolean;
  preferAutoDemoMic?: boolean;
  hideSampleSessions?: boolean;
}
