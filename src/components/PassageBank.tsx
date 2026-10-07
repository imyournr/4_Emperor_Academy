import React, { useState } from "react";
import { Passage, Question, CEFRLevel } from "../types";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  BookOpen,
  Link,
  CheckCircle2,
  Sparkles,
  Search,
  Layers,
  ChevronRight
} from "lucide-react";

interface PassageBankProps {
  passages: Passage[];
  questions: Question[];
  onAddPassage: (newPassage: Passage) => void;
  onUpdatePassage: (passageId: string, updated: Partial<Passage>) => void;
  onDeletePassage: (passageId: string) => void;
  onLinkQuestionToPassage: (questionId: string, passageId: string | undefined) => void;
}

export default function PassageBank({
  passages = [],
  questions = [],
  onAddPassage,
  onUpdatePassage,
  onDeletePassage,
  onLinkQuestionToPassage
}: PassageBankProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("General Reading");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPassageIdForLinking, setSelectedPassageIdForLinking] = useState<string | null>(null);

  const calculateWordCount = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const wCount = calculateWordCount(content);

    if (editingId) {
      onUpdatePassage(editingId, {
        title: title.trim(),
        content: content.trim(),
        topic,
        cefrLevel,
        wordCount: wCount
      });
      setEditingId(null);
    } else {
      const newPassage: Passage = {
        id: `pas_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        topic,
        cefrLevel,
        wordCount: wCount,
        questionIds: []
      };
      onAddPassage(newPassage);
    }

    // Reset form
    setTitle("");
    setContent("");
    setTopic("General Reading");
    setCefrLevel("B1");
  };

  const handleStartEdit = (p: Passage) => {
    setEditingId(p.id);
    setTitle(p.title);
    setContent(p.content);
    setTopic(p.topic || "General Reading");
    setCefrLevel(p.cefrLevel || "B1");
  };

  const filteredPassages = passages.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.content.toLowerCase().includes(term) ||
      p.topic?.toLowerCase().includes(term)
    );
  });

  const activePassageForLinking = passages.find((p) => p.id === selectedPassageIdForLinking);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="font-display text-xl font-black text-brand-navy flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-burgundy" />
            <span>คลังบทความอ่าน (Passage Bank)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รวบรวมบทความการอ่าน (Reading Passages) เพื่อให้ผูกกับโจทย์ข้อสอบ Reading Comprehension หลายข้อได้สะดวกในคลังเดียว
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-brand-burgundy bg-brand-cream/80 px-3 py-1.5 rounded-xl border border-brand-gold/30">
            มีบทความทั้งหมด {passages.length} บทความ
          </span>
        </div>
      </div>

      {/* Add / Edit Passage Form */}
      <form onSubmit={handleSave} className="bg-white border-2 border-brand-cream rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
          {editingId ? <Edit className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-brand-burgundy" />}
          <span>{editingId ? "แก้ไขข้อมูลบทความอ่าน" : "เพิ่มบทความอ่านใหม่ในคลัง (Create New Passage)"}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">ชื่อบทความ / หัวข้อเรื่อง (Passage Title):</label>
            <input
              type="text"
              required
              placeholder="เช่น The Rise of Renewable Energy in Asia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">ระดับภาษา (CEFR Level):</label>
            <select
              value={cefrLevel}
              onChange={(e) => setCefrLevel(e.target.value as CEFRLevel)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50 font-bold text-brand-navy"
            >
              <option value="A1">CEFR A1 (Beginner)</option>
              <option value="A2">CEFR A2 (Elementary)</option>
              <option value="B1">CEFR B1 (Intermediate - NETSAT/TGAT)</option>
              <option value="B2">CEFR B2 (Upper Int - A-Level/KEPT)</option>
              <option value="C1">CEFR C1 (Advanced)</option>
              <option value="C2">CEFR C2 (Proficient)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">หมวดหมู่ / หัวข้อความรู้ (Topic/Theme):</label>
          <input
            type="text"
            placeholder="เช่น Technology, Climate Change, Health & Science, Economics"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase">เนื้อหาบทความภาษาอังกฤษ (Passage Content):</label>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              ความยาว: {calculateWordCount(content)} คำ (Words)
            </span>
          </div>
          <textarea
            required
            rows={6}
            placeholder="วางเนื้อหาบทความอ่านภาษาอังกฤษที่นี่..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-burgundy bg-slate-50/30 leading-relaxed font-sans"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setContent("");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิกแก้ไข
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2 bg-brand-burgundy hover:bg-brand-navy text-brand-gold hover:text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-brand-gold" />
            <span>{editingId ? "บันทึกการแก้ไขบทความ" : "เพิ่มบทความลงคลัง"}</span>
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเรื่อง หรือคำในบทความ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-burgundy bg-slate-50/50"
          />
        </div>
        <div className="text-[10px] text-slate-400 font-bold">
          แสดงผล {filteredPassages.length} บทความ
        </div>
      </div>

      {/* Passages List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPassages.map((p) => {
          const linkedQuestions = questions.filter(
            (q) => q.passageId === p.id || (q.passageText && q.passageText.includes(p.title))
          );

          return (
            <div
              key={p.id}
              className="bg-white border-2 border-slate-150 hover:border-brand-gold/40 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-black text-brand-burgundy bg-brand-cream/80 px-2.5 py-0.5 rounded-md border border-brand-gold/30 font-mono">
                    {p.cefrLevel || "B1"} • {p.topic || "General"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไขบทความ"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`คุณต้องการลบบทความ "${p.title}" ใช่หรือไม่?`)) {
                          onDeletePassage(p.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบบทความ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="font-display text-sm font-black text-brand-navy leading-tight">
                  {p.title}
                </h4>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto font-sans line-clamp-4 whitespace-pre-line">
                  {p.content}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t pt-2">
                  <span>📄 จำนวนคำ: {p.wordCount || calculateWordCount(p.content)} คำ</span>
                  <span className="text-brand-burgundy">
                    🔗 ผูกกับโจทย์อยู่ {linkedQuestions.length} ข้อ
                  </span>
                </div>
              </div>

              {/* Link Questions Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() =>
                    setSelectedPassageIdForLinking(
                      selectedPassageIdForLinking === p.id ? null : p.id
                    )
                  }
                  className="w-full py-2 bg-slate-100 hover:bg-brand-cream/50 text-slate-700 hover:text-brand-navy rounded-xl text-xs font-black transition-all border border-slate-200 hover:border-brand-gold/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5 text-brand-burgundy" />
                  <span>
                    {selectedPassageIdForLinking === p.id
                      ? "ซ่อนเครื่องมือผูกโจทย์ข้อสอบ"
                      : "จัดการผูกข้อสอบเข้าบทความนี้"}
                  </span>
                </button>
              </div>

              {/* Linking Panel dropdown */}
              {selectedPassageIdForLinking === p.id && (
                <div className="bg-brand-cream/30 border border-brand-gold/30 rounded-xl p-3 space-y-2 mt-2">
                  <p className="text-[10px] font-black text-brand-navy uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-gold" />
                    <span>คลิกเพื่อผูก / ถอนโจทย์ข้อสอบกับบทความนี้:</span>
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto bg-white p-2 rounded-lg border border-slate-200">
                    {questions.map((q) => {
                      const isLinked = q.passageId === p.id;
                      return (
                        <div
                          key={q.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs border transition-all ${
                            isLinked
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="line-clamp-1 pr-2 flex-1">
                            <span className="text-[10px] font-mono text-slate-400 mr-1.5">[{q.category}]</span>
                            <span>{q.text}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onLinkQuestionToPassage(q.id, isLinked ? undefined : p.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer shrink-0 ${
                              isLinked
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-brand-burgundy text-brand-gold hover:bg-brand-navy"
                            }`}
                          >
                            {isLinked ? "ถอนการผูก" : "➕ ผูกบทความ"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPassages.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">
              ยังไม่มีบทความภาษาอังกฤษในคลัง เพิ่มบทความใหม่เพื่อเริ่มใช้งาน
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
