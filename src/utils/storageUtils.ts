import {
  SessionResultData,
  UserPreferences,
  ContextualExpression,
  ScaffoldingDecayStep,
} from '../types';
import { SAMPLE_COFFEE_SCENE, SAMPLE_PLANNING_SCENE } from '../data/sampleSceneData';

const SESSIONS_KEY = 'thinkdirect_saved_sessions_v2';
const PREFS_KEY = 'thinkdirect_user_prefs_v1';

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

/**
 * Rich baseline sessions (explicitly flagged with `isSeededSample: true`) so the
 * Progress / My English hub looks lived-in during DevFest video demos while allowing
 * real daily learners to filter or clear sample data cleanly at any time.
 */
export const SEEDED_HISTORY_SESSIONS: SessionResultData[] = [
  {
    id: 'seed_morning_coffee',
    timestamp: Date.now() - HOUR_MS * 25,
    sceneTitle: 'Morning Routine & Coffee',
    sceneImageUrl: SAMPLE_COFFEE_SCENE.imageUrl,
    isDemoSession: false,
    isSeededSample: true,
    srsStage: 0,
    nextReviewAt: Date.now() - 1000 * 60 * 45, // Due today for 24h Spaced Recall
    frameworkUsed: '5W1H',
    objectsLearned: SAMPLE_COFFEE_SCENE.objects,
    expressionsLearned: SAMPLE_COFFEE_SCENE.suggestedExpressions,
    thoughtJourney: {
      initialThought: "I'm drinking coffee.",
      expandedThought:
        "I'm drinking coffee before my morning class because I need energy for a busy day.",
      purposeWhy: 'Because I have two lectures and a team presentation to deliver.',
      methodHow: "I'm finishing my coffee while reviewing my presentation slides.",
      selfTalkMonologue:
        'I have twenty minutes before leaving for campus. Maybe traffic will be heavy this morning. I should pack my charger and review my opening slide first.',
      independentRecall:
        "I'm having coffee before my morning class because I have two lectures and a team presentation today. Traffic might be busy, so I'll review my slides and leave a few minutes early.",
    },
    naturalUpgrade: {
      learnerOriginal:
        "Traffic might be busy, so I'll review my slides and leave a few minutes early.",
      naturalPhrasing:
        "In case traffic gets heavy, I'll review my slides now and head out a bit early.",
      upgradedChunk: "In case ... gets heavy, I'll head out...",
      whyItHelps:
        'Links a morning risk smoothly to your preventive move like a native speaker.',
    },
    metrics: {
      meaningfulIdeaUnits: 5,
      expansionSuccess: {
        acceptedSteps: 2,
        totalAttempts: 2,
        addedDetailsCount: 7,
        ratePercent: 100,
      },
      hintUsage: {
        totalHintsUsed: 1,
        maxHintLevel: 1,
        vietnameseRescueUsed: false,
        recallHintUsed: false,
        dependencyLabel: 'Light support',
      },
      speechContinuity: {
        totalSpeakingSeconds: 58,
        selfTalkSeconds: 24,
        recallSeconds: 26,
        recallWordCount: 31,
        initialWordCount: 3,
        spokenTurnsCount: 6,
        typedTurnsCount: 0,
      },
      independentRecall: {
        recalledUnits: 3,
        targetUnits: 3,
        coveragePercent: 100,
        ideasIdentified: [
          'Core Activity & Context',
          'Purpose & Reasoning',
          'Next Immediate Step',
        ],
        usedWithoutHints: true,
      },
      sessionCompletion: {
        stagesCompleted: 4,
        totalStages: 4,
        completedCoreJourney: true,
      },
    },
    selfTalkDuration: 58,
    totalHintsUsed: 1,
    ideasExpressedCount: 5,
    independentExpressionsUsed: ['before morning class', 'review my slides'],
    communicationStrength:
      'Connected your morning preparation smoothly with upcoming lecture priorities.',
    oneThingToImprove:
      "Try linking transitions with 'Right before heading out, I'll...'",
    suggestedNextPractice: 'Capture your study desk during an afternoon coding block.',
  },
  {
    id: 'seed_planning_week',
    timestamp: Date.now() - HOUR_MS * 52,
    sceneTitle: 'Planning My Study Week',
    sceneImageUrl: SAMPLE_PLANNING_SCENE.imageUrl,
    isDemoSession: false,
    isSeededSample: true,
    srsStage: 1,
    nextReviewAt: Date.now() + DAY_MS * 2, // Scheduled in 2 days (3d SRS interval)
    frameworkUsed: '5W1H',
    objectsLearned: SAMPLE_PLANNING_SCENE.objects,
    expressionsLearned: SAMPLE_PLANNING_SCENE.suggestedExpressions,
    thoughtJourney: {
      initialThought: "I'm planning my day.",
      expandedThought:
        "I'm planning my day because I have two major assignments due this week.",
      purposeWhy: 'Writing down a clear checklist keeps me from feeling overwhelmed.',
      methodHow: "I'll start with the hardest assignment first while my mind is fresh.",
      selfTalkMonologue:
        'Both assignments take deep focus. Maybe I should silence notifications for ninety minutes and draft the main section first.',
      independentRecall:
        "I'm organizing my schedule because two major assignments are due this week. A written checklist prevents me from feeling overwhelmed, so I'll silence notifications and finish the hardest task first while my mind is fresh.",
    },
    naturalUpgrade: {
      learnerOriginal:
        "A written checklist prevents me from feeling overwhelmed, so I'll finish the hardest task first.",
      naturalPhrasing:
        "Mapping out a quick checklist keeps me on track, so I'll tackle the hardest task first.",
      upgradedChunk: "keeps me on track, so I'll tackle...",
      whyItHelps:
        'Upgrades basic task words into confident, idiomatic B1–B2 spoken phrasing.',
    },
    metrics: {
      meaningfulIdeaUnits: 5,
      expansionSuccess: {
        acceptedSteps: 2,
        totalAttempts: 2,
        addedDetailsCount: 6,
        ratePercent: 100,
      },
      hintUsage: {
        totalHintsUsed: 3,
        maxHintLevel: 2,
        vietnameseRescueUsed: true,
        recallHintUsed: false,
        dependencyLabel: 'Guided support',
      },
      speechContinuity: {
        totalSpeakingSeconds: 64,
        selfTalkSeconds: 26,
        recallSeconds: 28,
        recallWordCount: 35,
        initialWordCount: 4,
        spokenTurnsCount: 6,
        typedTurnsCount: 0,
      },
      independentRecall: {
        recalledUnits: 3,
        targetUnits: 3,
        coveragePercent: 100,
        ideasIdentified: [
          'Core Activity & Context',
          'Purpose & Reasoning',
          'Next Immediate Step',
        ],
        usedWithoutHints: true,
      },
      sessionCompletion: {
        stagesCompleted: 4,
        totalStages: 4,
        completedCoreJourney: true,
      },
    },
    selfTalkDuration: 64,
    totalHintsUsed: 3,
    ideasExpressedCount: 5,
    independentExpressionsUsed: ['feeling overwhelmed', 'while my mind is fresh'],
    communicationStrength:
      'Used starter hints early on, then connected your study plan smoothly at the end.',
    oneThingToImprove:
      "Add a backup plan phrase such as 'If afternoon meetings run late, I'll...'",
    suggestedNextPractice: 'Practice thinking aloud through a live coding bug.',
  },
];

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

