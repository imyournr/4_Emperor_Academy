import React, { useState } from "react";
import { Question, ExamType, CEFRLevel, ChallengeConfig } from "../types";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  ListOrdered,
  Shuffle,
  Zap,
  Play,
  FileSpreadsheet,
  Layers,
  Award
} from "lucide-react";

interface MatrixGeneratorProps {
  questions: Question[];
  categories: string[];
  onGenerateExamSet: (
    title: string,
    generatedQuestions: Question[],
    config: ChallengeConfig
  ) => void;
  onSaveNewExamSetToBank: (examSetTitle: string, questionIds: string[]) => void;
}

export default function MatrixGenerator({
  questions = [],
  categories = [],
  onGenerateExamSet,
  onSaveNewExamSetToBank
}: MatrixGeneratorProps) {
  const [examTitle, setExamTitle] = useState("TGAT 68 Mock Exam Paper A");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [selectedExamType, setSelectedExamType] = useState<ExamType>("TGAT");
  const [selectedCefr, setSelectedCefr] = useState<CEFRLevel | "all">("all");
  const [balanceOptionKeys, setBalanceOptionKeys] = useState(true);
  const [examMode, setExamMode] = useState<"mock" | "practice">("mock");
  const [timeLimitSecs, setTimeLimitSecs] = useState(60); // 60s per question
  
  // Category allocation proportions
  const [categoryWeights, setCategoryWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    categories.forEach((cat) => {
      initial[cat] = 1; // equal weight default
    });
    return initial;
  });

  const [generatedPreview, setGeneratedPreview] = useState<Question[]>([]);
  const [optionDistribution, setOptionDistribution] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  const handleCategoryWeightChange = (cat: string, val: number) => {
    setCategoryWeights((prev) => ({
      ...prev,
      [cat]: Math.max(0, val)
    }));
  };

  const handleGenerateMatrix = () => {
    if (questions.length === 0) return;

    // Filter candidate pool
    let pool = questions.filter((q) => {
      if (selectedExamType !== "General" && q.examType && q.examType !== selectedExamType) {
        // filter by examType if explicitly set
      }
      if (selectedCefr !== "all" && q.cefrLevel && q.cefrLevel !== selectedCefr) {
        return false;
      }
      return true;
    });

    if (pool.length === 0) {
      pool = [...questions]; // fallback if strict pool empty
    }

    // Weighted random selection by category
    const activeCategories = categories.filter((c) => (categoryWeights[c] || 0) > 0);
    const resultQuestions: Question[] = [];
    const usedIds = new Set<string>();

    if (activeCategories.length === 0) {
      // Shuffle & pick totalQuestions
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      resultQuestions.push(...shuffled.slice(0, totalQuestions));
    } else {
      // Calculate quota per category
      const totalWeight = activeCategories.reduce((acc, c) => acc + (categoryWeights[c] || 1), 0);
      
      activeCategories.forEach((cat) => {
        const catWeight = categoryWeights[cat] || 1;
        const quota = Math.max(1, Math.round((catWeight / totalWeight) * totalQuestions));
        const catPool = pool.filter((q) => q.category === cat && !usedIds.has(q.id));
        const shuffledCat = [...catPool].sort(() => 0.5 - Math.random());
        const selected = shuffledCat.slice(0, quota);
        
        selected.forEach((q) => {
          usedIds.add(q.id);
          resultQuestions.push(q);
        });
      });

      // Fill remaining if needed
      if (resultQuestions.length < totalQuestions) {
        const remainingPool = pool.filter((q) => !usedIds.has(q.id)).sort(() => 0.5 - Math.random());
        const fill = remainingPool.slice(0, totalQuestions - resultQuestions.length);
        resultQuestions.push(...fill);
      }
    }

    // Auto-balance option correct keys if requested
    let finalQuestions = resultQuestions.map((q) => ({ ...q }));

    if (balanceOptionKeys) {
      // Rotate option array so correctIndex distributes across 0, 1, 2, 3 (~25% each)
      finalQuestions = finalQuestions.map((q, idx) => {
        const targetIndex = idx % 4; // rotate target 0, 1, 2, 3
        if (q.correctIndex === targetIndex || q.options.length !== 4) return q;

        // Swap target index choice with original correct choice
        const optionsCopy = [...q.options];
        const originalCorrectOption = optionsCopy[q.correctIndex];
        const targetOldOption = optionsCopy[targetIndex];

        optionsCopy[targetIndex] = originalCorrectOption;
        optionsCopy[q.correctIndex] = targetOldOption;

        return {
          ...q,
          options: optionsCopy,
          correctIndex: targetIndex
        };
      });
    }

    // Calculate choice key distribution counts
    const dist: [number, number, number, number] = [0, 0, 0, 0];
    finalQuestions.forEach((q) => {
      if (q.correctIndex >= 0 && q.correctIndex <= 3) {
        dist[q.correctIndex] += 1;
      }
    });

    setOptionDistribution(dist);
    setGeneratedPreview(finalQuestions);
  };

  const handleStartExamNow = () => {
    if (generatedPreview.length === 0) return;
    onGenerateExamSet(examTitle, generatedPreview, {
      enabled: timeLimitSecs > 0,
      timeLimitPerQuestion: timeLimitSecs,
      examMode,
      showInstantExplanation: examMode === "practice"
    });
  };

  const handleSaveToBank = () => {
    if (generatedPreview.length === 0) return;
    const qIds = generatedPreview.map((q) => q.id);
    onSaveNewExamSetToBank(examTitle, qIds);
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-burgundy" />
          <span>ระบบจัดสอบสุ่มอัตโนมัติ (Matrix Exam Generator)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          สร้างชุดข้อสอบมาตรฐานตาม Matrix สัดส่วนหมวดหมู่ ระดับ CEFR และปรับสมดุลตำแหน่งเฉลย (25% Equal Option Distribution)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator Controls */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
            <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
            <span>ตั้งค่ากฎคัดเลือกข้อสอบ (Matrix Rules)</span>
          </h3>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">ชื่อชุดข้อสอบที่สร้าง:</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy font-bold text-brand-navy bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">ประเภทข้อสอบ:</label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value as ExamType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold"
              >
                <option value="TGAT">TGAT Eng</option>
                <option value="A-Level">A-Level Eng</option>
                <option value="NETSAT">NETSAT</option>
                <option value="KEPT X">KEPT X</option>
                <option value="General">ทั่วไป / ผสม</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">จำนวนข้อสอบที่ต้องการ:</label>
              <input
                type="number"
                min={5}
                max={100}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-mono font-bold text-center"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">โหมดการสอบ (Exam Mode):</label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setExamMode("mock")}
                className={`py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                  examMode === "mock"
                    ? "bg-brand-burgundy text-brand-gold border-brand-burgundy shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                ⏱️ Mock Test (จำลองจริง)
              </button>
              <button
                type="button"
                onClick={() => setExamMode("practice")}
                className={`py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                  examMode === "practice"
                    ? "bg-brand-burgundy text-brand-gold border-brand-burgundy shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                💡 Practice (ฝึกซ้อมเฉลยทันที)
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase">สัดส่วนหมวดหมู่ (Category Weights):</p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">{cat}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={categoryWeights[cat] || 0}
                    onChange={(e) => handleCategoryWeightChange(cat, Number(e.target.value))}
                    className="w-14 px-2 py-1 text-center font-mono border rounded-lg bg-white text-xs font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={balanceOptionKeys}
                onChange={(e) => setBalanceOptionKeys(e.target.checked)}
                className="w-4 h-4 rounded text-brand-burgundy accent-brand-burgundy"
              />
              <span>ปรับสมดุลตำแหน่งเฉลยตัวเลือกอัตโนมัติ (~25% Equal Keys)</span>
            </label>
          </div>

          <button
            onClick={handleGenerateMatrix}
            className="w-full py-3 bg-brand-burgundy hover:bg-brand-navy text-brand-gold hover:text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            <span>ประมวลผลสุ่มข้อสอบตาม Matrix</span>
          </button>
        </div>

        {/* Right Column: Generated Exam Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-display text-sm font-black text-brand-navy flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-brand-burgundy" />
                  <span>ผลลัพธ์ชุดข้อสอบที่สุ่มสร้าง ({generatedPreview.length} ข้อ)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  สุ่มจากคลังข้อสอบทั้งหมดที่มีในระบบ
                </p>
              </div>

              {generatedPreview.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToBank}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-brand-cream text-slate-700 hover:text-brand-navy rounded-xl text-xs font-black transition-all border border-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>บันทึกชื่อชุดเข้าคลัง</span>
                  </button>
                  <button
                    onClick={handleStartExamNow}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>เริ่มทำสอบชุดนี้เลย</span>
                  </button>
                </div>
              )}
            </div>

            {showSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in">
                ✓ บันทึกชุดข้อสอบ "{examTitle}" เข้าสู่คลังวิชาเรียบร้อยแล้ว!
              </div>
            )}

            {/* Answer Key Option Balance Badge bar */}
            {generatedPreview.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  สัดส่วนตำแหน่งเฉลย (Option Key Distribution):
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-mono">ข้อ 1 (A)</span>
                    <span className="text-brand-navy text-sm font-black">{optionDistribution[0]} ข้อ</span>
                    <span className="text-[9px] text-slate-400 block">({Math.round((optionDistribution[0] / generatedPreview.length) * 100)}%)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-mono">ข้อ 2 (B)</span>
                    <span className="text-brand-navy text-sm font-black">{optionDistribution[1]} ข้อ</span>
                    <span className="text-[9px] text-slate-400 block">({Math.round((optionDistribution[1] / generatedPreview.length) * 100)}%)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-mono">ข้อ 3 (C)</span>
                    <span className="text-brand-navy text-sm font-black">{optionDistribution[2]} ข้อ</span>
                    <span className="text-[9px] text-slate-400 block">({Math.round((optionDistribution[2] / generatedPreview.length) * 100)}%)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-mono">ข้อ 4 (D)</span>
                    <span className="text-brand-navy text-sm font-black">{optionDistribution[3]} ข้อ</span>
                    <span className="text-[9px] text-slate-400 block">({Math.round((optionDistribution[3] / generatedPreview.length) * 100)}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Items List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {generatedPreview.map((q, idx) => (
                <div key={q.id || idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span className="text-brand-burgundy font-mono">ข้อที่ {idx + 1}</span>
                    <span className="bg-white px-2 py-0.5 rounded border">{q.category}</span>
                  </div>
                  <p className="font-semibold text-slate-800 line-clamp-2">{q.text}</p>
                  <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                    <span className="text-emerald-700 font-bold">
                      เฉลย: ข้อ {q.correctIndex + 1} ({["A", "B", "C", "D"][q.correctIndex]})
                    </span>
                  </div>
                </div>
              ))}

              {generatedPreview.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Zap className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">
                    ยังไม่ได้กดประมวลผลสุ่มข้อสอบ กำหนดตั้งค่าทางซ้ายแล้วกด "ประมวลผลสุ่มข้อสอบตาม Matrix"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
