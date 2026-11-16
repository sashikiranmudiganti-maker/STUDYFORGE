import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Moon,
  School,
  Coffee,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySession, Subject } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  saveStudySession,
  deleteStudySession,
  updateSessionStatus,
  saveBatchStudySessions,
} from '../services/db';
import { smartReschedule, generateStudyPlan } from '../services/api';

interface StudyPlannerViewProps {
  sessions: StudySession[];
  subjects: Subject[];
  onRefreshSessions: () => void;
  onOpenTopicInForgeAi?: (topic: string, subject: string) => void;
}

export const StudyPlannerView: React.FC<StudyPlannerViewProps> = ({
  sessions,
  subjects,
  onRefreshSessions,
  onOpenTopicInForgeAi,
}) => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'calendar'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Reschedule & Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [missedSessionToReschedule, setMissedSessionToReschedule] = useState<StudySession | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('College assignment deadline ran over time');
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add Session Form state
  const [newSubjName, setNewSubjName] = useState(subjects[0]?.name || 'Engineering Mathematics');
  const [newUnit, setNewUnit] = useState('Unit 1');
  const [newTopic, setNewTopic] = useState('');
  const [newDate, setNewDate] = useState(selectedDate);
  const [newStartTime, setNewStartTime] = useState('18:00');
  const [newEndTime, setNewEndTime] = useState('19:15');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (subjectFilter !== 'all' && s.subjectName !== subjectFilter) return false;
    return true;
  });

  // Daily View Sessions
  const dailySessions = filteredSessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Weekly dates calculation
  const getWeekDates = (baseDateStr: string) => {
    const base = new Date(baseDateStr);
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(base.setDate(diff));

    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  const currentWeekDates = getWeekDates(selectedDate);

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

  const handleMarkMissed = (session: StudySession) => {
    setMissedSessionToReschedule(session);
    setShowRescheduleModal(true);
  };

  const executeSmartReschedule = async () => {
    if (!missedSessionToReschedule) return;
    setLoadingAction(true);
    setErrorMessage('');
    try {
      const remaining = sessions.filter(
        (s) => s.id !== missedSessionToReschedule.id && s.status === 'pending'
      );

      const result = await smartReschedule({
        missedSession: missedSessionToReschedule,
        remainingSessions: remaining,
        reason: rescheduleReason,
        availability: {
          collegeStart: userProfile?.collegeStart || '09:00',
          collegeEnd: userProfile?.collegeEnd || '16:30',
          sleepDurationHours: userProfile?.sleepDurationHours || 8,
        },
      });

      if (result.updatedSessions && result.updatedSessions.length > 0) {
        // Save new sessions
        const userId = userProfile?.uid || 'temp';
        const formatted = result.updatedSessions.map((s, idx) => ({
          ...s,
          id: `resched_${Date.now()}_${idx}`,
          userId,
          status: 'pending' as const,
        }));
        await saveBatchStudySessions(formatted);

        // Mark current session as missed
        await updateSessionStatus(missedSessionToReschedule.id, userId, 'missed');

        setStatusMessage(
          `Smart Rescheduled: ${result.explanation || 'Reallocated into upcoming buffer hours without sacrificing sleep.'}`
        );
        setTimeout(() => setStatusMessage(''), 6000);
        setShowRescheduleModal(false);
        onRefreshSessions();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Smart Reschedule failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    const startMinutes =
      parseInt(newStartTime.split(':')[0]) * 60 + parseInt(newStartTime.split(':')[1]);
    const endMinutes =
      parseInt(newEndTime.split(':')[0]) * 60 + parseInt(newEndTime.split(':')[1]);
    const duration = Math.max(15, endMinutes - startMinutes);

    const newSession: StudySession = {
      id: `session_custom_${Date.now()}`,
      userId: userProfile?.uid || 'temp',
      subjectName: newSubjName,
      unit: newUnit,
      topic: newTopic.trim(),
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      durationMinutes: duration,
      priority: newPriority,
      difficulty: 'Medium',
      status: 'pending',
      type: 'Study',
      notes: 'Custom student session',
    };

    await saveStudySession(newSession);
    onRefreshSessions();
    setShowAddSessionModal(false);
    setNewTopic('');
  };

  const handleDeleteSession = async (id: string) => {
    await deleteStudySession(id, userProfile?.uid || 'temp');
    onRefreshSessions();
  };

  const handleRegenerateEntirePlan = async () => {
    if (!confirm('Replan entire preparation schedule using Gemini AI? Existing unfinished sessions will be refreshed.')) {
      return;
    }
    setLoadingAction(true);
    setErrorMessage('');
    try {
      const validSubjects: Subject[] = subjects.length > 0 ? subjects : [
        {
          id: `subj_auto_${Date.now()}_1`,
          userId: userProfile?.uid || 'temp',
          name: 'Engineering Mathematics',
          code: 'MATH101',
          priority: 'High',
          difficulty: 'Hard',
          units: [
            { unitNumber: 1, title: 'Differential Calculus & ODEs', topics: ['First Order ODEs', 'Laplace Transforms'] },
            { unitNumber: 2, title: 'Linear Algebra', topics: ['Eigenvalues & Eigenvectors', 'Matrix Decompositions'] },
          ],
        },
        {
          id: `subj_auto_${Date.now()}_2`,
          userId: userProfile?.uid || 'temp',
          name: 'Core Major Specialization',
          code: 'CORE201',
          priority: 'High',
          difficulty: 'Medium',
          units: [
            { unitNumber: 1, title: 'Foundations & Architecture', topics: ['Core Concepts', 'System Architecture'] },
            { unitNumber: 2, title: 'Problem Solving & Analysis', topics: ['Algorithms & Complexity', 'Design Principles'] },
          ],
        },
      ];

      const planRes = await generateStudyPlan({
        subjects: validSubjects,
        availability: {
          startDate: selectedDate,
          collegeStart: userProfile?.collegeStart || '09:00',
          collegeEnd: userProfile?.collegeEnd || '16:30',
          sleepDurationHours: userProfile?.sleepDurationHours || 8,
          dailyTargetHours: userProfile?.dailyStudyTargetHours || 4,
        },
        studyPreferences: {
          preparationLevel: userProfile?.preparationLevel || 'Intermediate',
          dailyTargetHours: userProfile?.dailyStudyTargetHours || 4,
        },
        studentName: userProfile?.fullName,
      });

      if (planRes && planRes.sessions && planRes.sessions.length > 0) {
        const userId = userProfile?.uid || 'temp';
        const sessionsWithUser = planRes.sessions.map((s, idx) => ({
          ...s,
          id: `session_replan_${Date.now()}_${idx}`,
          userId,
          status: 'pending' as const,
        }));
        await saveBatchStudySessions(sessionsWithUser);
        setStatusMessage('AI regenerated full examination study timetable successfully!');
        setTimeout(() => setStatusMessage(''), 5000);
        onRefreshSessions();
      } else {
        throw new Error('AI returned an empty schedule. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to regenerate study plan.');
    } finally {
      setLoadingAction(false);
    }
  };

  const shiftDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header with Title & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              AI Study Planner & Timetable
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 tracking-wide uppercase">
              Adaptive
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Zero schedule conflicts. College hours ({userProfile?.collegeStart || '09:00'} -{' '}
            {userProfile?.collegeEnd || '16:30'}) and sleep duration ({userProfile?.sleepDurationHours || 8} hrs) protected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Smart Reschedule Trigger Button */}
          <button
            onClick={() => {
              const pending = sessions.find((s) => s.status === 'pending');
              if (pending) {
                handleMarkMissed(pending);
              } else {
                alert('No pending study session found to reschedule.');
              }
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Smart Reschedule
          </button>

          {/* Replan Entire Schedule */}
          <button
            onClick={handleRegenerateEntirePlan}
            disabled={loadingAction}
            className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Replan entire preparation with Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction ? 'animate-spin' : ''}`} />
            Replan All
          </button>

          {/* Add Session Button */}
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Session
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Constraints Notification Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Sleep schedule: <strong className="text-neutral-900">{userProfile?.sleepDurationHours || 8}h guaranteed</strong> (No midnight study)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            College hours: <strong className="text-neutral-900">{userProfile?.collegeStart || '09:00'} - {userProfile?.collegeEnd || '16:30'}</strong> (Free of study)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Breaks: <strong className="text-neutral-900">15 min breaks</strong> between high-focus blocks
          </span>
        </div>
      </div>

      {/* Controls Bar: View Tabs, Date Navigator, Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-neutral-200 rounded-xl shadow-2xs">
        {/* View Switcher Tabs */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'daily'
                ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Daily Timetable
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'weekly'
                ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Calendar View
          </button>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          />

          <button
            onClick={() => shiftDay(1)}
            className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs font-medium text-indigo-600 hover:underline px-1"
          >
            Today
          </button>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: DAILY VIEW */}
      {activeTab === 'daily' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-xs text-neutral-500">
                {dailySessions.length} sessions • {dailySessions.filter((s) => s.status === 'completed').length} completed
              </p>
            </div>
          </div>

          {dailySessions.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <Calendar className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No study sessions on this date.</p>
              <p className="text-xs text-neutral-400 mt-1">Add a session manually or ask AI to replan.</p>
              <button
                onClick={() => setShowAddSessionModal(true)}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
              >
                Schedule Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySessions.map((session) => {
                const isCompleted = session.status === 'completed';
                const isMissed = session.status === 'missed';

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-neutral-50/70 border-neutral-200 opacity-70'
                        : isMissed
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTask(session)}
                          className="mt-0.5 text-neutral-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-neutral-300 hover:text-indigo-500" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-bold ${
                                isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900'
                              }`}
                            >
                              {session.topic}
                            </h4>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                session.priority === 'Critical'
                                  ? 'bg-rose-50 text-rose-700'
                                  : session.priority === 'High'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {session.priority}
                            </span>
                            {session.type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                                {session.type}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-500 mt-1">
                            <span className="font-semibold text-neutral-700">{session.subjectName}</span> •{' '}
                            {session.unit}
                          </div>

                          {session.notes && (
                            <div className="text-[11px] text-neutral-500 mt-1">
                              Target: {session.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Time, Reschedule, Delete controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-neutral-900">
                            {session.startTime} - {session.endTime}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {session.durationMinutes} mins
                          </div>
                        </div>

                        {!isCompleted && !isMissed && (
                          <button
                            onClick={() => handleMarkMissed(session)}
                            className="px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 rounded-md border border-amber-200 transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                        )}

                        <button
                          onClick={() => onOpenTopicInForgeAi?.(session.topic, session.subjectName)}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Tutor
                        </button>

                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1 text-neutral-300 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW */}
      {activeTab === 'weekly' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900">7-Day Study Overview</h3>
            <span className="text-xs text-neutral-500">
              Week of {currentWeekDates[0]} to {currentWeekDates[6]}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDates.map((dateStr) => {
              const daySessions = filteredSessions.filter((s) => s.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const dateObj = new Date(dateStr);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dateObj.getDate();

              return (
                <div
                  key={dateStr}
                  className={`p-3 rounded-xl border min-h-[220px] flex flex-col ${
                    isToday
                      ? 'border-indigo-600 bg-indigo-50/20'
                      : 'border-neutral-200/80 bg-neutral-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                    <span className="text-xs font-bold text-neutral-700">{dayName}</span>
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-neutral-500'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-64">
                    {daySessions.map((s) => (
                      <div
                        key={s.id}
                        className={`p-2 rounded-lg border text-[11px] leading-tight ${
                          s.status === 'completed'
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-white border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <div className="font-semibold line-clamp-1">{s.topic}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          {s.subjectName.split(' ')[0]} • {s.startTime}
                        </div>
                      </div>
                    ))}
                    {daySessions.length === 0 && (
                      <div className="text-[10px] text-neutral-400 italic pt-4 text-center">
                        Free day / Buffer
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: COMPLETE EXAM CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-neutral-900">Examination Preparation Calendar</h3>
          <p className="text-xs text-neutral-500">
            All scheduled preparation milestones, buffer catch-ups, and examination dates.
          </p>

          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
            {filteredSessions.slice(0, 20).map((session) => (
              <div key={session.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-neutral-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-neutral-500 w-24 shrink-0 font-medium">{session.date}</span>
                  <div>
                    <span className="font-bold text-neutral-900">{session.topic}</span>
                    <span className="text-neutral-500 ml-2">({session.subjectName})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-600">{session.startTime} - {session.endTime}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      session.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SMART RESCHEDULE MODAL */}
      {showRescheduleModal && missedSessionToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">SMART RESCHEDULE ENGINE</h3>
                  <p className="text-[11px] text-neutral-500">Adapt timetable without breaking sleep or overloading tomorrow</p>
                </div>
              </div>
              <button onClick={() => setShowRescheduleModal(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
              <div className="font-semibold text-neutral-900">Unfinished Study Session:</div>
              <div className="text-indigo-700 font-bold">{missedSessionToReschedule.topic}</div>
              <div className="text-neutral-500">
                {missedSessionToReschedule.subjectName} • {missedSessionToReschedule.durationMinutes} minutes
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Reason for missed session (Gemini will adapt pacing accordingly):
              </label>
              <textarea
                rows={2}
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900">
              <span className="font-semibold">Adaptive Rules:</span> Gemini will allocate this topic into an
              upcoming evening buffer slot. Your {userProfile?.sleepDurationHours || 8}-hour sleep schedule remains inviolable.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSmartReschedule}
                disabled={loadingAction}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingAction ? 'AI Recalculating Schedule...' : 'Reschedule Intelligently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SESSION MODAL */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Add Study Session</h3>
              <button onClick={() => setShowAddSessionModal(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject</label>
                <select
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Unit Name</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Unit 1: Theory"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Topic to Study *</label>
                <input
                  type="text"
                  required
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Asymptotic Complexity and Big-O proofs"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