export function getStoredPreferences(): UserPreferences {
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load preferences from localStorage', e);
    }
  }

  return {
    level: 'B1',
    hardestPart: "I know what I mean, but I can't say it quickly.",
    hasCompletedOnboarding: false,
    preferAutoDemoMic: true,
    hideSampleSessions: false,
  };
}

export function saveStoredPreferences(
  prefs: Partial<UserPreferences>
): UserPreferences {
  const current = getStoredPreferences();
  const updated: UserPreferences = { ...current, ...prefs };
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save preferences to localStorage', e);
    }
  }
  return updated;
}

export function getStoredSessions(): SessionResultData[] {
  if (!hasLocalStorage()) {
    return SEEDED_HISTORY_SESSIONS;
  }

  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: SessionResultData) => {
          if (item.id.startsWith('seed_') && item.isSeededSample === undefined) {
            return {
              ...item,
              isSeededSample: true,
              srsStage: item.id === 'seed_morning_coffee' ? 0 : 1,
              nextReviewAt:
                item.nextReviewAt ??
                (item.id === 'seed_morning_coffee'
                  ? Date.now() - 1000 * 60 * 30
                  : Date.now() + DAY_MS * 2),
            };
          }
          return item;
        });
      }
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(SEEDED_HISTORY_SESSIONS));
    return SEEDED_HISTORY_SESSIONS;
  } catch (e) {
    console.error('Failed to load sessions from localStorage', e);
    return SEEDED_HISTORY_SESSIONS;
  }
}

const SRS_INTERVAL_DAYS: Record<0 | 1 | 2 | 3, number> = {
  0: 1,
  1: 3,
  2: 7,
  3: 30,
};

