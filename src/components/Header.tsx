import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Coffee,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenPomodoro: () => void;
  isPomodoroActive?: boolean;
  pomodoroTimeLeft?: string;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenPomodoro,
  isPomodoroActive = false,
  pomodoroTimeLeft = '25:00',
  onSearchClick,
}) => {
  const { userProfile, isDemoMode } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const mockNotifications = [
    {
      id: '1',
      title: 'Next Study Session in 45m',
      desc: 'Engineering Mathematics-II (Higher Order ODEs)',
      time: 'Just now',
      unread: true,
    },
    {
      id: '2',
      title: 'Examination Reminder',
      desc: 'Maths-II final exam is in 11 days. Revision plan ready.',
      time: '2h ago',
      unread: false,
    },
    {
      id: '3',
      title: 'Hydration & Rest Check',
      desc: 'Remember your 8-hour sleep schedule target tonight.',
      time: '5h ago',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-neutral-200">
      {/* Left section: Hamburger & Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 text-neutral-600 rounded-lg lg:hidden hover:bg-neutral-100 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            <span>{greeting}, {userProfile?.fullName?.split(' ')[0] || 'Student'}</span>
            <span className="hidden sm:inline-block text-xs font-normal text-neutral-400">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-normal text-neutral-500">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {formattedDate}
            </span>
          </h1>
        </div>
      </div>

      {/* Right section: Search, Pomodoro Timer, Notifications & Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer w-48"
        >
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <span>Quick search topics...</span>
          <kbd className="ml-auto text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-400 font-mono">
            /
          </kbd>
        </button>

        {/* Pomodoro Focus Companion */}
        <button
          onClick={onOpenPomodoro}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isPomodoroActive
              ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
              : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
          }`}
          title="Open Focus & Break Timer"
        >
          <Clock className={`w-3.5 h-3.5 ${isPomodoroActive ? 'text-rose-600' : 'text-neutral-500'}`} />
          <span className="font-mono">{pomodoroTimeLeft}</span>
          <span className="hidden sm:inline text-[11px] text-neutral-500">Focus</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">Notifications & Reminders</span>
                <span className="text-[10px] text-indigo-600 font-medium">Mark read</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto">
                {mockNotifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-medium text-neutral-900">{n.title}</div>
                      <span className="text-[10px] text-neutral-400 shrink-0">{n.time}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{n.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-medium text-xs">
            {userProfile?.fullName?.charAt(0) || 'S'}
          </div>
        </div>
      </div>
    </header>
  );
};
