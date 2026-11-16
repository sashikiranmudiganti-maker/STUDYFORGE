import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  Bell,
  Trash2,
} from 'lucide-react';
import { Subject, StudySession, AcademicReminder } from '../types';

interface CalendarViewProps {
  subjects: Subject[];
  sessions: StudySession[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ subjects, sessions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reminders, setReminders] = useState<AcademicReminder[]>([
    {
      id: 'rem_1',
      title: 'Mathematics-II Assignment 2 Submission',
      date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      time: '17:00',
      type: 'assignment',
    },
    {
      id: 'rem_2',
      title: 'Laplace Transforms Mock Drill',
      date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      time: '19:00',
      type: 'revision',
    },
  ]);

  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState<'exam' | 'assignment' | 'revision' | 'wellness'>('assignment');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const r: AcademicReminder = {
      id: `rem_${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      type: newType,
    };
    setReminders((prev) => [...prev, r]);
    setShowAddReminderModal(false);
    setNewTitle('');
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Academic Calendar & Deadlines
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Integrated milestones: final examinations, revision blocks, and assignment deadlines.
          </p>
        </div>

        <button
          onClick={() => setShowAddReminderModal(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Deadline / Event
        </button>
      </div>

      {/* Main Grid: Calendar Month Matrix + Side Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Matrix */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900">{monthName}</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`blank-${i}`} className="h-20 bg-neutral-50/50 rounded-xl" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum
                .toString()
                .padStart(2, '0')}`;
              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              // Check if exams fall on this date
              const dayExams = subjects.filter((s) => s.examDate === dateStr);
              const daySessions = sessions.filter((s) => s.date === dateStr);
              const dayReminders = reminders.filter((r) => r.date === dateStr);

              return (
                <div
                  key={dayNum}
                  className={`h-22 p-1.5 rounded-xl border flex flex-col justify-between overflow-hidden transition-all ${
                    isToday
                      ? 'bg-indigo-50/20 border-indigo-500 shadow-xs'
                      : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]' : 'text-neutral-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayExams.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Exam Date" />
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayExams.map((e) => (
                      <div
                        key={e.id}
                        className="text-[9px] font-bold px-1 py-0.5 rounded bg-rose-50 text-rose-700 truncate"
                      >
                        EXAM: {e.name}
                      </div>
                    ))}
                    {dayReminders.map((r) => (
                      <div
                        key={r.id}
                        className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-50 text-amber-800 truncate"
                      >
                        {r.title}
                      </div>
                    ))}
                    {daySessions.length > 0 && dayExams.length === 0 && (
                      <div className="text-[9px] text-neutral-400 font-medium truncate">
                        {daySessions.length} study tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Upcoming Reminders & Exam Deadlines */}
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
              <span>Deadlines & Reminders</span>
              <Bell className="w-4 h-4 text-indigo-600" />
            </h3>

            <div className="space-y-2.5 divide-y divide-neutral-100">
              {reminders.map((r) => (
                <div key={r.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-neutral-800">{r.title}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Due: {r.date} {r.time ? `at ${r.time}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="p-1 text-neutral-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Official Exam Dates */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">Official Exam Timetable</h3>
            <div className="space-y-2">
              {subjects
                .filter((s) => s.examDate)
                .map((s) => (
                  <div key={s.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs">
                    <div className="font-semibold text-neutral-900">{s.name}</div>
                    <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
                      <span>Date: {s.examDate}</span>
                      <span>Slot: {s.examTime || 'Morning'}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Add Academic Reminder</h3>
              <button
                onClick={() => setShowAddReminderModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Reminder Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Submit Operating Systems Lab Project"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="revision">Revision Slot</option>
                    <option value="exam">Exam Date</option>
                    <option value="wellness">Wellness Check</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
