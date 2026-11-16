import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarCheck2,
  Sparkles,
  ClipboardCheck,
  Layers,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Flame,
  UserCheck,
  GraduationCap,
  Sparkle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavView =
  | 'dashboard'
  | 'syllabus'
  | 'planner'
  | 'calendar'
  | 'forge-ai'
  | 'practice'
  | 'flashcards'
  | 'materials'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  streakCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  streakCount = 3,
}) => {
  const { userProfile, isDemoMode, logout } = useAuth();

  const navItems: Array<{ id: NavView; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'syllabus', label: 'My Syllabus', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'planner', label: 'Study Planner', icon: <CalendarDays className="w-4 h-4" />, badge: 'AI' },
    { id: 'calendar', label: 'Calendar', icon: <CalendarCheck2 className="w-4 h-4" /> },
    { id: 'forge-ai', label: 'FORGE AI', icon: <Sparkles className="w-4 h-4 text-indigo-600" />, badge: 'Tutor' },
    { id: 'practice', label: 'Practice Tests', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" /> },
    { id: 'materials', label: 'Study Materials', icon: <FileText className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-neutral-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tracking-tight text-neutral-900 text-base">STUDYFORGE</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 tracking-wide">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-normal">Your AI Study Companion</p>
            </div>
          </div>
        </div>

        {/* Demo Mode Indicator Banner */}
        {isDemoMode && (
          <div className="mx-3.5 mt-3 px-3 py-2 bg-amber-50/80 border border-amber-200/80 rounded-lg flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Demo Mode Active
            </div>
            <span className="text-[10px] bg-amber-200/70 text-amber-950 font-semibold px-1.5 py-0.5 rounded">
              SAMPLE
            </span>
          </div>
        )}

        {/* Study Streak Badge */}
        <div className="mx-3.5 mt-3 mb-2 px-3 py-2.5 bg-neutral-50 border border-neutral-200/60 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-900">{streakCount} Days Streak</div>
              <div className="text-[11px] text-neutral-500">Study goals maintained</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50/90 text-indigo-700 shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-indigo-600' : 'text-neutral-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-neutral-200/70 space-y-1">
          <button
            onClick={() => {
              onSelectView('settings');
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === 'settings'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <Settings className="w-4 h-4 text-neutral-500" />
            <span>Settings</span>
          </button>

          {/* User profile card & Logout */}
          <div className="pt-2 mt-1 border-t border-neutral-100 flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center font-medium text-xs text-neutral-700 shrink-0 overflow-hidden">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userProfile?.fullName?.charAt(0) || 'S'
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 truncate">
                  {userProfile?.fullName || 'Student'}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {userProfile?.course || 'Undergraduate'}
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
