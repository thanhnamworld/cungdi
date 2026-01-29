
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Bell, Search, Filter, CheckCircle2, AlertCircle, Info, 
  Trash2, MailOpen, Clock, CalendarDays, Car, Ticket, Shield, 
  ChevronRight, ArrowRight, Layers, LayoutGrid, Ghost
} from 'lucide-react';
import { Notification, NotificationCategory } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ 
  isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onClearAll 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'ALL'>('ALL');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           n.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || n.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [notifications, searchTerm, categoryFilter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  const getCategoryConfig = (category: NotificationCategory) => {
    switch (category) {
      case 'TRIP': return { icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Chuyến xe' };
      case 'ORDER': return { icon: Ticket, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Yêu cầu' };
      case 'SYSTEM': return { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Hệ thống' };
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-[85vh] animate-in zoom-in-95 duration-300">
        <div 
          ref={modalRef}
          className="bg-white w-full h-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white relative"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100 shrink-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Thông báo của bạn</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {unreadCount > 0 ? `Bạn có ${unreadCount} tin chưa đọc` : 'Không có tin nhắn mới'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onMarkAllRead}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <MailOpen size={20} />
                </button>
                <button 
                  onClick={onClearAll}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Xóa tất cả"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm từ khóa trong thông báo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-bold text-slate-800 text-sm shadow-inner"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-hide">
                {[
                  { id: 'ALL', label: 'Tất cả', icon: Layers },
                  { id: 'TRIP', label: 'Chuyến xe', icon: Car },
                  { id: 'ORDER', label: 'Yêu cầu', icon: Ticket },
                  { id: 'SYSTEM', label: 'Hệ thống', icon: Shield }
                ].map(cat => {
                  const Icon = cat.icon;
                  const isActive = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                        isActive 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
                      }`}
                    >
                      <Icon size={14} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((n) => {
                const catConfig = getCategoryConfig(n.category);
                const CatIcon = catConfig.icon;
                return (
                  <div 
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      !n.read 
                        ? 'bg-white border-emerald-100 shadow-md ring-1 ring-emerald-50' 
                        : 'bg-white/60 border-slate-100 hover:bg-white hover:border-emerald-200'
                    }`}
                  >
                    {!n.read && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500"></div>
                    )}
                    
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${catConfig.bg} ${catConfig.color} ${catConfig.bg.replace('bg-', 'border-')}`}>
                        <CatIcon size={24} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-black tracking-tight truncate ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                            {n.title}
                          </h4>
                          <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${
                            n.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            n.type === 'warning' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {n.type}
                          </div>
                        </div>
                        
                        <p className={`text-[11px] font-medium leading-relaxed mb-3 ${!n.read ? 'text-slate-700' : 'text-slate-400'}`}>
                          {n.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                              <Clock size={10} />
                              {new Date(n.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                              <CalendarDays size={10} />
                              {new Date(n.timestamp).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                            Xem chi tiết <ArrowRight size={10} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20">
                <div className="p-6 bg-slate-50 rounded-full mb-4">
                  <Ghost size={64} strokeWidth={1} />
                </div>
                <p className="text-sm font-black uppercase tracking-widest">Không có thông báo nào</p>
                <p className="text-[10px] font-bold mt-1 text-slate-400 italic">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              </div>
            )}
          </div>
        </div>
        {/* Nút đóng (X) - Đưa ra phía ngoài viền giống các Modal khác */}
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[510] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;
