import React, { useState } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  UserCheck,
  AlertCircle,
  Info,
  Mail,
  Phone,
  MessageCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserPlus
} from "lucide-react";

interface AuthProps {
  onLogin: (user: User) => void;
  users: User[];
  onRegister: (newUser: Omit<User, "id">) => User | null;
}

export default function Auth({ onLogin, users, onRegister }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [realName, setRealName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกข้อมูลบัญชีผู้ใช้และรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (isLogin) {
      // Find matching user
      const foundUser = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === password
      );

      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องตามระบบประมวลผล");
      }
    } else {
      // Register new student
      if (!realName.trim()) {
        setError("กรุณาระบุชื่อและนามสกุลจริงเพื่อใช้ในการบันทึกสถิติและผลการเรียน");
        return;
      }

      // Check duplicate
      const exists = users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setError("ชื่อผู้ใช้งาน (Username) นี้ได้รับการลงทะเบียนแล้ว กรุณาเลือกชื่อผู้ใช้อื่น");
        return;
      }

      const created = onRegister({
        username: username.trim(),
        passwordHash: password,
        role: "student",
        realName: realName.trim()
      });

      if (created) {
        setSuccessMsg("ดำเนินการลงทะเบียนผู้เรียนใหม่เรียบร้อยแล้ว ระบบกำลังนำคุณเข้าสู่ขั้นตอนลงชื่อเข้าใช้...");
        setTimeout(() => {
          setIsLogin(true);
          setUsername(created.username);
          setPassword(created.passwordHash);
          setSuccessMsg("");
        }, 2000);
      } else {
        setError("เกิดข้อผิดพลาดด้านเครือข่ายในการลงทะเบียน กรุณาติดต่อผู้ดูแลระบบ");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-md w-full mx-auto my-8 glass-panel rounded-3xl p-8 shadow-2xl shadow-slate-900/10 border border-white/60 relative overflow-hidden backdrop-blur-2xl"
    >
      {/* Apple-style subtle ambient glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center space-y-3 mb-6 relative z-10">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex p-3.5 bg-gradient-to-tr from-slate-900 to-slate-800 text-brand-gold rounded-2xl shadow-lg border border-white/20 mb-1"
        >
          <GraduationCap className="w-8 h-8" />
        </motion.div>
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            4 Emperor Academy
          </h2>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
            Academic Testing & Video Portal
          </p>
        </div>
      </div>

      {/* Apple Segmented Control Tab Switcher */}
      <div className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 mb-6 flex relative z-10">
        <button
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError("");
            setSuccessMsg("");
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            isLogin ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {isLogin && (
            <motion.div
              layoutId="auth-tab"
              className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/80 -z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            เข้าสู่ระบบ
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsLogin(false);
            setError("");
            setSuccessMsg("");
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            !isLogin ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {!isLogin && (
            <motion.div
              layoutId="auth-tab"
              className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/80 -z-0"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            ลงทะเบียนนักเรียน
          </span>
        </button>
      </div>

      {/* Accordion Demo Credentials Box */}
      {isLogin && (
        <details className="group mb-6 bg-slate-50/90 border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-300">
          <summary className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 select-none list-none">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              บัญชีทดสอบระบบ (Demo Accounts)
            </span>
            <span className="text-[10px] text-blue-600 font-bold group-open:hidden">ดูข้อมูล</span>
            <span className="text-[10px] text-slate-400 font-bold hidden group-open:inline">ซ่อน</span>
          </summary>
          <div className="px-4 pb-3.5 pt-1.5 text-[11px] text-slate-600 border-t border-slate-200/60 bg-white/60">
            <div className="grid grid-cols-2 gap-2 font-mono mt-1">
              <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/60">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🧑‍🎓</span> นักเรียน:
                </p>
                <p className="mt-1 text-[10px]">User: <span className="text-blue-600 font-bold">student</span></p>
                <p className="text-[10px]">Pass: <span className="text-blue-600 font-bold">student123</span></p>
              </div>
              <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/60">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <span>👑</span> อาจารย์:
                </p>
                <p className="mt-1 text-[10px]">User: <span className="text-blue-600 font-bold">admin</span></p>
                <p className="text-[10px]">Pass: <span className="text-blue-600 font-bold">admin123</span></p>
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Error / Success Notifications */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mb-5 p-3.5 bg-rose-50/90 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mb-5 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700"
          >
            <UserCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        {!isLogin && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              ชื่อ - นามสกุลจริง
            </label>
            <input
              type="text"
              required
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="เช่น นายสมชาย ใจดี"
              className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
            />
          </motion.div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            ชื่อผู้ใช้งาน (Username)
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ระบุ username"
            className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-mono"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              รหัสผ่าน (Password)
            </label>
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            )}
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ระบุ password"
            className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg shadow-slate-900/20"
        >
          <span>{isLogin ? "เข้าสู่ระบบการทำงาน" : "ยืนยันการลงทะเบียน"}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </form>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/95 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80"
            >
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200/60">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  ลืมรหัสผ่านผู้เข้าสอบ?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  เนื่องจากระบบมีการเก็บบันทึกประวัติและผลการทดสอบอย่างเป็นทางการ กรุณาติดต่อฝ่ายทะเบียนวิชาการเพื่อรีเซ็ตรหัสผ่าน
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200/60">
                <p className="text-xs font-bold text-slate-700">ช่องทางติดต่อเจ้าหน้าที่:</p>
                <div className="flex items-center gap-3 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">Line Official Account</p>
                    <p className="font-mono text-slate-500">@EngExamTrainer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">ฝ่ายทะเบียนวิชาการ</p>
                    <p className="font-mono text-slate-500 font-bold">support@eng-trainer.com</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
