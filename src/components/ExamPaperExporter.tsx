import React, { useState } from "react";
import { Question } from "../types";
import {
  Printer,
  FileText,
  Download,
  CheckSquare,
  Sparkles,
  Search,
  BookOpen
} from "lucide-react";

interface ExamPaperExporterProps {
  questions: Question[];
}

export default function ExamPaperExporter({ questions = [] }: ExamPaperExporterProps) {
  const [selectedExamSet, setSelectedExamSet] = useState<string>("all");
  const [paperTitle, setPaperTitle] = useState("ข้อสอบวัดระดับความรู้ภาษาอังกฤษ (English Proficiency Test)");
  const [institutionName, setInstitutionName] = useState("สถาบันกวดวิชาภาษาอังกฤษชั้นนำ");
  const [timeAllowed, setTimeAllowed] = useState("60 นาที");
  const [includeAnswerKeySheet, setIncludeAnswerKeySheet] = useState(true);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  const uniqueExamSets = Array.from(new Set(questions.map((q) => q.examSet || "ทั่วไป (General)")));

  const exportQuestions = questions.filter((q) => {
    if (selectedExamSet !== "all") {
      return (q.examSet || "ทั่วไป (General)") === selectedExamSet;
    }
    return true;
  });

  const handlePrintWindow = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Controls (Hidden during browser window printing) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
              <Printer className="w-5 h-5 text-brand-burgundy" />
              <span>พิมพ์ข้อสอบ & ปริ้นท์กระดาษคำตอบ (Export & Print Paper Exam)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              จัดรูปแบบข้อสอบมาตรฐานฟอนต์พิมพ์แจกในห้องเรียน พร้อมแยกกระดาษเฉลยและคำอธิบาย
            </p>
          </div>

          <button
            onClick={handlePrintWindow}
            className="px-5 py-2.5 bg-brand-navy hover:bg-brand-burgundy text-brand-gold hover:text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์ / Export เป็น PDF</span>
          </button>
        </div>

        {/* Paper Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">เลือกชุดข้อสอบ:</label>
            <select
              value={selectedExamSet}
              onChange={(e) => setSelectedExamSet(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold"
            >
              <option value="all">ทั้งหมดในคลัง ({questions.length} ข้อ)</option>
              {uniqueExamSets.map((es) => (
                <option key={es} value={es}>{es}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">หัวข้อบนกระดาษข้อสอบ:</label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">ชื่อสถาบัน / โรงเรียน:</label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs pt-1">
          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswerKeySheet}
              onChange={(e) => setIncludeAnswerKeySheet(e.target.checked)}
              className="w-4 h-4 rounded text-brand-burgundy accent-brand-burgundy"
            />
            <span>แนบใบเฉลย (Answer Key & Explanations Sheet) ต่อท้าย</span>
          </label>
        </div>
      </div>

      {/* PRINTABLE PAPER LAYOUT */}
      <div className="bg-white border-2 border-slate-300 p-8 sm:p-12 rounded-2xl shadow-lg space-y-8 max-w-4xl mx-auto text-slate-900 print:shadow-none print:border-none print:p-0">
        
        {/* Paper Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
          <h1 className="text-lg font-extrabold uppercase tracking-wide">{institutionName}</h1>
          <h2 className="text-base font-bold">{paperTitle}</h2>
          <div className="flex justify-between items-center text-xs font-semibold pt-2 text-slate-600">
            <span>คำสั่ง: จงเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว</span>
            <span>เวลาสอบ: {timeAllowed}</span>
            <span>จำนวนข้อสอบ: {exportQuestions.length} ข้อ</span>
          </div>
          <div className="pt-2 text-left text-xs font-mono font-bold flex justify-between border-t border-slate-300">
            <span>ชื่อ-นามสกุล: ............................................................................</span>
            <span>เลขประจำตัว: ............................</span>
          </div>
        </div>

        {/* Questions Area */}
        <div className="space-y-6">
          {exportQuestions.map((q, qIdx) => (
            <div key={q.id} className="space-y-2 break-inside-avoid">
              <div className="flex gap-2 text-sm font-semibold">
                <span className="font-bold">{qIdx + 1}.</span>
                <div className="leading-relaxed flex-1 whitespace-pre-line">{q.text}</div>
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6 text-xs text-slate-800">
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-1.5 items-start">
                    <span className="font-bold text-slate-600">({optIdx + 1})</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Separate Answer Key Sheet */}
        {includeAnswerKeySheet && (
          <div className="pt-12 border-t-2 border-dashed border-slate-400 space-y-6 break-before-page">
            <div className="text-center border-b border-slate-800 pb-2">
              <h3 className="text-base font-bold uppercase">เฉลยพร้อมคำอธิบาย (Answer Key & Explanations)</h3>
              <p className="text-xs text-slate-600 font-bold">{paperTitle} - {institutionName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {exportQuestions.map((q, qIdx) => (
                <div key={q.id} className="p-3 border border-slate-200 rounded-lg space-y-1 bg-slate-50/50">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>ข้อที่ {qIdx + 1}: ตอบ ข้อ {q.correctIndex + 1} ({["A", "B", "C", "D"][q.correctIndex]})</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{q.category}]</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px] font-sans">
                    {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
