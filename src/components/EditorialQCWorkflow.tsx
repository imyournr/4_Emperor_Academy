import React, { useState } from "react";
import { Question, QCStatus, QuestionComment, User } from "../types";
import {
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Tag,
  Filter,
  Sparkles
} from "lucide-react";

interface EditorialQCWorkflowProps {
  questions: Question[];
  currentUser: User | null;
  onUpdateQuestionQC: (questionId: string, status: QCStatus) => void;
  onAddComment: (questionId: string, commentText: string) => void;
}

export default function EditorialQCWorkflow({
  questions = [],
  currentUser,
  onUpdateQuestionQC,
  onAddComment
}: EditorialQCWorkflowProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<QCStatus | "all">("all");
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");

  const filteredQuestions = questions.filter((q) => {
    if (selectedStatusFilter !== "all") {
      const qStatus = q.qcStatus || "draft";
      return qStatus === selectedStatusFilter;
    }
    return true;
  });

  const activeQuestion = filteredQuestions.find((q) => q.id === activeQuestionId) || filteredQuestions[0] || null;

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeQuestion) return;
    onAddComment(activeQuestion.id, commentInput.trim());
    setCommentInput("");
  };

  const handleBulkSetStatus = (newStatus: QCStatus) => {
    if (filteredQuestions.length === 0) return;
    if (confirm(`คุณต้องการเปลี่ยนสถานะของข้อสอบทั้ง ${filteredQuestions.length} ข้อในหมวดนี้เป็น "${newStatus}" หรือไม่?`)) {
      filteredQuestions.forEach((q) => onUpdateQuestionQC(q.id, newStatus));
    }
  };

  const getStatusBadge = (status?: QCStatus) => {
    const s = status || "draft";
    switch (s) {
      case "draft":
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">📝 รอร่าง (Draft)</span>;
      case "reviewed":
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">🔍 ตรวจสอบแล้ว (Reviewed)</span>;
      case "approved":
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ อนุมัติแล้ว (Approved)</span>;
      case "published":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">🚀 เผยแพร่แล้ว (Published)</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-burgundy" />
            <span>กระบวนการตรวจแก้ข้อสอบ & QC Workflow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            สถานะ QC ข้อสอบ (Draft → Reviewed → Approved → Published), ระบบคอมเมนต์โน้ตแก้ไข, และ Checklist ตรวจสอบรายประเภทข้อสอบ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(["all", "draft", "reviewed", "approved", "published"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                  selectedStatusFilter === st
                    ? "bg-brand-burgundy text-white shadow-xs"
                    : "text-slate-600 hover:text-brand-navy"
                }`}
              >
                {st === "all" ? "ทั้งหมด" : st}
              </button>
            ))}
          </div>

          {/* Quick Batch QC Action */}
          {filteredQuestions.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase hidden xl:inline">เปลี่ยนทั้งชุด:</span>
              <button
                onClick={() => handleBulkSetStatus("approved")}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                title="เปลี่ยนทุกข้อในตัวกรองนี้เป็น Approved"
              >
                ⭐ อนุมัติทั้งหมด ({filteredQuestions.length})
              </button>
              <button
                onClick={() => handleBulkSetStatus("published")}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                title="เปลี่ยนทุกข้อในตัวกรองนี้เป็น Published"
              >
                🚀 เผยแพร่ทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Questions List with QC Status */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center justify-between border-b pb-2">
            <span>รายการข้อสอบ ({filteredQuestions.length})</span>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
          </h3>

          <div className="space-y-2">
            {filteredQuestions.map((q) => {
              const isActive = activeQuestion?.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer space-y-1.5 ${
                    isActive
                      ? "bg-brand-cream/40 border-brand-gold text-brand-navy font-bold shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-slate-400">[{q.category}]</span>
                    {getStatusBadge(q.qcStatus)}
                  </div>
                  <p className="line-clamp-2 leading-tight">{q.text}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Question QC Detail, Comments & Checklist */}
        <div className="lg:col-span-2 space-y-4">
          {activeQuestion ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="flex justify-between items-start gap-3 border-b pb-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-black text-brand-burgundy bg-brand-cream px-2 py-0.5 rounded border border-brand-gold/30">
                      หมวด: {activeQuestion.category}
                    </span>
                    {getStatusBadge(activeQuestion.qcStatus)}
                  </div>
                  <h3 className="font-display text-sm font-black text-brand-navy leading-tight">
                    {activeQuestion.text}
                  </h3>
                </div>

                {/* Change QC Status Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(["draft", "reviewed", "approved", "published"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateQuestionQC(activeQuestion.id, st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer capitalize ${
                        (activeQuestion.qcStatus || "draft") === st
                          ? "bg-brand-burgundy text-brand-gold shadow-xs"
                          : "text-slate-600 hover:text-brand-navy"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Choices & Explanation */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase text-[10px]">ตัวเลือก (Options):</p>
                <div className="grid grid-cols-2 gap-2">
                  {activeQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border text-xs ${
                        i === activeQuestion.correctIndex
                          ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-950"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="font-mono text-[10px] mr-1.5 font-bold">
                        ข้อ {i + 1} ({["A", "B", "C", "D"][i]}):
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Type Specific QC Checklist */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <p className="font-black text-brand-navy text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-brand-burgundy" />
                  <span>รายการตรวจสอบสถาบัน (QC Audit Checklist):</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input type="checkbox" defaultChecked className="accent-brand-burgundy rounded" />
                    <span>มีตัวเลือกครบ 4 ข้อ และเฉลยถูกต้อง 1 ข้อแน่นอน</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input type="checkbox" defaultChecked className="accent-brand-burgundy rounded" />
                    <span>คำอธิบายเฉลยมีกฎไวยากรณ์/คำแปลชัดเจน</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input type="checkbox" defaultChecked className="accent-brand-burgundy rounded" />
                    <span>ตัวลวงไม่มีความหมายซ้ำซ้อนกับคำตอบจริง</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                    <input type="checkbox" defaultChecked className="accent-brand-burgundy rounded" />
                    <span>ระบุระดับ CEFR หรือหมวดหมู่วิชาตรงตามคลัง</span>
                  </label>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="font-black text-brand-navy text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-burgundy" />
                  <span>บันทึกโน้ตและข้อเสนอแนะกองบรรณาธิการ (Editorial Comments):</span>
                </p>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(activeQuestion.editorialComments || []).map((cm) => (
                    <div key={cm.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span className="text-brand-navy">{cm.author} {cm.role ? `(${cm.role})` : ""}</span>
                        <span>{cm.timestamp || ((cm as any).createdAt ? new Date((cm as any).createdAt).toLocaleDateString("th-TH") : "")}</span>
                      </div>
                      <p className="text-slate-700">{cm.text}</p>
                    </div>
                  ))}
                  {(!activeQuestion.editorialComments || activeQuestion.editorialComments.length === 0) && (
                    <p className="text-xs text-slate-400 italic">ยังไม่มีข้อเสนอแนะเพิ่มเติมสำหรับข้อนี้</p>
                  )}
                </div>

                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="พิมพ์ข้อเสนอแนะหรือจุดต้องแก้ไข..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-navy hover:bg-brand-burgundy text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งข้อความ</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">เลือกข้อสอบทางซ้ายเพื่อเริ่มตรวจแก้ QC</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
