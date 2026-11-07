import { SceneData, PracticeContextKey } from '../types';

const sampleStudyImage = new URL(
  '../assets/images/study_workspace_1793767529641.jpg',
  import.meta.url
).href;

const morningCoffeeImage = new URL(
  '../assets/images/morning_coffee_scene.jpg',
  import.meta.url
).href;

const studyPlannerImage = new URL(
  '../assets/images/study_planner_scene.jpg',
  import.meta.url
).href;

export const SAMPLE_STUDY_SCENE: SceneData = {
  title: 'University Study Workspace',
  description:
    'A focused personal workspace with laptop code editor, headphones, notebook, keyboard, and warm coffee.',
  imageUrl: sampleStudyImage,
  isSample: true,
  openingQuestion: 'What are you doing at your desk right now?',
  initialSuggestedThought: "I'm coding.",
  suggestedFramework: '5W1H',
  objects: [
    {
      name: 'Laptop',
      phonetic: '/ˈlæp.tɒp/',
      actionChunk: 'build a login page',
      xPercent: 50,
      yPercent: 36,
      definition: 'A portable computer open on your desk for coding and coursework.',
      contextualSentence: "I'm building a login page on my laptop.",
      category: 'Electronics',
      vietnameseMeaning: 'máy tính xách tay',
    },
    {
      name: 'Headphones',
      phonetic: '/ˈhed.fəʊnz/',
      actionChunk: 'block out noise',
      xPercent: 21,
      yPercent: 64,
      definition: 'Over-ear headphones worn to block noise and stay focused.',
      contextualSentence: "I'm wearing headphones so I can focus on my code.",
      category: 'Audio',
      vietnameseMeaning: 'tai nghe chụp tai',
    },
    {
      name: 'Ceramic Mug',
      phonetic: '/səˈræm.ɪk mʌɡ/',
      actionChunk: 'sip warm coffee',
      xPercent: 79,
      yPercent: 56,
      definition: 'A cup of hot coffee keeping your energy steady while studying.',
      contextualSentence: "I'm sipping hot coffee to stay awake while coding.",
      category: 'Beverage',
      vietnameseMeaning: 'tách cà phê sứ',
    },
    {
      name: 'Notebook',
      phonetic: '/ˈnəʊt.bʊk/',
      actionChunk: 'sketch API notes',
      xPercent: 78,
      yPercent: 77,
      definition: 'An open notebook for jotting down login flows and quick ideas.',
      contextualSentence: "I'm sketching the login flow in my notebook first.",
      category: 'Stationery',
      vietnameseMeaning: 'sổ tay ghi chép',
    },
    {
      name: 'Keyboard',
      phonetic: '/ˈkiː.bɔːd/',
      actionChunk: 'type clean code',
      xPercent: 47,
      yPercent: 76,
      definition: 'A compact desk keyboard for comfortable typing.',
      contextualSentence: "I'm typing React components on my wireless keyboard.",
      category: 'Peripherals',
      vietnameseMeaning: 'bàn phím rời',
    },
  ],
  suggestedExpressions: [
    {
      phrase: 'build a login page',
      meaning: 'create the user sign-in screen for a web or mobile project',
      example: "I'm building a login page for my university project.",
      vietnameseMeaning: 'xây dựng trang đăng nhập',
    },
    {
      phrase: 'sign in securely',
      meaning: 'let users log into their account safely with verified tokens',
      example: 'Students need to sign in securely to access their courses.',
      vietnameseMeaning: 'đăng nhập an toàn',
    },
    {
      phrase: 'check the API response',
      meaning: 'look at the server status and data to see why a request failed',
      example: 'Maybe the token has expired—I should check the API response first.',
      vietnameseMeaning: 'kiểm tra phản hồi API',
    },
  ],
};