/**
 * Computes Spaced Repetition (1d -> 3d -> 7d -> Mastered) status for a session.
 */
export function getSessionSrsInfo(
  session: SessionResultData,
  now: number = Date.now()
): {
  isDue: boolean;
  stage: 0 | 1 | 2 | 3;
  badgeLabel: string;
} {
  if (session.sessionType === 'blind_recall') {
    return { isDue: false, stage: 3, badgeLabel: 'Recalled' };
  }

  const stage: 0 | 1 | 2 | 3 = session.srsStage ?? 0;
  if (stage >= 3) {
    return { isDue: false, stage: 3, badgeLabel: 'Mastered' };
  }

  const dueAt = session.nextReviewAt ?? session.timestamp + DAY_MS;
  if (dueAt <= now) {
    const label =
      stage === 0 ? 'Due · 24h Recall' : stage === 1 ? 'Due · 3d Recall' : 'Due · 7d Recall';
    return { isDue: true, stage, badgeLabel: label };
  }

  const daysLeft = Math.max(1, Math.ceil((dueAt - now) / DAY_MS));
  return {
    isDue: false,
    stage,
    badgeLabel: `Recall in ${daysLeft}d`,
  };
}

export function saveSessionToStorage(session: SessionResultData): SessionResultData[] {
  const now = Date.now();
  const existing = getStoredSessions().map((s) => {
    const clean = { ...s, isNewlyCompleted: false };
    // Advance SRS stage on the origin session when learner completes a Blind Recall!
    if (
      session.sessionType === 'blind_recall' &&
      session.originSessionId &&
      s.id === session.originSessionId
    ) {
      const prevStage = s.srsStage ?? 0;
      const nextStage = Math.min(3, prevStage + 1) as 0 | 1 | 2 | 3;
      return {
        ...clean,
        srsStage: nextStage,
        lastReviewedAt: now,
        nextReviewAt: now + SRS_INTERVAL_DAYS[nextStage] * DAY_MS,
      };
    }
    return clean;
  });

  const defaultSrsStage: 0 | 1 | 2 | 3 =
    session.sessionType === 'blind_recall' ? 3 : session.srsStage ?? 0;
  const defaultNextReviewAt =
    session.nextReviewAt ?? now + SRS_INTERVAL_DAYS[defaultSrsStage] * DAY_MS;

  const enrichedNew: SessionResultData = {
    ...session,
    isSeededSample: false,
    isNewlyCompleted: true,
    srsStage: defaultSrsStage,
    nextReviewAt: defaultNextReviewAt,
  };

  // Supports up to 120 sessions (~4 months of daily speaking)
  const updated = [
    enrichedNew,
    ...existing.filter((s) => s.id !== session.id),
  ].slice(0, 120);

  if (hasLocalStorage()) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  }
  return updated;
}

export function removeSampleSessionsFromStorage(): SessionResultData[] {
  const personalOnly = getStoredSessions().filter((s) => !s.isSeededSample);
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(personalOnly));
    } catch (e) {
      console.error('Failed to remove sample sessions', e);
    }
  }
  return personalOnly;
}

export function clearStoredSessions(): void {
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
    } catch (e) {
      console.error('Failed to clear sessions', e);
    }
  }
}

export interface LearnedExpressionStatus extends ContextualExpression {
  sceneTitle: string;
  isNew?: boolean;
  spokenCount: number;
  masteryStatus: 'mastered' | 'spoken_once' | 'try_aloud';
  masteryLabel: string;
}

/**
 * Aggregates observable portfolio stats, SRS due queue, & active expression reuse
 * across sessions (zero opaque scores).
 */
