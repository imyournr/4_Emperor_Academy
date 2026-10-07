import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Question, UserAttempt, ChallengeConfig, User, Course, Passage, QCStatus, QuestionComment } from "./types";
import {
  loadQuestions,
  saveQuestions,
  resetQuestionsToDefault,
  loadAttempts,
  saveAttempt,
  clearAttempts,
  getActiveMistakes,
  loadUsers,
  saveUsers,
  loadCategories,
  saveCategories,
  loadCourses,
  saveCourses,
  loadPassages,
  savePassages
} from "./lib/storage";

// Sub-components
import Dashboard from "./components/Dashboard";
import QuizEngine from "./components/QuizEngine";
import MistakesBank from "./components/MistakesBank";
import AdminPanel from "./components/AdminPanel";
import Auth from "./components/Auth";

// Icons
import {
  BookOpen,
  Award,
  Upload,
  AlertTriangle,
  LayoutDashboard,
  Timer,
  Info,
  Layers,
  Sparkles,
  LogOut,
  ShieldCheck,
  User as UserIcon
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  
  // All recorded attempts across all users (for computing live leaderboard)
  const [allAttempts, setAllAttempts] = useState<UserAttempt[]>([]);
  // Only attempts of the currently logged in student
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);

  // Navigation states
  const [activeView, setActiveView] = useState<"dashboard" | "mistakes" | "admin">("dashboard");
  
  // Active Quiz State
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [challengeConfig, setChallengeConfig] = useState<ChallengeConfig>({
    enabled: false,
    timeLimitPerQuestion: 30
  });

  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);

  // Load database structures on mount and sync with full-stack server
  useEffect(() => {
    // 1. Initial local load for immediate page rendering
    const localQ = loadQuestions();
    const localU = loadUsers();
    const localC = loadCategories();
    const localA = loadAttempts();
    const localCourses = loadCourses();
    const localPassages = loadPassages();
    
    setQuestions(localQ);
    setUsers(localU);
    setCategories(localC);
    setAllAttempts(localA);
    setCourses(localCourses);
    setPassages(localPassages);

    // 2. Fetch shared database state from container full-stack server
    fetch("/api/db")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.empty) {
          // Priority to server's shared database
          setQuestions(data.questions || []);
          setUsers(data.users || []);
          setCategories(data.categories || []);
          setAllAttempts(data.attempts || []);
          setCourses(data.courses || []);
          setPassages(data.passages || []);
          
          // Write back to local cache as immediate local fallback
          saveQuestions(data.questions || []);
          saveUsers(data.users || []);
          saveCategories(data.categories || []);
          saveCourses(data.courses || []);
          savePassages(data.passages || []);
          localStorage.setItem("eng_quiz_attempts_v1", JSON.stringify(data.attempts || []));
          
          setIsLoadedFromServer(true);
        } else {
          // If server database is empty (first-time boot), upload our current local dataset to initialize server
          fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questions: localQ,
              users: localU,
              categories: localC,
              attempts: localA,
              courses: localCourses,
              passages: localPassages
            })
          })
          .then(() => {
            setIsLoadedFromServer(true);
          })
          .catch((err) => {
            console.error("Failed to initialize server database:", err);
            setIsLoadedFromServer(true);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load server database, falling back to local storage:", err);
        setIsLoadedFromServer(true);
      });
  }, []);

  // Sync state back to server whenever changes are made (debounced)
  useEffect(() => {
    if (!isLoadedFromServer) return;

    const syncTimeout = setTimeout(() => {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          users,
          categories,
          attempts: allAttempts,
          courses,
          passages
        })
      })
      .then(() => {
        // Also ensure local storage copy is perfectly updated
        saveQuestions(questions);
        saveUsers(users);
        saveCategories(categories);
        saveCourses(courses);
        savePassages(passages);
        localStorage.setItem("eng_quiz_attempts_v1", JSON.stringify(allAttempts));
      })
      .catch((err) => {
        console.error("Failed to sync database to server:", err);
      });
    }, 500); // 500ms debounce to prevent multiple write requests during rapid operations

    return () => clearTimeout(syncTimeout);
  }, [questions, users, categories, allAttempts, courses, passages, isLoadedFromServer]);

  // Sync active user attempts when currentUser or global attempts change
  useEffect(() => {
    if (currentUser) {
      // Re-fetch standard user in case their details (like enrolledCourses) updated
      const freshUser = users.find(u => u.id === currentUser.id);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
      setAttempts(allAttempts.filter((a) => a.userId === currentUser.id));
    } else {
      setAttempts([]);
    }
  }, [currentUser, allAttempts, users]);

  // Handle Log Out
  const handleLogOut = () => {
    setCurrentUser(null);
    setActiveView("dashboard");
    setIsQuizActive(false);
    setActiveQuizQuestions([]);
  };

  // Handle Student Registration
  const handleRegisterStudent = (newStudentData: Omit<User, "id">) => {
    const newStudent: User = {
      ...newStudentData,
      id: `user_${Date.now()}`,
      enrolledCourses: [] // Starts with empty course enrollments by default
    };
    const updatedUsers = [...users, newStudent];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    return newStudent;
  };

  // Course Management Handlers
  const handleAddCourse = (newCourse: Course) => {
    const updated = [...courses, newCourse];
    setCourses(updated);
    saveCourses(updated);
  };

  const handleUpdateCourse = (courseId: string, updatedFields: Partial<Course>) => {
    const updated = courses.map((c) => c.id === courseId ? { ...c, ...updatedFields } : c);
    setCourses(updated);
    saveCourses(updated);
  };

  const handleDeleteCourse = (courseId: string) => {
    const updated = courses.filter((c) => c.id !== courseId);
    setCourses(updated);
    saveCourses(updated);
  };

  const handleUpdateUserCourses = (userId: string, courseIds: string[]) => {
    const updatedUsers = users.map((u) => u.id === userId ? { ...u, enrolledCourses: courseIds } : u);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  const handleBulkAssignCourses = (userIds: string[], courseIds: string[]) => {
    const updatedUsers = users.map((u) => {
      if (userIds.includes(u.id)) {
        const currentEnrolled = u.enrolledCourses || [];
        const combined = Array.from(new Set([...currentEnrolled, ...courseIds]));
        return { ...u, enrolledCourses: combined };
      }
      return u;
    });
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  // Active student's mistakes bank
  const activeMistakes = currentUser 
    ? getActiveMistakes(questions, allAttempts, currentUser.id)
    : [];

  // Admin: Add custom category
  const handleAddCategory = (newCat: string) => {
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);
  };

  // Admin: Delete custom category
  const handleDeleteCategory = (catToDelete: string) => {
    const updated = categories.filter((c) => c !== catToDelete);
    setCategories(updated);
    saveCategories(updated);
  };

  // Admin: Change student password
  const handleUpdateUserPassword = (userId: string, newPass: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, passwordHash: newPass } : u));
    setUsers(updated);
    saveUsers(updated);
  };

  // Admin: Add new user directly
  const handleAddUserDirect = (username: string, passwordHash: string, realName: string) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      passwordHash,
      role: "student",
      realName
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
  };

  // Admin: Delete user
  const handleDeleteUser = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    // Optionally delete user's scores
    const updatedAttempts = allAttempts.filter((a) => a.userId !== userId);
    setAllAttempts(updatedAttempts);
  };

  // Admin & Importer: Triggered when new questions are imported
  const handleImportQuestions = (newQuestions: Question[]) => {
    const updatedQuestions = [...questions, ...newQuestions];
    setQuestions(updatedQuestions);
    saveQuestions(updatedQuestions);
  };

  // Admin: Delete single question
  const handleDeleteQuestion = (qId: string) => {
    const updated = questions.filter((q) => q.id !== qId);
    setQuestions(updated);
    saveQuestions(updated);
  };

  // Admin: Update single question (e.g. change category/examSet)
  const handleUpdateQuestion = (qId: string, updatedFields: Partial<Question>) => {
    const updated = questions.map((q) => (q.id === qId ? { ...q, ...updatedFields } : q));
    setQuestions(updated);
    saveQuestions(updated);
  };

  // Admin: Bulk update category of an entire exam set
  const handleBulkUpdateCategory = (examSetName: string, newCategory: string) => {
    const updated = questions.map((q) => {
      const qSet = q.examSet || "ทั่วไป (General)";
      if (qSet === examSetName) {
        return { ...q, category: newCategory };
      }
      return q;
    });
    setQuestions(updated);
    saveQuestions(updated);
  };

  // Passage handlers
  const handleAddPassage = (newPassage: Passage) => {
    const updated = [newPassage, ...passages];
    setPassages(updated);
    savePassages(updated);
  };

  const handleUpdatePassage = (pId: string, updatedFields: Partial<Passage>) => {
    const updated = passages.map((p) => (p.id === pId ? { ...p, ...updatedFields } : p));
    setPassages(updated);
    savePassages(updated);
  };

  const handleDeletePassage = (pId: string) => {
    const updated = passages.filter((p) => p.id !== pId);
    setPassages(updated);
    savePassages(updated);
  };

  const handleLinkQuestionToPassage = (qId: string, pId: string | undefined) => {
    const updatedQuestions = questions.map((q) => (q.id === qId ? { ...q, passageId: pId } : q));
    setQuestions(updatedQuestions);
    saveQuestions(updatedQuestions);
  };

  const handleGenerateExamSet = (title: string, generatedQuestions: Question[], config: ChallengeConfig) => {
    setActiveQuizQuestions(generatedQuestions);
    setChallengeConfig(config);
    setIsQuizActive(true);
  };

  const handleSaveNewExamSetToBank = (examSetTitle: string, questionIds: string[]) => {
    const updated = questions.map((q) => {
      if (questionIds.includes(q.id)) {
        return { ...q, examSet: examSetTitle };
      }
      return q;
    });
    setQuestions(updated);
    saveQuestions(updated);
    alert(`🎉 บันทึกชุดข้อสอบ "${examSetTitle}" จำนวน ${questionIds.length} ข้อเข้าคลังสำเร็จ!`);
  };

  const handleUpdateQuestionQC = (qId: string, status: QCStatus) => {
    const updated = questions.map((q) => (q.id === qId ? { ...q, qcStatus: status } : q));
    setQuestions(updated);
    saveQuestions(updated);
  };

  const handleAddComment = (qId: string, commentText: string) => {
    const updated = questions.map((q) => {
      if (q.id === qId) {
        const comments = q.editorialComments || [];
        const now = new Date();
        const formattedTime = `${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} ${now.toLocaleDateString("th-TH")}`;
        const newComm: QuestionComment = {
          id: `comm_${Date.now()}`,
          author: currentUser?.realName || currentUser?.username || "เจ้าหน้าที่ QC",
          role: currentUser?.role === "admin" ? "อาจารย์ / QC Admin" : "ผู้ตรวจสอบ",
          text: commentText,
          timestamp: formattedTime,
          resolved: false
        };
        return { ...q, editorialComments: [...comments, newComm] };
      }
      return q;
    });
    setQuestions(updated);
    saveQuestions(updated);
  };

  // Student: Clear personal history
  const handleClearPersonalHistory = () => {
    if (currentUser) {
      const updatedAttempts = allAttempts.filter((a) => a.userId !== currentUser.id);
      setAllAttempts(updatedAttempts);
    }
  };

  // Student: Manually resolve a mistake by marking it as mastered
  const handleMarkAsMastered = (qId: string) => {
    if (!currentUser) return;
    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;
    
    const attempt: UserAttempt = {
      id: `attempt_mastered_${Date.now()}_${qId}`,
      userId: currentUser.id,
      questionId: qId,
      category: targetQ.category,
      selectedIndex: targetQ.correctIndex, // Correctly solved
      isCorrect: true,
      timestamp: Date.now(),
      timeSpent: 0
    };
    const updatedAttempts = [...allAttempts, attempt];
    setAllAttempts(updatedAttempts);
  };

  // Admin: Reset database back to default initial questions and clean slate
  const handleResetDatabase = () => {
    const defaults = resetQuestionsToDefault();
    setQuestions(defaults);
    setAllAttempts([]);
  };

  // Triggered when quiz finishes
  const handleFinishQuiz = (sessionAttempts: UserAttempt[]) => {
    const updatedAttempts = [...allAttempts, ...sessionAttempts];
    setAllAttempts(updatedAttempts);
    setIsQuizActive(false);
    setActiveQuizQuestions([]);
    setActiveView("dashboard");
  };

  // Real-time update question from within active quiz (especially for admin edits)
  const handleUpdateQuestionInQuiz = (qId: string, updatedFields: Partial<Question>) => {
    const updatedGlobal = questions.map((q) => (q.id === qId ? { ...q, ...updatedFields } : q));
    setQuestions(updatedGlobal);
    saveQuestions(updatedGlobal);
    setActiveQuizQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, ...updatedFields } : q)));
  };

  // Launch a quiz based on specific filters
  const handleStartQuiz = (
    mode: "all" | "random" | "mistakes" | string,
    limit?: number,
    filterType: "category" | "examSet" | "categoryAndExamSet" = "category",
    extraFilter?: string
  ) => {
    let pool: Question[] = [];

    if (mode === "mistakes") {
      pool = [...activeMistakes];
    } else if (mode === "random") {
      pool = [...questions];
    } else if (mode === "all") {
      pool = [...questions];
    } else if (filterType === "examSet") {
      pool = questions.filter((q) => (q.examSet || "ทั่วไป (General)") === mode);
    } else if (filterType === "categoryAndExamSet") {
      pool = questions.filter(
        (q) => q.category === mode && (q.examSet || "ทั่วไป (General)") === extraFilter
      );
    } else {
      // It's a category filter, e.g. "Tenses"
      pool = questions.filter((q) => q.category === mode);
    }

    // Only shuffle if NOT doing an exam set / mock test!
    const shouldShuffle = mode === "random" || (filterType !== "examSet" && filterType !== "categoryAndExamSet");
    const processedPool = shouldShuffle ? [...pool].sort(() => Math.random() - 0.5) : [...pool];

    // Apply limit if specified
    const selected = limit ? processedPool.slice(0, limit) : processedPool;

    if (selected.length === 0) {
      alert("ไม่มีข้อสอบให้ฝึกซ้อมสำหรับตัวเลือกนี้ กรุณาลองตรวจสอบใหม่อีกครั้ง");
      return;
    }

    setActiveQuizQuestions(selected);
    setIsQuizActive(true);
  };

  // Handle Login and auto-navigate depending on user's role
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === "admin") {
      setActiveView("admin");
    } else {
      setActiveView("dashboard");
    }
  };

  // If no user is logged in, show Auth component
  if (!currentUser) {
    return (
      <div id="main-app" className="min-h-screen bg-slate-50/80 text-slate-800 font-sans antialiased flex flex-col justify-center py-12 relative overflow-hidden">
        {/* Apple-style Ambient Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-100/40 via-amber-100/20 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        
        <div className="max-w-md w-full mx-auto px-4">
          <Auth
            users={users}
            onLogin={handleLogin}
            onRegister={handleRegisterStudent}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="main-app" className="min-h-screen bg-slate-50/90 text-slate-800 font-sans antialiased flex flex-col pb-16 relative">
      {/* Apple Dynamic Background Light Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-gradient-to-b from-blue-100/40 via-slate-100/20 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:32px_32px] opacity-30 pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 flex flex-col gap-6">
        
        {/* Header Branding - Apple Translucent Dark Glass Bar */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-900/90 text-white backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-56 h-56 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 3 }}
                className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-lg flex items-center justify-center font-bold"
              >
                <BookOpen className="w-5 h-5" />
              </motion.div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2 uppercase">
                  4 Emperor Academy
                </h1>
                <p className="text-[10px] text-amber-400 tracking-widest font-bold uppercase -mt-0.5">
                  English Institute & Portal
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full ml-1 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-amber-400" /> {currentUser.role === "admin" ? "ADMIN PORTAL" : "STUDENT PORTAL"}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              ผู้เข้าใช้: <strong className="text-white">{currentUser.realName}</strong> ({currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "นักเรียน"})
            </p>
          </div>

          {!isQuizActive && (
            <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
              
              {/* Main Nav Items - Segmented Pill Switcher */}
              <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                {currentUser.role === "admin" ? (
                  <>
                    <button
                      onClick={() => setActiveView("admin")}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeView === "admin" ? "text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {activeView === "admin" && (
                        <motion.div
                          layoutId="active-main-tab"
                          className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm -z-0"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        แผงอาจารย์
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveView("dashboard")}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeView === "dashboard" ? "text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {activeView === "dashboard" && (
                        <motion.div
                          layoutId="active-main-tab"
                          className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm -z-0"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        แดชบอร์ดสอบ
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveView("mistakes")}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeView === "mistakes" ? "text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {activeView === "mistakes" && (
                        <motion.div
                          layoutId="active-main-tab"
                          className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm -z-0"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ข้อที่ผิด ({activeMistakes.length})
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveView("dashboard")}
                      className={`relative px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeView === "dashboard" ? "text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {activeView === "dashboard" && (
                        <motion.div
                          layoutId="active-main-tab"
                          className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm -z-0"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        คอร์สเรียน & แดชบอร์ด
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveView("mistakes")}
                      className={`relative px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeView === "mistakes" ? "text-slate-950" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {activeView === "mistakes" && (
                        <motion.div
                          layoutId="active-main-tab"
                          className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm -z-0"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        คลังข้อที่ผิด ({activeMistakes.length})
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Log Out Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLogOut}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-2xl text-xs font-bold transition-all border border-rose-500/30 cursor-pointer shadow-md"
                title="ลงชื่อออก"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </motion.button>
            </div>
          )}
        </motion.header>

        {/* Core Screen Router with Apple Motion Transitions */}
        <main className="flex-1">
          {isQuizActive ? (
            <QuizEngine
              userId={currentUser.id}
              questions={activeQuizQuestions}
              challengeConfig={challengeConfig}
              onFinishQuiz={handleFinishQuiz}
              isAdmin={currentUser.role === "admin"}
              onUpdateQuestion={handleUpdateQuestionInQuiz}
              onClose={() => {
                setIsQuizActive(false);
                setActiveQuizQuestions([]);
              }}
            />
          ) : (
            <AnimatePresence mode="wait">
              {activeView === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Dashboard
                    currentUser={currentUser}
                    users={users}
                    questions={questions}
                    attempts={attempts}
                    allAttempts={allAttempts}
                    activeMistakesCount={activeMistakes.length}
                    challengeConfig={challengeConfig}
                    categories={categories}
                    courses={courses}
                    onUpdateUserCourses={handleUpdateUserCourses}
                    onSetChallengeConfig={setChallengeConfig}
                    onStartQuiz={handleStartQuiz}
                    onClearHistory={handleClearPersonalHistory}
                  />
                </motion.div>
              )}

              {activeView === "mistakes" && (
                <motion.div
                  key="mistakes"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <MistakesBank
                    questions={questions}
                    activeMistakes={activeMistakes}
                    categories={categories}
                    onStartQuiz={handleStartQuiz}
                    onRemoveMistake={handleMarkAsMastered}
                    attempts={attempts}
                  />
                </motion.div>
              )}

              {activeView === "admin" && currentUser.role === "admin" && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AdminPanel
                    users={users}
                    questions={questions}
                    categories={categories}
                    attempts={allAttempts}
                    courses={courses}
                    passages={passages}
                    currentUser={currentUser}
                    onAddCourse={handleAddCourse}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    onUpdateUserCourses={handleUpdateUserCourses}
                    onBulkAssignCourses={handleBulkAssignCourses}
                    onAddCategory={handleAddCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onUpdateUserPassword={handleUpdateUserPassword}
                    onAddUser={handleAddUserDirect}
                    onDeleteUser={handleDeleteUser}
                    onImportQuestions={handleImportQuestions}
                    onDeleteQuestion={handleDeleteQuestion}
                    onUpdateQuestion={handleUpdateQuestion}
                    onResetDatabase={handleResetDatabase}
                    onBulkUpdateCategory={handleBulkUpdateCategory}
                    onAddPassage={handleAddPassage}
                    onUpdatePassage={handleUpdatePassage}
                    onDeletePassage={handleDeletePassage}
                    onLinkQuestionToPassage={handleLinkQuestionToPassage}
                    onGenerateExamSet={handleGenerateExamSet}
                    onSaveNewExamSetToBank={handleSaveNewExamSetToBank}
                    onUpdateQuestionQC={handleUpdateQuestionQC}
                    onAddComment={handleAddComment}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* Apple Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200/80 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-medium text-slate-500">
            © {new Date().getFullYear()} 4 Emperor Academy. Professional Thai Pedagogy Platform.
          </div>
          <div className="flex items-center justify-center gap-1.5 text-slate-500 font-medium">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>ขุมพลัง AI วิเคราะห์แกรมม่าภาษาอังกฤษขั้นสูง</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