export const SAMPLE_COFFEE_SCENE: SceneData = {
  title: 'Morning Routine & Coffee',
  description:
    'A sunlit morning table with a warm coffee mug, lecture notes, presentation laptop, and window plant.',
  imageUrl: morningCoffeeImage,
  isSample: true,
  openingQuestion: 'What are you doing before your morning class?',
  initialSuggestedThought: "I'm drinking coffee.",
  suggestedFramework: '5W1H',
  objects: [
    {
      name: 'Coffee Mug',
      phonetic: '/ˈkɒf.i mʌɡ/',
      actionChunk: 'drink warm coffee',
      xPercent: 31,
      yPercent: 57,
      definition: 'A warm cup of morning latte giving steady energy before class.',
      contextualSentence: "I'm drinking warm coffee before heading out to class.",
      category: 'Beverage',
      vietnameseMeaning: 'ly cà phê sáng',
    },
    {
      name: 'Laptop',
      phonetic: '/ˈlæp.tɒp/',
      actionChunk: 'check my slides',
      xPercent: 74,
      yPercent: 35,
      definition: 'Your laptop open to presentation slides for today’s class.',
      contextualSentence: "I'm checking my presentation slides one last time.",
      category: 'Electronics',
      vietnameseMeaning: 'máy tính xách tay',
    },
    {
      name: 'Lecture Notes',
      phonetic: '/ˈlek.tʃər nəʊts/',
      actionChunk: 'review key points',
      xPercent: 63,
      yPercent: 77,
      definition: 'Printed notes and a highlighter for reviewing key talking points.',
      contextualSentence: "I'm reviewing my lecture notes while finishing coffee.",
      category: 'Stationery',
      vietnameseMeaning: 'tài liệu bài giảng',
    },
    {
      name: 'Window Plant',
      phonetic: '/ˈwɪn.dəʊ plɑːnt/',
      actionChunk: 'sit by the window',
      xPercent: 37,
      yPercent: 28,
      definition: 'A green potted plant beside the sunny morning window.',
      contextualSentence: "I'm sitting by the sunny window to wake up calmly.",
      category: 'Environment',
      vietnameseMeaning: 'chậu cây bên cửa sổ',
    },
  ],
  suggestedExpressions: [
    {
      phrase: 'before morning class',
      meaning: 'in the quiet preparation window right before your first lecture',
      example: "I'm drinking coffee before my morning class.",
      vietnameseMeaning: 'trước giờ học sáng',
    },
    {
      phrase: 'review presentation slides',
      meaning: 'go over key talking points before speaking in front of your team',
      example: "I'll finish my coffee and review my presentation slides.",
      vietnameseMeaning: 'xem lại slide thuyết trình',
    },
    {
      phrase: 'leave ten minutes early',
      meaning: 'head out slightly ahead of schedule in case morning traffic is heavy',
      example: 'Maybe traffic will be heavy, so I should leave ten minutes early.',
      vietnameseMeaning: 'đi sớm hơn 10 phút',
    },
  ],
};

export const SAMPLE_PLANNING_SCENE: SceneData = {
  title: 'Planning My Study Week',
  description:
    'An organized wooden desk with an open daily planner, black pen, wireless keyboard, and desk clock.',
  imageUrl: studyPlannerImage,
  isSample: true,
  openingQuestion: 'How are you organizing your tasks today?',
  initialSuggestedThought: "I'm planning my day.",
  suggestedFramework: '5W1H',
  objects: [
    {
      name: 'Daily Planner',
      phonetic: '/ˈdeɪ.li ˈplæn.ər/',
      actionChunk: 'write a quick list',
      xPercent: 42,
      yPercent: 63,
      definition: 'An open notebook used to map out today’s top three priorities.',
      contextualSentence: "I'm writing my top three tasks in my daily planner.",
      category: 'Stationery',
      vietnameseMeaning: 'sổ lập kế hoạch',
    },
    {
      name: 'Keyboard',
      phonetic: '/ˈkiː.bɔːd/',
      actionChunk: 'start the hardest task',
      xPercent: 73,
      yPercent: 33,
      definition: 'A wireless mechanical keyboard ready for your first focus block.',
      contextualSentence: "I'm ready to start typing my hardest assignment first.",
      category: 'Peripherals',
      vietnameseMeaning: 'bàn phím cơ không dây',
    },
    {
      name: 'Pen',
      phonetic: '/pen/',
      actionChunk: 'check off tasks',
      xPercent: 72,
      yPercent: 77,
      definition: 'A black pen resting beside your planner to cross off finished work.',
      contextualSentence: "I'm using a pen to check off tasks one by one.",
      category: 'Stationery',
      vietnameseMeaning: 'bút viết',
    },
    {
      name: 'Desk Clock',
      phonetic: '/desk klɒk/',
      actionChunk: 'block ninety minutes',
      xPercent: 25,
      yPercent: 32,
      definition: 'A small wooden clock helping you time focused study blocks.',
      contextualSentence: "I'm setting aside ninety quiet minutes this morning.",
      category: 'Environment',
      vietnameseMeaning: 'đồng hồ để bàn',
    },
  ],
  suggestedExpressions: [
    {
      phrase: 'feel overwhelmed',
      meaning: 'feel stressed when too many deadlines pile up at the same time',
      example: 'A quick checklist keeps me from feeling overwhelmed.',
      vietnameseMeaning: 'cảm thấy quá tải',
    },
    {
      phrase: 'while my mind is fresh',
      meaning: 'in the morning when your focus and energy are strongest',
      example: "I'll start with the hardest task while my mind is fresh.",
      vietnameseMeaning: 'khi đầu óc còn minh mẫn',
    },
    {
      phrase: 'silence notifications',
      meaning: 'mute phone and chat alerts so nothing interrupts your focus block',
      example: 'Maybe I should silence notifications for ninety minutes first.',
      vietnameseMeaning: 'tắt thông báo gây xao nhãng',
    },
  ],
};

export function getSceneForContextKey(key: PracticeContextKey): SceneData {
  switch (key) {
    case 'MORNING_COFFEE':
      return SAMPLE_COFFEE_SCENE;
    case 'PLANNING_DAY':
      return SAMPLE_PLANNING_SCENE;
    case 'STUDY_WORKSPACE':
    default:
      return SAMPLE_STUDY_SCENE;
  }
}
