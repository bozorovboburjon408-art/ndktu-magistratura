import React, { useState } from 'react';
import { User, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { AssessorWorkbench } from './components/AssessorWorkbench';
import { DepartmentHeadPanel } from './components/DepartmentHeadPanel';
import { AppealCommissionView } from './components/AppealCommissionView';
import { LivePresentationRoom } from './components/LivePresentationRoom';
import { AuditTrailView } from './components/AuditTrailView';

import { LocalDatabase } from './services/localDatabase';
import { ToastContainer } from './components/ToastContainer';
import { NotificationService } from './services/notificationService';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('talaba');
  const [activeTab, setActiveTab] = useState<string>('portal');
  const [isLiveRoomOpen, setIsLiveRoomOpen] = useState<boolean>(false);

  // LocalDatabase'dan roliga mos foydalanuvchini olish
  const dbUsers = LocalDatabase.getUsers();
  const currentUser: User = dbUsers.find(u => u.role === currentRole) || {
    id: 1,
    username: 'talaba1',
    full_name: 'Bozorov Bobur Qudrat o‘g‘li',
    role: currentRole,
    specialty: '70610101 – Kompyuter tizimlari va dasturiy injiniring',
    course_year: 2,
    hemis_id: '3842100451'
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setActiveTab('portal');
    setIsLiveRoomOpen(false);
    const targetUser = dbUsers.find(u => u.role === role);
    NotificationService.info(
      "Rol almashtirildi",
      `${targetUser ? targetUser.full_name : role} kabinetiga o'tildi`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Real-vaqt bildirishnomalari va chiroyli ovozli signallar */}
      <ToastContainer />
      
      {/* Yuqori Menyu va Rol Almashtirgich */}
      <Navbar
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Asosiy Kontent */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Agar Audit jurnali tanlansa */}
        {activeTab === 'audit' ? (
          <AuditTrailView user={currentUser} />
        ) : isLiveRoomOpen ? (
          /* 5 Daqiqalik Jonli Taqdimot Xonasi */
          <LivePresentationRoom
            user={currentUser}
            onBack={() => setIsLiveRoomOpen(false)}
          />
        ) : (
          /* Rollar bo'yicha Shaxsiy Kabinetlar */
          <>
            {currentRole === 'talaba' && (
              <StudentPortal
                user={currentUser}
                onOpenLiveSession={() => setIsLiveRoomOpen(true)}
              />
            )}

            {currentRole === 'ilmiy_rahbar' && (
              <AssessorWorkbench user={currentUser} />
            )}

            {currentRole === 'baholovchi' && (
              <AssessorWorkbench user={currentUser} />
            )}

            {currentRole === 'kafedra_mudiri' && (
              <DepartmentHeadPanel user={currentUser} />
            )}

            {currentRole === 'apellatsiya' && (
              <AppealCommissionView user={currentUser} />
            )}

            {currentRole === 'administrator' && (
              <AuditTrailView user={currentUser} />
            )}

            {currentRole === 'auditor' && (
              <AuditTrailView user={currentUser} />
            )}
          </>
        )}

      </main>

      {/* Rasmiy Pastki Qism (Footer) */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            Magistratura Talabalarining Semestrlik Monitoringi va Baholash Platformasi
          </p>
          <p>
            O‘zbekiston Respublikasi Vazirlar Mahkamasining 2015-yil 2-martdagi 36-son qarori (2026-yil 30-iyundagi 353-son tahriri) asosida ishlab chiqilgan.
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Barcha ma’lumotlar O‘zbekiston Respublikasi hududidagi serverlarda saqlanadi (O‘RQ-547).
          </p>
        </div>
      </footer>

    </div>
  );
};
export default App;
