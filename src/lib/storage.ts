import { Question, UserAttempt, User, Course } from "../types";
import { initialQuestions } from "../initialQuestions";

const QUESTIONS_KEY = "eng_quiz_questions_v1";
const ATTEMPTS_KEY = "eng_quiz_attempts_v1";
const USERS_KEY = "eng_quiz_users_v1";
const CATEGORIES_KEY = "eng_quiz_categories_v1";
const COURSES_KEY = "eng_quiz_courses_v1";
const PASSAGES_KEY = "eng_quiz_passages_v1";

const defaultCategories = ["Tenses", "Vocabulary", "Error Detection", "Conversation", "Reading"];

const defaultPassages = [
  {
    id: "pas_1",
    title: "Global Impact of Climate Change on Agriculture",
    content: "Climate change poses an unprecedented threat to global food security. Rising temperatures, shifting precipitation patterns, and extreme weather events are increasingly disrupting agricultural productivity worldwide. In developing nations, smallholder farmers are particularly vulnerable due to limited access to modern technology and financial resources. To mitigate these adverse effects, scientists advocate for the adoption of drought-resistant crop varieties and sustainable farming practices.",
    topic: "Environment & Science",
    cefrLevel: "B2",
    wordCount: 72
  }
];

export function loadPassages(): any[] {
  try {
    const data = localStorage.getItem(PASSAGES_KEY);
    if (!data) {
      localStorage.setItem(PASSAGES_KEY, JSON.stringify(defaultPassages));
      return defaultPassages;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load passages:", error);
    return defaultPassages;
  }
}

export function savePassages(passages: any[]): void {
  try {
    localStorage.setItem(PASSAGES_KEY, JSON.stringify(passages));
  } catch (error) {
    console.error("Failed to save passages:", error);
  }
}

const defaultCourses: Course[] = [
  {
    id: "course_tgat_eng",
    title: "🎓 TGAT English Ultimate Mastery",
    category: "TGAT",
    description: "คอร์สภาษาอังกฤษสำหรับสอบเข้ามหาวิทยาลัยครอบคลุม TGAT1 การสื่อสาร บทสนทนา และการอ่านจับใจความ เน้นสอบจริง!",
    examSets: ["TGAT 66", "TGAT 67", "ทั่วไป (General)"],
    videos: [
      {
        id: "v-1",
        title: "🎬 เจาะลึกโครงสร้างข้อสอบ TGAT1 English Communication & Conversation เทคนิคทำคะแนน 80+",
        youtubeUrl: "https://www.youtube.com/embed/S_8qKInuR_E",
        description: "แนะนำสัดส่วนคะแนน แนวโจทย์บทสนทนา (Conversation) และโจทย์การอ่านจับใจความ (Reading Comprehension)",
        duration: "18:45"
      },
      {
        id: "v-2",
        title: "💡 สรุปสูตรลัดแกรมม่าเด็ดๆ ที่ออกข้อสอบ TGAT และเทคนิค Error Identification",
        youtubeUrl: "https://www.youtube.com/embed/37B_2_Y-NRE",
        description: "วิเคราะห์โครงสร้าง Subject-Verb Agreement, Participle, และ Relative Clauses ที่ออกบ่อยที่สุดในห้องสอบจริง",
        duration: "25:10"
      }
    ]
  },
  {
    id: "course_alevel_eng",
    title: "🚀 A-Level English Advanced Prep",
    category: "A-Level",
    description: "คอร์สติวเข้มภาษาอังกฤษ A-Level สำหรับเน้นทำคะแนนระดับสูง เน้นบทความยาว เทคนิคการอ่านจับใจความ และคำศัพท์ขั้นสูง",
    examSets: ["A-Level 67 Paper A"],
    videos: [
      {
        id: "v-3",
        title: "📰 เทคนิคการสแกนและสคิมมิ่งบทความระดับวิชาการ (Reading Comprehension Hacks for A-Level)",
        youtubeUrl: "https://www.youtube.com/embed/5U77M6yG5jU",
        description: "เรียนรู้วิธีการทำโจทย์ประเภท Text-Completion และ Reading Passage ยาวๆ เพื่อประหยัดเวลาและเพิ่มความแม่นยำสูงสุด",
        duration: "22:15"
      }
    ]
  }
];

const defaultUsers: User[] = [
  {
    id: "user_admin",
    username: "admin",
    passwordHash: "admin123",
    role: "admin",
    realName: "อาจารย์ผู้ดูแลระบบ",
    enrolledCourses: ["course_tgat_eng", "course_alevel_eng"]
  },
  {
    id: "user_student",
    username: "student",
    passwordHash: "student123",
    role: "student",
    realName: "สมชาย รักดี",
    enrolledCourses: ["course_tgat_eng"]
  }
];

export function loadCourses(): Course[] {
  try {
    const data = localStorage.getItem(COURSES_KEY);
    if (!data) {
      localStorage.setItem(COURSES_KEY, JSON.stringify(defaultCourses));
      return defaultCourses;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load courses:", error);
    return defaultCourses;
  }
}

export function saveCourses(courses: Course[]): void {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  } catch (error) {
    console.error("Failed to save courses:", error);
  }
}

export function loadUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load users:", error);
    return defaultUsers;
  }
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Failed to save users:", error);
  }
}

