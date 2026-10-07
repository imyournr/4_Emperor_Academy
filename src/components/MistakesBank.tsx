import React, { useState } from "react";
import { Question, UserAttempt } from "../types";
import { Search, AlertTriangle, BookOpen, ChevronDown, ChevronUp, Play, CheckCircle, Flame, Check, RefreshCw } from "lucide-react";

interface MistakesBankProps {
  questions: Question[];
  activeMistakes: Question[];
  categories: string[];
  onStartQuiz: (mode: "all" | "random" | "mistakes" | string, limit?: number) => void;
  onRemoveMistake?: (qId: string) => void;
  attempts?: UserAttempt[];
}

export default function MistakesBank({
  questions,
  activeMistakes,
  categories,
  onStartQuiz,
  onRemoveMistake,
  attempts = []
}: MistakesBankProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"mistakes" | "all">("mistakes");
  const [mistakeSubTab, setMistakeSubTab] = useState<"new" | "reviewing" | "mastered">("new");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const categoriesWithAll = ["All", ...categories];

  // Process attempt history for classification
  const sortedAttempts = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  const questionHistoryMap = new Map<string, { totalIncorrect: number; latestIsCorrect: boolean }>();

  sortedAttempts.forEach((attempt) => {
    const existing = questionHistoryMap.get(attempt.questionId) || { totalIncorrect: 0, latestIsCorrect: false };
    questionHistoryMap.set(attempt.questionId, {
      totalIncorrect: existing.totalIncorrect + (attempt.isCorrect ? 0 : 1),
      latestIsCorrect: attempt.isCorrect
    });
  });

  const newMistakesList: Question[] = [];
  const reviewingList: Question[] = [];
  const masteredList: Question[] = [];

  questions.forEach((q) => {
    const history = questionHistoryMap.get(q.id);
    if (history) {
      if (!history.latestIsCorrect) {
        if (history.totalIncorrect === 1) {
          newMistakesList.push(q);
        } else if (history.totalIncorrect >= 2) {
          reviewingList.push(q);
        }
      } else {
        if (history.totalIncorrect >= 1) {
          masteredList.push(q);
        }
      }
    }
  });

  // Decide current list based on selected active tab and mistakes sub-tab
  let currentList: Question[] = [];
  if (activeTab === "all") {
    currentList = questions;
  } else {
    if (mistakeSubTab === "new") {
      currentList = newMistakesList;
    } else if (mistakeSubTab === "reviewing") {
      currentList = reviewingList;
    } else {
      currentList = masteredList;
    }
  }

  // Filter list by search term and category
  const filteredQuestions = currentList.filter((q) => {
    const matchesCategory = selectedCategory === "All" || q.category === selectedCategory;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      q.text.toLowerCase().includes(searchLower) ||
      q.explanation.toLowerCase().includes(searchLower) ||
      q.category.toLowerCase().includes(searchLower) ||
      (q.tags && q.tags.some((tag) => tag.toLowerCase().includes(searchLower)));

    return matchesCategory && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
        {/* Tab selector */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("mistakes");
              setSearchTerm("");
              setSelectedCategory("All");
            }}
            className={`flex-1 py-3.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "mistakes"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>คลังสะสมส่วนตัว (My Mistakes · {activeMistakes.length} ข้อ)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("all");
              setSearchTerm("");
              setSelectedCategory("All");
            }}
            className={`flex-1 py-3.5 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "all"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>ค้นหาคลังข้อสอบทั้งหมด ({questions.length} ข้อ)</span>
          </button>
        </div>

        {/* Dynamic Mistakes Sub-Tabs (New, Reviewing, Mastered) */}
        {activeTab === "mistakes" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150">
            <button
              onClick={() => {
                setMistakeSubTab("new");
                setExpandedQuestionId(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                mistakeSubTab === "new"
                  ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
                  : "bg-transparent border-transparent text-slate-600 hover:bg-white/80"
              }`}
            >
              <span className="text-amber-500">⚠️</span>
              <span>เพิ่งผิด 1 ครั้ง ({newMistakesList.length})</span>
            </button>

            <button
              onClick={() => {
                setMistakeSubTab("reviewing");
                setExpandedQuestionId(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                mistakeSubTab === "reviewing"
                  ? "bg-rose-50 border-rose-300 text-rose-800 shadow-xs"
                  : "bg-transparent border-transparent text-slate-600 hover:bg-white/80"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>ผิดซ้ำ 2+ ครั้ง ({reviewingList.length})</span>
            </button>

            <button
              onClick={() => {
                setMistakeSubTab("mastered");
                setExpandedQuestionId(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border ${
                mistakeSubTab === "mastered"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                  : "bg-transparent border-transparent text-slate-600 hover:bg-white/80"
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>เข้าใจแล้ว ({masteredList.length})</span>
            </button>
          </div>
        )}

        {/* Search Inputs */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาข้อสอบในหมวดหมู่นี้ เช่น 'present perfect', 'listening', 'vocabulary'..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200/50 focus:border-slate-400 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200/50 focus:border-slate-400 transition-all text-slate-700 font-medium cursor-pointer"
            >
              {categoriesWithAll.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "ทุกหมวดหมู่ (All Categories)" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Header for retaking mistakes */}
      {activeTab === "mistakes" && activeMistakes.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>อุดรอยรั่วทักษะภาษาอังกฤษ (Personalized Retest)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              ทำข้อสอบที่เคยตอบผิดซ้ำอีกครั้ง เพื่อเสริมทักษะและความจำที่แม่นยำ ระบบจำลองจะสุ่มลำดับชอยส์เพื่อเช็คความเข้าใจจริง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onStartQuiz("mistakes", 10)}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:bg-slate-50 active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Smart Retest (สุ่มแก้ตัว 10 ข้อ)</span>
            </button>
            <button
              onClick={() => onStartQuiz("mistakes")}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 text-slate-200" />
              <span>เริ่มทำข้อที่ผิดซ้ำทั้งหมด ({activeMistakes.length} ข้อ)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-3.5">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-sans font-bold text-slate-700 text-sm">ไม่พบคู่ข้อมูลที่ตรงเงื่อนไข</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              {activeTab === "mistakes"
                ? "ดีใจด้วยนะ! คุณยังไม่มีข้อสอบที่ทำผิดค้างอยู่ในกลุ่มนี้ หรือลองเปลี่ยนปุ่มกลุ่มข้อผิดพลาดดู"
                : "ไม่พบข้อสอบที่ตรงกับคำสำคัญที่คุณพิมพ์ กรุณาลองใช้คำค้นหาทั่วไปอื่น เช่น 'reading' หรือ 'grammar'"}
            </p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border transition-all overflow-hidden shadow-2xs hover:shadow-xs ${
                  isExpanded ? "border-slate-400 ring-1 ring-slate-400/10 bg-slate-50/10" : "border-slate-200/80"
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/40">
                        Q-{idx + 1}
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100/40 text-indigo-700 px-2 py-0.5 rounded-md">
                        {q.category}
                      </span>
                      {(() => {
                        const history = questionHistoryMap.get(q.id);
                        if (!history) return null;
                        if (!history.latestIsCorrect) {
                          if (history.totalIncorrect === 1) {
                            return (
                              <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>ผิดครั้งแรก (รอทบทวน)</span>
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>ผิดบ่อยมาก (ผิดซ้ำ {history.totalIncorrect} ครั้ง)</span>
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>เข้าใจแล้ว (ผ่านการทบทวน)</span>
                          </span>
                        );
                      })()}
                      {q.tags?.map((t) => (
                        <span key={t} className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-100">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-800 whitespace-pre-line leading-relaxed pr-6">
                      {q.text}
                    </p>
                  </div>

                  <div className="text-slate-400 p-1 shrink-0 mt-0.5">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-700" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-3 border-t border-slate-200/60 bg-slate-50/50 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                        ตัวเลือกคำตอบทั้งหมด (Answer Options)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl text-xs border transition-all ${
                              q.correctIndex === oIdx
                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-bold flex items-center justify-between shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            <span>
                              <span className="font-extrabold mr-1.5 text-slate-400">
                                {String.fromCharCode(65 + oIdx)}
                              </span>{" "}
                              {opt}
                            </span>
                            {q.correctIndex === oIdx && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">💡 คำอธิบายคำตอบและเฉลย (Explanation)</span>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      {activeTab === "mistakes" && onRemoveMistake && (
                        <button
                          onClick={() => {
                            if (confirm("คุณต้องการเอาข้อนี้ออกจากคลังข้อผิดพลาดใช่หรือไม่? (ระบบจะบันทึกว่าคุณเข้าใจข้อนี้แล้ว)")) {
                              onRemoveMistake(q.id);
                            }
                          }}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ทำเครื่องหมายว่าเข้าใจแล้ว</span>
                        </button>
                      )}
                      <button
                        onClick={() => onStartQuiz(q.category)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        สุ่มทดสอบเฉพาะหมวด {q.category}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
