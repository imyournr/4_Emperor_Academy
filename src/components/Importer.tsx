import React, { useState, useRef } from "react";
import { Question } from "../types";
import { Upload, FileText, CheckCircle, AlertCircle, HelpCircle, FileDown, Trash2, Edit3, PlusCircle, Sparkles, Loader2, FileSpreadsheet } from "lucide-react";

interface ImporterProps {
  categories: string[];
  onImport: (newQuestions: Question[]) => void;
  existingQuestionsCount: number;
}

export default function Importer({ categories, onImport, existingQuestionsCount }: ImporterProps) {
  const [inputText, setInputText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "Tenses");
  const [selectedExamSet, setSelectedExamSet] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<Partial<Question>[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Parse text into structured Question objects
  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) {
      setParsedQuestions([]);
      return;
    }

    const normalized = textToParse.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 1. Direct JSON detection
    const trimmed = normalized.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsedJson = JSON.parse(trimmed);
        const qArray = Array.isArray(parsedJson) ? parsedJson : (parsedJson.questions || []);
        if (Array.isArray(qArray) && qArray.length > 0 && qArray[0].text) {
          const mapped = qArray.map((q: any, i: number) => ({
            id: q.id || `imported_json_${Date.now()}_${i}`,
            text: q.text,
            options: Array.isArray(q.options) ? q.options : [],
            correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 ? q.correctIndex : 0,
            explanation: q.explanation || "คำอธิบายจากไฟล์นำเข้า",
            category: q.category || selectedCategory,
            examSet: q.examSet || selectedExamSet || "ทั่วไป (General)",
            isListening: !!q.isListening,
            listeningTranscript: q.listeningTranscript || "",
            tags: q.tags || [q.category || selectedCategory, "Imported"]
          }));
          setParsedQuestions(mapped);
          setPreviewOpen(true);
          setImportSuccess(false);
          return;
        }
      } catch (_) {
        // Not valid JSON, continue with text parsing
      }
    }

    // 2. Intelligent Question Block Splitting
    // Splits on question beginnings (e.g. "1.", "1)", "ข้อ 1.", "Item 1:", "Q1.")
    const rawBlocks = normalized.split(/\n(?=(?:ข้อ|ข้อที่|Item|Q\.?|Question|No\.?)?\s*\d+[\.\)\s:])/i);
    const parsedList: Partial<Question>[] = [];

    rawBlocks.forEach((block, index) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      const lines = trimmedBlock.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      let questionText = "";
      const options: string[] = [];
      let answerChar = "";
      let explanation = "";
      let readingExplanation = false;

      // Extract question number and main question text from first line
      const firstLine = lines[0];
      const qNumMatch = firstLine.match(/^(?:ข้อ|ข้อที่|Item|Q\.?|Question|No\.?)?\s*\d+[\.\)\s:]+(.*)/i);
      if (qNumMatch) {
        questionText = qNumMatch[1].trim();
      } else {
        questionText = firstLine;
      }

      // Helper to check horizontal inline choices on a single line (e.g. "A. cat  B. dog  C. bird  D. fish")
      const checkInlineChoices = (lineStr: string): string[] => {
        const parts = lineStr.split(/(?=\s+(?:\([a-dA-D1-4ก-ง]\)|[a-dA-D1-4ก-ง][\.\)]))/);
        if (parts.length >= 2) {
          const extracted: string[] = [];
          for (const p of parts) {
            const m = p.trim().match(/^(?:\(([a-dA-D1-4ก-ง])\)|([a-dA-D1-4ก-ง])[\.\)])\s*(.*)/i);
            if (m) {
              extracted.push((m[3] || "").trim());
            }
          }
          if (extracted.length >= 2) return extracted;
        }
        return [];
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check for answer line
        const answerMatch = line.match(/^(?:Answer|Ans|เฉลย|เฉลยข้อ|Key|Keys|คำตอบ|ข้อที่ถูก)[:\s]+([a-dA-D1-4ก-ง])/i);
        if (answerMatch) {
          answerChar = answerMatch[1].toLowerCase();
          continue;
        }

        // 2. Check for explanation start
        const explanationStartMatch = line.match(/^(?:Explanation|Exp|อธิบาย|คำอธิบาย|เหตุผล)[:\s]+(.*)/i);
        if (explanationStartMatch) {
          readingExplanation = true;
          explanation = explanationStartMatch[1].trim();
          continue;
        }

        if (readingExplanation) {
          explanation += " " + line;
          continue;
        }

        // 3. Check for inline horizontal options
        const inlineOpts = checkInlineChoices(line);
        if (inlineOpts.length >= 2 && options.length === 0) {
          options.push(...inlineOpts);
          continue;
        }

        // 4. Check for individual option lines:
        // A. / a) / (A) / 1. / 1) / (1) / ก. / ก)
        const optionMatch = line.match(/^(?:(?:\(([a-dA-D1-4ก-ง])\))|([a-dA-D1-4ก-ง])[\.\)\s])\s*(.*)/i);
        if (optionMatch && options.length < 4) {
          options.push((optionMatch[3] || "").trim());
          continue;
        }

        // If not option/answer/explanation, append to question text
        if (options.length === 0) {
          questionText += " " + line;
        } else {
          explanation += (explanation ? " " : "") + line;
        }
      }

      // Map answer character to 0-3 index
      const charToIndexMap: Record<string, number> = {
        a: 0, "1": 0, "ก": 0,
        b: 1, "2": 1, "ข": 1,
        c: 2, "3": 2, "ค": 2,
        d: 3, "4": 3, "ง": 3
      };
      let correctIndex = answerChar && charToIndexMap[answerChar] !== undefined ? charToIndexMap[answerChar] : -1;

      // If options exist but no answer was explicitly declared, default to 0 for convenience
      if (correctIndex === -1 && options.length > 0) {
        correctIndex = 0;
      }

      if (questionText.trim()) {
        const timestamp = Date.now() + index;
        parsedList.push({
          id: `imported_${timestamp}`,
          text: questionText.trim(),
          options: options.slice(0, 4),
          correctIndex,
          explanation: explanation || "คำอธิบายอัตโนมัติจากการนำเข้า",
          category: selectedCategory,
          examSet: selectedExamSet || "ทั่วไป (General)",
          tags: [selectedCategory, "Imported"]
        });
      }
    });

    setParsedQuestions(parsedList);
    setPreviewOpen(parsedList.length > 0);
    setImportSuccess(false);
  };

  // Safe multi-format file uploader (supports .txt, .json, .csv, .md)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      handleParse(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  // Safe Word (.docx) upload with native browser DataURL (no byte-by-byte freeze)
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingText("กำลังอ่านและแปลงข้อความจากไฟล์ Word (.docx)...");
    setErrorMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const resultStr = event.target?.result as string;
          const base64 = resultStr.includes(",") ? resultStr.split(",")[1] : resultStr;

          const res = await fetch("/api/parse-docx", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileData: base64 }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "เกิดข้อผิดพลาดในการแปลงไฟล์ Word");
          }

          setInputText(data.text);
          setErrorMessage("");
          setLoadingText("ดึงข้อความจาก Word สำเร็จ! กำลังประมวลผลแยกคำถาม...");
          handleParse(data.text);
        } catch (err: any) {
          console.error("Docx Upload Handler Error:", err);
          setErrorMessage("ไม่สามารถดึงข้อความจากไฟล์ได้: " + err.message);
        } finally {
          setIsLoading(false);
        }
      };
      // Native C++ DataURL reading (fast, zero memory leaks, supports all sizes)
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("เกิดข้อผิดพลาดในการอ่านไฟล์: " + err.message);
      setIsLoading(false);
    }
  };

  const handleAIParse = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setLoadingText("🧠 กำลังส่งวิเคราะห์โครงสร้างด้วย Gemini AI (แยก Passage, Conversation, Error Identification และสร้างคำอธิบายภาษาไทยให้อัตโนมัติ)...");
    setErrorMessage("");
    setParsedQuestions([]);
    setImportSuccess(false);

    try {
      const res = await fetch("/api/analyze-exam-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          customInstructions,
          defaultCategory: selectedCategory,
          defaultExamSet: selectedExamSet
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์เพื่อวิเคราะห์ AI");
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("โครงสร้างผลลัพธ์จาก AI ไม่ถูกต้อง");
      }

      const parsedList = data.questions.map((q: any, idx: number) => {
        const timestamp = Date.now() + idx;
        const mappedCat = q.isListening ? "Listening" : (q.category || selectedCategory);
        return {
          id: `imported_ai_${timestamp}`,
          text: q.text,
          options: q.options || [],
          correctIndex: q.correctIndex !== undefined && q.correctIndex >= 0 ? q.correctIndex : 0,
          explanation: q.explanation || "คำอธิบายจากการวิเคราะห์ด้วย AI",
          category: mappedCat,
          examSet: q.examSet || selectedExamSet || "ทั่วไป (General)",
          isListening: !!q.isListening,
          listeningTranscript: q.listeningTranscript || "",
          tags: [mappedCat, "AI-Parsed", "Imported"]
        };
      });

      setParsedQuestions(parsedList);
      setPreviewOpen(parsedList.length > 0);
    } catch (err: any) {
      console.error("AI Parse Error:", err);
      let userFriendlyErr = err.message || "เกิดข้อผิดพลาดในการวิเคราะห์ AI";
      if (userFriendlyErr.includes("503") || userFriendlyErr.includes("UNAVAILABLE") || userFriendlyErr.includes("high demand")) {
        userFriendlyErr = "ขณะนี้เซิร์ฟเวอร์ Gemini AI ของ Google มีผู้ใช้งานหนาแน่นสูงชั่วคราว (High demand spikes) ท่านสามารถกดลองใหม่อีกครั้ง หรือคลิกปุ่ม 'วิเคราะห์แบบด่วน (Regex)' เพื่อนำเข้าข้อสอบได้ทันที";
      }
      setErrorMessage("เกิดข้อผิดพลาด: " + userFriendlyErr);
    } finally {
      setIsLoading(false);
    }
  };

  const executeImport = () => {
    // Filter only valid questions
    const validQuestions = parsedQuestions.filter(
      (q) => q.text && q.options && q.options.length >= 2 && q.correctIndex !== undefined && q.correctIndex >= 0
    ) as Question[];

    if (validQuestions.length === 0) {
      alert("ไม่พบข้อสอบที่สมบูรณ์สำหรับนำเข้า กรุณาตรวจสอบรูปแบบข้อความ");
      return;
    }

    onImport(validQuestions);
    setImportCount(validQuestions.length);
    setImportSuccess(true);
    setPreviewOpen(false);
    setInputText("");
    setParsedQuestions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsertTemplate = () => {
    const template = `1. She ____ to school every day.
a) go
b) goes
c) went
d) going
Answer: b
Explanation: ประธาน She เป็นเอกพจน์บุรุษที่ 3 ใน Present Simple จึงต้องกริยาเติม -s

2. We have been waiting here ____ two hours.
a) since
b) for
c) during
d) ago
Answer: b
Explanation: ใช้ "for" เพื่อบอกระยะเวลารวม (two hours)

3. Identify the error:
The news about the team were very disappointing.
a) The news
b) about
c) were
d) disappointing
Answer: c
Explanation: The news เป็นนามนับไม่ได้ ถือเป็นเอกพจน์ ต้องใช้ was`;
    setInputText(template);
    handleParse(template);
  };

  return (
    <div id="importer-section" className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-800 flex items-center gap-2">
              <Upload className="w-6 h-6 text-indigo-600" />
              ระบบ Import ข้อสอบอัตโนมัติ
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              นำเข้าไฟล์ข้อสอบปริมาณมากได้ใน 10 วินาทีจากไฟล์ Text หรือ Word (.docx) คัดสรรค์โดย AI
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleInsertTemplate}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <FileDown className="w-4 h-4" />
              ดูข้อสอบตัวอย่าง
            </button>
            <label className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1 border border-slate-200">
              <FileText className="w-4 h-4 text-slate-600" />
              อัปโหลด .txt / .json / .csv
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.csv,.md"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
            <label className="px-4 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1 border border-indigo-200 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              อัปโหลด Word (.docx)
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx"
                onChange={handleDocxUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {isLoading && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            <p className="text-xs font-medium text-indigo-800">{loadingText}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-800">เกิดข้อผิดพลาด</h4>
              <p className="text-xs text-rose-600 mt-0.5 whitespace-pre-line">{errorMessage}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-800">นำเข้าสำเร็จแล้ว!</h4>
              <p className="text-xs text-emerald-600 mt-0.5">
                เพิ่มข้อสอบใหม่จำนวน <strong>{importCount} ข้อ</strong> เข้าสู่คลังวิเคราะห์เรียบร้อยแล้ว (คลังรวมปัจจุบันมี {existingQuestionsCount} ข้อ)
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                วางข้อความคำถามเพื่อเริ่มแยกประเด็น
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="คัดลอกข้อสอบจาก Word แล้ววางที่นี่..."
                disabled={isLoading}
                className="w-full h-80 p-4 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Custom AI Instructions Box */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-xl p-4 border border-indigo-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>🧠 คุย/สั่งการ AI เพิ่มเติม (เช่น แยกชุดข้อสอบหลายชุดในไฟล์เดียว หรือตั้งค่า Listening)</span>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="ตัวอย่าง: 'ไฟล์นี้มีข้อสอบ 3 ชุดปะปนกัน ช่วยกรองแยกชุดข้อสอบแต่ละข้อเป็น Mock 1, Mock 2, Mock 3 ให้ที' หรือ 'กำหนดข้อ 1-5 เป็น Listening และจำลอง transcript สำหรับเด็กผู้หญิงคุยกับคุณครู'"
                disabled={isLoading}
                className="w-full h-20 p-3 border border-slate-250 focus:border-indigo-500 rounded-lg text-xs outline-none bg-white transition-all placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  หมวดหมู่พื้นฐาน (สำหรับโหมดด่วน)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Update all currently parsed questions' categories
                    setParsedQuestions(prev => prev.map(q => ({ ...q, category: e.target.value, tags: [e.target.value, "Imported"] })));
                  }}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  ชื่อชุดข้อสอบสำหรับนำเข้ารุ่นนี้ (Exam Set Name)
                </label>
                <input
                  type="text"
                  value={selectedExamSet}
                  onChange={(e) => {
                    setSelectedExamSet(e.target.value);
                    // Update all currently parsed questions' exam sets
                    setParsedQuestions(prev => prev.map(q => ({ ...q, examSet: e.target.value || "ทั่วไป (General)" })));
                  }}
                  placeholder="เช่น TGAT 66, A-Level 67"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-5">
                <button
                  onClick={() => handleParse(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  title="ใช้เครื่องมือแยกคำด้วย Regex ด่วน"
                >
                  วิเคราะห์แบบด่วน (Regex)
                </button>
                <button
                  onClick={handleAIParse}
                  disabled={!inputText.trim() || isLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer"
                  title="ใช้ Gemini AI จำแนกบทความ, บทสนทนา, ข้อหาจุดผิด และสร้างเฉลยละเอียดภาษาไทยทันที"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  วิเคราะห์อัจฉริยะด้วย Gemini AI ✨
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-700 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              คำแนะนำรูปแบบเอกสาร (Formatting Guide)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              เพื่อให้ระบบแปลงประเด็นวิเคราะห์ได้อย่างมีประสิทธิภาพ กรุณาใช้โครงสร้างดังนี้:
            </p>

            <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1 overflow-x-auto">
              <div>1. [พิมพ์คำถามที่ต้องการที่นี่]</div>
              <div className="text-indigo-600">a) [ตัวเลือกที่ 1]</div>
              <div className="text-indigo-600">b) [ตัวเลือกที่ 2]</div>
              <div className="text-indigo-600">c) [ตัวเลือกที่ 3]</div>
              <div className="text-indigo-600">d) [ตัวเลือกที่ 4]</div>
              <div className="text-emerald-600 font-semibold mt-1">Answer: b</div>
              <div className="text-slate-400">Explanation: [เฉลยข้อสอบอย่างละเอียด]</div>
            </div>

            <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
              <li>ขึ้นต้นด้วยหมายเลขตามด้วยจุดหรือวงเล็บเสมอ</li>
              <li>ชอยส์ระบุอักษร a) ถึง d) ชัดเจน</li>
              <li>ระบุเฉลยนำหน้าด้วยคำว่า <code className="text-indigo-600 font-mono">Answer:</code>, <code className="text-indigo-600 font-mono">เฉลย:</code>, หรือ <code className="text-indigo-600 font-mono">Key:</code></li>
              <li>ใส่คำอธิบายตามหลังได้ทันที ระบบจะแยกเป็นส่วนเฉลย</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live Preview Section */}
      {previewOpen && parsedQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                ตัวอย่างผลการวิเคราะห์ ({parsedQuestions.length} ข้อที่พบ)
              </h3>
              <p className="text-xs text-slate-500">
                กรุณาตรวจสอบความถูกต้องของโจทย์และคำตอบของเฉลย ก่อนกดยืนยันจัดเก็บเข้าคลังถาวร
              </p>
            </div>
            <button
              onClick={executeImport}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100"
            >
              <CheckCircle className="w-4 h-4" />
              ยืนยันนำเข้ารวม {parsedQuestions.filter(q => q.text && q.correctIndex !== undefined && q.correctIndex >= 0).length} ข้อ
            </button>
          </div>

          {/* BATCH GROUP EDITOR FOR STREAMLINED BULK UPDATES */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 my-3">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>⚡ แก้ไขข้อมูลด่วนทั้งชุดแบบกลุ่ม (Batch Group Editor)</span>
              </h4>
              <p className="text-[10px] text-slate-500">
                เปลี่ยนหมวดหมู่หรือชื่อชุดข้อสอบของทุกข้อในหน้านี้พร้อมกันทันทีใน 1 คลิกหากวิเคราะห์ผิดพลาด
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              {/* Batch Category Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600 shrink-0">เปลี่ยนหมวดหมู่ทั้งหมด:</span>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    setParsedQuestions((prev) =>
                      prev.map((q) => ({
                        ...q,
                        category: val,
                        tags: [val, ...(q.tags?.filter((t) => t !== q.category) || ["Imported"])]
                      }))
                    );
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>-- เลือกหมวดหมู่เพื่อใช้กับทั้งหมด --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Exam Set Name Input */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600 shrink-0">เปลี่ยนชื่อชุดข้อสอบทั้งหมด:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    id="bulk-exam-set-input"
                    placeholder="เช่น KEPT X — Full Mock Test"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-750 outline-none w-44 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setParsedQuestions((prev) => prev.map((q) => ({ ...q, examSet: val })));
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById("bulk-exam-set-input") as HTMLInputElement;
                      const val = inputEl?.value.trim();
                      if (val) {
                        setParsedQuestions((prev) => prev.map((q) => ({ ...q, examSet: val })));
                      }
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    นำไปใช้
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
            {parsedQuestions.map((q, idx) => {
              const isValid = q.text && q.options && q.options.length >= 2 && q.correctIndex !== undefined && q.correctIndex >= 0;
              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isValid ? "bg-slate-50 border-slate-100" : "bg-amber-50/50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          ข้อ {idx + 1}
                        </span>

                        {/* Interactive Category Selector in Preview */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">หมวดหมู่:</span>
                          <select
                            value={q.category || selectedCategory}
                            onChange={(e) => {
                              const updatedCat = e.target.value;
                              setParsedQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, category: updatedCat, tags: [updatedCat, "Imported"] } : item
                                )
                              );
                            }}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Interactive Exam Set Input in Preview */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">ชุดข้อสอบ:</span>
                          <input
                            type="text"
                            value={q.examSet || selectedExamSet || ""}
                            placeholder="ทั่วไป (General)"
                            onChange={(e) => {
                              const updatedSet = e.target.value;
                              setParsedQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, examSet: updatedSet } : item
                                )
                              );
                            }}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-750 font-medium outline-none w-24 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Interactive Listening Switch in Preview */}
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!q.isListening}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setParsedQuestions((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        isListening: checked,
                                        category: checked ? "Listening" : item.category,
                                        listeningTranscript: checked ? item.listeningTranscript || item.text : ""
                                      }
                                    : item
                                )
                              );
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            🎧 Listening
                          </span>
                        </label>

                        {isValid ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> โครงสร้างถูกต้อง
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> ข้อมูลไม่ครบถ้วน (เช็คโจทย์/ตัวเลือก/เฉลย)
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">
                        {q.text || "(ไม่มีข้อความโจทย์)"}
                      </p>

                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt, oIdx) => (
                            <button
                              type="button"
                              key={oIdx}
                              onClick={() => {
                                setParsedQuestions((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, correctIndex: oIdx } : item
                                  )
                                );
                              }}
                              className={`text-left text-xs p-2 rounded border transition-all cursor-pointer ${
                                q.correctIndex === oIdx
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs ring-1 ring-emerald-400"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              title="คลิกเพื่อกำหนดให้ข้อนี้เป็นคำตอบที่ถูกต้อง"
                            >
                              <span className="font-bold mr-1">
                                {String.fromCharCode(97 + oIdx)})
                              </span>{" "}
                              {opt}
                              {q.correctIndex === oIdx && (
                                <span className="ml-1 text-[10px] text-emerald-600 font-bold">✓ (เฉลยที่ถูกต้อง)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 italic">ไม่พบตัวเลือกคำตอบ</p>
                      )}

                      {q.explanation && (
                        <p className="text-xs text-slate-500 bg-white p-2.5 rounded border border-slate-150 mt-2">
                          <strong className="text-slate-700">อธิบาย: </strong>
                          {q.explanation}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setParsedQuestions((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ลบออก"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
