import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { PomodoroTimer } from './components/PomodoroTimer';
import { DashboardView } from './views/DashboardView';
import { SyllabusView } from './views/SyllabusView';
import { StudyPlannerView } from './views/StudyPlannerView';
import { CalendarView } from './views/CalendarView';
import { ForgeAiView } from './views/ForgeAiView';
import { PracticeTestsView } from './views/PracticeTestsView';
import { FlashcardsView } from './views/FlashcardsView';
import { StudyMaterialsView } from './views/StudyMaterialsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { Subject, StudySession, QuizAttempt } from './types';
import { getSubjects, getStudySessions, getQuizAttempts } from './services/db';

function MainApp() {
  const { currentUser, userProfile, loading, isDemoMode } = useAuth();

  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState('25:00');
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);

  // Application Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [initialAiTopic, setInitialAiTopic] = useState('');
  const [initialAiSubject, setInitialAiSubject] = useState('');

  // Quick Search Dialog state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = async () => {
    if (!userProfile?.uid) return;
    try {
      const [fetchedSubjs, fetchedSessions, fetchedQuizzes] = await Promise.all([
        getSubjects(userProfile.uid),
        getStudySessions(userProfile.uid),
        getQuizAttempts(userProfile.uid),
      ]);
      setSubjects(fetchedSubjs);
      setSessions(fetchedSessions);
      setQuizAttempts(fetchedQuizzes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    if (userProfile?.uid) {
      refreshData();
    }
  }, [userProfile?.uid]);

  // Global hotkey: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center animate-pulse mb-3 font-bold text-sm">
          SF
        </div>
        <p className="text-xs font-semibold text-neutral-900 tracking-tight">STUDYFORGE AI</p>
        <p className="text-[11px] text-neutral-400 mt-1">Connecting to academic workspace...</p>
      </div>
    );
  }

  // 2. Unauthenticated state (No Firebase user and Demo mode not active)
  if (!currentUser && !isDemoMode) {
    return <AuthModal onSuccess={() => refreshData()} />;
  }

  // 3. User logged in, but has not completed onboarding
  if (userProfile && !userProfile.onboardingCompleted && !isDemoMode) {
    return (
      <OnboardingModal
        onComplete={() => {
          refreshData();
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // Helper to open FORGE AI directly with topic
  const handleOpenForgeAiWithTopic = (topic: string, subject: string) => {
    setInitialAiTopic(topic);
    setInitialAiSubject(subject);
    setCurrentView('forge-ai');
  };

  // Helper to start practice test on topic
  const handlePracticeTopic = (topic: string, subject: string) => {
    setInitialAiTopic(topic);
    setInitialAiSubject(subject);
    setCurrentView('practice');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-neutral-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v);
          setMobileSidebarOpen(false);
        }}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        streakCount={4}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Top Header */}
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenPomodoro={() => setPomodoroOpen(true)}
          isPomodoroActive={isPomodoroActive}
          pomodoroTimeLeft={pomodoroTimeLeft}
          onSearchClick={() => setSearchOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && (
            <DashboardView
              subjects={subjects}
              sessions={sessions}
              onRefreshSessions={refreshData}
              onNavigate={(v) => setCurrentView(v)}
              onOpenStudyTopic={handleOpenForgeAiWithTopic}
            />
          )}

          {currentView === 'syllabus' && (
            <SyllabusView
              subjects={subjects}
              onRefreshSubjects={refreshData}
              onAskForgeAi={handleOpenForgeAiWithTopic}
              onPracticeTopic={handlePracticeTopic}
            />
          )}

          {currentView === 'planner' && (
            <StudyPlannerView
              sessions={sessions}
              subjects={subjects}
              onRefreshSessions={refreshData}
              onOpenTopicInForgeAi={handleOpenForgeAiWithTopic}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView subjects={subjects} sessions={sessions} />
          )}

          {currentView === 'forge-ai' && (
            <ForgeAiView
              subjects={subjects}
              initialTopic={initialAiTopic}
              initialSubject={initialAiSubject}
            />
          )}

          {currentView === 'practice' && (
            <PracticeTestsView
              subjects={subjects}
              initialTopic={initialAiTopic}
              initialSubject={initialAiSubject}
              onNavigateToRevision={(topic) => handleOpenForgeAiWithTopic(topic, '')}
            />
          )}

          {currentView === 'flashcards' && <FlashcardsView subjects={subjects} />}

          {currentView === 'materials' && <StudyMaterialsView subjects={subjects} />}

          {currentView === 'analytics' && (
            <AnalyticsView
              subjects={subjects}
              sessions={sessions}
              quizAttempts={quizAttempts}
            />
          )}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Focus / Pomodoro Modal */}
      <PomodoroTimer
        isOpen={pomodoroOpen}
        onClose={() => setPomodoroOpen(false)}
        onTimerTick={(time, running) => {
          setPomodoroTimeLeft(time);
          setIsPomodoroActive(running);
        }}
      />

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-900/40 backdrop-blur-xs p-4 pt-20">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
            <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, subjects, study sessions..."
                className="w-full px-3 py-1.5 text-sm bg-transparent focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs px-2"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 divide-y divide-neutral-100 text-xs">
              {subjects
                .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentView('syllabus');
                      setSearchOpen(false);
                    }}
                    className="w-full p-2.5 text-left hover:bg-neutral-50 rounded-lg flex items-center justify-between"
                  >
                    <span className="font-semibold text-neutral-900">{s.name}</span>
                    <span className="text-[10px] text-neutral-400">{s.units.length} Units</span>
                  </button>
                ))}
              {sessions
                .filter((s) => s.topic.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 5)
                .map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setCurrentView('planner');
                      setSearchOpen(false);
                    }}
                    className="w-full p-2.5 text-left hover:bg-neutral-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900">{session.topic}</div>
                      <div className="text-[10px] text-neutral-400">{session.subjectName}</div>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500">{session.date}</span>
                  </button>
                ))}
              {searchQuery && (
                <button
                  onClick={() => {
                    handleOpenForgeAiWithTopic(searchQuery, 'General');
                    setSearchOpen(false);
                  }}
                  className="w-full p-2.5 text-left hover:bg-indigo-50 text-indigo-700 font-semibold rounded-lg flex items-center gap-1.5"
                >
                  Ask FORGE AI about "{searchQuery}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
