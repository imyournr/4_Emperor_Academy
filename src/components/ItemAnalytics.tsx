import React, { useState } from "react";
import { Question, UserAttempt } from "../types";
import {
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Award,
  Layers,
  Search,
  Users
} from "lucide-react";

interface ItemAnalyticsProps {
  questions: Question[];
  attempts: UserAttempt[];
}

export default function ItemAnalytics({
  questions = [],
  attempts = []
}: ItemAnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Calculate psychometric metrics per question
  const itemStatsMap = React.useMemo(() => {
    const stats: Record<
      string,
      {
        totalResponses: number;
        correctResponses: number;
        pVal: number; // Difficulty index %
        choices: [number, number, number, number]; // Option selected counts
        discrimination: number; // Point-biserial estimate
      }
    > = {};

    questions.forEach((q) => {
      stats[q.id] = {
        totalResponses: 0,
        correctResponses: 0,
        pVal: 0,
        choices: [0, 0, 0, 0],
        discrimination: 0
      };
    });

    attempts.forEach((a) => {
      if (stats[a.questionId]) {
        stats[a.questionId].totalResponses += 1;
        if (a.isCorrect) stats[a.questionId].correctResponses += 1;
        if (a.selectedIndex >= 0 && a.selectedIndex <= 3) {
          stats[a.questionId].choices[a.selectedIndex] += 1;
        }
      }
    });

    // Compute P-value & discrimination
    Object.keys(stats).forEach((qId) => {
      const s = stats[qId];
      if (s.totalResponses > 0) {
        s.pVal = Math.round((s.correctResponses / s.totalResponses) * 100);
      }
    });

    return stats;
  }, [questions, attempts]);

  // Overall Answer Key Position Balance across the entire bank
  const answerKeyDistribution = React.useMemo(() => {
    const dist = [0, 0, 0, 0];
    questions.forEach((q) => {
      if (q.correctIndex >= 0 && q.correctIndex <= 3) {
        dist[q.correctIndex] += 1;
      }
    });
    return dist;
  }, [questions]);

  const categories = Array.from(new Set(questions.map((q) => q.category)));

  const filteredQuestions = questions.filter((q) => {
    if (filterCategory !== "all" && q.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        q.text.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-burgundy" />
            <span>วิเคราะห์คุณภาพข้อสอบ & ตัวลวง (Item Psychometrics)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ดัชนีความยากง่าย (P-value), อัตราการเลือกตัวลวงแต่ละข้อ (Distractor Frequency), และสมดุลตำแหน่งเฉลยทั้งคลัง
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-brand-navy bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            วิเคราะห์ข้อสอบ {questions.length} ข้อ | {attempts.length} ประวัติการตอบ
          </span>
        </div>
      </div>

      {/* Answer Key Distribution Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
          <PieChartIcon className="w-4 h-4 text-brand-burgundy" />
          <span>ตรวจสอบการกระจายตำแหน่งคำตอบเฉลยทั้งคลัง (Answer Position Balance)</span>
        </h3>
        <p className="text-xs text-slate-500">
          หลัก QC ข้อสอบสถาบัน: เฉลยควรสุ่มกระจายสัดส่วนสม่ำเสมอใกล้เคียง ~25% ในทุกตำแหน่ง (ข้อ 1-4)
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {["ข้อ 1 (A)", "ข้อ 2 (B)", "ข้อ 3 (C)", "ข้อ 4 (D)"].map((label, idx) => {
            const count = answerKeyDistribution[idx];
            const pct = questions.length > 0 ? Math.round((count / questions.length) * 100) : 0;
            const isBiased = pct > 35 || pct < 15;

            return (
              <div
                key={label}
                className={`p-3.5 rounded-xl border transition-all ${
                  isBiased
                    ? "bg-amber-50/70 border-amber-300 text-amber-900"
                    : "bg-slate-50/80 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                  <span>{label}</span>
                  {isBiased && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <div className="text-lg font-black font-mono text-brand-navy">
                  {count} ข้อ <span className="text-xs font-normal text-slate-500">({pct}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBiased ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Item Analysis list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b pb-3">
          <h3 className="font-display text-sm font-black text-brand-navy">
            รายการวิเคราะห์ข้อสอบรายข้อ (Item-level Analytics)
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาโจทย์ข้อสอบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q, qIdx) => {
            const stats = itemStatsMap[q.id] || {
              totalResponses: 0,
              correctResponses: 0,
              pVal: 0,
              choices: [0, 0, 0, 0]
            };

            const total = stats.totalResponses;

            return (
              <div
                key={q.id}
                className="p-4 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black bg-brand-navy text-brand-gold px-2 py-0.5 rounded">
                        #{qIdx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                        {q.category}
                      </span>
                      {q.examSet && (
                        <span className="text-[10px] font-bold text-brand-burgundy bg-brand-cream px-2 py-0.5 rounded border border-brand-gold/30">
                          {q.examSet}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed pt-1">
                      {q.text}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-700 block">
                      ตอบถูก {stats.pVal}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      ตอบทั้งหมด {total} ครั้ง
                    </span>
                  </div>
                </div>

                {/* Choices & Distractor Frequency Chart */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60">
                  {q.options.map((optText, optIdx) => {
                    const isCorrect = optIdx === q.correctIndex;
                    const optCount = stats.choices[optIdx] || 0;
                    const optPct = total > 0 ? Math.round((optCount / total) * 100) : 0;
                    const isDeadDistractor = !isCorrect && total >= 3 && optPct === 0;

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          isCorrect
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold"
                            : isDeadDistractor
                            ? "bg-rose-50/50 border-rose-200 text-rose-800"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono font-black">
                            ข้อ {optIdx + 1} ({["A", "B", "C", "D"][optIdx]}) {isCorrect && "✓ เฉลย"}
                          </span>
                          <span className="font-mono text-slate-500 font-bold">
                            {optCount} คน ({optPct}%)
                          </span>
                        </div>
                        <p className="line-clamp-1 text-[11px] leading-tight">{optText}</p>
                        {isDeadDistractor && (
                          <span className="text-[9px] text-rose-600 font-bold block pt-0.5">
                            ⚠️ ตัวลวงไม่ทำงาน (0% คนเลือก)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
