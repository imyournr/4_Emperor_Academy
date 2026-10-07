import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Question, UserAttempt, CategoryStat, ChallengeConfig, User, Course } from "../types";
import {
  PieChart,
  BookOpen,
  Award,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  UserCheck,
  Flame,
  Volume2,
  Tv,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  PlusCircle,
  CheckSquare,
  FileText,
  Save,
  Check
} from "lucide-react";

interface DashboardProps {
  currentUser: User;
  users: User[];
  questions: Question[];
  attempts: UserAttempt[]; // Filtered active user attempts
  allAttempts: UserAttempt[]; // Global unfiltered attempts for leaderboard
  activeMistakesCount: number;
  challengeConfig: ChallengeConfig;
  categories: string[];
  courses: Course[];
  onUpdateUserCourses: (userId: string, courseIds: string[]) => void;
  onSetChallengeConfig: (config: ChallengeConfig) => void;
  onStartQuiz: (
    mode: "all" | "random" | "mistakes" | string,
    limit?: number,
    filterType?: "category" | "examSet" | "categoryAndExamSet",
    extraFilter?: string
  ) => void;
  onClearHistory: () => void;
}

export default function Dashboard({
  currentUser,
  users,
  questions,
  attempts,
  allAttempts,
  activeMistakesCount,
  challengeConfig,
  categories,
  courses = [],
  onUpdateUserCourses,
  onSetChallengeConfig,
  onStartQuiz,
  onClearHistory
}: DashboardProps) {
  const [activeSelectorTab, setActiveSelectorTab] = useState<"courses" | "examSets" | "categories">("courses");
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [selectedExamCategoryFilter, setSelectedExamCategoryFilter] = useState<string>("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // States for Student video learning refinements
  const [completedVideos, setCompletedVideos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`completed_videos_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeNoteText, setActiveNoteText] = useState("");
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);

  useEffect(() => {
    // Load note for active video whenever it switches
    const enrolledIds = currentUser.enrolledCourses || [];
    const myEnrolledCourses = courses.filter((c) => enrolledIds.includes(c.id));
    const currentActiveCourseId = selectedCourseId || (myEnrolledCourses.length > 0 ? myEnrolledCourses[0].id : (courses[0]?.id || null));
    const activeCourse = courses.find((c) => c.id === currentActiveCourseId);

    if (activeCourse && activeCourse.videos && activeCourse.videos.length > 0) {
      const currentVideo = activeCourse.videos.find((v) => v.id === activeVideoId) || activeCourse.videos[0];
      if (currentVideo) {
        const savedNote = localStorage.getItem(`video_notes_${currentUser.id}_${currentVideo.id}`) || "";
        setActiveNoteText(savedNote);
      }
    }
  }, [activeVideoId, selectedCourseId, courses, currentUser.id]);

  const handleToggleVideoComplete = (videoId: string) => {
    const updated = completedVideos.includes(videoId)
      ? completedVideos.filter((id) => id !== videoId)
      : [...completedVideos, videoId];
    setCompletedVideos(updated);
    localStorage.setItem(`completed_videos_${currentUser.id}`, JSON.stringify(updated));
  };

  const handleSaveVideoNote = (videoId: string, note: string) => {
    setActiveNoteText(note);
    localStorage.setItem(`video_notes_${currentUser.id}_${videoId}`, note);
    setNoteSavedAlert(true);
    setTimeout(() => setNoteSavedAlert(false), 2000);
  };
  
  // Calculate aggregate stats for active user only (they are already pre-filtered, but let's double check)
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Streak logic (continuous correct answers starting from the latest)
  let streak = 0;
  const sortedAttempts = [...attempts].sort((a, b) => b.timestamp - a.timestamp);
  for (const attempt of sortedAttempts) {
    if (attempt.isCorrect) {
      streak++;
    } else {
      break;
    }
  }

  // Group stats by categories dynamically (using categories list passed from state)
  const categoryStats: Record<string, { total: number; correct: number }> = {};
  categories.forEach((cat) => {
    categoryStats[cat] = { total: 0, correct: 0 };
  });

  attempts.forEach((attempt) => {
    if (categoryStats[attempt.category]) {
      categoryStats[attempt.category].total += 1;
      if (attempt.isCorrect) {
        categoryStats[attempt.category].correct += 1;
      }
    }
  });

  const categoryList: CategoryStat[] = categories.map((cat) => {
    const stats = categoryStats[cat] || { total: 0, correct: 0 };
    return {
      category: cat,
      totalAttempted: stats.total,
      totalCorrect: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    };
  });

  // Extract unique exam sets and group their contents
  const examSetMap: Record<string, { total: number; categories: Set<string> }> = {};
  questions.forEach((q) => {
    const setName = q.examSet || "ทั่วไป (General)";
    if (!examSetMap[setName]) {
      examSetMap[setName] = { total: 0, categories: new Set() };
    }
    examSetMap[setName].total += 1;
    if (q.category) {
      examSetMap[setName].categories.add(q.category);
    }
  });

  const examSetList = Object.entries(examSetMap).map(([name, data]) => ({
    name,
    totalQuestions: data.total,
    categories: Array.from(data.categories),
  })).sort((a, b) => (a.name === "ทั่วไป (General)" ? 1 : b.name === "ทั่วไป (General)" ? -1 : b.totalQuestions - a.totalQuestions));

  const getAccuracyBadge = (accuracy: number, total: number) => {
    if (total === 0) return { label: "ยังไม่เคยตอบ", bg: "bg-slate-100 text-slate-600 border-slate-200" };
    if (accuracy >= 80) return { label: "แข็งแกร่ง (Master)", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (accuracy >= 50) return { label: "ปานกลาง (Medium)", bg: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "ต้องพัฒนา (Needs Focus)", bg: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  // Calculate real-time class leaderboard
  const studentUsers = users.filter((u) => u.role === "student");
  const leaderboard = studentUsers
    .map((u) => {
      const userCorrect = allAttempts.filter((a) => a.userId === u.id && a.isCorrect).length;
      const userTotal = allAttempts.filter((a) => a.userId === u.id).length;
      const userAccuracy = userTotal > 0 ? Math.round((userCorrect / userTotal) * 100) : 0;
      return {
        id: u.id,
        realName: u.realName,
        correctCount: userCorrect,
        totalCount: userTotal,
        accuracy: userAccuracy
      };
    })
    .sort((a, b) => b.correctCount - a.correctCount || b.accuracy - a.accuracy);


  // A. Continue Learning Widget calculations
  const latestAttempt = sortedAttempts.length > 0 ? sortedAttempts[0] : null;
  let continueExamSet = "";
  let continueAttemptedCount = 0;
  let continueTotalCount = 0;
  let continueTimeAgo = "";

  if (latestAttempt) {
    const latestQ = questions.find((q) => q.id === latestAttempt.questionId);
    continueExamSet = latestQ?.examSet || "";
    if (continueExamSet) {
      const examQuestions = questions.filter((q) => q.examSet === continueExamSet);
      continueTotalCount = examQuestions.length;
      const examQIds = examQuestions.map((q) => q.id);
      continueAttemptedCount = Array.from(new Set(attempts.filter((a) => examQIds.includes(a.questionId)).map((a) => a.questionId))).length;

      // Time ago string
      const diffMs = Date.now() - latestAttempt.timestamp;
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 60) {
        continueTimeAgo = diffMin <= 1 ? "เมื่อสักครู่นี้" : "เมื่อ " + diffMin + " นาทีที่แล้ว";
      } else if (diffHr < 24) {
        continueTimeAgo = "เมื่อ " + diffHr + " ชั่วโมงที่แล้ว";
      } else {
        continueTimeAgo = "เมื่อ " + diffDay + " วันที่แล้ว";
      }
    }
  }

  // B. Recent Weakness Trend calculation
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentAttempts = attempts.filter((a) => a.timestamp >= sevenDaysAgo);
  const olderAttempts = attempts.filter((a) => a.timestamp < sevenDaysAgo);

  let trendAlert = null;
  if (recentAttempts.length >= 3 && olderAttempts.length >= 3) {
    let maxDrop = 0;
    categories.forEach((cat) => {
      const catQuestions = questions.filter((q) => q.category === cat);
      const catQIds = catQuestions.map((q) => q.id);
      
      const recCatAttempts = recentAttempts.filter((a) => catQIds.includes(a.questionId));
      const oldCatAttempts = olderAttempts.filter((a) => catQIds.includes(a.questionId));

      if (recCatAttempts.length >= 2 && oldCatAttempts.length >= 2) {
        const recCorrect = recCatAttempts.filter((a) => a.isCorrect).length;
        const oldCorrect = oldCatAttempts.filter((a) => a.isCorrect).length;
        const recAcc = Math.round((recCorrect / recCatAttempts.length) * 100);
        const oldAcc = Math.round((oldCorrect / oldCatAttempts.length) * 100);

        if (oldAcc - recAcc >= 5 && (oldAcc - recAcc) > maxDrop) {
          maxDrop = oldAcc - recAcc;
          trendAlert = {
            category: cat,
            oldAcc,
            newAcc: recAcc
          };
        }
      }
    });
  }

  // C. Confidence Analytics calculations
  const flaggedAttempts = attempts.filter((a) => a.isFlagged);
  const unflaggedAttempts = attempts.filter((a) => !a.isFlagged);

  const unconfidentCorrectCount = flaggedAttempts.filter((a) => a.isCorrect).length;
  const overconfidentIncorrectCount = unflaggedAttempts.filter((a) => !a.isCorrect).length;

  return (
    <div className="space-y-6">
      {/* 1. Header Welcome & Current Streak (Apple Glass Banner) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 sm:p-7 shadow-lg shadow-slate-900/5 border border-white/80 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50/80 border border-blue-200/60 px-3 py-1 rounded-full backdrop-blur-md">
                ระบบฝึกซ้อมเตรียมสอบ
              </span>
              {streak >= 3 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50/90 border border-amber-200/80 px-3 py-1 rounded-full flex items-center gap-1">
                  🔥 กำลังเข้าฝัก {streak} ข้อติด!
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              สวัสดีคุณ {currentUser.realName} 👋
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-xl leading-relaxed">
              {overallAccuracy >= 80 
                ? "รักษาความแม่นยำระดับเหรียญทองนี้ไว้เพื่อพิชิตคะแนนสูงสุดในสนามสอบจริง!"
                : totalAttempts > 0 
                  ? `คุณทำแบบฝึกหัดไปแล้ว ${totalAttempts} ครั้ง มาร่วมอุดจุดผิดพลาดกันต่อเถอะ`
                  : "ยินดีต้อนรับเข้าสู่ระบบฝึกทำข้อสอบ! เริ่มต้นด้วยการเลือกชุดข้อสอบจริงหรือหมวดที่ต้องการฝึกด้านล่าง"}
            </p>
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl shrink-0 self-start sm:self-center backdrop-blur-md">
              <div className="text-right">
                <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wider">ตอบถูกต่อเนื่องล่าสุด</p>
                <p className="text-sm font-black text-amber-700">{streak} ข้อติดต่อกัน</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 2. Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Core Study & Practice Hub (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recent Progress / Continue Learning Card */}
          {latestAttempt && continueExamSet && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                  <span>ทำค้างอยู่ล่าสุด</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  ชุดข้อสอบ: {continueExamSet}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium">
                  <span>ความคืบหน้า: <strong className="text-slate-800 font-mono">{continueAttemptedCount}</strong> / {continueTotalCount} ข้อ ({Math.round(continueAttemptedCount / continueTotalCount * 100)}%)</span>
                  <span className="text-slate-300">|</span>
                  <span>ทำล่าสุด {continueTimeAgo}</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStartQuiz(continueExamSet)}
                className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 self-start sm:self-center cursor-pointer shadow-lg shadow-slate-900/15"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> ทำต่อจากเดิม
              </motion.button>
            </motion.div>
          )}

          {/* Recent Weakness Alert */}
          {trendAlert && (
            <div className="bg-rose-50/90 border border-rose-200/80 p-4.5 rounded-3xl flex items-start gap-3 backdrop-blur-md">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div className="space-y-1">
                <h4 className="font-bold text-rose-950 text-xs">
                  แจ้งเตือนจุดอ่อนสัปดาห์นี้
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                  พบแนวโน้มที่ต้องเฝ้าระวังในหมวดหมู่ <span className="font-bold text-rose-700">{trendAlert.category}</span> เนื่องจากความแม่นยำสัปดาห์นี้ลดลงจาก {trendAlert.oldAcc}% เหลือเพียง <span className="font-bold text-rose-600 font-mono">{trendAlert.newAcc}%</span> แนะนำให้ฝึกฝนหัวข้อนี้เพิ่มเติมเป็นพิเศษ
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation & Search Bar (Apple Segmented Control) */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-lg shadow-slate-900/5 border border-white/80">
            <div className="p-2 bg-slate-100/70 border-b border-slate-200/60 flex gap-1">
              <button
                onClick={() => setActiveSelectorTab("courses")}
                className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                  activeSelectorTab === "courses" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSelectorTab === "courses" && (
                  <motion.div
                    layoutId="dashboard-tab"
                    className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-slate-200/80 -z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-amber-500" />
                  <span>คอร์สเรียน & วิดีโอ ({courses.length})</span>
                </span>
              </button>

              <button
                onClick={() => setActiveSelectorTab("examSets")}
                className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                  activeSelectorTab === "examSets" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSelectorTab === "examSets" && (
                  <motion.div
                    layoutId="dashboard-tab"
                    className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-slate-200/80 -z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>ชุดข้อสอบตามปี ({examSetList.length})</span>
                </span>
              </button>

              <button
                onClick={() => setActiveSelectorTab("categories")}
                className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                  activeSelectorTab === "categories" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSelectorTab === "categories" && (
                  <motion.div
                    layoutId="dashboard-tab"
                    className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-slate-200/80 -z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>สถิติรายหมวด ({categoryList.length})</span>
                </span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* TAB 0: PREMIUM COURSES & VIDEO PORTAL */}
              {activeSelectorTab === "courses" && (() => {
                const enrolledIds = currentUser.enrolledCourses || [];
                const myEnrolledCourses = courses.filter((c) => enrolledIds.includes(c.id));
                const otherCourses = courses.filter((c) => !enrolledIds.includes(c.id));
                
                const currentActiveCourseId = selectedCourseId || (myEnrolledCourses.length > 0 ? myEnrolledCourses[0].id : (courses[0]?.id || null));
                const activeCourse = courses.find((c) => c.id === currentActiveCourseId);
                const isEnrolled = activeCourse ? enrolledIds.includes(activeCourse.id) : false;

                return (
                  <div className="space-y-6">
                    {/* Course Selection Shelf */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                        <span>คอร์สเรียนทั้งหมดในสถาบัน (Academy Course Offerings)</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Enrolled Courses list */}
                        {myEnrolledCourses.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCourseId(c.id);
                              setActiveVideoId(null);
                            }}
                            className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer ${
                              currentActiveCourseId === c.id
                                ? "border-brand-burgundy bg-brand-navy text-white shadow-md"
                                : "border-slate-200 bg-white hover:border-brand-gold/50 hover:bg-brand-cream/10 text-slate-800"
                            }`}
                          >
                            <span className="absolute top-0 right-0 px-2 py-0.5 rounded-bl bg-emerald-600 text-white text-[9px] font-bold uppercase">
                              ลงทะเบียนแล้ว
                            </span>
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${currentActiveCourseId === c.id ? "text-brand-gold" : "text-brand-burgundy"}`}>
                                {c.category}
                              </p>
                              <h4 className="font-extrabold text-sm line-clamp-1 mt-0.5">
                                {c.title}
                              </h4>
                            </div>
                            <p className={`text-[11px] line-clamp-1 ${currentActiveCourseId === c.id ? "text-slate-300" : "text-slate-500"}`}>
                              {c.videos?.length || 0} วิดีโอ • {c.examSets?.length || 0} ชุดข้อสอบเฉพาะ
                            </p>
                          </button>
                        ))}

                        {/* Unenrolled Courses list */}
                        {otherCourses.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCourseId(c.id);
                              setActiveVideoId(null);
                            }}
                            className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer ${
                              currentActiveCourseId === c.id
                                ? "border-brand-burgundy bg-brand-navy text-white shadow-md"
                                : "border-dashed border-slate-300 bg-slate-50 hover:border-brand-gold hover:bg-brand-cream/5 text-slate-800"
                            }`}
                          >
                            <span className="absolute top-0 right-0 px-2 py-0.5 rounded-bl bg-slate-400 text-white text-[9px] font-bold uppercase flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> ล็อกอยู่
                            </span>
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${currentActiveCourseId === c.id ? "text-brand-gold" : "text-slate-500"}`}>
                                {c.category}
                              </p>
                              <h4 className="font-extrabold text-sm line-clamp-1 mt-0.5">
                                {c.title}
                              </h4>
                            </div>
                            <p className={`text-[11px] line-clamp-1 ${currentActiveCourseId === c.id ? "text-slate-300" : "text-slate-500"}`}>
                              {c.videos?.length || 0} วิดีโอ • {c.examSets?.length || 0} ชุดข้อสอบ
                            </p>
                          </button>
                        ))}

                        {courses.length === 0 && (
                          <div className="col-span-full py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500">ยังไม่มีคอร์สเรียนในขณะนี้ กรุณาติดต่ออาจารย์ผู้สอน</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Course Viewport */}
                    {activeCourse ? (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-6 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white bg-brand-burgundy px-2.5 py-0.5 rounded-md">
                                {activeCourse.category}
                              </span>
                              {!isEnrolled && (
                                <span className="text-[10px] font-extrabold uppercase text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-slate-500" /> ยังไม่ได้ลงทะเบียน
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight">
                              {activeCourse.title}
                            </h3>
                            <p className="text-xs text-slate-600">
                              {activeCourse.description}
                            </p>
                          </div>

                          {/* Enrollment request/action button */}
                          {!isEnrolled && (
                            <button
                              onClick={() => {
                                const nextEnrolled = [...enrolledIds, activeCourse.id];
                                onUpdateUserCourses(currentUser.id, nextEnrolled);
                              }}
                              className="px-5 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy/90 text-white hover:text-brand-gold text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 border border-brand-gold/30 shrink-0 self-start sm:self-center"
                            >
                              <PlusCircle className="w-4 h-4 text-brand-gold" /> ลงทะเบียนสมัครวิชานี้ทันที
                            </button>
                          )}
                        </div>

                        {/* If Enrolled: Show Video Portal & Associated Locked Exam sets */}
                        {isEnrolled ? (
                          <div className="space-y-6">
                            
                            {/* 1. Video Player Area */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Tv className="w-4 h-4 text-brand-gold" />
                                <span>พอร์ทัลวิดีโอบรรยายเฉพาะหลักสูตร (Lectures & Explanations)</span>
                              </h4>

                              {activeCourse.videos && activeCourse.videos.length > 0 ? (() => {
                                const currentVideo = activeCourse.videos.find((v) => v.id === activeVideoId) || activeCourse.videos[0];
                                const isVideoCompleted = completedVideos.includes(currentVideo.id);

                                // Course progress calculation
                                const totalCourseVideos = activeCourse.videos.length;
                                const completedCourseVideos = activeCourse.videos.filter(v => completedVideos.includes(v.id)).length;
                                const courseProgressPct = totalCourseVideos > 0 ? Math.round((completedCourseVideos / totalCourseVideos) * 100) : 0;

                                return (
                                  <div className="space-y-5">
                                    {/* Video Course Progress Bar */}
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                                        <span className="flex items-center gap-1.5 text-brand-navy">
                                          <Award className="w-4 h-4 text-brand-gold animate-bounce" />
                                          <span>ความคืบหน้าการดูวิดีโอบรรยายในหลักสูตร:</span>
                                        </span>
                                        <span className="text-brand-burgundy font-mono bg-brand-cream/60 px-2 py-0.5 rounded border border-brand-gold/20">
                                          เรียนจบแล้ว {completedCourseVideos} / {totalCourseVideos} วิดีโอ ({courseProgressPct}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                                        <div
                                          className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                                          style={{ width: `${courseProgressPct}%` }}
                                        ></div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                      {/* Video Player Display */}
                                      <div className="lg:col-span-2 space-y-4">
                                        <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md border-2 border-brand-navy bg-black relative">
                                          <iframe
                                            src={currentVideo.youtubeUrl}
                                            title={currentVideo.title}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                          ></iframe>
                                        </div>

                                        {/* Action buttons & Details Card */}
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                                          <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
                                            <div className="space-y-1 flex-1">
                                              <h5 className="font-extrabold text-sm text-brand-navy">
                                                {currentVideo.title}
                                              </h5>
                                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold">
                                                <span>🕒 ความยาว: {currentVideo.duration} นาที</span>
                                                <span>•</span>
                                                <span className="text-brand-burgundy">คอร์ส: {activeCourse.title}</span>
                                              </div>
                                            </div>

                                            {/* Toggle completion status */}
                                            <button
                                              type="button"
                                              onClick={() => handleToggleVideoComplete(currentVideo.id)}
                                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                                                isVideoCompleted
                                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                                              }`}
                                            >
                                              {isVideoCompleted ? (
                                                <>
                                                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                                                  <span>เรียนจบหัวข้อนี้แล้ว</span>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                                                  <span>ทำเครื่องหมายเรียนจบแล้ว</span>
                                                </>
                                              )}
                                            </button>
                                          </div>

                                          {/* Description */}
                                          {currentVideo.description && (
                                            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                              <p className="font-bold text-brand-navy mb-0.5 text-[10px] uppercase tracking-wider">รายละเอียดวิดีโอ (Video Details):</p>
                                              {currentVideo.description}
                                            </div>
                                          )}

                                          {/* PERSONAL STUDY NOTE COMPONENT */}
                                          <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-brand-burgundy" />
                                                <span>สมุดบันทึกย่อส่วนตัวสำหรับการดูวิดีโอนี้ (My Study Notes):</span>
                                              </label>
                                              {noteSavedAlert && (
                                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-pulse">
                                                  ✓ บันทึกโน้ตสำเร็จ!
                                                </span>
                                              )}
                                            </div>
                                            <div className="relative">
                                              <textarea
                                                rows={3}
                                                placeholder="จดบันทึกไวยากรณ์ คำศัพท์สำคัญ หรือจุดน่าสนใจจากวิดีโอเพื่อทบทวนย้อนหลัง..."
                                                value={activeNoteText}
                                                onChange={(e) => setActiveNoteText(e.target.value)}
                                                className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy focus:ring-1 focus:ring-brand-burgundy/20 bg-slate-50/20"
                                              />
                                            </div>
                                            <div className="flex justify-end">
                                              <button
                                                type="button"
                                                onClick={() => handleSaveVideoNote(currentVideo.id, activeNoteText)}
                                                className="px-3.5 py-1.5 bg-brand-navy hover:bg-brand-navy/95 text-white hover:text-brand-gold text-xs font-black rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                              >
                                                <Save className="w-3.5 h-3.5 text-brand-gold" />
                                                <span>บันทึกโน้ตช่วยจำ</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Playlist Selection Column */}
                                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 max-h-[480px] overflow-y-auto shadow-xs">
                                        <p className="text-[10px] font-black text-brand-navy uppercase tracking-wider border-b pb-1.5 mb-1 flex justify-between items-center">
                                          <span>วิดีโอแนะนำในคอร์สนี้ ({activeCourse.videos.length})</span>
                                          <span className="text-[9px] font-mono font-normal text-slate-400">PLAYLIST</span>
                                        </p>
                                        <div className="space-y-1.5">
                                          {activeCourse.videos.map((v, idx) => {
                                            const isActive = v.id === currentVideo.id;
                                            const isVCompleted = completedVideos.includes(v.id);
                                            return (
                                              <button
                                                key={v.id}
                                                onClick={() => setActiveVideoId(v.id)}
                                                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex gap-2 items-start cursor-pointer border ${
                                                  isActive
                                                    ? "bg-brand-cream/30 border-brand-gold/40 text-brand-burgundy font-bold shadow-xs"
                                                    : "hover:bg-slate-50 border-transparent text-slate-700"
                                                }`}
                                              >
                                                <span className="font-mono text-[10px] font-black text-slate-400 shrink-0 mt-0.5">
                                                  {(idx + 1).toString().padStart(2, "0")}
                                                </span>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                  <p className="line-clamp-2 leading-tight">
                                                    {v.title}
                                                  </p>
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[9px] text-slate-400 font-medium">
                                                      🕒 {v.duration} นาที
                                                    </span>
                                                    {isVCompleted && (
                                                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/50 font-bold flex items-center gap-0.5 shrink-0">
                                                        <Check className="w-2.5 h-2.5" /> เรียนจบแล้ว
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                  <p className="text-xs text-slate-500">คอร์สนี้ยังไม่มีการลงวิดีโอบรรยาย</p>
                                </div>
                              )}
                            </div>

                            {/* 2. Lock & Associated Exam Sets Specific Content */}
                            <div className="space-y-3 pt-2">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-brand-navy" />
                                <span>ชุดคลังข้อสอบเฉพาะหลักสูตร (Course Practice Syllabus)</span>
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeCourse.examSets && activeCourse.examSets.length > 0 ? activeCourse.examSets.map((setName) => {
                                  const setQuestions = questions.filter((q) => (q.examSet || "ทั่วไป (General)") === setName);
                                  const setQIds = setQuestions.map((q) => q.id);
                                  
                                  // Analyze unique answered questions for progress calculations
                                  const completedInSet = Array.from(new Set(
                                    attempts.filter((a) => setQIds.includes(a.questionId)).map((a) => a.questionId)
                                  )).length;
                                  
                                  const pct = setQuestions.length > 0 ? Math.round((completedInSet / setQuestions.length) * 100) : 0;

                                  return (
                                    <div
                                      key={setName}
                                      className="bg-white border border-slate-200 hover:border-brand-gold/30 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all relative overflow-hidden"
                                    >
                                      {pct === 100 && (
                                        <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl uppercase">
                                          COMPLETED
                                        </span>
                                      )}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold bg-brand-cream text-brand-navy border border-brand-gold/30 px-2 py-0.5 rounded">
                                            ข้อสอบสอบแข่งขัน
                                          </span>
                                          <span className="text-[11px] text-slate-500 font-semibold">
                                            {setQuestions.length} ข้อในระบบ
                                          </span>
                                        </div>
                                        <h5 className="font-extrabold text-slate-900 text-xs">
                                          {setName}
                                        </h5>
                                        
                                        {/* Progress bar */}
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                                            <span>ความแม่นยำและการทำเสร็จ</span>
                                            <span className="font-mono text-brand-burgundy">{completedInSet}/{setQuestions.length} ข้อ ({pct}%)</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                              style={{ width: `${pct}%` }}
                                              className="h-full bg-gradient-to-r from-brand-burgundy to-brand-gold transition-all duration-500"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => onStartQuiz(setName, undefined, "examSet")}
                                        className="w-full py-2 bg-brand-navy hover:bg-brand-burgundy text-brand-gold hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1"
                                      >
                                        <Play className="w-3 h-3 fill-current" /> เริ่มทำข้อสอบชุดนี้
                                      </button>
                                    </div>
                                  );
                                }) : (
                                  <div className="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                    <p className="text-xs text-slate-500">คอร์สนี้ไม่มีแบบฝึกหัดเฉพาะชุดเจาะจงในขณะนี้</p>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        ) : (
                          // If NOT enrolled: Blur and explain benefits
                          <div className="bg-white/60 border border-slate-200 rounded-xl p-6 text-center space-y-4 shadow-inner relative overflow-hidden backdrop-blur-xs">
                            <div className="absolute inset-0 bg-slate-50/40 pointer-events-none" />
                            <div className="relative z-10 max-w-sm mx-auto space-y-2.5">
                              <div className="inline-flex p-3 bg-amber-50 text-brand-gold rounded-full border border-brand-gold/30">
                                <Lock className="w-5 h-5" />
                              </div>
                              <h4 className="font-extrabold text-sm text-slate-800">
                                เนื้อหาคอร์สและแบบฝึกหัดถูกล็อกอยู่
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                สิทธิเข้าถึงวิดีโอบรรยาย และชุดคลังแบบฝึกหัดสำหรับ <span className="font-bold text-slate-800">"{activeCourse.title}"</span> สงวนไว้สำหรับนักเรียนที่ลงทะเบียนเรียนเท่านั้น
                              </p>
                              <button
                                onClick={() => {
                                  const nextEnrolled = [...enrolledIds, activeCourse.id];
                                  onUpdateUserCourses(currentUser.id, nextEnrolled);
                                }}
                                className="w-full py-2.5 bg-brand-burgundy hover:bg-brand-burgundy/90 text-white hover:text-brand-gold text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-brand-gold/30"
                              >
                                <PlusCircle className="w-4 h-4 text-brand-gold" /> สมัครคอร์สเพื่อปลดล็อกทันที
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-xs text-slate-500">ไม่พบหลักสูตรที่เลือก</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 1: STANDARD EXAM SETS */}
              {activeSelectorTab === "examSets" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        เลือกทำข้อสอบมาตรฐาน (Official Exam Papers)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        จำลองสถานการณ์เหมือนการทำสอบจริงในแต่ละปีเพื่อวัดระดับความแม่นยำโดยรวม
                      </p>
                    </div>

                    {/* Simple Search Box */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อชุดข้อสอบ เช่น TGAT 66..."
                        value={examSearchQuery}
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  {/* Browse by Topic pill bar */}
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-150 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-[11px] font-bold text-slate-700">
                        🎯 กรองเฉพาะบางหัวข้อไวยากรณ์หรือทักษะภาษาอังกฤษ:
                      </h4>
                      {selectedExamCategoryFilter !== "all" && (
                        <button
                          onClick={() => setSelectedExamCategoryFilter("all")}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold transition-all cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-200"
                        >
                          🔄 เคลียร์การกรอง
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedExamCategoryFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedExamCategoryFilter === "all"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        ดูข้อสอบทั้งหมด ({questions.length} ข้อ)
                      </button>
                      {categories.map((cat) => {
                        const countInDB = questions.filter((q) => q.category === cat).length;
                        const isSelected = selectedExamCategoryFilter === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedExamCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/20"
                            }`}
                          >
                            <span>{cat}</span>
                            <span className={`text-[9px] font-mono font-bold px-1 py-0.1 rounded ${
                              isSelected ? "bg-indigo-500/50 text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                              {countInDB}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedExamCategoryFilter !== "all" && (
                      <div className="text-[10px] text-indigo-800 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/30 font-medium">
                        💡 กำลังไฮไลท์เฉพาะชุดที่มีหัวข้อ <strong>&ldquo;{selectedExamCategoryFilter}&rdquo;</strong> คุณสามารถเลือกทำข้อสอบเฉพาะหัวข้อนี้ในแต่ละปีได้ทันที!
                      </div>
                    )}
                  </div>

                  {/* Exam Papers Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const filteredExamSets = examSetList.filter((set) =>
                        set.name.toLowerCase().includes(examSearchQuery.toLowerCase())
                      );

                      return filteredExamSets.map((set) => {
                        const attemptedQuestionsCount = Array.from(
                          new Set(
                            attempts
                              .filter((a) => {
                                const q = questions.find((ques) => ques.id === a.questionId);
                                return q && (q.examSet || "ทั่วไป (General)") === set.name;
                              })
                              .map((a) => a.questionId)
                          )
                        ).length;

                        const percentCompleted = set.totalQuestions > 0 
                          ? Math.min(Math.round((attemptedQuestionsCount / set.totalQuestions) * 100), 100) 
                          : 0;

                        const hasSelectedCategory = selectedExamCategoryFilter === "all" || set.categories.includes(selectedExamCategoryFilter);
                        const countOfSelectedCategory = selectedExamCategoryFilter === "all" 
                          ? 0 
                          : questions.filter(
                              (q) => q.category === selectedExamCategoryFilter && (q.examSet || "ทั่วไป (General)") === set.name
                            ).length;

                        return (
                          <div
                            key={set.name}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden bg-white ${
                              selectedExamCategoryFilter !== "all"
                                ? hasSelectedCategory
                                  ? "border-indigo-300 ring-1 ring-indigo-300/30 bg-indigo-50/10"
                                  : "border-slate-100 opacity-40"
                                : "border-slate-200/80 hover:border-indigo-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                                  selectedExamCategoryFilter !== "all" && hasSelectedCategory
                                    ? "bg-indigo-600 text-white"
                                    : "bg-indigo-50 text-indigo-700"
                                }`}>
                                  {set.name}
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-slate-400">
                                  {set.totalQuestions} ข้อ
                                </span>
                              </div>

                              {selectedExamCategoryFilter !== "all" && (
                                <div className="pt-0.5">
                                  {hasSelectedCategory ? (
                                    <span className="inline-flex items-center text-[9px] font-bold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded border border-indigo-200/40">
                                      🎯 มีหัวข้อ &ldquo;{selectedExamCategoryFilter}&rdquo; ({countOfSelectedCategory} ข้อ)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      ไม่มีหัวข้อ &ldquo;{selectedExamCategoryFilter}&rdquo; ในปีนี้
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Progress bar inside exam sets */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">ความคืบหน้า:</span>
                                  <span className="font-bold text-indigo-600 font-mono">
                                    {attemptedQuestionsCount}/{set.totalQuestions} ข้อ ({percentCompleted}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                    style={{ width: `${percentCompleted}%` }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                                  หัวข้อที่ปรากฏในชุดข้อสอบนี้ (เจาะจงฝึก):
                                </span>
                                <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto pr-0.5">
                                  {set.categories.map((cat) => {
                                    const count = questions.filter(
                                      (q) => q.category === cat && (q.examSet || "ทั่วไป (General)") === set.name
                                    ).length;
                                    const isCurrentFilteredCat = selectedExamCategoryFilter === cat;
                                    return (
                                      <button
                                        key={cat}
                                        onClick={() => onStartQuiz(cat, undefined, "categoryAndExamSet", set.name)}
                                        className={`text-[9px] border px-1.5 py-0.5 rounded transition-all font-semibold flex items-center gap-0.5 cursor-pointer ${
                                          isCurrentFilteredCat
                                            ? "bg-indigo-600 border-indigo-600 text-white scale-102"
                                            : "bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                                        }`}
                                        title={`สอบเฉพาะหมวด ${cat} ในชุดนี้ (${count} ข้อ)`}
                                      >
                                        <span>{cat}</span>
                                        <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                                          isCurrentFilteredCat ? "bg-indigo-500/50 text-white" : "bg-slate-100 text-slate-400"
                                        }`}>
                                          {count}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {selectedExamCategoryFilter !== "all" && hasSelectedCategory && (
                                <button
                                  onClick={() => onStartQuiz(selectedExamCategoryFilter, undefined, "categoryAndExamSet", set.name)}
                                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-white" />
                                  สอบเฉพาะหัวข้อ &ldquo;{selectedExamCategoryFilter}&rdquo;
                                </button>
                              )}
                              <button
                                onClick={() => onStartQuiz(set.name, undefined, "examSet")}
                                className={`w-full py-2 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                                  selectedExamCategoryFilter !== "all" && hasSelectedCategory
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                }`}
                              >
                                <Play className="w-2.5 h-2.5" />
                                เริ่มทำข้อสอบทั้งปีนี้
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {examSetList.length === 0 && (
                      <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                        ยังไม่มีการนำเข้าชุดข้อสอบมาตรฐานในระบบ
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DIAGNOSTIC CATEGORIES */}
              {activeSelectorTab === "categories" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      สถิติวิเคราะห์ตามหัวข้อไวยากรณ์ (Skill Group Analysis)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ดูภาพรวมสถิติและอัตราความแม่นยำรายทักษะภาษาอังกฤษเพื่อค้นหาจุดบกพร่องสะสม
                    </p>
                  </div>

                  {categoryList.some(c => c.totalAttempted > 0) && (() => {
                    const attemptedCats = categoryList.filter(c => c.totalAttempted > 0);
                    const weakest = [...attemptedCats].sort((a, b) => a.accuracy - b.accuracy)[0];
                    const strongest = [...attemptedCats].sort((a, b) => b.accuracy - a.accuracy)[0];

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/50 text-xs">
                        {weakest && weakest.accuracy < 60 && (
                          <div className="flex gap-2 items-start">
                            <span className="p-1 bg-rose-100 text-rose-700 rounded-md text-[9px] shrink-0 font-bold">🆘 ควรทบทวน</span>
                            <div>
                              <p className="font-bold text-slate-800">หัวข้อไวยากรณ์ที่ควรเน้น: <span className="text-rose-600">{weakest.category}</span></p>
                              <p className="text-[10px] text-slate-500 mt-0.5">ความแม่นยำเพียง {weakest.accuracy}% จากการฝึกฝน {weakest.totalAttempted} ครั้ง</p>
                            </div>
                          </div>
                        )}
                        {strongest && strongest.accuracy >= 75 && (
                          <div className="flex gap-2 items-start">
                            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md text-[9px] shrink-0 font-bold">🏆 ชำนาญสูงสุด</span>
                            <div>
                              <p className="font-bold text-slate-800">หัวข้อที่แข็งแกร่งที่สุด: <span className="text-emerald-600">{strongest.category}</span></p>
                              <p className="text-[10px] text-slate-500 mt-0.5">ทำผลงานได้ดีด้วยความแม่นยำ {strongest.accuracy}% จาก {strongest.totalAttempted} ครั้ง</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                          <th className="py-2.5 px-3">หมวดหมู่เนื้อหา</th>
                          <th className="py-2.5 px-3 text-center">ความพยายาม</th>
                          <th className="py-2.5 px-3">ความแม่นยำเฉลี่ย</th>
                          <th className="py-2.5 px-3">ระดับทักษะ</th>
                          <th className="py-2.5 px-3 text-right">เจาะจงฝึกฝน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {categoryList.map((cat) => {
                          const badge = getAccuracyBadge(cat.accuracy, cat.totalAttempted);
                          const availableCount = questions.filter(q => q.category === cat.category).length;
                          const relatedExamSets = Array.from(
                            new Set(
                              questions
                                .filter((q) => q.category === cat.category)
                                .map((q) => q.examSet || "ทั่วไป (General)")
                            )
                          );

                          return (
                            <tr key={cat.category} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-800 text-xs block">
                                  {cat.category}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  ในคลังทั้งหมด {availableCount} ข้อ
                                </span>
                                {relatedExamSets.length > 0 && (
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase mr-0.5">ฝึกคัดเฉพาะปี:</span>
                                    {relatedExamSets.map((setName) => {
                                      const count = questions.filter(
                                        (q) => q.category === cat.category && (q.examSet || "ทั่วไป (General)") === setName
                                      ).length;
                                      return (
                                        <button
                                          key={setName}
                                          onClick={() => onStartQuiz(cat.category, undefined, "categoryAndExamSet", setName)}
                                          className="text-[9px] bg-white hover:bg-indigo-50 text-slate-650 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                          title={`สอบหมวด ${cat.category} ในชุด ${setName}`}
                                        >
                                          {setName} ({count})
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center text-xs text-slate-500 font-mono">
                                {cat.totalAttempted === 0 ? "-" : `${cat.totalAttempted} ครั้ง`}
                              </td>
                              <td className="py-3 px-3">
                                {cat.totalAttempted > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                      <div
                                        className={`h-full rounded-full ${
                                          cat.accuracy >= 80 ? "bg-emerald-500" : cat.accuracy >= 50 ? "bg-amber-500" : "bg-rose-500"
                                        }`}
                                        style={{ width: `${cat.accuracy}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-700 font-mono">{cat.accuracy}%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-mono">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => onStartQuiz(cat.category)}
                                  disabled={availableCount === 0}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:bg-slate-50 disabled:text-slate-300 font-semibold text-[10px] text-slate-600 rounded-lg transition-all cursor-pointer"
                                >
                                  ฝึกเฉพาะหมวดนี้
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Insights & Quick Launch Panel (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Section A: Quick Mastery Cards Grid (2x2) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              สรุปสถิติคะแนนส่วนตัว (Personal Metrics)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">คลังรวมทั้งหมด</span>
                <span className="text-base font-extrabold text-slate-800 font-mono block mt-0.5">
                  {questions.length} ข้อ
                </span>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">ความแม่นยำสะสม</span>
                <span className="text-base font-extrabold text-indigo-600 font-mono block mt-0.5">
                  {overallAccuracy}%
                </span>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">คลังข้อที่ตอบผิด</span>
                <span className="text-base font-extrabold text-rose-600 font-mono block mt-0.5">
                  {activeMistakesCount} ข้อ
                </span>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">สถิติสูงสุด (Streak)</span>
                <span className="text-base font-extrabold text-amber-600 font-mono block mt-0.5">
                  {streak} ข้อรวด
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Challenge Mode timer setup */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                โหมดจับเวลา (Challenge Mode)
              </h3>
              <span className="text-[9px] font-bold text-slate-400">เลียนแบบสนามสอบจริง</span>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={challengeConfig.enabled}
                  onChange={(e) => onSetChallengeConfig({ ...challengeConfig, enabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-xs font-bold text-slate-700">เปิดระบบจับเวลาต่อข้อ</span>
              </label>

              {challengeConfig.enabled && (
                <div className="flex items-center justify-between bg-indigo-50/25 border border-indigo-100/50 p-2.5 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">จำกัดเวลาต่อคำถาม:</span>
                  <select
                    value={challengeConfig.timeLimitPerQuestion}
                    onChange={(e) =>
                      onSetChallengeConfig({ ...challengeConfig, timeLimitPerQuestion: parseInt(e.target.value) })
                    }
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="15">15 วินาที (ยาก/ท้าทาย)</option>
                    <option value="30">30 วินาที (มาตรฐาน TGAT)</option>
                    <option value="60">60 วินาที (ระดับง่าย)</option>
                    <option value="120">120 วินาที (ฝึกวิเคราะห์แบบละเอียด)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section C: Quick Practice Menu */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              เริ่มฝึกทำแบบรวดเร็ว (Quick Training)
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={() => onStartQuiz("random", 10)}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-100 hover:border-indigo-200 transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>⚡ สุ่มแบบด่วน 10 ข้อ</span>
                <span className="text-[10px] text-indigo-600 font-bold font-mono">10 Qs</span>
              </button>

              <button
                onClick={() => onStartQuiz("random", 20)}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-100 hover:border-indigo-200 transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>🎯 สุ่มฝึกฝนมาตรฐาน 20 ข้อ</span>
                <span className="text-[10px] text-indigo-600 font-bold font-mono">20 Qs</span>
              </button>

              <button
                onClick={() => onStartQuiz("mistakes")}
                disabled={activeMistakesCount === 0}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 disabled:bg-slate-50 disabled:text-slate-350 disabled:border-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-100 hover:border-rose-200 transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>🛠️ ลุยคลังข้อที่ตอบผิด (My Mistakes)</span>
                <span className="text-[10px] font-bold font-mono bg-rose-100/50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200/30">
                  {activeMistakesCount} ข้อ
                </span>
              </button>
            </div>
          </div>

          {/* Section D: Metacognitive Confidence Analytics */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                วิเคราะห์จิตวิทยาความมั่นใจ (Metacognition)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                แยกระหว่างทักษะที่เข้าใจจริงกับสภาวะประมาทหรือความไม่มั่นใจสะสม
              </p>
            </div>

            <div className="space-y-3">
              {/* Box 1: Unconfident but Correct */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">ไม่มั่นใจแต่ตอบถูก</span>
                  <span className="text-xs font-extrabold text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.2 rounded">
                    {unconfidentCorrectCount} ข้อ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  เป็นคำถามที่คุณกดปักธงทบทวน (Flagged) แต่ตอบถูก แสดงว่าสัญชาตญาณหรือเซนส์ภาษาดีแต่ยังขาดความมั่นใจ ควรกลับมาทวนให้แม่นยำขึ้น
                </p>
              </div>

              {/* Box 2: Overconfident but Incorrect */}
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-750">มั่นใจเกินไปแต่กลับตอบผิด</span>
                  <span className="text-xs font-extrabold text-rose-600 font-mono bg-rose-50 px-1.5 py-0.2 rounded">
                    {overconfidentIncorrectCount} ข้อ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  เป็นข้อสอบที่คิดว่ามั่นใจโดยไม่ได้ปักธงแต่ผลลัพธ์คือตอบผิด หัวข้อนี้จัดเป็นรอยรั่วสำคัญที่คุณอาจจดจำกฎผิดหรือถูกตัวเลือกหลอกได้ง่าย!
                </p>
              </div>
            </div>
          </div>

          {/* Section E: Simple Leaderboard */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                🏆 บอร์ดทำเนียบคะแนนรวมห้องเรียน (Leaderboard)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                อันดับการสะสมคะแนนข้อที่ตอบถูกและความแม่นยำของเพื่อนร่วมห้อง
              </p>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((student, idx) => {
                const isSelf = student.id === currentUser.id;
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                      isSelf
                        ? "bg-indigo-50 border border-indigo-150 text-indigo-950 font-bold"
                        : "bg-slate-50/60 border border-slate-100 text-slate-650 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                        idx === 0 
                          ? "bg-amber-100 text-amber-700 border border-amber-200" 
                          : idx === 1 
                            ? "bg-slate-200 text-slate-700" 
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">
                        {student.realName} {isSelf && "(คุณ)"}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-indigo-600 font-mono">{student.correctCount} ข้อถูก</span>
                      <span className="text-[9px] text-slate-400 block font-mono">แม่นยำ {student.accuracy}%</span>
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-2">ยังไม่มีประวัติการส่งคะแนนร่วมกัน</p>
              )}
            </div>
          </div>

          {/* Section F: Statistics Reset Option */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (confirm("คุณต้องการล้างประวัติการฝึกฝนส่วนตัวของคุณทั้งหมดหรือไม่? (สถิติและคลังข้อที่ผิดจะเริ่มนับใหม่)")) {
                  onClearHistory();
                }
              }}
              className="w-full py-2 hover:bg-rose-50 text-rose-500 font-bold text-[11px] rounded-xl transition-all border border-rose-100/40 flex items-center justify-center gap-1 cursor-pointer bg-white"
            >
              🔄 เริ่มต้นใหม่ - ล้างประวัติส่วนตัวทั้งหมด
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
