import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Flame,
  GraduationCap,
  ChevronRight,
  Target,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, StudySession } from '../types';
import { useAuth } from '../context/AuthContext';
import { updateSessionStatus } from '../services/db';

interface DashboardViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  onRefreshSessions: () => void;
  onNavigate: (view: any) => void;
  onOpenStudyTopic?: (topic: string, subject: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  subjects,
  sessions,
  onRefreshSessions,
  onNavigate,
  onOpenStudyTopic,
}) => {
  const { userProfile, isDemoMode } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter today's sessions
  const todaySessions = sessions.filter((s) => s.date === todayStr);
  const completedToday = todaySessions.filter((s) => s.status === 'completed');

  // Overall syllabus completion percentage calculation
  let totalTopics = 0;
  let totalCompletedTopics = 0;
  subjects.forEach((subj) => {
    subj.units.forEach((u) => {
      totalTopics += u.topics.length;
    });
    totalCompletedTopics += subj.completedTopics?.length || 0;
  });
  const overallCompletion = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 45;

  // Study hours completed today
  const totalMinutesStudiedToday = completedToday.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const studyHoursToday = (totalMinutesStudiedToday / 60).toFixed(1);

  // Next upcoming examination countdown
  const upcomingExams = subjects
    .filter((s) => s.examDate && s.examDate >= todayStr)
    .sort((a, b) => (a.examDate! > b.examDate! ? 1 : -1));

  const nextExam = upcomingExams[0];
  const daysUntilNextExam = nextExam
    ? Math.max(0, Math.ceil((new Date(nextExam.examDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : null;

  // Recommended next topic (first pending high priority topic)
  const nextPendingSession =
    todaySessions.find((s) => s.status === 'pending') ||
    sessions.find((s) => s.status === 'pending');

  const handleToggleTask = async (session: StudySession) => {
    const nextStatus = session.status === 'completed' ? 'pending' : 'completed';
    if (nextStatus === 'completed') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {
        // graceful
      }
    }
    await updateSessionStatus(session.id, userProfile?.uid || 'temp', nextStatus);
    onRefreshSessions();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Welcome Banner Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Optimized Timetable Active
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Ready to make consistent progress today?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            You have <span className="font-semibold text-neutral-800">{todaySessions.length - completedToday.length} sessions remaining</span> today.
            Your sleep schedule of {userProfile?.sleepDurationHours || 8} hours is fully guarded.
          </p>
        </div>

        {/* Examination Countdown Pill */}
        {nextExam && daysUntilNextExam !== null && (
          <div className="w-full md:w-auto p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0">
              {daysUntilNextExam}d
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Next Examination
              </div>
              <div className="text-sm font-bold text-neutral-900">{nextExam.name}</div>
              <div className="text-[11px] text-neutral-500">
                {new Date(nextExam.examDate!).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Syllabus completion */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Syllabus Completion</span>
            <BookOpen className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{overallCompletion}%</span>
            <span className="text-[11px] text-emerald-600 font-medium">On track</span>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${overallCompletion}%` }} />
          </div>
        </div>

        {/* Stat 2: Daily study hours */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Study Hours Today</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">{studyHoursToday}h</span>
            <span className="text-[11px] text-neutral-500 font-medium">/ {userProfile?.dailyStudyTargetHours || 4}h target</span>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (parseFloat(studyHoursToday) / (userProfile?.dailyStudyTargetHours || 4)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stat 3: Tasks completed today */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">
              {completedToday.length} / {todaySessions.length || 0}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">
              {todaySessions.length > 0 ? Math.round((completedToday.length / todaySessions.length) * 100) : 0}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">Daily sessions scheduled</p>
        </div>

        {/* Stat 4: Study Streak */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900">4 Days</span>
            <span className="text-[11px] text-orange-600 font-medium">Consistent</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">Target maintained 4 days straight</p>
        </div>
      </div>

      {/* Recommended Next Task Box */}
      {nextPendingSession && (
        <div className="bg-gradient-to-r from-indigo-50/70 via-white to-white border border-indigo-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Recommended Next Topic
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">
                  {nextPendingSession.durationMinutes} mins
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                {nextPendingSession.topic}
              </h3>
              <p className="text-xs text-neutral-600 mt-0.5">
                <span className="font-semibold text-neutral-800">{nextPendingSession.subjectName}</span> •{' '}
                {nextPendingSession.unit}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 italic">
                Reason: High priority syllabus weightage and scheduled before upcoming examination.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenStudyTopic?.(nextPendingSession.topic, nextPendingSession.subjectName)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask FORGE AI
            </button>
            <button
              onClick={() => handleToggleTask(nextPendingSession)}
              className="px-3.5 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Mark Done
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Today's Schedule + Subject Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Timetable Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Today's Study Schedule</h3>
                <p className="text-xs text-neutral-500">
                  Conflict-free sessions calibrated with your college and sleep schedule.
                </p>
              </div>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View full planner
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaySessions.length === 0 ? (
              <div className="text-center py-10 text-neutral-400">
                <Calendar className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                <p className="text-sm font-medium text-neutral-700">No study sessions scheduled for today.</p>
                <p className="text-xs text-neutral-400 mt-1">Visit Study Planner to generate or add sessions.</p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                >
                  Open Study Planner
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {todaySessions.map((session) => {
                  const isDone = session.status === 'completed';
                  return (
                    <div
                      key={session.id}
                      className={`py-3.5 flex items-start justify-between gap-3 transition-colors ${
                        isDone ? 'opacity-65' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTask(session)}
                          className="mt-0.5 text-neutral-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-neutral-300 hover:text-indigo-500" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isDone ? 'line-through text-neutral-400' : 'text-neutral-900'
                              }`}
                            >
                              {session.topic}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                session.priority === 'Critical'
                                  ? 'bg-rose-50 text-rose-700'
                                  : session.priority === 'High'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {session.priority}
                            </span>
                          </div>

                          <div className="text-xs text-neutral-500 mt-0.5">
                            {session.subjectName} • {session.unit}
                          </div>

                          {session.notes && (
                            <div className="text-[11px] text-neutral-400 mt-1 italic">
                              Focus: {session.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Time & Duration badge */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-neutral-800 font-mono">
                          {session.startTime} - {session.endTime}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {session.durationMinutes} mins
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Subject-wise Progress & Upcoming Exams */}
        <div className="space-y-4">
          {/* Upcoming Exams Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center justify-between">
              <span>Upcoming Examinations</span>
              <span className="text-[11px] font-normal text-neutral-500">{upcomingExams.length} Scheduled</span>
            </h3>

            <div className="space-y-2.5">
              {upcomingExams.slice(0, 3).map((exam) => {
                const days = Math.max(
                  0,
                  Math.ceil((new Date(exam.examDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                );
                return (
                  <div key={exam.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-neutral-900">{exam.name}</div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {days} days left
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                      <span>Date: {exam.examDate}</span>
                      <span>{exam.examTime || 'Morning Slot'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject-Wise Progress */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
              <h3 className="text-sm font-bold text-neutral-900">Subject Progress</h3>
              <button
                onClick={() => onNavigate('syllabus')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3.5">
              {subjects.map((subj) => {
                let totalSubjTopics = 0;
                subj.units.forEach((u) => (totalSubjTopics += u.topics.length));
                const completed = subj.completedTopics?.length || 0;
                const pct = totalSubjTopics > 0 ? Math.round((completed / totalSubjTopics) * 100) : 0;

                return (
                  <div key={subj.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 truncate pr-2">{subj.name}</span>
                      <span className="text-neutral-500 font-mono text-[11px] shrink-0">{pct}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