export function loadCategories(): string[] {
  try {
    const data = localStorage.getItem(CATEGORIES_KEY);
    if (!data) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load categories:", error);
    return defaultCategories;
  }
}

export function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("Failed to save categories:", error);
  }
}

export function loadQuestions(): Question[] {
  try {
    const data = localStorage.getItem(QUESTIONS_KEY);
    if (!data) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(initialQuestions));
      return initialQuestions;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load questions:", error);
    return initialQuestions;
  }
}

export function saveQuestions(questions: Question[]): void {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error("Failed to save questions:", error);
  }
}

export function resetQuestionsToDefault(): Question[] {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(initialQuestions));
    return initialQuestions;
  } catch (error) {
    console.error("Failed to reset questions:", error);
    return initialQuestions;
  }
}

export function loadAttempts(userId?: string): UserAttempt[] {
  try {
    const data = localStorage.getItem(ATTEMPTS_KEY);
    const allAttempts: UserAttempt[] = data ? JSON.parse(data) : [];
    if (userId) {
      return allAttempts.filter((a) => a.userId === userId);
    }
    return allAttempts;
  } catch (error) {
    console.error("Failed to load attempts:", error);
    return [];
  }
}

export function saveAttempt(attempt: UserAttempt): void {
  try {
    const data = localStorage.getItem(ATTEMPTS_KEY);
    const allAttempts: UserAttempt[] = data ? JSON.parse(data) : [];
    allAttempts.push(attempt);
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(allAttempts));
  } catch (error) {
    console.error("Failed to save attempt:", error);
  }
}

export function clearAttempts(userId?: string): void {
  try {
    if (userId) {
      const data = localStorage.getItem(ATTEMPTS_KEY);
      const allAttempts: UserAttempt[] = data ? JSON.parse(data) : [];
      const filtered = allAttempts.filter((a) => a.userId !== userId);
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(ATTEMPTS_KEY);
    }
  } catch (error) {
    console.error("Failed to clear attempts:", error);
  }
}

// Derived mistakes from attempts:
// A question is in the "Mistakes Bank" if it has been answered incorrectly
// and has NOT been answered correctly since then.
export function getActiveMistakes(questions: Question[], attempts: UserAttempt[], userId: string): Question[] {
  // Filter attempts for this user only
  const userAttempts = attempts.filter((a) => a.userId === userId);

  // Find the latest attempt for each question
  const latestAttemptMap = new Map<string, UserAttempt>();
  userAttempts.forEach((attempt) => {
    const existing = latestAttemptMap.get(attempt.questionId);
    if (!existing || attempt.timestamp > existing.timestamp) {
      latestAttemptMap.set(attempt.questionId, attempt);
    }
  });

  const questionMap = new Map<string, Question>();
  questions.forEach((q) => questionMap.set(q.id, q));

  const mistakes: Question[] = [];
  latestAttemptMap.forEach((attempt, qId) => {
    if (!attempt.isCorrect) {
      const q = questionMap.get(qId);
      if (q) {
        mistakes.push(q);
      }
    }
  });

  return mistakes;
}
