import { PracticeContextKey, SceneData } from '../types';
import {
  SAMPLE_STUDY_SCENE,
  SAMPLE_COFFEE_SCENE,
  SAMPLE_PLANNING_SCENE,
} from './sampleSceneData';

export type PromptCategory = 'all' | 'work_tech' | 'campus_study' | 'daily_life';

export interface DailyPromptItem {
  id: string;
  category: Exclude<PromptCategory, 'all'>;
  categoryLabel: string;
  title: string;
  subtitle: string;
  durationBadge: string;
  contextKey: PracticeContextKey;
  scene: SceneData;
}

/**
 * 12 No-Camera Daily Speaking Prompts for Vietnamese A2–B1 learners
 * Designed for moments when opening the camera isn't convenient (bus, office, café, night review).
 */
export const DAILY_SPEAKING_PROMPTS: DailyPromptItem[] = [
  {
    id: 'university_project',
    category: 'work_tech',
    categoryLabel: 'Work & Tech',
    title: 'Debugging a login issue',
    subtitle: 'Explain what you are building, what broke, and your first check.',
    durationBadge: 'Core · 4m',
    contextKey: 'STUDY_WORKSPACE',
    scene: SAMPLE_STUDY_SCENE,
  },
  {
    id: 'daily_standup',
    category: 'work_tech',
    categoryLabel: 'Work & Tech',
    title: 'Daily standup update',
    subtitle: 'Share what you finished yesterday, today’s goal, and one blocker.',
    durationBadge: 'Work · 3m',
    contextKey: 'STUDY_WORKSPACE',
    scene: {
      ...SAMPLE_STUDY_SCENE,
      title: 'Team Standup Update',
      description: 'Preparing a concise morning update for your engineering or project team.',
      initialSuggestedThought: "I'm sharing my progress.",
      openingQuestion: 'What are you updating your team about today?',
      suggestedExpressions: [
        {
          phrase: 'wrap up the UI',
          meaning: 'Finish the remaining user interface work',
          example: "Today I want to wrap up the UI before afternoon testing.",
        },
        {
          phrase: 'blocked by an API change',
          meaning: 'Waiting on a backend update to proceed',
          example: "Right now I'm blocked by an API change on staging.",
        },
        {
          phrase: 'sync with my teammate',
          meaning: 'Have a quick check-in to align next steps',
          example: "After standup, I'll sync with my teammate to fix it.",
        },
      ],
    },
  },
  {
    id: 'deadline_extension',
    category: 'work_tech',
    categoryLabel: 'Work & Tech',
    title: 'Asking for 1 extra day on a deadline',
    subtitle: 'Explain why scope grew and propose a realistic delivery plan.',
    durationBadge: 'Work · 3m',
    contextKey: 'PLANNING_DAY',
    scene: {
      ...SAMPLE_PLANNING_SCENE,
      title: 'Negotiating a Realistic Deadline',
      description: 'Explaining task complexity calmly and proposing a clear completion time.',
      initialSuggestedThought: 'I need one extra day.',
      openingQuestion: 'Why do you need a little more time on this task?',
      suggestedExpressions: [
        {
          phrase: 'ran into edge cases',
          meaning: 'Found unexpected scenarios that need handling',
          example: 'Testing took longer because I ran into edge cases.',
        },
        {
          phrase: 'deliver a solid version',
          meaning: 'Ship reliable, well-tested work instead of rushing',
          example: 'One extra day helps me deliver a solid version.',
        },
        {
          phrase: 'send a preview tonight',
          meaning: 'Share early progress so the team stays confident',
          example: "I'll send a preview tonight and finalize tomorrow morning.",
        },
      ],
    },
  },
  {
    id: 'explain_feature',
    category: 'work_tech',
    categoryLabel: 'Work & Tech',
    title: 'Demoing a new app feature',
    subtitle: 'Walk a non-technical teammate through how your feature helps users.',
    durationBadge: 'Work · 4m',
    contextKey: 'STUDY_WORKSPACE',
    scene: {
      ...SAMPLE_STUDY_SCENE,
      title: 'Explaining a Feature Simply',
      description: 'Showing how a new screen solves a real problem for everyday users.',
      initialSuggestedThought: 'I built a new feature.',
      openingQuestion: 'What problem does your new feature solve for users?',
      suggestedExpressions: [
        {
          phrase: 'saves two extra taps',
          meaning: 'Makes a user flow faster and simpler',
          example: 'This shortcut saves two extra taps on mobile.',
        },
        {
          phrase: 'easier for first-time users',
          meaning: 'Reduces confusion on day one',
          example: 'Clear labels make it easier for first-time users.',
        },
        {
          phrase: 'gather quick feedback',
          meaning: 'Test with 2–3 people to spot confusion early',
          example: "Next, I'll gather quick feedback from three classmates.",
        },
      ],
    },
  },
  {
    id: 'study_week_plan',
    category: 'campus_study',
    categoryLabel: 'Campus & Study',
    title: 'Planning your study week',
    subtitle: 'Prioritize urgent assignments and protect your deep-focus hours.',
    durationBadge: 'Core · 4m',
    contextKey: 'PLANNING_DAY',
    scene: SAMPLE_PLANNING_SCENE,
  },
  {
    id: 'group_presentation',
    category: 'campus_study',
    categoryLabel: 'Campus & Study',
    title: 'Rehearsing a group presentation',
    subtitle: 'Connect your opening hook, main slide point, and timing check.',
    durationBadge: 'Campus · 3m',
    contextKey: 'MORNING_COFFEE',
    scene: {
      ...SAMPLE_COFFEE_SCENE,
      title: 'Group Presentation Rehearsal',
      description: 'Practicing your 2-minute speaking part before meeting classmates.',
      initialSuggestedThought: "I'm practicing my slides.",
      openingQuestion: 'How are you preparing for your part of the presentation?',
      suggestedExpressions: [
        {
          phrase: 'keep my opening concise',
          meaning: 'Start clearly without rambling',
          example: 'I want to keep my opening concise under thirty seconds.',
        },
        {
          phrase: 'speak without reading slides',
          meaning: 'Maintain natural eye contact with the audience',
          example: 'Bullet keywords help me speak without reading slides.',
        },
        {
          phrase: 'time my transitions',
          meaning: 'Practice smooth handoffs to the next speaker',
          example: "I'll time my transitions once more before class.",
        },
      ],
    },
  },
  {
    id: 'summarize_article',
    category: 'campus_study',
    categoryLabel: 'Campus & Study',
    title: 'Summarizing a lecture or video',
    subtitle: 'State the main takeaway in English and how you will apply it.',
    durationBadge: 'Campus · 3m',
    contextKey: 'PLANNING_DAY',
    scene: {
      ...SAMPLE_PLANNING_SCENE,
      title: 'Summarizing Today’s Key Lesson',
      description: 'Turning passive reading notes into active spoken English thoughts.',
      initialSuggestedThought: 'I learned a useful concept.',
      openingQuestion: 'What is one idea you just learned and why is it useful?',
      suggestedExpressions: [
        {
          phrase: 'main takeaway is',
          meaning: 'Introduce the single most important point',
          example: 'The main takeaway is breaking large problems into small steps.',
        },
        {
          phrase: 'apply it right away',
          meaning: 'Put theory into real practice immediately',
          example: 'I want to apply it right away in my capstone project.',
        },
        {
          phrase: 'explain it in my own words',
          meaning: 'Test real understanding without memorizing definitions',
          example: "First, I'll explain it in my own words aloud.",
        },
      ],
    },
  },
  {
    id: 'cafe_vs_library',
    category: 'campus_study',
    categoryLabel: 'Campus & Study',
    title: 'Choosing a study spot today',
    subtitle: 'Compare studying at a quiet library vs. an energetic coffee shop.',
    durationBadge: 'Opinion · 3m',
    contextKey: 'MORNING_COFFEE',
    scene: {
      ...SAMPLE_COFFEE_SCENE,
      title: 'Coffee Shop vs. Quiet Library',
      description: 'Expressing a personal preference with a clear reason and example.',
      suggestedFramework: 'IDEA_REASON_EXAMPLE',
      initialSuggestedThought: 'I prefer studying at a café.',
      openingQuestion: 'Where do you focus better today, and why?',
      suggestedExpressions: [
        {
          phrase: 'light background buzz',
          meaning: 'Gentle ambient sound in a coffee shop',
          example: 'A light background buzz keeps me awake in the afternoon.',
        },
        {
          phrase: 'switch environments',
          meaning: 'Move to a fresh place to reset focus',
          example: 'When I feel stuck at home, I switch environments.',
        },
        {
          phrase: 'put on noise-canceling headphones',
          meaning: 'Block loud chatter when deep focus is needed',
          example: "If it gets noisy, I'll put on noise-canceling headphones.",
        },
      ],
    },
  },
  {
    id: 'morning_routine',
    category: 'daily_life',
    categoryLabel: 'Daily Life',
    title: 'Morning coffee & daily priorities',
    subtitle: 'Talk through your morning pace, traffic timing, and first win.',
    durationBadge: 'Core · 4m',
    contextKey: 'MORNING_COFFEE',
    scene: SAMPLE_COFFEE_SCENE,
  },
  {
    id: 'ordering_custom_drink',
    category: 'daily_life',
    categoryLabel: 'Daily Life',
    title: 'Ordering coffee & snack naturally',
    subtitle: 'Practice stating what you want, less sugar/ice, and why.',
    durationBadge: 'Daily · 2m',
    contextKey: 'MORNING_COFFEE',
    scene: {
      ...SAMPLE_COFFEE_SCENE,
      title: 'Ordering a Custom Morning Drink',
      description: 'Expressing everyday food/drink preferences smoothly without translating.',
      initialSuggestedThought: "I'm ordering an iced latte.",
      openingQuestion: 'How do you like your drink today and why?',
      suggestedExpressions: [
        {
          phrase: 'less sweet than usual',
          meaning: 'Ask for reduced syrup or sugar naturally',
          example: "I'd like it less sweet than usual this morning.",
        },
        {
          phrase: 'grab a quick bite',
          meaning: 'Eat something light when short on time',
          example: "I'll grab a quick bite before my nine o'clock class.",
        },
        {
          phrase: 'take it to go',
          meaning: 'Order in a travel cup so you can leave on time',
          example: "Since I'm running slightly late, I'll take it to go.",
        },
      ],
    },
  },
  {
    id: 'rainy_commute',
    category: 'daily_life',
    categoryLabel: 'Daily Life',
    title: 'Adapting to sudden heavy rain',
    subtitle: 'Think aloud when weather changes your commute or evening plan.',
    durationBadge: 'Daily · 3m',
    contextKey: 'MORNING_COFFEE',
    scene: {
      ...SAMPLE_COFFEE_SCENE,
      title: 'Rainy Commute Backup Plan',
      description: 'Problem-solving aloud in English when weather slows down your trip.',
      initialSuggestedThought: "It's raining heavily outside.",
      openingQuestion: 'How does the rain change your plan right now?',
      suggestedExpressions: [
        {
          phrase: 'roads might flood',
          meaning: 'Heavy rain can slow down motorbike or bus routes',
          example: 'Main roads might flood during rush hour.',
        },
        {
          phrase: 'message my team early',
          meaning: 'Let others know proactively before running late',
          example: "I should message my team early in case I'm ten minutes late.",
        },
        {
          phrase: 'join the call from here',
          meaning: 'Switch to remote participation smoothly',
          example: "If the rain doesn't let up, I'll join the call from here.",
        },
      ],
    },
  },
  {
    id: 'evening_wind_down',
    category: 'daily_life',
    categoryLabel: 'Daily Life',
    title: 'Wrapping up & recharging tonight',
    subtitle: 'Reflect on one win from today and how you will recharge tonight.',
    durationBadge: 'Daily · 3m',
    contextKey: 'PLANNING_DAY',
    scene: {
      ...SAMPLE_PLANNING_SCENE,
      title: 'Evening Reflection & Recharge',
      description: 'Closing your day with calm English self-talk instead of scrolling late.',
      initialSuggestedThought: "I'm wrapping up for today.",
      openingQuestion: 'What did you finish today, and how will you unwind tonight?',
      suggestedExpressions: [
        {
          phrase: 'call it a day',
          meaning: 'Stop working intentionally for the evening',
          example: "After sending this last commit, I'll call it a day.",
        },
        {
          phrase: 'step away from screens',
          meaning: 'Give your eyes and mind a real break',
          example: 'I want to step away from screens an hour before bed.',
        },
        {
          phrase: 'write tomorrow’s top three',
          meaning: 'Note 3 key priorities so you wake up with clarity',
          example: "First, I'll write tomorrow's top three tasks in my planner.",
        },
      ],
    },
  },
];
