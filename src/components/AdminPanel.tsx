import React, { useState } from "react";
import { User, Question, UserAttempt, Course, VideoLecture, Passage, QCStatus, ChallengeConfig } from "../types";
import Importer from "./Importer";
import PassageBank from "./PassageBank";
import MatrixGenerator from "./MatrixGenerator";
import ItemAnalytics from "./ItemAnalytics";
import EditorialQCWorkflow from "./EditorialQCWorkflow";
import ExamPaperExporter from "./ExamPaperExporter";
import { renderFormattedQuestionText } from "./QuizEngine";
import {
  Users,
  AlertCircle,
  CheckCircle,
  Settings,
  PlusCircle,
  FileText,
  Key,
  Database,
  Trash2,
  BookmarkCheck,
  Award,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  RefreshCw,
  Plus,
  Lock,
  Search,
  Sparkles,
  Tv,
  BookOpen,
  UserCheck,
  CheckSquare,
  Square,
  Trash,
  Edit,
  Sliders,
  BarChart2,
  ShieldCheck,
  Printer
} from "lucide-react";

interface AdminPanelProps {
  users: User[];
  questions: Question[];
  categories: string[];
  attempts?: UserAttempt[];
  courses: Course[];
  passages?: Passage[];
  currentUser?: User | null;
  onAddCourse: (newCourse: Course) => void;
  onUpdateCourse: (courseId: string, updatedFields: Partial<Course>) => void;
  onDeleteCourse: (courseId: string) => void;
  onUpdateUserCourses: (userId: string, courseIds: string[]) => void;
  onBulkAssignCourses: (userIds: string[], courseIds: string[]) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onUpdateUserPassword: (userId: string, newPass: string) => void;
  onAddUser: (username: string, passwordHash: string, realName: string) => void;
  onDeleteUser: (userId: string) => void;
  onImportQuestions: (newQuestions: Question[]) => void;
  onDeleteQuestion: (qId: string) => void;
  onUpdateQuestion: (qId: string, updatedFields: Partial<Question>) => void;
  onResetDatabase: () => void;
  onBulkUpdateCategory: (examSetName: string, newCategory: string) => void;

  // Passage & Matrix & QC Handlers
  onAddPassage?: (newPassage: Passage) => void;
  onUpdatePassage?: (passageId: string, updated: Partial<Passage>) => void;
  onDeletePassage?: (passageId: string) => void;
  onLinkQuestionToPassage?: (questionId: string, passageId: string | undefined) => void;
  onGenerateExamSet?: (title: string, generatedQuestions: Question[], config: ChallengeConfig) => void;
  onSaveNewExamSetToBank?: (examSetTitle: string, questionIds: string[]) => void;
  onUpdateQuestionQC?: (questionId: string, status: QCStatus) => void;
  onAddComment?: (questionId: string, commentText: string) => void;
}

