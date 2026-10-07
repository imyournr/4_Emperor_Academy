const fs = require('fs');
const filepath = './src/components/AdminPanel.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// 1. Inject questionAttemptsMap useMemo right at the beginning of AdminPanel component definition
const targetMemo = "  const [adminTab, setAdminTab] = useState<\"list\" | \"add\" | \"categories\">(\"list\");";
const replacementMemo = `  const [adminTab, setAdminTab] = useState<"list" | "add" | "categories" | "health">("list");
  
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
  }, [attempts]);`;

if (content.includes(targetMemo)) {
  content = content.replace(targetMemo, replacementMemo);
  console.log('Injected questionAttemptsMap!');
} else {
  console.log('Memo target not found!');
}

// 2. Add "Question Health Center" button to the adminTab navigation header
const targetTabs = `          <button
            onClick={() => setAdminTab("categories")}
            className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer \${
              adminTab === "categories" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }\`}
          >
            จัดการหมวดหมู่ Bulk
          </button>`;

const replacementTabs = `          <button
            onClick={() => setAdminTab("categories")}
            className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer \${
              adminTab === "categories" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }\`}
          >
            จัดการหมวดหมู่ Bulk
          </button>
          <button
            onClick={() => setAdminTab("health")}
            className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer \${
              adminTab === "health" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }\`}
          >
            คลังคุณภาพข้อสอบ (Health Center)
          </button>`;

if (content.includes(targetTabs)) {
  content = content.replace(targetTabs, replacementTabs);
  console.log('Injected Tab buttons!');
} else {
  console.log('Tabs target not found!');
}

// 3. Render question quality badge inside row headers
const targetBadge = `                        {q.tags && q.tags.map((t) => (
                          <span key={t} className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-100">
                            {t}
                          </span>
                        ))}`;

const replacementBadge = `                        {q.tags && q.tags.map((t) => (
                          <span key={t} className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-100">
                            {t}
                          </span>
                        ))}
                        {(() => {
                          const stats = questionAttemptsMap[q.id];
                          if (!stats || stats.total < 5) return null;
                          if (stats.rate >= 90) {
                            return (
                              <span className="text-[9.5px] bg-emerald-50 border border-emerald-150 text-emerald-700 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                🟢 ง่ายเกินไป ({stats.rate}%)
                              </span>
                            );
                          } else if (stats.rate <= 15) {
                            return (
                              <span className="text-[9.5px] bg-rose-50 border border-rose-150 text-rose-700 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                                ⚠️ คลุมเครือ/ยากวิกฤต ({stats.rate}%)
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-[9.5px] bg-slate-100 border border-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded">
                                ⚖️ ความยากมาตรฐาน ({stats.rate}%)
                              </span>
                            );
                          }
                        })()}`;

if (content.includes(targetBadge)) {
  content = content.replace(targetBadge, replacementBadge);
  console.log('Injected quality badge!');
} else {
  console.log('Badge target not found!');
}

// 4. Append health tab UI at the end before final render closing div
// We will look for final "      {adminTab === "categories" && (" block or similar
const targetHealthTab = `      {adminTab === "categories" && (`;
const replacementHealthTab = `      {adminTab === "health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
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
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
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
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
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

          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
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
                          {q.questionText}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {issues.map(issue => (
                            <span key={issue} className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-extrabold">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartEdit(q)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[10px] rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        แก้ไขข้อมูล
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {adminTab === "categories" && (`;

if (content.includes(targetHealthTab)) {
  content = content.replace(targetHealthTab, replacementHealthTab);
  console.log('Injected health tab UI!');
} else {
  console.log('Health tab target not found!');
}

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filepath, content, 'utf8');
