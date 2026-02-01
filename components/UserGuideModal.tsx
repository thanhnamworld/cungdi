import React, { useState, useRef, useEffect } from 'react';
import {
  X, HelpCircle, Clock, Play, CheckCircle2, XCircle, AlertCircle, Timer,
  Search, Navigation, Zap, Car, Ticket, Shield, Users,
  Settings, LayoutDashboard, ClipboardList, ShoppingBag, ArrowRight,
  ListChecks, FileText, User, Handshake, Gem, Trophy, Award, Heart, PlusCircle, CreditCard, Key,
  Download, Share, MoreVertical, PlusSquare, Smartphone, Globe
} from 'lucide-react';
import { Profile, UserRole } from '../types';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
}

// Reusable UI components for the guide
interface StatusBadgeProps {
  icon: React.ElementType;
  label: string;
  style: string;
  description: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ icon: Icon, label, style, description }) => (
  <div className="p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-lg transition-all duration-300 group">
    <div className="mb-3 flex justify-between items-center">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-bold ${style}`}>
        <Icon size={10} />
        {label}
      </div>
      <ArrowRight size={12} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
    </div>
    <p className="text-[10px] text-slate-600 leading-relaxed font-normal">{description}</p>
  </div>
);

const GuideSection = ({ title, description, icon: Icon, children, borderColor = 'border-emerald-500' }: {title: string, description: string, icon: React.ElementType, children?: React.ReactNode, borderColor?: string}) => (
  <section className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
    <div className={`flex items-start gap-4 border-l-4 ${borderColor} pl-5`}>
      <div className={`mt-1 p-2 rounded-xl bg-slate-100 ${borderColor.replace('border-', 'text-')}`}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        {description && <p className="text-xs font-normal text-slate-500 mt-1">{description}</p>}
      </div>
    </div>
    <div className="pl-14 space-y-4">
      {children}
    </div>
  </section>
);

const Step = ({ number, title, children }: {number: string | number, title: string, children?: React.ReactNode}) => (
  <div className="flex items-start gap-4">
    <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg">{number}</div>
    <div className="flex-1 pt-0.5">
      <h4 className="font-bold text-slate-800 text-sm mb-1">{title}</h4>
      <div className="text-xs text-slate-600 font-normal leading-relaxed space-y-2">{children}</div>
    </div>
  </div>
);

const TripStatusGuide = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: 'Chờ', icon: Clock, style: 'bg-amber-50 text-amber-500 border-amber-100', description: 'Chuyến xe vừa được đăng, còn nhiều thời gian (> 6 tiếng) để nhận khách.' },
        { label: 'Chuẩn bị', icon: Timer, style: 'bg-amber-50 text-amber-600 border-amber-100', description: 'Tự động kích hoạt khi còn 6 tiếng nữa khởi hành. Thẻ chuyến đi sẽ có viền Vàng.' },
        { label: 'Sát giờ', icon: AlertCircle, style: 'bg-rose-50 text-rose-600 border-rose-100', description: 'Tự động kích hoạt khi còn 1 tiếng nữa khởi hành. Thẻ chuyến đi có viền Đỏ khẩn cấp.' },
        { label: 'Đang chạy', icon: Play, style: 'bg-blue-50 text-blue-600 border-blue-100', description: 'Tự động kích hoạt khi đến giờ khởi hành. Chuyến xe bắt đầu di chuyển.' },
        { label: 'Hoàn thành', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 border-emerald-100', description: 'Tự động kích hoạt sau giờ dự kiến đến. Chuyến đi kết thúc, không nhận khách nữa.' },
        { label: 'Huỷ', icon: XCircle, style: 'bg-rose-50 text-rose-500 border-rose-100', description: 'Do tài xế hoặc quản trị viên chủ động hủy vì lý do khách quan.' },
      ].map((status, idx) => (
        <StatusBadge
          key={idx}
          icon={status.icon}
          label={status.label}
          style={status.style}
          description={status.description}
        />
      ))}
    </div>
);

const InstallGuideSection = () => {
  const [os, setOs] = useState<'android' | 'ios'>('android');

  return (
    <GuideSection title="Cài đặt ứng dụng (Lối tắt)" description="Thêm biểu tượng ra màn hình chính để truy cập nhanh như ứng dụng native." icon={Download} borderColor="border-purple-500">
      <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
        {/* OS Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-purple-100 w-fit mb-4 shadow-sm">
          <button 
            onClick={() => setOs('android')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${os === 'android' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Smartphone size={14} /> Android
          </button>
          <button 
            onClick={() => setOs('ios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${os === 'ios' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Smartphone size={14} /> iOS (iPhone)
          </button>
        </div>

        {os === 'android' ? (
          <div className="space-y-3">
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">1</div>
                <p className="text-xs text-slate-700 pt-1">Mở ứng dụng bằng trình duyệt <b className="text-slate-900">Chrome</b>.</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">2</div>
                <p className="text-xs text-slate-700 pt-1">Nhấn vào biểu tượng <b className="text-slate-900 inline-flex items-center gap-1 bg-slate-200 px-1 rounded"><MoreVertical size={10}/> Menu</b> (3 dấu chấm) ở góc trên bên phải.</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">3</div>
                <p className="text-xs text-slate-700 pt-1">Chọn <b className="text-purple-700">"Cài đặt ứng dụng"</b> hoặc <b className="text-purple-700">"Thêm vào màn hình chính"</b>.</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">4</div>
                <p className="text-xs text-slate-700 pt-1">Nhấn <b className="text-slate-900">Thêm</b> để hoàn tất.</p>
             </div>
          </div>
        ) : (
          <div className="space-y-3">
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">1</div>
                <p className="text-xs text-slate-700 pt-1">Mở ứng dụng bằng trình duyệt <b className="text-slate-900">Safari</b>.</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">2</div>
                <p className="text-xs text-slate-700 pt-1">Nhấn vào biểu tượng <b className="text-slate-900 inline-flex items-center gap-1 bg-slate-200 px-1 rounded"><Share size={10}/> Chia sẻ</b> ở thanh công cụ dưới cùng.</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">3</div>
                <p className="text-xs text-slate-700 pt-1">Cuộn xuống và chọn <b className="text-purple-700 inline-flex items-center gap-1"><PlusSquare size={10}/> Thêm vào MH chính</b> (Add to Home Screen).</p>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shadow-sm shrink-0">4</div>
                <p className="text-xs text-slate-700 pt-1">Nhấn <b className="text-slate-900">Thêm</b> (Add) ở góc trên bên phải.</p>
             </div>
          </div>
        )}
      </div>
    </GuideSection>
  );
};

// --- Role-specific Content ---
const UserContent = () => (
  <div className="space-y-10">
    <GuideSection title="Dành cho Hành khách" description="Tìm kiếm chuyến đi phù hợp hoặc đăng tin tìm xe nhanh chóng." icon={Users} borderColor="border-sky-500">
      <Step number={1} title="Tìm kiếm & Lọc chuyến xe">
        <p>Tại tab <b className="text-emerald-600">"Chuyến xe có sẵn"</b>, bạn có thể tìm các chuyến do tài xế đăng. Thanh tìm kiếm hỗ trợ tìm theo địa điểm (cả không dấu), mã chuyến, tên tài xế.</p>
        <p>Sử dụng các bộ lọc <b className="text-slate-700">Trạng thái, Điểm đi, Điểm đến</b> để thu hẹp kết quả. Nút <b className="text-slate-700">Sắp xếp</b> giúp bạn ưu tiên chuyến xe theo thời gian hoặc giá cả.</p>
      </Step>
      <Step number={2} title="Đặt chỗ">
        <p>Sau khi chọn chuyến ưng ý, nhấn nút <b className="text-blue-600">"Đặt chỗ ngay"</b>. Một cửa sổ sẽ hiện ra để bạn điền thông tin chi tiết:</p>
        <ul className="list-disc list-inside text-xs space-y-1 pl-2">
            <li><b className="text-slate-800">Điểm đón/trả mong muốn:</b> Ghi rõ địa chỉ cụ thể để tài xế tiện liên lạc.</li>
            <li><b className="text-slate-800">Số lượng vé:</b> Chọn số ghế bạn cần.</li>
            <li><b className="text-slate-800">Lời nhắn:</b> Ghi chú thêm nếu cần (VD: có hành lý, có trẻ em...).</li>
        </ul>
        <p>Đơn hàng của bạn sẽ ở trạng thái <b className="text-amber-600">"Chờ duyệt"</b> và được chuyển đến tài xế.</p>
      </Step>
      <Step number={3} title="Đăng yêu cầu tìm xe">
        <p>Nếu không có chuyến nào phù hợp, chuyển sang tab <b className="text-orange-600">"Yêu cầu chuyến xe"</b> và nhấn nút <b className="text-orange-600">"Đăng yêu cầu mới"</b>.</p>
        <p>Điền đầy đủ thông tin về lộ trình, thời gian, số lượng người. Mục <b className="text-slate-800">"Ngân sách dự kiến"</b> cho phép bạn đặt mức giá mong muốn hoặc chọn <b className="text-orange-600">"Giá thoả thuận"</b> để tài xế tự đề xuất giá.</p>
        <p>Các tài xế có lộ trình tương tự sẽ thấy và liên hệ với bạn.</p>
      </Step>
       <Step number={4} title="Quản lý & Theo dõi">
        <p>Tất cả các chuyến bạn đã đặt hoặc các yêu cầu bạn đã đăng được quản lý tại tab <b className="text-indigo-600">"Yêu cầu"</b> (Menu &gt; Yêu cầu). Tại đây bạn có thể theo dõi trạng thái đơn hàng (đã được duyệt hay chưa) và có thể tự <b className="text-rose-600">hủy đơn</b> nếu cần.</p>
      </Step>
    </GuideSection>
    <GuideSection title="Cấp độ thành viên & Ưu đãi" description="Tích lũy chuyến đi để nâng hạng và nhận các đặc quyền hấp dẫn." icon={Gem} borderColor="border-sky-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusBadge icon={Award} label="Bạc" style="bg-slate-100 text-slate-500 border-slate-200" description="Giảm 10% khi đặt xe từ các Đối tác Ưu đãi." />
            <StatusBadge icon={Trophy} label="Vàng" style="bg-amber-50 text-amber-600 border-amber-100" description="Giảm 20% khi đặt xe từ các Đối tác Ưu đãi." />
            <StatusBadge icon={Gem} label="Kim Cương" style="bg-cyan-50 text-cyan-600 border-cyan-100" description="Giảm 30% khi đặt xe từ các Đối tác Ưu đãi." />
            <StatusBadge icon={Heart} label="Gia Đình" style="bg-rose-50 text-rose-600 border-rose-100" description="Ưu đãi đặc biệt giảm đến 80% chi phí." />
        </div>
        <p className="text-xs text-slate-600 pl-1">Lưu ý: Giảm giá chỉ áp dụng khi bạn đặt xe từ tài xế có huy hiệu <b className="text-amber-600 inline-flex items-center gap-1"><Handshake size={12}/> Đối tác Ưu đãi</b>.</p>
    </GuideSection>
    <InstallGuideSection />
  </div>
);

const DriverContent = () => (
    <div className="space-y-10">
    <GuideSection title="Dành cho Tài xế" description="Tối ưu hóa thu nhập bằng cách quản lý chuyến đi và nhận khách hiệu quả." icon={Car} borderColor="border-emerald-500">
      <Step number={1} title="Quản lý đội xe (Bắt buộc)">
        <p>Đây là bước đầu tiên và quan trọng nhất. Truy cập <b className="text-slate-700">Menu &gt; Hồ sơ &gt; Quản lý đội xe</b> để thêm thông tin các phương tiện bạn sở hữu.</p>
        <p>Mỗi xe cần có <b className="text-slate-800">Loại xe, Biển kiểm soát</b> và <b className="text-rose-600">bắt buộc phải có hình ảnh</b>. Hình ảnh sẽ được tự động cắt vuông và nén để tối ưu hiển thị.</p>
      </Step>
      <Step number={2} title="Đăng chuyến mới">
        <p>Nhấn nút <b className="text-slate-700">"Đăng tin"</b>, chọn chế độ <b className="text-indigo-600">"Có xe trống"</b>. Điền đầy đủ thông tin và chọn xe từ danh sách đã thêm ở bước 1.</p>
        <p>Tính năng <b className="text-slate-700">"Lịch đi định kỳ"</b> giúp bạn nhanh chóng tạo nhiều chuyến cho các tuyến cố định trong tuần mà không cần nhập lại.</p>
      </Step>
      <Step number={3} title="Nhận yêu cầu từ khách (2 cách)">
        <p><b className="text-slate-800">Cách 1 (Chủ động):</b> Truy cập tab <b className="text-orange-600">"Yêu cầu chuyến xe"</b>, nơi hiển thị các nhu cầu tìm xe từ hành khách. Nếu thấy lộ trình phù hợp, nhấn <b className="text-indigo-600">"Nhận chuyến ngay"</b> để gửi báo giá và thông tin xe của bạn cho khách.</p>
        <p><b className="text-slate-800">Cách 2 (Bị động):</b> Khách hàng sẽ tìm thấy chuyến xe bạn đã đăng (ở bước 2) và đặt chỗ trực tiếp. Yêu cầu của họ sẽ được chuyển đến bạn.</p>
      </Step>
    </GuideSection>
    <GuideSection title="Quản lý Vận hành" description="Xử lý đơn hàng, theo dõi chuyến đi và các logic tự động của hệ thống." icon={ListChecks} borderColor="border-emerald-500">
       <Step number="✅" title="Duyệt đơn & Logic trừ ghế">
          <p>Tất cả các yêu cầu đặt chỗ hoặc yêu cầu nhận chuyến của bạn đều tập trung tại tab <b className="text-slate-700">"Yêu cầu"</b>. Bạn có quyền <b className="text-emerald-600">Xác nhận</b> hoặc <b className="text-rose-600">Hủy</b> đơn hàng.</p>
          <p className="font-bold text-emerald-700">Logic quan trọng: Khi bạn "Xác nhận" một đơn, số ghế trống trên chuyến xe tương ứng sẽ tự động bị trừ đi. Nếu số ghế về 0, chuyến xe sẽ chuyển sang trạng thái "Đầy chỗ". Ngược lại, khi bạn "Hủy" một đơn đã xác nhận, số ghế sẽ được hoàn trả.</p>
       </Step>
       <Step number="⚙️" title="Vòng đời chuyến xe tự động">
           <p>Trạng thái chuyến xe của bạn sẽ tự động thay đổi theo thời gian thực để tối ưu việc tìm kiếm khách:</p>
            <TripStatusGuide />
       </Step>
       <Step number="⭐" title="Trở thành Đối tác Ưu đãi">
           <p>Trong <b className="text-slate-700">Hồ sơ</b>, bạn có thể bật chế độ <b className="text-amber-600">"Đối tác Ưu đãi"</b>. Khi bật, các hành khách có Cấp độ thành viên (Bạc, Vàng...) sẽ được tự động giảm giá khi đặt chuyến của bạn, giúp thu hút nhiều khách hàng hơn.</p>
       </Step>
    </GuideSection>
    <InstallGuideSection />
  </div>
);

const StaffContent = ({ role }: { role: 'manager' | 'admin' }) => (
    <div className="space-y-10">
    <GuideSection title={role === 'admin' ? "Dành cho Quản trị viên" : "Dành cho Điều phối viên"} description="Giám sát, điều phối và quản lý toàn bộ hoạt động của hệ thống." icon={LayoutDashboard} borderColor={role === 'admin' ? 'border-rose-500' : 'border-indigo-500'}>
      <Step number={1} title="Bảng điều khiển (Thống kê)">
         <p>Truy cập <b className="text-slate-800">Menu &gt; Thống kê</b>. Cung cấp cái nhìn tổng quan về các chỉ số quan trọng: <b className="text-slate-800">Doanh thu, Chuyến xe, Đơn hàng, Hiệu suất xe</b>. Biểu đồ giúp theo dõi tăng trưởng và hiệu quả hoạt động theo thời gian.</p>
      </Step>
      <Step number={2} title="Quản lý Chuyến xe">
         <p>Tại <b className="text-slate-800">Menu &gt; Chuyến xe</b>, bạn có thể xem tất cả các chuyến xe (cả tin đăng tìm khách và tin đăng tìm xe) trong hệ thống. Bạn có quyền xem chi tiết và thay đổi trạng thái của bất kỳ chuyến nào (VD: Hủy một chuyến xe gặp sự cố).</p>
      </Step>
      <Step number={3} title="Quản lý Yêu cầu">
         <p>Tab <b className="text-slate-800">"Yêu cầu"</b> là trung tâm quản lý tất cả các đơn hàng. Bạn có thể lọc đơn theo nhiều tiêu chí và có toàn quyền thay đổi trạng thái của bất kỳ đơn hàng nào để hỗ trợ tài xế và hành khách.</p>
         <p>Tính năng <b className="text-indigo-600">"Đặt hộ"</b> & <b className="text-indigo-600">"Giao chuyến"</b> cho phép bạn thay mặt một thành viên đã có trong hệ thống để đặt vé hoặc gán một yêu cầu tìm xe cho một tài xế cụ thể, rất hữu ích khi hỗ trợ qua điện thoại.</p>
      </Step>
    </GuideSection>
    {role === 'admin' && (
      <GuideSection title="Quản trị Hệ thống (Admin)" description="Quản lý người dùng và các thiết lập cấp cao của hệ thống." icon={Shield} borderColor="border-rose-500">
          <Step number="👤" title="Quản lý người dùng">
            <p>Tab <b className="text-rose-600">"Thành viên"</b> là nơi quản lý toàn bộ tài khoản. Bạn có thể:</p>
            <ul className="list-disc list-inside text-xs space-y-1 pl-2">
                <li>Tìm kiếm và lọc người dùng theo nhiều tiêu chí.</li>
                <li>Thay đổi <b className="text-slate-800">Quyền hạn</b> (VD: nâng cấp thành viên lên tài xế).</li>
                <li>Thay đổi <b className="text-slate-800">Cấp độ thành viên</b>.</li>
                <li>Bật/Tắt chế độ <b className="text-amber-600">Đối tác Ưu đãi</b> cho tài xế.</li>
                <li>Sử dụng <b className="text-indigo-600">Hành động hàng loạt</b> để cập nhật nhiều người dùng cùng lúc.</li>
                <li><b className="text-rose-600">Xóa</b> người dùng khỏi hệ thống.</li>
            </ul>
          </Step>
          <Step number="🔑" title="Cấp lại mật khẩu">
             <p>Trong bảng quản lý người dùng, bạn có thể nhấn vào biểu tượng <b className="text-amber-600"><Key size={12}/></b> để lấy <b className="text-slate-800">User ID</b> của người dùng. Dùng ID này trong trang quản trị <b className="text-indigo-600">Supabase Auth</b> để đặt lại mật khẩu cho họ khi cần.</p>
          </Step>
      </GuideSection>
    )}
    <InstallGuideSection />
  </div>
);


const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, profile }) => {
  const userRole = profile?.role || 'user';
  // Admin sees all tabs, others see content relevant to their roles up to their level
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isDriver = userRole === 'driver';

  const [activeTab, setActiveTab] = useState(userRole);
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const container = tabsContainerRef.current;
    const thumb = scrollbarThumbRef.current;
    if (container && thumb) {
      if (container.scrollWidth <= container.clientWidth) {
        thumb.style.width = '100%';
        thumb.style.left = '0%';
        return;
      }
      const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
      const thumbWidth = (container.clientWidth / container.scrollWidth) * 100;
      const thumbLeft = scrollPercentage * (100 - thumbWidth);

      thumb.style.width = `${thumbWidth}%`;
      thumb.style.left = `${thumbLeft}%`;
    }
  };

  useEffect(() => {
    const updateScrollbar = () => {
        setTimeout(() => handleScroll(), 50);
    };
    if(isOpen) {
      updateScrollbar();
      window.addEventListener('resize', updateScrollbar);
    }
    return () => window.removeEventListener('resize', updateScrollbar);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
    // For non-admins, show their specific guide directly
    if (!isAdmin && !isManager && !isDriver) return <UserContent />;
    if (!isAdmin && !isManager && isDriver) return <DriverContent />;
    if (!isAdmin && isManager) {
        switch (activeTab) {
            case 'user': return <UserContent />;
            case 'driver': return <DriverContent />;
            case 'manager': return <StaffContent role="manager" />;
            default: return <StaffContent role="manager" />;
        }
    }
    
    // For admin, allow switching
    switch (activeTab) {
      case 'user': return <UserContent />;
      case 'driver': return <DriverContent />;
      case 'manager': return <StaffContent role="manager" />;
      case 'admin': return <StaffContent role="admin" />;
      default: return <StaffContent role="admin" />;
    }
  };

  const getRoleInfo = (role: UserRole) => {
    switch(role) {
      case 'user': return { label: 'Hành khách', icon: Users, color: 'text-sky-600' };
      case 'driver': return { label: 'Tài xế', icon: Car, color: 'text-emerald-600' };
      case 'manager': return { label: 'Điều phối', icon: Settings, color: 'text-indigo-600' };
      case 'admin': return { label: 'Quản trị', icon: Shield, color: 'text-rose-600' };
      default: return { label: 'Hành khách', icon: Users, color: 'text-sky-600' };
    }
  };
  
  // Determine which tabs to show
  const visibleRoles: UserRole[] = [];
  if (isAdmin) {
      visibleRoles.push('admin', 'manager', 'driver', 'user');
  } else if (isManager) {
      visibleRoles.push('manager', 'driver', 'user');
  } else if (isDriver) {
      visibleRoles.push('driver', 'user');
  }
  
  const showTabs = isAdmin || isManager || isDriver;
  const singleRoleInfo = getRoleInfo(userRole);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="bg-slate-50 w-full h-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-100 p-6 flex flex-col shrink-0">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <HelpCircle size={20} />
                  </div>
                  <div>
                  <h2 className="font-bold text-slate-800">Hướng dẫn</h2>
                  <p className="text-xs text-slate-400">{showTabs ? 'Theo vai trò' : `Dành cho ${singleRoleInfo.label}`}</p>
                  </div>
              </div>

              {showTabs ? (
                <>
                  {/* Desktop: Vertical List */}
                  <nav className="hidden md:flex flex-col gap-1.5 flex-1">
                    {visibleRoles.map(role => {
                        const { label, icon: Icon, color } = getRoleInfo(role);
                        const isActive = activeTab === role;
                        return (
                          <button 
                              key={role} 
                              onClick={() => setActiveTab(role)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left text-xs font-bold whitespace-nowrap ${isActive ? `bg-emerald-50 text-emerald-600 shadow-sm` : `text-slate-500 hover:bg-slate-100 hover:text-slate-800`}`}
                          >
                              <Icon size={16} className={isActive ? color : 'text-slate-400'} />
                              {label}
                          </button>
                        );
                    })}
                  </nav>

                  {/* Mobile: Horizontal Pill Scroll */}
                  <div className="md:hidden">
                    <div 
                      ref={tabsContainerRef} 
                      onScroll={handleScroll} 
                      className="flex gap-2 overflow-x-auto" 
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      {visibleRoles.map(role => {
                          const { label, icon: Icon, color } = getRoleInfo(role);
                          const isActive = activeTab === role;
                          return (
                            <button 
                              key={role} 
                              onClick={() => setActiveTab(role)}
                              className={`px-4 py-2.5 rounded-xl transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2 border ${isActive ? `bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200` : `bg-white text-slate-500 border-slate-200`}`}
                            >
                              <Icon size={14} />
                              {label}
                            </button>
                          );
                      })}
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 relative overflow-hidden">
                      <div ref={scrollbarThumbRef} className="h-full bg-slate-800 rounded-full absolute top-0"></div>
                    </div>
                  </div>
                </>
              ) : (
                  <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-600 shadow-sm`}>
                      <singleRoleInfo.icon size={16} className={singleRoleInfo.color} />
                      {singleRoleInfo.label}
                  </div>
              )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {renderContent()}
            </main>
        </div>
        
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default UserGuideModal;
