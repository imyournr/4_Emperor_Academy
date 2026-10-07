const fs = require('fs');
const filepath = './src/components/Dashboard.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// Find line index containing "Strengths & Weaknesses"
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('Strengths & Weaknesses'));

if (idx !== -1) {
  const replacement = `
      {/* Recent Weakness Alert (Point B) */}
      {trendAlert && (
        <div className="bg-rose-50 border border-rose-100/70 p-4.5 rounded-2xl flex items-start gap-3 shadow-xs animate-fade-in">
          <span className="text-lg">⚠️</span>
          <div className="space-y-1">
            <h4 className="font-extrabold text-rose-950 text-xs flex items-center gap-1">
              การแจ้งเตือนความมั่นคงของวิทยฐานะสัปดาห์นี้
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              พบแนวโน้มที่ต้องเฝ้าระวังในหมวดหมู่ <span className="font-black text-rose-700">{trendAlert.category}</span> เนื่องจากความแม่นยำสัปดาห์นี้ลดลงอย่างมีนัยสำคัญจาก <span className="font-semibold">{trendAlert.oldAcc}%</span> เหลือเพียง <span className="font-black text-rose-600 font-mono">{trendAlert.newAcc}%</span> แนะนำให้ฝึกฝนหัวข้อนี้เพิ่มเติมเพื่อแก้ไขข้อบกพร่องโดยด่วน
            </p>
          </div>
        </div>
      )}

      {/* Continue Learning Widget (Point A) */}
      {latestAttempt && continueExamSet && (
        <div className="bg-gradient-to-r from-indigo-50/70 to-violet-50/70 border border-indigo-150 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-fade-in">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
              <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">เรียนรู้ค้างอยู่ (Continue Learning)</span>
            </div>
            <h3 className="font-display font-black text-slate-900 text-sm flex items-center gap-1.5">
              📖 ชุดข้อสอบล่าสุด: {continueExamSet}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
              <span>ความคืบหน้า: <strong className="text-slate-700 font-bold">{continueAttemptedCount}</strong> / {continueTotalCount} ข้อ ({Math.round(continueAttemptedCount / continueTotalCount * 100)}%)</span>
              <span className="text-slate-300">|</span>
              <span>ทำล่าสุด {continueTimeAgo}</span>
            </div>
          </div>
          <button
            onClick={() => onStartQuiz(continueExamSet)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-1.5 self-start sm:self-center cursor-pointer hover:scale-[1.02]"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> ทำต่อจากเดิม
          </button>
        </div>
      )}
`;
  lines.splice(idx, 0, replacement);
  content = lines.join('\n');
  console.log('Successfully injected widgets A and B into Dashboard.tsx!');
} else {
  console.log('Target Strengths & Weaknesses comment not found!');
}

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filepath, content, 'utf8');