export function computePortfolioSummary(
  sessions: SessionResultData[],
  options?: { excludeSamples?: boolean }
) {
  const activeList = options?.excludeSamples
    ? sessions.filter((s) => !s.isSeededSample)
    : sessions;

  const totalSessions = activeList.length;
  const personalSessionsCount = sessions.filter((s) => !s.isSeededSample).length;
  const hasSampleSessions = sessions.some((s) => Boolean(s.isSeededSample));

  const totalIdeas = activeList.reduce(
    (sum, s) => sum + (s.metrics?.meaningfulIdeaUnits ?? s.ideasExpressedCount ?? 4),
    0
  );
  const totalSeconds = activeList.reduce(
    (sum, s) =>
      sum +
      (s.metrics?.speechContinuity.totalSpeakingSeconds ?? s.selfTalkDuration ?? 45),
    0
  );
  const totalSpeakingMinutes =
    totalSessions === 0 ? 0 : Math.max(1, Math.round(totalSeconds / 60));

  const independentSessions = activeList.filter(
    (s) => (s.metrics?.hintUsage.totalHintsUsed ?? s.totalHintsUsed ?? 0) <= 1
  ).length;

  const zeroHintSessionsCount = activeList.filter(
    (s) => (s.metrics?.hintUsage.totalHintsUsed ?? s.totalHintsUsed ?? 0) === 0
  ).length;

  // Build corpus of what the learner actually spoke independently across sessions
  const spokenRecalls = activeList.map((s) => ({
    usedList: (s.independentExpressionsUsed || []).map((p) => p.toLowerCase()),
    recallText: (
      s.thoughtJourney?.independentRecall ||
      s.finalThought ||
      ''
    ).toLowerCase(),
  }));

  const seenPhrases = new Set<string>();
  const learnedExpressions: LearnedExpressionStatus[] = [];

  for (const s of activeList) {
    for (const expr of s.expressionsLearned || []) {
      const key = expr.phrase.toLowerCase().trim();
      if (!seenPhrases.has(key)) {
        seenPhrases.add(key);

        const phraseTokens = key
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 4);

        let spokenCount = 0;
        for (const rec of spokenRecalls) {
          const directHit =
            rec.usedList.some((u) => u.includes(key) || key.includes(u)) ||
            rec.recallText.includes(key);

          const tokenOverlapHit =
            phraseTokens.length >= 2 &&
            phraseTokens.filter((tok) =>
              rec.recallText.includes(tok.slice(0, Math.max(4, tok.length - 1)))
            ).length >= 2;

          if (directHit || tokenOverlapHit) {
            spokenCount += 1;
          }
        }

        const masteryStatus: LearnedExpressionStatus['masteryStatus'] =
          spokenCount >= 2
            ? 'mastered'
            : spokenCount === 1
              ? 'spoken_once'
              : 'try_aloud';
        const masteryLabel =
          spokenCount >= 2
            ? `Mastered (${spokenCount}×)`
            : spokenCount === 1
              ? 'Spoken 1×'
              : 'Try in speech';

        learnedExpressions.push({
          ...expr,
          sceneTitle: s.sceneTitle,
          isNew: Boolean(s.isNewlyCompleted),
          spokenCount,
          masteryStatus,
          masteryLabel,
        });
      }
    }
  }

  const now = Date.now();
  const dueRecallSessions = activeList.filter(
    (s) => s.sessionType !== 'blind_recall' && getSessionSrsInfo(s, now).isDue
  );

  // Calculate distinct calendar day streak honestly (with minimum 1 when active)
  const uniqueDays = new Set(
    activeList.map((s) => new Date(s.timestamp).toISOString().slice(0, 10))
  ).size;
  const streakDays = totalSessions === 0 ? 0 : Math.max(1, Math.min(90, uniqueDays));

  return {
    filteredSessions: activeList,
    totalSessions,
    personalSessionsCount,
    hasSampleSessions,
    totalIdeas,
    totalSpeakingMinutes,
    independentSessions,
    zeroHintSessionsCount,
    learnedExpressions,
    dueRecallSessions,
    streakDays,
  };
}

/**
 * Computes chronological Scaffolding Decay steps (oldest -> newest, up to 4 sessions)
 * to demonstrate progressive reduction in hint dependency on My English.
 */
export function computeScaffoldingDecay(
  sessions: SessionResultData[]
): ScaffoldingDecayStep[] {
  const chronological = [...sessions].slice(0, 4).reverse();

  return chronological.map((s, idx) => {
    const hints = s.metrics?.hintUsage.totalHintsUsed ?? s.totalHintsUsed ?? 0;
    const depLabel =
      s.metrics?.hintUsage.dependencyLabel ??
      (hints === 0
        ? 'Independent'
        : hints <= 2
          ? 'Light support'
          : 'Guided support');
    const sessionType = s.sessionType || 'core_journey';
    const independencePercent =
      sessionType === 'transfer_challenge' || sessionType === 'blind_recall'
        ? 100
        : sessionType === 'daily_sprint' && hints === 0
          ? 98
          : hints === 0
            ? 96
            : hints === 1
              ? 72
              : hints === 2
                ? 55
                : 38;

    return {
      id: s.id,
      shortLabel:
        sessionType === 'transfer_challenge'
          ? 'New'
          : sessionType === 'blind_recall'
            ? 'SRS'
            : sessionType === 'daily_sprint'
              ? '90s'
              : `S${idx + 1}`,
      sceneTitle: s.sceneTitle,
      hintsUsed: hints,
      dependencyLabel: depLabel,
      sessionType,
      independencePercent,
    };
  });
}