export default function AdminPanel({
  users,
  questions,
  categories,
  courses = [],
  passages = [],
  currentUser = null,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onUpdateUserCourses,
  onBulkAssignCourses,
  onAddCategory,
  onDeleteCategory,
  onUpdateUserPassword,
  onAddUser,
  onDeleteUser,
  onImportQuestions,
  onDeleteQuestion,
  onUpdateQuestion,
  onResetDatabase,
  onBulkUpdateCategory,
  attempts = [],
  onAddPassage = () => {},
  onUpdatePassage = () => {},
  onDeletePassage = () => {},
  onLinkQuestionToPassage = () => {},
  onGenerateExamSet = () => {},
  onSaveNewExamSetToBank = () => {},
  onUpdateQuestionQC = () => {},
  onAddComment = () => {}
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    | "courses"
    | "questions"
    | "passages"
    | "matrix"
    | "analytics"
    | "qc-workflow"
    | "users"
    | "categories"
    | "importer"
    | "export-print"
    | "health"
    | "ai-assistant"
  >("courses");

  // D. Question Quality Metrics pre-calculations
  const questionAttemptsMap = React.useMemo(() => {
    const map = {};
    attempts.forEach((a) => {
      if (!map[a.questionId]) {
        map[a.questionId] = { total: 0, correct: 0, rate: 0 };
      }
      map[a.questionId].total += 1;
      if (a.isCorrect) {
        map[a.questionId].correct += 1;
      }
    });
    Object.keys(map).forEach((qId) => {
      map[qId].rate = Math.round((map[qId].correct / map[qId].total) * 100);
    });
    return map;
  }, [attempts, questions]);

  // Bulk category change states
  const [bulkExamSet, setBulkExamSet] = useState("");
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [bulkNewCategory, setBulkNewCategory] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");
  const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);
  const [bulkConfirmCount, setBulkConfirmCount] = useState(0);

  // User tab form states
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRealName, setNewRealName] = useState("");
  const [userError, setUserError] = useState("");

  // Edit user password state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassValue, setEditPassValue] = useState("");

  // Category tab state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Search question state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSetFilter, setSelectedSetFilter] = useState<string>("all");
  const [quickFilterSearchQuery, setQuickFilterSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Exam set dropdown selection states inside table row
  const [openDropdownQId, setOpenDropdownQId] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // AI Assistant States
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState(categories[0] || "Grammar");
  const [aiExamSet, setAiExamSet] = useState("Mock Test by AI");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiNumQuestions, setAiNumQuestions] = useState(3);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
  const [aiGenError, setAiGenError] = useState("");
  const [aiGenSuccessMsg, setAiGenSuccessMsg] = useState("");

  const [aiRawSentence, setAiRawSentence] = useState("");
  const [aiUnderlineA, setAiUnderlineA] = useState("");
  const [aiUnderlineB, setAiUnderlineB] = useState("");
  const [aiUnderlineC, setAiUnderlineC] = useState("");
  const [aiUnderlineD, setAiUnderlineD] = useState("");
  const [aiFormattedError, setAiFormattedError] = useState("");
  const [aiIsFormatting, setAiIsFormatting] = useState(false);

  // States for database-wide Error Identification auto-fix
  const [isFixingAllUnderlines, setIsFixingAllUnderlines] = useState(false);
  const [fixAllUnderlinesMessage, setFixAllUnderlinesMessage] = useState("");

  // Course Management states
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCategory, setCourseCategory] = useState("TGAT");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseExamSets, setCourseExamSets] = useState<string[]>([]);
  const [courseVideos, setCourseVideos] = useState<VideoLecture[]>([]);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseError, setCourseError] = useState("");
  const [courseSuccess, setCourseSuccess] = useState("");

  // Video Form states
  const [videoTitle, setVideoTitle] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoDuration, setVideoDuration] = useState("");

  // Bulk Student Course Enrollment states
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [selectedBulkCourseIds, setSelectedBulkCourseIds] = useState<string[]>([]);
  const [bulkCourseSuccessMsg, setBulkCourseSuccessMsg] = useState("");

  // Student list refinement states
  const [studentSearch, setStudentSearch] = useState("");
  const [editingStudentIdCourses, setEditingStudentIdCourses] = useState<string | null>(null);

  const handleFixAllUnderlines = async () => {
    if (!confirm("คุณต้องการให้ AI สแกนคลังข้อสอบและทำการวิเคราะห์เพิ่มโค้ดขีดเส้นใต้ (_) ให้ข้อสอบ Error Identification ทั้งหมดที่มีในระบบใช่หรือไม่?\n\n(ขั้นตอนนี้จะใช้เวลาชั่วครู่ในการประมวลผลผ่าน Gemini AI)")) {
      return;
    }
    setIsFixingAllUnderlines(true);
    setFixAllUnderlinesMessage("");
    try {
      const res = await fetch("/api/fix-all-underlines", {
        method: "POST"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      }
      if (data.success) {
        setFixAllUnderlinesMessage(`🎉 สำเร็จ: ${data.message}`);
        if (data.updatedQuestions) {
          // Sync state immediately back to React global questions pool
          data.updatedQuestions.forEach((updatedQ: any) => {
            const originalQ = questions.find((q) => q.id === updatedQ.id);
            if (originalQ && originalQ.text !== updatedQ.text) {
              onUpdateQuestion(updatedQ.id, { text: updatedQ.text });
            }
          });
        }
      } else {
        setFixAllUnderlinesMessage(`ℹ️ ข้อมูล: ${data.message}`);
      }
    } catch (err: any) {
      console.error(err);
      setFixAllUnderlinesMessage(`❌ ข้อผิดพลาด: ${err.message || "ล้มเหลวในการปรับปรุงคลังข้อสอบ"}`);
    } finally {
      setIsFixingAllUnderlines(false);
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");

    if (!newUsername.trim() || !newPassword.trim() || !newRealName.trim()) {
      setUserError("กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน");
      return;
    }

    const exists = users.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase());
    if (exists) {
      setUserError("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
      return;
    }

    onAddUser(newUsername.trim(), newPassword.trim(), newRealName.trim());
    setNewUsername("");
    setNewPassword("");
    setNewRealName("");
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError("");

    if (!newCategoryName.trim()) {
      setCategoryError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    const exists = categories.some((c) => c.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (exists) {
      setCategoryError("หมวดหมู่นี้มีอยู่ในระบบแล้ว");
      return;
    }

    onAddCategory(newCategoryName.trim());
    setNewCategoryName("");
  };

  const handleAIGenerateQuestions = async () => {
    if (!aiTopic.trim()) {
      setAiGenError("กรุณากรอกหัวข้อหรือเนื้อหาไวยากรณ์ที่ต้องการให้ AI ออกข้อสอบ");
      return;
    }
    setAiIsGenerating(true);
    setAiGenError("");
    setAiGenSuccessMsg("");
    setAiGeneratedQuestions([]);

    try {
      const promptText = `Please generate exactly ${aiNumQuestions} high-quality multiple choice English questions targeting the grammar or vocabulary topic: "${aiTopic}".
The difficulty level should be "${aiDifficulty}".
The category/genre of these questions must be assigned as "${aiCategory}".
The exam set name must be assigned as "${aiExamSet || "Mock Test by AI"}".

Requirements:
- Make sure to write a detailed explanation in Thai for each question.
- Every question must have exactly 4 options.
- If the category is "Error Identification" (or "Error Detection"), make sure the question text includes exactly 4 underlined parts using underscores and option tags (a), (b), (c), (d), e.g. "She (a) _don't_ like (b) _playing_ tennis (c) _because_ she (d) _is_ lazy." so it renders perfectly in our UI.
- Provide a correctIndex between 0 and 3.`;

      const res = await fetch("/api/analyze-exam-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: promptText,
          defaultCategory: aiCategory,
          defaultExamSet: aiExamSet || "Mock Test by AI"
        })
      });

      if (!res.ok) {
        throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่า Gemini API Key");
      }

      const data = await res.json();
      if (data && data.questions && data.questions.length > 0) {
        // Map questions with temporary ids
        const formatted = data.questions.map((q: any, index: number) => ({
          ...q,
          id: `ai_gen_${Date.now()}_${index}`,
          tags: q.tags || [aiCategory, "AI-Generated"]
        }));
        setAiGeneratedQuestions(formatted);
        setAiGenSuccessMsg(`✨ AI สร้างข้อสอบคุณภาพจำนวน ${formatted.length} ข้อสำเร็จ! กรุณาตรวจสอบความถูกต้องและกดปุ่มด้านล่างเพื่อนำเข้าคลังระบบ`);
      } else {
        throw new Error("ไม่มีข้อมูลข้อสอบถูกส่งกลับมา กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      console.error(err);
      setAiGenError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setAiIsGenerating(false);
    }
  };

  const handleAIFormatErrorQuestion = async (mode: "auto" | "manual") => {
    if (!aiRawSentence.trim()) {
      alert("กรุณากรอกประโยคภาษาอังกฤษก่อน");
      return;
    }

    if (mode === "manual") {
      let resultText = aiRawSentence;
      // Precision replace to prevent substrings collisions
      if (aiUnderlineA && resultText.includes(aiUnderlineA)) resultText = resultText.replace(aiUnderlineA, `_subA_`);
      if (aiUnderlineB && resultText.includes(aiUnderlineB)) resultText = resultText.replace(aiUnderlineB, `_subB_`);
      if (aiUnderlineC && resultText.includes(aiUnderlineC)) resultText = resultText.replace(aiUnderlineC, `_subC_`);
      if (aiUnderlineD && resultText.includes(aiUnderlineD)) resultText = resultText.replace(aiUnderlineD, `_subD_`);

      if (aiUnderlineA) resultText = resultText.replace(`_subA_`, `_${aiUnderlineA}_ (a)`);
      if (aiUnderlineB) resultText = resultText.replace(`_subB_`, `_${aiUnderlineB}_ (b)`);
      if (aiUnderlineC) resultText = resultText.replace(`_subC_`, `_${aiUnderlineC}_ (c)`);
      if (aiUnderlineD) resultText = resultText.replace(`_subD_`, `_${aiUnderlineD}_ (d)`);

      setAiFormattedError(resultText);
    } else {
      setAiIsFormatting(true);
      try {
        const promptText = `Convert this raw English sentence with grammatical error into a beautifully formatted Error Identification question text: "${aiRawSentence}".
Please identify 4 words or phrases (with exactly 1 of them being the actual grammatical error) and wrap each of them with underscores and postfix letters (a), (b), (c), (d) or prefix letters. For example: "Neither the teacher (a) nor the students (b) is (c) aware of (d) the changes." or "She (a) _don't_ like (b) _playing_ tennis (c) _because_ she (d) _is_ lazy."
Return ONLY the formatted sentence string, nothing else.`;

        const res = await fetch("/api/analyze-exam-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: promptText,
            defaultCategory: "Error Identification"
          })
        });

        if (!res.ok) throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง");
        const data = await res.json();
        if (data && data.questions && data.questions[0]) {
          setAiFormattedError(data.questions[0].text);
          // if we also got options
          if (data.questions[0].options && data.questions[0].options.length === 4) {
            setAiUnderlineA(data.questions[0].options[0]);
            setAiUnderlineB(data.questions[0].options[1]);
            setAiUnderlineC(data.questions[0].options[2]);
            setAiUnderlineD(data.questions[0].options[3]);
          }
        } else {
          throw new Error("ไม่มีคำแนะนำจาก AI");
        }
      } catch (err: any) {
        alert(err.message || "ล้มเหลวในการเชื่อมต่อ AI");
      } finally {
        setAiIsFormatting(false);
      }
    }
  };

  const handleImportAIGeneratedQuestions = () => {
    if (aiGeneratedQuestions.length === 0) return;
    onImportQuestions(aiGeneratedQuestions);
    setAiGenSuccessMsg(`🎉 นำเข้าข้อสอบชุดใหม่จำนวน ${aiGeneratedQuestions.length} ข้อเข้าสู่ระบบเรียบร้อยแล้ว!`);
    setAiGeneratedQuestions([]);
    setAiTopic("");
  };

  const handleSavePasswordEdit = (userId: string) => {
    if (!editPassValue.trim()) return;
    onUpdateUserPassword(userId, editPassValue.trim());
    setEditingUserId(null);
    setEditPassValue("");
  };

  // Filter questions for display
  const filteredQuestions = questions.filter((q) => {
    const textMatch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = q.category.toLowerCase().includes(searchQuery.toLowerCase());
    const setMatch = (q.examSet || "").toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatch = textMatch || catMatch || setMatch;

    const qExamSet = q.examSet || "ทั่วไป (General)";
    const setFilterMatch = selectedSetFilter === "all" || qExamSet === selectedSetFilter;
    const catFilterMatch = selectedCategoryFilter === "all" || q.category === selectedCategoryFilter;

    return queryMatch && setFilterMatch && catFilterMatch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px] flex flex-col md:flex-row">
      
      {/* Side Navigation for Admin Panel */}
      <aside className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-5 space-y-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-brand-burgundy" />
            <h3 className="font-display text-xs font-black text-brand-navy uppercase tracking-wider">
              4 Emperor Academy
            </h3>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            ระบบบริหารหลักสูตร, สิทธิ์เข้าถึงแบบฝึกหัด, วิดีโอบรรยาย และข้อมูลนักเรียนทั้งหมดแบบจำลองห้องเรียนจริง
          </p>
        </div>

        {/* Tab Buttons */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("courses")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "courses"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-brand-gold" />
              <span>จัดการหลักสูตร & คอร์ส ({courses.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("questions")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "questions"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>คลังข้อสอบทั้งหมด ({questions.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("passages")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "passages"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>คลังบทความอ่าน ({passages.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>สุ่มสอบ Matrix Engine</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span>วิเคราะห์ Psychometrics</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("qc-workflow")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "qc-workflow"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>กระบวนการตรวจแก้ QC</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-burgundy" />
              <span>ทะเบียนผู้ใช้ ({users.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("importer")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "importer"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-rose-600" />
              <span>นำเข้า Word/Excel</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("export-print")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "export-print"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-cyan-600" />
              <span>พิมพ์ข้อสอบ / Export PDF</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "categories"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>จัดการหมวดหมู่ ({categories.length})</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("health")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "health"
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>สุขภาพข้อสอบ (QC Health)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab("ai-assistant")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-brand-gold/25 cursor-pointer ${
              activeTab === "ai-assistant"
                ? "bg-brand-burgundy text-white shadow-sm"
                : "text-brand-burgundy bg-brand-cream/40 hover:bg-brand-cream/70 hover:text-brand-navy"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
              <span>ผู้ช่วยอาจารย์ AI ✨</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </nav>

        {/* Global actions */}
        <div className="pt-6 border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            เครื่องมือระบบพื้นฐาน
          </p>
          <button
            onClick={() => {
              if (confirm("คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตคำถามกลับไปเป็นชุดเริ่มต้น? ข้อมูลนักเรียนและความพยายามทั้งหมดจะถูกลบออกด้วย")) {
                onResetDatabase();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเซ็ตคลังข้อสอบเริ่มต้น
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8">
        
        {/* TAB 0: COURSE MANAGEMENT & BULK ENROLLMENT */}
        {activeTab === "courses" && (() => {
          // Identify unique exam sets present in the system database
          const uniqueExamSets = Array.from(new Set(questions.map((q) => q.examSet || "ทั่วไป (General)")));
          const studentUsers = users.filter((u) => u.role === "student");

          const handleSaveCourseSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!courseTitle.trim()) {
              setCourseError("กรุณากรอกชื่อคอร์สเรียน");
              return;
            }

            const courseData: Course = {
              id: editingCourseId || `course_${Date.now()}`,
              title: courseTitle.trim(),
              category: courseCategory,
              description: courseDescription.trim(),
              examSets: courseExamSets,
              videos: courseVideos
            };

            if (editingCourseId) {
              onUpdateCourse(editingCourseId, courseData);
              setCourseSuccess("🎉 แก้ไขข้อมูลคอร์สเรียนเรียบร้อยแล้ว!");
            } else {
              onAddCourse(courseData);
              setCourseSuccess("🎉 สร้างคอร์สเรียนใหม่และบันทึกเข้าระบบเรียบร้อย!");
            }

            // Reset Form states
            setCourseTitle("");
            setCourseCategory("TGAT");
            setCourseDescription("");
            setCourseExamSets([]);
            setCourseVideos([]);
            setEditingCourseId(null);
            setCourseError("");
            setTimeout(() => setCourseSuccess(""), 4000);
          };

          const handleAddVideoToCourse = (e: React.FormEvent) => {
            e.preventDefault();
            if (!videoTitle.trim() || !videoYoutubeUrl.trim()) {
              alert("กรุณากรอกหัวข้อวิดีโอและลิงก์ YouTube");
              return;
            }

            // Convert watch/share youtube URLs to proper embed code if necessary
            let embedUrl = videoYoutubeUrl.trim();
            if (embedUrl.includes("youtube.com/watch?v=")) {
              const vParam = new URL(embedUrl).searchParams.get("v");
              if (vParam) {
                embedUrl = `https://www.youtube.com/embed/${vParam}`;
              }
            } else if (embedUrl.includes("youtu.be/")) {
              const segments = embedUrl.split("/");
              const id = segments[segments.length - 1]?.split("?")[0];
              if (id) {
                embedUrl = `https://www.youtube.com/embed/${id}`;
              }
            }

            const newVideo: VideoLecture = {
              id: `video_${Date.now()}`,
              title: videoTitle.trim(),
              youtubeUrl: embedUrl,
              description: videoDescription.trim(),
              duration: videoDuration.trim() || "15:00"
            };

            setCourseVideos([...courseVideos, newVideo]);
            setVideoTitle("");
            setVideoYoutubeUrl("");
            setVideoDescription("");
            setVideoDuration("");
          };

          const handleRemoveVideoFromCourse = (idx: number) => {
            setCourseVideos(courseVideos.filter((_, i) => i !== idx));
          };

          const handleEditCourseClick = (c: Course) => {
            setEditingCourseId(c.id);
            setCourseTitle(c.title);
            setCourseCategory(c.category);
            setCourseDescription(c.description);
            setCourseExamSets(c.examSets || []);
            setCourseVideos(c.videos || []);
            setCourseError("");
            setCourseSuccess("");
            window.scrollTo({ top: 0, behavior: "smooth" });
          };

          const handleCancelEdit = () => {
            setEditingCourseId(null);
            setCourseTitle("");
            setCourseCategory("TGAT");
            setCourseDescription("");
            setCourseExamSets([]);
            setCourseVideos([]);
            setCourseError("");
          };

          const handleToggleExamSetSelection = (setName: string) => {
            if (courseExamSets.includes(setName)) {
              setCourseExamSets(courseExamSets.filter(s => s !== setName));
            } else {
              setCourseExamSets([...courseExamSets, setName]);
            }
          };

          // Bulk Enrollment Actions
          const handleToggleBulkUserSelect = (uId: string) => {
            if (selectedBulkUserIds.includes(uId)) {
              setSelectedBulkUserIds(selectedBulkUserIds.filter(id => id !== uId));
            } else {
              setSelectedBulkUserIds([...selectedBulkUserIds, uId]);
            }
          };

          const handleSelectAllStudentsForBulk = () => {
            if (selectedBulkUserIds.length === studentUsers.length) {
              setSelectedBulkUserIds([]);
            } else {
              setSelectedBulkUserIds(studentUsers.map(u => u.id));
            }
          };

          const handleToggleBulkCourseSelect = (cId: string) => {
            if (selectedBulkCourseIds.includes(cId)) {
              setSelectedBulkCourseIds(selectedBulkCourseIds.filter(id => id !== cId));
            } else {
              setSelectedBulkCourseIds([...selectedBulkCourseIds, cId]);
            }
          };

          const handleApplyBulkEnrollment = () => {
            if (selectedBulkUserIds.length === 0) {
              alert("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
              return;
            }
            if (selectedBulkCourseIds.length === 0) {
              alert("กรุณาเลือกหลักสูตรที่ต้องการลงทะเบียนอย่างน้อย 1 คอร์ส");
              return;
            }

            onBulkAssignCourses(selectedBulkUserIds, selectedBulkCourseIds);
            setBulkCourseSuccessMsg(`🎉 ลงทะเบียนแบบกลุ่มสำเร็จ! เพิ่มสิทธิ์การเรียนให้นักเรียนจำนวน ${selectedBulkUserIds.length} คน เรียบร้อยแล้ว`);
            setSelectedBulkUserIds([]);
            setSelectedBulkCourseIds([]);
            setTimeout(() => setBulkCourseSuccessMsg(""), 5000);
          };

          return (
            <div className="space-y-8">
              {/* Header Title */}
              <div className="border-b pb-4 border-slate-100">
                <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
                  <Tv className="w-5.5 h-5.5 text-brand-burgundy" />
                  ระบบบริหารหลักสูตรและจัดสิทธิ์นักเรียนรายบุคคล/รายกลุ่ม
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  เครื่องมือสถาบันพรีเมียม: ออกแบบประเภทรายวิชา ปลดล็อกชุดคำถาม และอัปโหลดวิดีโอบรรยายเพื่อเตรียมความพร้อมสู่มหาวิทยาลัย
                </p>
              </div>

              {/* Course creation & edit forms */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* CREATE / EDIT COURSE PANEL */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-brand-burgundy" />
                      <span>{editingCourseId ? "แก้ไขหลักสูตรเดิม" : "สร้างหลักสูตรรายวิชาใหม่"}</span>
                    </h3>
                    {editingCourseId && (
                      <button
                        onClick={handleCancelEdit}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold bg-white px-2 py-0.5 rounded border"
                      >
                        ยกเลิกการแก้ไข
                      </button>
                    )}
                  </div>

                  {courseError && <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-bold">{courseError}</div>}
                  {courseSuccess && <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">{courseSuccess}</div>}

                  <form onSubmit={handleSaveCourseSubmit} className="space-y-4">
                    {/* Basic info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ชื่อหลักสูตร (Course Title)</label>
                        <input
                          type="text"
                          placeholder="เช่น TGAT English Ultimate Mastery"
                          value={courseTitle}
                          onChange={(e) => setCourseTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white outline-none focus:border-brand-burgundy"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">หมวดข้อสอบ (Category)</label>
                        <select
                          value={courseCategory}
                          onChange={(e) => setCourseCategory(e.target.value)}
                          className="w-full px-2 py-2 border rounded-lg text-xs bg-white outline-none focus:border-brand-burgundy"
                        >
                          <option value="TGAT">TGAT English</option>
                          <option value="A-Level">A-Level English</option>
                          <option value="TOEIC">TOEIC Exam</option>
                          <option value="General">ทั่วไป / แกรมม่า</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">คำอธิบายย่อ (Description)</label>
                      <textarea
                        rows={2}
                        placeholder="สรุปเนื้อหาคอร์สสั้นๆ เพื่อแสดงให้ผู้เรียนเข้าใจประโยชน์ที่จะได้รับ..."
                        value={courseDescription}
                        onChange={(e) => setCourseDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white outline-none focus:border-brand-burgundy"
                      />
                    </div>

                    {/* Associated Locked Exam Sets */}
                    <div className="space-y-1.5 bg-white p-3.5 rounded-xl border">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                        ปลดล็อกสิทธิ์เข้าถึงชุดข้อสอบเฉพาะคอร์สนี้ (Syllabus Paper Permissions)
                      </label>
                      <p className="text-[10px] text-slate-400">
                        * นักเรียนที่สมัครคอร์สนี้จะมีสิทธิ์เข้าทำข้อสอบที่อาจารย์ขีดเลือกไว้ด้านล่างนี้ได้เท่านั้น
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {uniqueExamSets.map((setName) => {
                          const isSelected = courseExamSets.includes(setName);
                          return (
                            <button
                              type="button"
                              key={setName}
                              onClick={() => handleToggleExamSetSelection(setName)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-brand-cream text-brand-navy border-brand-gold font-bold"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span>{setName}</span>
                              {isSelected ? "✅" : "➕"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Videos addition sub-section */}
                    <div className="bg-white p-3.5 rounded-xl border space-y-3">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b pb-1">
                        จัดการเพลย์ลิสต์วิดีโอบรรยาย ({courseVideos.length} วิดีโอในรายการ)
                      </label>

                      {/* Video lectures listing */}
                      {courseVideos.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {courseVideos.map((v, idx) => (
                            <div key={v.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-slate-800 truncate">{(idx+1)}. {v.title}</p>
                                <p className="text-[10px] text-slate-400 truncate font-mono">{v.youtubeUrl}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveVideoFromCourse(idx)}
                                className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400"
                                title="ลบวิดีโอนี้"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mini inline video creation form */}
                      <div className="bg-slate-50 p-3 rounded-lg border-2 border-dashed space-y-2.5">
                        <p className="text-[9px] font-black text-brand-burgundy uppercase tracking-widest">➕ ฟอร์มอัปโหลดวิดีโอบรรยายเฉพาะคอร์ส:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="หัวข้อเรื่องวิดีโอ เช่น บทนำ Part 1"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            className="px-2 py-1.5 border rounded text-[11px] bg-white"
                          />
                          <input
                            type="text"
                            placeholder="ลิงก์แชร์ YouTube หรือ Embed URL"
                            value={videoYoutubeUrl}
                            onChange={(e) => setVideoYoutubeUrl(e.target.value)}
                            className="px-2 py-1.5 border rounded text-[11px] bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="สรุปย่อวิดีโอ (อธิบายคำศัพท์, แกมม่า)..."
                            value={videoDescription}
                            onChange={(e) => setVideoDescription(e.target.value)}
                            className="px-2 py-1.5 border rounded text-[11px] bg-white sm:col-span-2"
                          />
                          <input
                            type="text"
                            placeholder="เวลา เช่น 20:30"
                            value={videoDuration}
                            onChange={(e) => setVideoDuration(e.target.value)}
                            className="px-2 py-1.5 border rounded text-[11px] bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddVideoToCourse}
                          className="px-3 py-1 bg-brand-navy hover:bg-brand-burgundy text-brand-gold hover:text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                        >
                          ➕ เพิ่มวิดีโอลงสีกรรม
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-brand-burgundy hover:bg-brand-navy text-brand-gold hover:text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer border border-brand-gold/30 flex items-center justify-center gap-1.5 uppercase"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{editingCourseId ? "บันทึกข้อมูลแก้ไขหลักสูตร" : "ยืนยันสร้างหลักสูตรวิชาใหม่"}</span>
                    </button>
                  </form>
                </div>

                {/* BULK SELECTION AND ASSIGNMENT (เเบบเลือกกลุ่ม หนือทีละหลา) */}
                <div className="lg:col-span-5 bg-white border-2 border-brand-gold/15 p-5 rounded-2xl space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-brand-gold" />
                      <span>ลงทะเบียนแบบเลือกกลุ่มรายบุคคลเเละแบบกลุ่มสถาบัน</span>
                    </h3>
                  </div>

                  {bulkCourseSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-bold leading-relaxed">
                      {bulkCourseSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    
                    {/* Step 1: Select Students (Group or Individual) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          ขั้นที่ 1: เลือกกลุ่มผู้เรียน ({selectedBulkUserIds.length} คน)
                        </label>
                        <button
                          type="button"
                          onClick={handleSelectAllStudentsForBulk}
                          className="text-[9px] text-brand-burgundy font-bold hover:underline"
                        >
                          {selectedBulkUserIds.length === studentUsers.length ? "🔲 ยกเลิกทั้งหมด" : "☑️ เลือกทั้งหมดในสถาบัน"}
                        </button>
                      </div>
                      
                      <div className="border rounded-xl max-h-48 overflow-y-auto p-2.5 bg-slate-50 space-y-1.5">
                        {studentUsers.map((u) => {
                          const isChecked = selectedBulkUserIds.includes(u.id);
                          const enrolledCount = u.enrolledCourses?.length || 0;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleToggleBulkUserSelect(u.id)}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-white border text-left hover:border-brand-gold/40 text-xs cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-brand-burgundy shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                                <span className="font-extrabold text-slate-800">{u.realName}</span>
                              </div>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                                ลงทะเบียนเรียนแล้ว {enrolledCount} วิชา
                              </span>
                            </button>
                          );
                        })}
                        {studentUsers.length === 0 && (
                          <p className="text-[11px] text-slate-400 text-center py-4">ไม่มีรายชื่อนักเรียนในระบบในขณะนี้</p>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Select Courses to assign */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                        ขั้นที่ 2: เลือกวิชาที่จะเพิ่มสิทธิ์ปลดล็อก
                      </label>
                      <div className="border rounded-xl p-2.5 bg-slate-50 space-y-1.5">
                        {courses.map((c) => {
                          const isChecked = selectedBulkCourseIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleToggleBulkCourseSelect(c.id)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg bg-white border text-left hover:border-brand-gold/40 text-xs cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-brand-burgundy shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 shrink-0" />
                              )}
                              <div>
                                <p className="font-black text-slate-800">{c.title}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-mono">{c.category}</p>
                              </div>
                            </button>
                          );
                        })}
                        {courses.length === 0 && (
                          <p className="text-[11px] text-slate-400 text-center py-4">ไม่มีวิชาเรียนที่สร้างไว้ในขณะนี้</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyBulkEnrollment}
                      className="w-full py-2 bg-brand-navy hover:bg-brand-burgundy text-brand-gold hover:text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-brand-gold/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> ประมวลผลเพิ่มเข้าคอร์สเรียนแบบกลุ่ม
                    </button>

                  </div>
                </div>

              </div>

              {/* LIST OF CURRENTLY SAVED COURSES IN THE DATABASE */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5 border-b pb-1 border-slate-100">
                  <BookOpen className="w-4.5 h-4.5 text-brand-burgundy" />
                  <span>หลักสูตรวิชาเรียนที่จัดตั้งในสถาบัน ({courses.length} คอร์ส)</span>
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {courses.map((c) => {
                    // Find enrolled students
                    const enrolledStudents = users.filter((u) => u.enrolledCourses?.includes(c.id));
                    return (
                      <div key={c.id} className="bg-white border border-slate-200 hover:border-brand-gold/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-brand-burgundy bg-brand-cream px-2 py-0.5 rounded border border-brand-gold/30 uppercase font-mono">
                              {c.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCourseId(c.id);
                                  setCourseTitle(c.title);
                                  setCourseCategory(c.category);
                                  setCourseDescription(c.description);
                                  setCourseExamSets(c.examSets || []);
                                  setCourseVideos(c.videos || []);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`คุณต้องการลบวิชา "${c.title}" หรือไม่? นักเรียนในระบบจะเสียสิทธิ์การเข้าถึงวิชานี้ทันที`)) {
                                    onDeleteCourse(c.id);
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                          
                          <h4 className="font-display text-sm font-black text-brand-navy leading-tight">
                            {c.title}
                          </h4>
                          
                          {c.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {c.description}
                            </p>
                          )}

                          <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold border-t border-slate-50">
                            <div>
                              📚 วิดีโอบรรยาย: <span className="text-brand-navy">{c.videos?.length || 0} ตอน</span>
                            </div>
                            <div>
                              📝 ชุดข้อสอบสิทธิ์: <span className="text-brand-navy">{c.examSets?.length || 0} ชุด</span>
                            </div>
                          </div>
                        </div>

                        {/* Enrolled Students cloud */}
                        <div className="pt-2.5 border-t border-slate-100 space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            นักเรียนในชั้นเรียน ({enrolledStudents.length}):
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {enrolledStudents.map((student) => (
                              <span key={student.id} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold border border-slate-200">
                                {student.realName}
                              </span>
                            ))}
                            {enrolledStudents.length === 0 && (
                              <span className="text-[9px] text-slate-400 italic">ยังไม่มีนักเรียนลงทะเบียนเรียนวิชานี้</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {courses.length === 0 && (
                    <div className="col-span-full text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500">ไม่มีหลักสูตรคอร์สเรียนใดๆ ในสถาบันขณะนี้</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === "users" && (() => {
          const filteredUsers = users.filter((u) => {
            if (!studentSearch) return true;
            const term = studentSearch.toLowerCase();
            return (
              u.realName?.toLowerCase().includes(term) ||
              u.username?.toLowerCase().includes(term)
            );
          });

          return (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-burgundy" />
                  ระบบจัดการทะเบียนนักเรียน & สิทธิ์หลักสูตรรายบุคคล
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  รายชื่อนักเรียนและอาจารย์ในระบบสถาบัน แอดมินสามารถค้นหารายชื่อ ตรวจเช็คข้อมูล/รหัสผ่าน และปรับปรุงวิชาที่ลงทะเบียนได้อย่างสะดวกรวดเร็ว
                </p>
              </div>

              {/* Register New User Inline Form */}
              <form onSubmit={handleAddUserSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-burgundy animate-bounce" />
                  <span>ลงทะเบียนสมัครให้นักเรียนใหม่เข้าระบบโดยตรง (Add New Student Profile):</span>
                </p>
                
                {userError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                    {userError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="ชื่อ-นามสกุลจริง (เช่น ณัฐพงษ์ ใจดี)"
                    value={newRealName}
                    onChange={(e) => setNewRealName(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none bg-white focus:border-brand-burgundy"
                  />
                  <input
                    type="text"
                    placeholder="Username ไอดีล็อกอิน (เช่น student1)"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none bg-white focus:border-brand-burgundy font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Password รหัสผ่าน (เช่น 123456)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none bg-white focus:border-brand-burgundy"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-burgundy hover:bg-brand-navy text-brand-gold hover:text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer border border-brand-gold/20"
                  >
                    บันทึกข้อมูลนักเรียนใหม่
                  </button>
                </div>
              </form>

              {/* Filters and search panel */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-150">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อนักเรียน หรือ Username..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  แสดงผลทะเบียนนักเรียน {filteredUsers.length} จากทั้งหมด {users.length} คน
                </div>
              </div>

              {/* Users list */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-brand-navy uppercase tracking-wider">
                        <th className="p-4">ชื่อจริงผู้ใช้งาน</th>
                        <th className="p-4">Username (ไอดี)</th>
                        <th className="p-4">Password (รหัสผ่านจริง)</th>
                        <th className="p-4">คอร์สที่ลงทะเบียน (Active Courses)</th>
                        <th className="p-4">ระดับสิทธิ์</th>
                        <th className="p-4 text-right">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.map((user) => {
                        const isStudent = user.role === "student";
                        const enrolled = user.enrolledCourses || [];

                        return (
                          <tr key={user.id} className="text-xs text-slate-700 hover:bg-slate-50/30 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{user.realName}</td>
                            <td className="p-4 font-mono text-slate-600 bg-slate-50/40">{user.username}</td>
                            <td className="p-4">
                              {editingUserId === user.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editPassValue}
                                    onChange={(e) => setEditPassValue(e.target.value)}
                                    placeholder="รหัสผ่านใหม่"
                                    className="px-2 py-1 border border-slate-300 rounded-md text-xs w-28 bg-white outline-none"
                                  />
                                  <button
                                    onClick={() => handleSavePasswordEdit(user.id)}
                                    className="px-2 py-1 bg-brand-burgundy text-white rounded font-bold text-[10px] cursor-pointer"
                                  >
                                    บันทึก
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-brand-burgundy bg-brand-cream/50 px-2.5 py-1 rounded-md border border-brand-gold/25 font-mono">
                                    {user.passwordHash}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(user.id);
                                      setEditPassValue(user.passwordHash);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-brand-burgundy underline font-bold cursor-pointer"
                                  >
                                    แก้ไขรหัส
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              {isStudent ? (
                                <div className="space-y-1.5">
                                  {/* List enrolled courses */}
                                  <div className="flex flex-wrap gap-1 max-w-[280px]">
                                    {enrolled.map((cId) => {
                                      const courseObj = courses.find((c) => c.id === cId);
                                      if (!courseObj) return null;
                                      return (
                                        <span
                                          key={cId}
                                          className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1 group border"
                                        >
                                          <span>{courseObj.title}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextList = enrolled.filter((id) => id !== cId);
                                              onUpdateUserCourses(user.id, nextList);
                                            }}
                                            className="text-slate-400 hover:text-rose-600 font-extrabold cursor-pointer"
                                            title="ถอนสิทธิ์รายวิชานี้"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      );
                                    })}
                                    {enrolled.length === 0 && (
                                      <span className="text-[10px] text-slate-400 italic">ไม่มีวิชาเรียนที่ลงทะเบียน</span>
                                    )}
                                  </div>

                                  {/* Inline Quick Enroll Widget */}
                                  <div className="relative">
                                    {editingStudentIdCourses === user.id ? (
                                      <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 space-y-2 min-w-[220px]">
                                        <p className="text-[9px] font-black text-brand-navy border-b pb-1">⚡️ ปลดล็อกสิทธิ์เข้าเรียนทันที:</p>
                                        <div className="space-y-1 max-h-36 overflow-y-auto">
                                          {courses
                                            .filter((c) => !enrolled.includes(c.id))
                                            .map((c) => (
                                              <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                  const nextList = [...enrolled, c.id];
                                                  onUpdateUserCourses(user.id, nextList);
                                                  setEditingStudentIdCourses(null);
                                                }}
                                                className="w-full text-left p-1.5 hover:bg-brand-cream/40 hover:text-brand-burgundy rounded text-[10px] font-bold transition-colors cursor-pointer block"
                                              >
                                                ➕ {c.title}
                                              </button>
                                            ))}
                                          {courses.filter((c) => !enrolled.includes(c.id)).length === 0 && (
                                            <p className="text-[9px] text-slate-400 italic text-center py-1">ลงทะเบียนเรียนครบทุกวิชาแล้ว</p>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setEditingStudentIdCourses(null)}
                                          className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-black text-center cursor-pointer"
                                        >
                                          ปิดหน้าต่าง
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEditingStudentIdCourses(user.id)}
                                        className="text-[9px] font-black text-brand-burgundy hover:text-white hover:bg-brand-burgundy border border-brand-burgundy/40 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
                                      >
                                        ➕ ปรับปรุงคอร์สรายบุคคล
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">ผู้ดูแลระบบไม่ต้องลงทะเบียนคอร์ส</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}>
                                {user.role === "admin" ? "อาจารย์ / แอดมิน" : "นักเรียน (Student)"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {user.username !== "admin" ? (
                                <button
                                  onClick={() => {
                                    if (confirm(`คุณต้องการลบผู้เรียน "${user.realName}" หรือไม่? คะแนนสะสมทั้งหมดจะถูกลบไปด้วย`)) {
                                      onDeleteUser(user.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex cursor-pointer"
                                  title="ลบรายชื่อนักเรียน"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">ห้ามลบแอดมินหลัก</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-slate-400 font-bold">
                            🔍 ไม่พบรายชื่อนักเรียนที่ค้นหา
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: CATEGORY MANAGEMENT */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-950 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                ระบบจัดการหมวดหมู่ข้อสอบ (Dynamic Categories)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                อาจารย์สามารถเพิ่มหมวดหมู่ไวยากรณ์หรือวิชาแยกย่อยใหม่ๆ ได้ตามใจชอบ ระบบฝึกทำข้อสอบจะอัปเดตหน้าเริ่มและวิเคราะห์ความแม่นยำอัตโนมัติ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add Category Form */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl h-fit space-y-4">
                <h3 className="font-display text-sm font-bold text-slate-700">
                  เพิ่มหมวดหมู่ข้อสอบใหม่:
                </h3>
                
                {categoryError && (
                  <div className="p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs">
                    {categoryError}
                  </div>
                )}

                <form onSubmit={handleAddCategorySubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      ชื่อหมวดหมู่ (เช่น Prepositions, Direct Speech, Idioms)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Direct & Indirect Speech"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    บันทึกหมวดหมู่ใหม่เข้าสู่ระบบ
                  </button>
                </form>
              </div>

              {/* Category List */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-700">
                  หมวดหมู่ปัจจุบันในระบบ:
                </h3>
                <div className="divide-y divide-slate-100">
                  {categories.map((cat) => {
                    const count = questions.filter((q) => q.category === cat).length;
                    return (
                      <div key={cat} className="py-2.5 flex items-center justify-between text-xs text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-900">{cat}</span>
                          <span className="ml-2 text-[10px] text-slate-400 font-mono">({count} ข้อ)</span>
                        </div>
                        {/* Protect default categories, only allow deleting custom ones if empty */}
                        {count === 0 && !["Tenses", "Vocabulary", "Error Detection", "Conversation", "Reading"].includes(cat) ? (
                          <button
                            onClick={() => onDeleteCategory(cat)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : count > 0 ? (
                          <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">มีข้อสอบสังกัดอยู่</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">หมวดหมู่หลักระบบ</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BULK IMPORTER FOR ADMINS */}
        {activeTab === "importer" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-950 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                ระบบนำเข้าไฟล์ข้อสอบปริมาณมากสำหรับอาจารย์
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                แอดมินคัดลอกข้อความคำถามจาก Microsoft Word มาวางที่นี่ แล้วใช้ปุ่มแยกประเด็นอัจฉริยะช่วยจำแนกช้อยส์และเฉลยเพื่อแอดเข้าระบบพร้อมๆ กันได้ทันที
              </p>
            </div>
            <Importer
              categories={categories}
              onImport={onImportQuestions}
              existingQuestionsCount={questions.length}
            />
          </div>
        )}

        {/* TAB 4: ALL QUESTIONS LIST & DELETE */}
        {activeTab === "questions" && (() => {
          const uniqueExamSets = Array.from(
            new Set(questions.map((q) => q.examSet || "ทั่วไป (General)"))
          ).sort();

          const uniqueExamSetsWithCounts = uniqueExamSets.map((setName) => {
            const count = questions.filter((q) => (q.examSet || "ทั่วไป (General)") === setName).length;
            return { name: setName, count };
          });

          const uniqueCategoriesWithCounts = categories.map((cat) => {
            const count = questions.filter((q) => q.category === cat).length;
            return { name: cat, count };
          });

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-extrabold text-slate-950 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    คลังเก็บคำถามและบทเฉลยคัดสรร
                  </h2>
                  <p className="text-xs text-slate-500">
                    จัดการคลังข้อสอบทั้งหมด แยกชุดข้อสอบ (Exam Set) และหมวดหมู่หัวข้อ (Category) อย่างเป็นระบบ สามารถค้นหา แก้ไข และกรองดูได้อย่างสะดวกสบาย
                  </p>
                </div>

                {/* Quick actions & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาตามโจทย์/ตัวเลือก..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  {(selectedSetFilter !== "all" || selectedCategoryFilter !== "all" || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedSetFilter("all");
                        setSelectedCategoryFilter("all");
                        setSearchQuery("");
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  )}
                </div>
              </div>

              {/* Grid 2 Columns for Interactive Group Filtering */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Exam Sets Grouping Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                      แยกตามชุดข้อสอบ ({uniqueExamSetsWithCounts.length} ชุด)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      คลิกเพื่อกรองด่วน
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 ค้นหาชุดข้อสอบ..."
                      value={quickFilterSearchQuery}
                      onChange={(e) => setQuickFilterSearchQuery(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-indigo-500 rounded-lg text-[10px] outline-none transition-all placeholder:text-slate-400 font-semibold"
                    />
                    {quickFilterSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setQuickFilterSearchQuery("")}
                        className="absolute right-2 top-1.5 text-[9px] text-slate-400 hover:text-slate-650"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                    <button
                      onClick={() => setSelectedSetFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSetFilter === "all"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ทั้งหมด ({questions.length})
                    </button>
                    {uniqueExamSetsWithCounts
                      .filter((set) =>
                        set.name.toLowerCase().includes(quickFilterSearchQuery.trim().toLowerCase())
                      )
                      .map((set) => (
                        <button
                          key={set.name}
                          onClick={() => setSelectedSetFilter(set.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedSetFilter === set.name
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{set.name}</span>
                          <span className={`text-[10px] font-mono font-bold px-1 rounded ${
                            selectedSetFilter === set.name ? "bg-indigo-500 text-white" : "bg-slate-200/80 text-slate-600"
                          }`}>
                            {set.count}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Categories Grouping Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      แยกตามหมวดหมู่เนื้อหา ({categories.length} หมวด)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      คลิกเพื่อกรองด่วน
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                    <button
                      onClick={() => setSelectedCategoryFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        selectedCategoryFilter === "all"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ทั้งหมด ({questions.length})
                    </button>
                    {uniqueCategoriesWithCounts.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedCategoryFilter(cat.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedCategoryFilter === cat.name
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-1 rounded ${
                          selectedCategoryFilter === cat.name ? "bg-indigo-500 text-white" : "bg-slate-200/80 text-slate-600"
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ⚡ ระบบแก้ไขหมวดหมู่แบบกลุ่มรายชุดข้อสอบ (Bulk Category Changer) */}
              <div className="bg-slate-50/80 rounded-2xl border border-dashed border-indigo-200 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider">⚡ เครื่องมือด่วนแอดมิน</span>
                  <h3 className="text-xs font-black text-slate-800">
                    ระบบเปลี่ยนหมวดหมู่แบบกลุ่มรายชุดข้อสอบ (Bulk Update Exam Set Category)
                  </h3>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  เมื่อคุณนำเข้าข้อสอบชุดใหม่หรือต้องการย้ายกลุ่มคำถามทั้งหมดในชุดข้อสอบหนึ่งๆ ไปยังหมวดหมู่เนื้อหาอื่น (เช่น ย้ายข้อสอบทั้งหมดของชุด TGAT 66 ไปเป็นหมวด Vocabulary) สามารถทำได้ในขั้นตอนเดียวที่นี่ โดยไม่จำเป็นต้องตามกดเปลี่ยนทีละข้อให้เสียเวลา
                </p>

                {bulkSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-1.5">
                    <span className="text-base">✅</span>
                    <span>{bulkSuccessMsg}</span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-end gap-3">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      1. ค้นหา & เลือกชุดข้อสอบต้นทาง:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 พิมพ์ค้นหาชุดข้อสอบ..."
                        value={bulkSearchQuery}
                        onChange={(e) => setBulkSearchQuery(e.target.value)}
                        className="w-full mb-1.5 px-3 py-1.5 border border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] outline-none transition-all placeholder:text-slate-400 font-medium"
                      />
                      {bulkSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBulkSearchQuery("")}
                          className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 hover:text-slate-650"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                    <select
                      value={bulkExamSet}
                      onChange={(e) => setBulkExamSet(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">-- กรุณาเลือกชุดข้อสอบ --</option>
                      {uniqueExamSets
                        .filter((setName) =>
                          setName.toLowerCase().includes(bulkSearchQuery.trim().toLowerCase())
                        )
                        .map((setName) => {
                          const count = questions.filter((q) => (q.examSet || "ทั่วไป (General)") === setName).length;
                          return (
                            <option key={setName} value={setName}>
                              {setName} ({count} ข้อ)
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      2. เลือกหมวดหมู่ปลายทางใหม่:
                    </label>
                    <select
                      value={bulkNewCategory}
                      onChange={(e) => setBulkNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">-- กรุณาเลือกหมวดหมู่ใหม่ --</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (!bulkExamSet) {
                        alert("กรุณาเลือกชุดข้อสอบก่อน");
                        return;
                      }
                      if (!bulkNewCategory) {
                        alert("กรุณาเลือกหมวดหมู่เป้าหมายก่อน");
                        return;
                      }
                      const count = questions.filter((q) => (q.examSet || "ทั่วไป (General)") === bulkExamSet).length;
                      setBulkConfirmCount(count);
                      setBulkConfirmModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 shrink-0 w-full md:w-auto cursor-pointer"
                  >
                    <span>🔄 เริ่มการเปลี่ยนแบบกลุ่ม</span>
                  </button>

                  {/* Safety Custom Confirmation Modal (Bulk Category Changer Protection) */}
                  {bulkConfirmModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl space-y-5 text-left transform scale-100 transition-all">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                            <Lock className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="font-display font-extrabold text-slate-950 text-sm">
                              🔒 รหัสยืนยันความปลอดภัยความถูกต้องข้อมูล
                            </h3>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">แผงควบคุมหลักอาจารย์ (Admin safety lock)</p>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            คุณกำลังจะทำธุรกรรมแบบ <strong>กลุ่ม (Bulk Transaction)</strong> ซึ่งส่งผลกระทบต่อชุดข้อสอบและระบบรายงานความก้าวหน้าของวิทยฐานะผู้เรียนทั้งหมด:
                          </p>
                          
                          <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">ชุดข้อสอบต้นทาง:</span>
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{bulkExamSet}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">จำนวนคำถามที่ได้รับผลกระทบ:</span>
                              <span className="font-extrabold text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded-md">{bulkConfirmCount} ข้อ</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">หมวดหมู่เป้าหมายปลายทาง:</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{bulkNewCategory}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2">
                            <span className="text-xs mt-0.5">⚠️</span>
                            <p className="text-[10px] text-amber-800 leading-relaxed">
                              <strong>คำเตือน:</strong> การแก้ไขหมวดหมู่ด่วนจะคำนวณและอัปเดตสถิติจุดแข็ง/จุดอ่อน (Accuracy) ในแดชบอร์ดนักเรียนโดยอัตโนมัติ กรุณาตรวจสอบให้มั่นใจก่อนกดยืนยันเพื่อความถูกต้องสูงสุดของฐานข้อมูล
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setBulkConfirmModalOpen(false);
                            }}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                          >
                            ยกเลิก (Cancel)
                          </button>
                          <button
                            onClick={() => {
                              onBulkUpdateCategory(bulkExamSet, bulkNewCategory);
                              setBulkSuccessMsg(`อัปเดตเรียบร้อย! เปลี่ยนคำถามจำนวน ${bulkConfirmCount} ข้อของชุด "${bulkExamSet}" ไปสังกัดหมวดหมู่ "${bulkNewCategory}" เรียบร้อยแล้ว`);
                              setTimeout(() => setBulkSuccessMsg(""), 6000);
                              setBulkExamSet("");
                              setBulkNewCategory("");
                              setBulkConfirmModalOpen(false);
                            }}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-rose-100 cursor-pointer text-center"
                          >
                            ยืนยันดำเนินการ (Confirm)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className="bg-indigo-50/50 border border-indigo-100/50 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-indigo-900">ตัวกรองขณะนี้:</span>
                  <span className="bg-white border border-indigo-200 px-2.5 py-0.5 rounded text-[11px] font-medium">
                    ชุดข้อสอบ: <strong className="text-indigo-700">{selectedSetFilter === "all" ? "ทั้งหมด" : selectedSetFilter}</strong>
                  </span>
                  <span className="bg-white border border-indigo-200 px-2.5 py-0.5 rounded text-[11px] font-medium">
                    หมวดหมู่หลัก: <strong className="text-indigo-700">{selectedCategoryFilter === "all" ? "ทั้งหมด" : selectedCategoryFilter}</strong>
                  </span>
                  {searchQuery && (
                    <span className="bg-white border border-indigo-200 px-2.5 py-0.5 rounded text-[11px] font-medium">
                      คำค้นหา: <strong className="text-indigo-700">"{searchQuery}"</strong>
                    </span>
                  )}
                </div>
                <div className="font-bold font-mono">
                  พบข้อมูล {filteredQuestions.length} จากทั้งหมด {questions.length} ข้อ
                </div>
              </div>

              {/* Questions Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 tracking-wider">
                        <th className="p-4 w-12 text-center">ข้อ</th>
                        <th className="p-4 w-48">หมวดหมู่หลัก (คลิกเปลี่ยนได้)</th>
                        <th className="p-4 w-48">ชุดข้อสอบ (พิมพ์เพื่อเปลี่ยนกลุ่ม)</th>
                        <th className="p-4">โจทย์คำถามและตัวเลือก (เฉลยสีเขียว)</th>
                        <th className="p-4 text-center w-20">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQuestions.map((q, idx) => (
                        <tr key={q.id} className="text-xs text-slate-750 hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-4">
                            <select
                              value={q.category}
                              onChange={(e) => onUpdateQuestion(q.id, { category: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="relative">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={q.examSet || ""}
                                  placeholder="ทั่วไป (General)"
                                  onChange={(e) => onUpdateQuestion(q.id, { examSet: e.target.value })}
                                  onFocus={() => {
                                    setOpenDropdownQId(q.id);
                                    setDropdownSearch("");
                                  }}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openDropdownQId === q.id) {
                                      setOpenDropdownQId(null);
                                    } else {
                                      setOpenDropdownQId(q.id);
                                      setDropdownSearch("");
                                    }
                                  }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-indigo-650 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="เลือกจากชุดข้อสอบที่มี"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {openDropdownQId === q.id && (
                                <>
                                  {/* Click outside backdrop */}
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setOpenDropdownQId(null)} 
                                  />
                                  <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 space-y-1.5 max-h-56 overflow-y-auto animate-fade-in">
                                    <div className="text-[10px] font-black text-indigo-700 px-1 py-0.5 uppercase tracking-wider">
                                      🔍 เลือกชุดที่มีอยู่แล้ว:
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="พิมพ์ค้นหาชุดข้อสอบ..."
                                      value={dropdownSearch}
                                      onChange={(e) => setDropdownSearch(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-150 rounded-lg text-[11px] outline-none focus:border-indigo-500 focus:bg-white font-semibold"
                                      autoFocus
                                    />
                                    <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateQuestion(q.id, { examSet: "" });
                                          setOpenDropdownQId(null);
                                        }}
                                        className="w-full text-left px-2 py-1 hover:bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium transition-colors flex items-center justify-between cursor-pointer"
                                      >
                                        <span className="italic">ทั่วไป (General)</span>
                                      </button>
                                      {(() => {
                                        const filteredSets = uniqueExamSets.filter(
                                          (set) => 
                                            set !== "ทั่วไป (General)" &&
                                            set.toLowerCase().includes(dropdownSearch.toLowerCase())
                                        );
                                        if (filteredSets.length === 0) {
                                          return (
                                            <div className="text-[10px] text-slate-400 text-center py-1.5 italic">
                                              ไม่พบชุดข้อสอบอื่น
                                            </div>
                                          );
                                        }
                                        return filteredSets.map((setName) => {
                                          const count = questions.filter((item) => (item.examSet || "ทั่วไป (General)") === setName).length;
                                          return (
                                            <button
                                              key={setName}
                                              type="button"
                                              onClick={() => {
                                                onUpdateQuestion(q.id, { examSet: setName });
                                                setOpenDropdownQId(null);
                                              }}
                                              className="w-full text-left px-2 py-1 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-md text-[11px] font-bold transition-colors flex items-center justify-between cursor-pointer"
                                            >
                                              <span className="truncate">{setName}</span>
                                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1 py-0.5 rounded shrink-0">
                                                {count} ข้อ
                                              </span>
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4 space-y-2">
                            <div className="font-bold text-slate-800 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                              {q.text}
                            </div>
                            {(() => {
                              const stats = questionAttemptsMap[q.id];
                              if (!stats || stats.total < 5) return null;
                              if (stats.rate >= 90) {
                                return (
                                  <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-lg">
                                    🟢 โจทย์ง่ายเกินไป (อัตราตอบถูก {stats.rate}% จาก {stats.total} ครั้งตอบ)
                                  </div>
                                );
                              } else if (stats.rate <= 15) {
                                return (
                                  <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-800 font-extrabold text-[10px] rounded-lg animate-pulse">
                                    ⚠️ โจทย์คลุมเครือ/ยากวิกฤต (อัตราตอบถูก {stats.rate}% จาก {stats.total} ครั้งตอบ)
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[10px] rounded-lg">
                                    ⚖️ ระดับความยากมาตรฐาน (อัตราตอบถูก {stats.rate}% จาก {stats.total} ครั้งตอบ)
                                  </div>
                                );
                              }
                            })()}
                            
                            {/* Options visualization with clear indicators */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = oIdx === q.correctIndex;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 border ${
                                      isCorrect
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold"
                                        : "bg-white text-slate-500 border-slate-100"
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded flex items-center justify-center font-bold font-mono text-[9px] ${
                                      isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                    }`}>
                                      {String.fromCharCode(97 + oIdx)}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && (
                              <p className="text-[10px] text-slate-400 italic pl-2">
                                *คำอธิบาย: {q.explanation}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคำถามข้อนี้ออกจากคลังข้อสอบระบบ?")) {
                                  onDeleteQuestion(q.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all inline-flex cursor-pointer border border-transparent hover:border-rose-100"
                              title="ลบคำถามออกจากคลัง"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredQuestions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Info className="w-6 h-6 text-slate-300" />
                              <p>ไม่พบข้อสอบที่ตรงตามตัวกรองที่เลือก</p>
                              <button
                                onClick={() => {
                                  setSelectedSetFilter("all");
                                  setSelectedCategoryFilter("all");
                                  setSearchQuery("");
                                }}
                                className="mt-1 text-xs font-bold text-indigo-600 hover:underline"
                              >
                                รีเซ็ตเพื่อดูข้อสอบทั้งหมด
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
        {/* TAB 5: QUESTION HEALTH CENTER (Point F) */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">ไม่มีคำอธิบายเฉลย</span>
                  <span className="text-xl font-black font-display text-slate-800">
                    {questions.filter(q => !q.explanation || !q.explanation.trim()).length} ข้อ
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">ไม่มีแท็กคำอธิบาย</span>
                  <span className="text-xl font-black font-display text-slate-800">
                    {questions.filter(q => !q.tags || q.tags.length === 0).length} ข้อ
                  </span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <Plus className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">ไม่มีชุดข้อสอบ (examSet)</span>
                  <span className="text-xl font-black font-display text-slate-800">
                    {questions.filter(q => !q.examSet || !q.examSet.trim()).length} ข้อ
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-slate-800 text-sm">
                  🔍 รายการข้อสอบที่ตกเกณฑ์คุณภาพ (Unhealthy Questions Audit)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">ข้อสอบที่มีองค์ประกอบการสอนไม่ครบถ้วน ควรรีบเพิ่มข้อมูลเพื่อพัฒนาวิทยฐานะของคลัง</p>
              </div>

              <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto pr-2">
                {questions.filter(q => !q.explanation || !q.tags || q.tags.length === 0 || !q.examSet).length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-600 font-bold">
                    ✨ ยอดเยี่ยมมาก! ข้อสอบทั้งหมดมีข้อมูลครบถ้วน สมบูรณ์ 100% แล้ว
                  </div>
                ) : (
                  questions.filter(q => !q.explanation || !q.tags || q.tags.length === 0 || !q.examSet).map((q) => {
                    const issues = [];
                    if (!q.explanation) issues.push("ไม่มีคำอธิบายเฉลย");
                    if (!q.tags || q.tags.length === 0) issues.push("ไม่มีแท็กหัวข้อ");
                    if (!q.examSet) issues.push("ไม่มีชุดข้อสอบ");

                    return (
                      <div key={q.id} className="py-4 flex items-start justify-between gap-4 border-b border-slate-50 last:border-0">
                        <div className="space-y-1.5">
                          <h4 className="font-semibold text-slate-800 text-xs leading-relaxed">
                            {q.text}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {issues.map(issue => (
                              <span key={issue} className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-extrabold">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          เข้าแก้ไขข้อมูลได้ที่แท็บ "คลังข้อสอบทั้งหมด"
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Tab Panel */}
        {activeTab === "ai-assistant" && (
          <div className="space-y-6">
            <div className="bg-indigo-900 text-white rounded-3xl p-6 shadow-sm border border-indigo-950 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  ระบบ AI Co-Pilot แนะนำวิทยฐานะอาจารย์
                </div>
                <h3 className="font-display font-black text-2xl tracking-tight">
                  ระบบแอดมิน AI อัจฉริยะ (AI Admin Assistant)
                </h3>
                <p className="text-indigo-200 text-xs leading-relaxed max-w-3xl">
                  เครื่องมือที่จะช่วยให้อาจารย์สร้างข้อสอบภาษาอังกฤษที่ได้มาตรฐานได้อย่างรวดเร็วด้วยพลังของ Gemini AI 
                  พร้อมทั้งเครื่องมือพิเศษในการขัดเกลาและขีดเส้นใต้ข้อสอบแบบ Error Identification ด้วยวิธีประมวลผลที่มีความแม่นยำ 100%
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12">
                <Sparkles className="w-64 h-64 text-amber-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: AI Question Generator */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-150 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h4 className="font-display font-extrabold text-slate-800 text-sm">
                      เครื่องมือสร้างข้อสอบอัจฉริยะด้วย AI (AI Question Generator)
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">ออกข้อสอบใหม่ตามหัวข้อไวยากรณ์และระดับความยากที่ต้องการได้ทันที</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">หัวข้อไวยากรณ์ / คำศัพท์ที่ต้องการออกข้อสอบ:</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="เช่น Relative Clauses (who/whom/which), Present Perfect vs Past Simple, Phrasal Verbs at Airport..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">หมวดหมู่ข้อสอบระบบ:</label>
                      <select
                        value={aiCategory}
                        onChange={(e) => setAiCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-700"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">จัดระเบียบเข้ากลุ่มข้อสอบ (Exam Set):</label>
                      <input
                        type="text"
                        value={aiExamSet}
                        onChange={(e) => setAiExamSet(e.target.value)}
                        placeholder="เช่น ชุดข้อสอบปลายภาค 2026, มิดเทอม ม.6"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">ระดับความยากของคำถาม:</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {["easy", "medium", "hard"].map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setAiDifficulty(diff)}
                            className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                              aiDifficulty === diff
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {diff === "easy" ? "ง่าย" : diff === "medium" ? "ปานกลาง" : "ยาก"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">จำนวนคำถามที่ต้องการ:</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        {[1, 3, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setAiNumQuestions(num)}
                            className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                              aiNumQuestions === num
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {num} ข้อ
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAIGenerateQuestions}
                    disabled={aiIsGenerating}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    {aiIsGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังประมวลผลความรู้และร่างข้อสอบโดย AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>สร้างข้อสอบอัจฉริยะผ่าน AI ทันที ✨</span>
                      </>
                    )}
                  </button>

                  {aiGenError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] rounded-xl font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{aiGenError}</span>
                    </div>
                  )}

                  {aiGenSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-xl font-bold">
                      {aiGenSuccessMsg}
                    </div>
                  )}

                  {/* Generated questions list view for editing or checking */}
                  {aiGeneratedQuestions.length > 0 && (
                    <div className="mt-4 border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-slate-700 text-xs">พรีวิวข้อสอบที่สร้างโดย AI</span>
                        <span className="text-[10px] text-slate-400">สามารถแก้ไขข้อมูลได้โดยตรง</span>
                      </div>

                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 divide-y divide-slate-100">
                        {aiGeneratedQuestions.map((q, qIdx) => (
                          <div key={q.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                            <div className="font-bold text-slate-800">
                              ข้อที่ {qIdx + 1}: <input
                                type="text"
                                value={q.text}
                                onChange={(e) => {
                                  const updated = [...aiGeneratedQuestions];
                                  updated[qIdx].text = e.target.value;
                                  setAiGeneratedQuestions(updated);
                                }}
                                className="inline-block w-[85%] px-2 py-1 bg-white border border-slate-200 rounded font-normal"
                              />
                            </div>
                            
                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={q.correctIndex === oIdx}
                                    onChange={() => {
                                      const updated = [...aiGeneratedQuestions];
                                      updated[qIdx].correctIndex = oIdx;
                                      setAiGeneratedQuestions(updated);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...aiGeneratedQuestions];
                                      updated[qIdx].options[oIdx] = e.target.value;
                                      setAiGeneratedQuestions(updated);
                                    }}
                                    className={`w-full px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded ${
                                      q.correctIndex === oIdx ? "border-emerald-400 bg-emerald-50/20" : ""
                                    }`}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Explanation */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500">คำอธิบายเฉลยภาษาไทย:</label>
                              <textarea
                                value={q.explanation}
                                onChange={(e) => {
                                  const updated = [...aiGeneratedQuestions];
                                  updated[qIdx].explanation = e.target.value;
                                  setAiGeneratedQuestions(updated);
                                }}
                                className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded h-12"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleImportAIGeneratedQuestions}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>นำเข้าข้อสอบที่เลือกจำนวน {aiGeneratedQuestions.length} ข้อเข้าคลังคลังวิทยฐานะ</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Card 2: Error Identification Precision Underline Formatter */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-150 p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-display font-extrabold text-slate-800 text-sm">
                      ตัวแก้ปัญหาและขีดเส้นใต้ข้อสอบ Error Identification 🛠️
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">เครื่องมือขจัดปัญหาขีดเส้นใต้ข้อสอบเบี้ยว จัดรูปแบบโค้ดขีดเส้นใต้อย่างแม่นยำ</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">1. พิมพ์ประโยคดิบที่มีจุดผิดไวยากรณ์ (Raw Sentence):</label>
                    <textarea
                      value={aiRawSentence}
                      onChange={(e) => setAiRawSentence(e.target.value)}
                      placeholder="เช่น Neither the teacher nor the students is aware of the changes."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 h-16 font-medium"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                    <span className="block text-[11px] font-black text-slate-600">2. กำหนดคำ/วลีที่ต้องการขีดเส้นใต้เพื่อเป็นตัวเลือก (A, B, C, D):</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600">ตัวเลือก (A):</span>
                        <input
                          type="text"
                          value={aiUnderlineA}
                          onChange={(e) => setAiUnderlineA(e.target.value)}
                          placeholder="เช่น Neither the teacher"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600">ตัวเลือก (B):</span>
                        <input
                          type="text"
                          value={aiUnderlineB}
                          onChange={(e) => setAiUnderlineB(e.target.value)}
                          placeholder="เช่น nor"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600">ตัวเลือก (C):</span>
                        <input
                          type="text"
                          value={aiUnderlineC}
                          onChange={(e) => setAiUnderlineC(e.target.value)}
                          placeholder="เช่น is"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600">ตัวเลือก (D):</span>
                        <input
                          type="text"
                          value={aiUnderlineD}
                          onChange={(e) => setAiUnderlineD(e.target.value)}
                          placeholder="เช่น aware of"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => handleAIFormatErrorQuestion("manual")}
                        className="py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[10px] transition-colors"
                      >
                        จัดรูปแบบกำหนดเองทันที ⚙️
                      </button>

                      <button
                        onClick={() => handleAIFormatErrorQuestion("auto")}
                        disabled={aiIsFormatting}
                        className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-[10px] transition-colors disabled:opacity-55"
                      >
                        {aiIsFormatting ? "กำลังประมวลผล..." : "ให้ AI เลือกจัดรูปแบบอัจฉริยะ 🤖"}
                      </button>
                    </div>
                  </div>

                  {aiFormattedError && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 font-extrabold mb-1">ผลลัพธ์การจัดรหัสข้อสอบ Error (String Code):</label>
                        <input
                          type="text"
                          readOnly
                          value={aiFormattedError}
                          className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl font-mono text-[11px] text-amber-950 font-bold"
                        />
                      </div>

                      {/* LIVE PREVIEW OF THE STUDENT VIEW */}
                      <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-4 shadow-inner space-y-2">
                        <span className="text-[10px] font-black text-indigo-600 tracking-wider uppercase block">
                          👁️ ภาพพรีวิวเสมือนจริงบนหน้าจอเด็กนักเรียน (Real-time Student View Preview):
                        </span>
                        
                        <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium text-xs leading-relaxed min-h-12 flex items-center">
                          {renderFormattedQuestionText(aiFormattedError, "Error Identification")}
                        </div>
                      </div>

                      {/* Direct Create Form */}
                      <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-3">
                        <span className="font-extrabold text-[11px] text-slate-700 block">กดสร้างข้อสอบเข้าสู่คลังทันที:</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500">เฉลยข้อที่ผิดไวยากรณ์:</span>
                            <select
                              id="ai_formatted_correct_idx"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            >
                              <option value="0">ข้อ (A) {aiUnderlineA ? `(${aiUnderlineA})` : ""}</option>
                              <option value="1">ข้อ (B) {aiUnderlineB ? `(${aiUnderlineB})` : ""}</option>
                              <option value="2">ข้อ (C) {aiUnderlineC ? `(${aiUnderlineC})` : ""}</option>
                              <option value="3">ข้อ (D) {aiUnderlineD ? `(${aiUnderlineD})` : ""}</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500">หมวดหมู่เป้าหมาย:</span>
                            <select
                              id="ai_formatted_category"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">พิมพ์คำอธิบายวิเคราะห์ความผิดพลาด (Explanation):</span>
                          <textarea
                            id="ai_formatted_explanation"
                            placeholder="เช่น is ต้องแก้เป็น are เนื่องจากประธาน the students เป็นพหูพจน์..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] h-12"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const correctIdx = parseInt((document.getElementById("ai_formatted_correct_idx") as HTMLSelectElement).value);
                            const categoryVal = (document.getElementById("ai_formatted_category") as HTMLSelectElement).value;
                            const explanationVal = (document.getElementById("ai_formatted_explanation") as HTMLTextAreaElement).value || "วิเคราะห์คำตอบจากโครงสร้างไวยากรณ์";
                            
                            const newQ: Question = {
                              id: `error_designer_${Date.now()}`,
                              text: aiFormattedError,
                              options: [
                                aiUnderlineA || "Option A",
                                aiUnderlineB || "Option B",
                                aiUnderlineC || "Option C",
                                aiUnderlineD || "Option D"
                              ],
                              correctIndex: correctIdx,
                              explanation: explanationVal,
                              category: categoryVal,
                              examSet: aiExamSet || "Mock Test by AI",
                              tags: [categoryVal, "Error-Designed"]
                            };

                            onImportQuestions([newQ]);
                            alert("🎉 บันทึกข้อสอบ Error ข้อใหม่และขีดเส้นใต้แม่นยำเข้าคลังสำเร็จ!");
                            
                            // Reset
                            setAiRawSentence("");
                            setAiUnderlineA("");
                            setAiUnderlineB("");
                            setAiUnderlineC("");
                            setAiUnderlineD("");
                            setAiFormattedError("");
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          บันทึกข้อสอบ Error ใหม่เข้าคลังระบบทันที 💾
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Card 3: Full-width Database-wide Auto-Fix Tool */}
            <div className="mt-6 bg-indigo-50 border border-indigo-150 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <h4 className="font-display font-extrabold text-slate-800 text-sm">
                      🪄 เครื่องมือซ่อมแซมและขีดเส้นใต้ข้อสอบ Error ID ทั้งระบบย้อนหลังด้วย AI
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ค้นหาและซ่อมแซมข้อสอบกลุ่ม Error Identification ที่นำเข้าก่อนหน้านี้ทั้งหมดที่ยังไม่มีโค้ดขีดเส้นใต้สมบูรณ์ โดย AI จะทำการวิเคราะห์และเติมสัญลักษณ์ (_) ครอบตัวเลือกข้อสอบให้แบบอัตโนมัติ แม่นยำ และปลอดภัยย้อนหลังให้ทันที
                  </p>
                </div>

                <button
                  onClick={handleFixAllUnderlines}
                  disabled={isFixingAllUnderlines}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isFixingAllUnderlines ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผลระบบ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>เริ่มซ่อมแซมข้อสอบทั้งคลังทันที 🚀</span>
                    </>
                  )}
                </button>
              </div>

              {fixAllUnderlinesMessage && (
                <div className="p-3 bg-white border border-indigo-100 text-slate-800 text-xs rounded-xl font-bold font-mono">
                  {fixAllUnderlinesMessage}
                </div>
              )}
            </div>

          </div>
        )}
        {/* TAB: PASSAGE BANK */}
        {activeTab === "passages" && (
          <PassageBank
            passages={passages}
            questions={questions}
            onAddPassage={onAddPassage}
            onUpdatePassage={onUpdatePassage}
            onDeletePassage={onDeletePassage}
            onLinkQuestionToPassage={onLinkQuestionToPassage}
          />
        )}

        {/* TAB: MATRIX EXAM GENERATOR */}
        {activeTab === "matrix" && (
          <MatrixGenerator
            questions={questions}
            categories={categories}
            onGenerateExamSet={onGenerateExamSet}
            onSaveNewExamSetToBank={onSaveNewExamSetToBank}
          />
        )}

        {/* TAB: ITEM PSYCHOMETRICS & ANALYTICS */}
        {activeTab === "analytics" && (
          <ItemAnalytics questions={questions} attempts={attempts} />
        )}

        {/* TAB: QC & EDITORIAL WORKFLOW */}
        {activeTab === "qc-workflow" && (
          <EditorialQCWorkflow
            questions={questions}
            currentUser={currentUser}
            onUpdateQuestionQC={onUpdateQuestionQC}
            onAddComment={onAddComment}
          />
        )}

        {/* TAB: EXAM PAPER EXPORTER & PRINT */}
        {activeTab === "export-print" && (
          <ExamPaperExporter questions={questions} />
        )}
      </main>
    </div>
  );
}
