export interface User {
  id: string;
  username: string;
  passwordHash: string; // Plain password for simple local storage user management as requested
  role: "student" | "admin" | "content_creator" | "teacher";
  realName: string;
  enrolledCourses?: string[]; // list of course IDs
}

export type QuestionType =
  | "mcq"
  | "error_id"
  | "sentence_completion"
  | "reading"
  | "matching"
  | "fill_blank"
  | "true_false";

export type QCStatus = "draft" | "reviewed" | "approved" | "published";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type ExamType = "NETSAT" | "KEPT X" | "TGAT" | "A-Level" | "General";

export interface QuestionComment {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
  resolved?: boolean;
}

export interface StructuredExplanation {
  coreRule?: string;
  translation?: string;
  keyClue?: string;
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  topic?: string;
  cefrLevel?: CEFRLevel;
  wordCount?: number;
  questionIds?: string[];
}

export interface Question {
  id: string;
  text: string;
  options: string[]; // e.g. ["go", "goes", "went", "going"]
  correctIndex: number; // 0 for a, 1 for b, 2 for c, 3 for d
  explanation: string;
  category: string; // e.g. "Tenses", "Vocabulary", "Error Detection", "Reading", "Conversation"
  examSet?: string; // e.g. "TGAT 66", "A-Level 67 Paper A", "General Practice"
  tags?: string[];
  isListening?: boolean; // Indicates if this question is a listening comprehension question
  listeningTranscript?: string; // The text spoken in the listening audio

  // Extended Content & QC Metadata
  questionType?: QuestionType;
  cefrLevel?: CEFRLevel;
  examType?: ExamType;
  difficulty?: "Easy" | "Medium" | "Hard";
  topic?: string;
  distractorTags?: string[]; // e.g. ["Spelling Trick", "Over-generalization", "False Synonym"]
  passageId?: string;
  passageText?: string;
  qcStatus?: QCStatus;
  version?: number;
  createdBy?: string;
  updatedAt?: string;
  editorialComments?: QuestionComment[];
  structuredExplanation?: StructuredExplanation;
  matchingPairs?: { left: string; right: string }[];
}

export interface VideoLecture {
  id: string;
  title: string;
  youtubeUrl: string; // YouTube embed link or video URL
  description?: string;
  duration?: string;
  attachedExerciseIds?: string[]; // IDs of practice questions attached to this lesson
  documentUrl?: string; // Attachment note link or PDF reference
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  lessons: VideoLecture[];
}

export interface Course {
  id: string;
  title: string;
  category: string; // e.g. "TGAT", "A-Level", "Grammar"
  description: string;
  examSets: string[]; // associated examSets (e.g. ["TGAT 66", "TGAT 67"])
  videos: VideoLecture[];
  modules?: CourseModule[];
}

export interface UserAttempt {
  id: string;
  userId: string; // Associated student ID
  questionId: string;
  category: string;
  selectedIndex: number;
  isCorrect: boolean;
  timestamp: number;
  timeSpent?: number; // in seconds
  isFlagged?: boolean;
}

export interface CategoryStat {
  category: string;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
}

export interface ChallengeConfig {
  enabled: boolean;
  timeLimitPerQuestion: number; // in seconds (e.g., 30, 60, or 0 for unlimited)
  examMode?: "mock" | "practice"; // Mock Test vs Practice mode
  showInstantExplanation?: boolean; // In practice mode
}

export interface ExamMatrixRule {
  totalQuestions: number;
  examType?: ExamType;
  categoryDistribution: Record<string, number>;
  cefrDistribution: Record<string, number>;
  enforceBalancedAnswers?: boolean; // Target 25% per choice option A, B, C, D
}

export interface ItemPsychometricStats {
  questionId: string;
  totalResponses: number;
  correctPercentage: number; // P-value
  choiceDistribution: [number, number, number, number]; // Counts or % for choice 0, 1, 2, 3
  discriminationIndex: number; // Point-biserial / High-Low group difference
}

