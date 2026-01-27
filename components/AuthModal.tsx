
import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Phone, Loader2, LogIn, UserPlus, Smartphone, History, Trash2, ArrowRight, KeyRound, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RECENT_LOGINS_KEY = 'tripease_recent_logins';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // view: 'login' | 'register' | 'forgot'
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [recentLogins, setRecentLogins] = useState<string[]>([]);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_LOGINS_KEY);
    if (saved) {
      try {
        setRecentLogins(JSON.parse(saved));
      } catch (e) {
        setRecentLogins([]);
      }
    }
  }, [isOpen]);

  const saveToRecent = (val: string) => {
    // Chỉ lưu nếu giá trị hợp lệ
    if (!val || val.trim().length < 3) return;
    const updated = [val, ...recentLogins.filter(i => i !== val)].slice(0, 3);
    setRecentLogins(updated);
    localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(updated));
  };

  const removeRecent = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentLogins.filter(i => i !== val);
    setRecentLogins(updated);
    localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(updated));
  };

  const handleSelectRecent = (val: string) => {
    setIdentifier(val);
    // Focus vào ô mật khẩu sau khi chọn
    setTimeout(() => {
        if (passwordInputRef.current) {
            passwordInputRef.current.focus();
        }
    }, 100);
  };

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setLoading(false);
  };

  if (!isOpen) return null;

  const isEmail = (val: string) => val.includes('@');

  const formatPhoneNumber = (phoneStr: string) => {
    let cleaned = phoneStr.trim().replace(/\s/g, '');
    if (cleaned.startsWith('0')) return '+84' + cleaned.substring(1);
    if (!cleaned.startsWith('+')) return '+84' + cleaned;
    return cleaned;
  };

  const handleAuth = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const isMail = isEmail(identifier);
      const finalIdentifier = isMail ? identifier.trim() : formatPhoneNumber(identifier);

      if (view === 'forgot') {
        if (!isMail) {
            throw new Error('Vui lòng nhập địa chỉ Email để khôi phục mật khẩu.');
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(finalIdentifier, {
            redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Đã gửi email khôi phục! Vui lòng kiểm tra hộp thư (cả mục Spam).');
        setLoading(false);
        return;
      }

      if (view === 'login') {
        const credentials = isMail 
          ? { email: finalIdentifier, password } 
          : { phone: finalIdentifier, password };
        
        const { error: authError } = await supabase.auth.signInWithPassword(credentials);
        if (authError) throw authError;
        
        saveToRecent(identifier);
      } else {
        const signUpData = isMail
          ? { email: finalIdentifier, password, options: { data: { full_name: fullName } } }
          : { phone: finalIdentifier, password, options: { data: { full_name: fullName, phone: identifier } } };

        const { error: authError } = await supabase.auth.signUp(signUpData);
        if (authError) throw authError;
        
        if (isMail) alert('Vui lòng kiểm tra email để xác nhận!');
        else {
          alert('Đăng ký thành công!');
          saveToRecent(identifier);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('E.164')) errorMsg = 'Số điện thoại không đúng định dạng.';
      else if (errorMsg.includes('Invalid login credentials')) errorMsg = 'Thông tin đăng nhập không chính xác.';
      else if (errorMsg.includes('User not found')) errorMsg = 'Tài khoản không tồn tại.';
      setError(errorMsg || 'Đã có lỗi xảy ra.');
    } finally {
      if (view !== 'forgot') setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-[400px] rounded-[32px] shadow-2xl overflow-visible border border-slate-100 animate-in zoom-in-95 duration-300 relative">
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <div className="pt-10 pb-6 px-8 text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100 shadow-sm">
            <div className="w-7 h-7 rounded-full border-4 border-indigo-600 relative flex items-center justify-center">
               {view === 'forgot' ? (
                 <KeyRound size={16} className="text-indigo-600" />
               ) : (
                 <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white"></div>
               )}
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {view === 'forgot' ? 'Khôi phục mật khẩu' : 'Chào mừng tới Cùng đi'}
          </h3>
          <p className="text-slate-500 text-[11px] mt-2 font-normal uppercase tracking-wider">
            {view === 'forgot' ? 'Nhập email để nhận hướng dẫn' : 'Hệ thống xe tiện chuyến thông minh'}
          </p>
        </div>

        {view !== 'forgot' && (
            <div className="flex px-8 mb-6 relative">
            <button 
                type="button"
                onClick={() => { setView('login'); resetState(); }}
                className={`flex-1 py-3 text-sm font-bold transition-all relative z-10 ${view === 'login' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Đăng nhập
                {view === 'login' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full animate-in slide-in-from-left-2"></div>}
            </button>
            <button 
                type="button"
                onClick={() => { setView('register'); resetState(); }}
                className={`flex-1 py-3 text-sm font-bold transition-all relative z-10 ${view === 'register' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Đăng ký
                {view === 'register' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full animate-in slide-in-from-right-2"></div>}
            </button>
            <div className="absolute bottom-0 left-8 right-8 h-px bg-slate-100"></div>
            </div>
        )}

        <form onSubmit={handleAuth} className="px-8 pb-10 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-normal text-center flex items-center justify-center gap-2">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {/* Recent Logins Suggestion */}
          {view === 'login' && recentLogins.length > 0 && !identifier && (
            <div className="mb-4 animate-in slide-in-from-top-2 fade-in">
              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <History size={10} /> Đăng nhập gần đây
              </p>
              <div className="space-y-2">
                {recentLogins.map((loginId) => {
                  const isMail = isEmail(loginId);
                  return (
                    <div 
                      key={loginId} 
                      onClick={() => handleSelectRecent(loginId)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md hover:border-indigo-100 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMail ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {isMail ? <Mail size={14} /> : <Phone size={14} />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{loginId}</span>
                      </div>
                      <button 
                        onClick={(e) => removeRecent(loginId, e)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa khỏi danh sách"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-normal text-slate-400 ml-1">
                {view === 'forgot' ? 'Email đăng ký' : 'Tài khoản (Email / SĐT)'}
            </label>
            <input 
              type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              placeholder={view === 'forgot' ? "nhap@email.com" : ""}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none font-normal text-slate-800 transition-all text-sm"
            />
          </div>

          {view !== 'forgot' && (
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-[11px] font-normal text-slate-400 ml-1">Mật khẩu</label>
                    {view === 'login' && (
                        <button type="button" onClick={() => { setView('forgot'); resetState(); setIdentifier(''); }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                            Quên mật khẩu?
                        </button>
                    )}
                </div>
                <input 
                ref={passwordInputRef}
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none font-normal text-slate-800 transition-all text-sm"
                />
            </div>
          )}

          {view === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-normal text-slate-400 ml-1">Họ và tên</label>
              <input 
                type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ tên của bạn..."
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none font-normal text-slate-800 transition-all text-sm"
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className={`w-full py-4 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] mt-6 ${view === 'forgot' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (view === 'login' ? 'Đăng nhập ngay' : view === 'register' ? 'Tạo tài khoản' : 'Gửi email khôi phục')}
            {!loading && <ArrowRight size={16} />}
          </button>

          {view === 'forgot' && (
             <button type="button" onClick={() => { setView('login'); resetState(); }} className="w-full py-2 text-slate-500 font-bold text-xs hover:text-slate-800">
                Quay lại đăng nhập
             </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
