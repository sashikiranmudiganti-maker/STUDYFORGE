import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Clock,
  Moon,
  School,
  Save,
  CheckCircle2,
  Download,
  RotateCcw,
  LogOut,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resetDemoData } from '../services/db';

export const SettingsView: React.FC = () => {
  const {
    userProfile,
    updateProfileData,
    isDemoMode,
    logout,
    resendVerification,
    currentUser,
  } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [collegeName, setCollegeName] = useState(userProfile?.collegeName || '');
  const [course, setCourse] = useState(userProfile?.course || '');
  const [collegeStart, setCollegeStart] = useState(userProfile?.collegeStart || '09:00');
  const [collegeEnd, setCollegeEnd] = useState(userProfile?.collegeEnd || '16:30');
  const [sleepDurationHours, setSleepDurationHours] = useState(userProfile?.sleepDurationHours || 8);
  const [dailyTargetHours, setDailyTargetHours] = useState(userProfile?.dailyStudyTargetHours || 4);
  const [preparationLevel, setPreparationLevel] = useState(userProfile?.preparationLevel || 'Intermediate');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({
        fullName,
        collegeName,
        course,
        collegeStart,
        collegeEnd,
        sleepDurationHours,
        dailyStudyTargetHours: dailyTargetHours,
        preparationLevel,
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      alert('Error updating settings: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    const data = {
      profile: userProfile,
      exportedAt: new Date().toISOString(),
      appName: 'STUDYFORGE AI',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyforge_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemo = () => {
    if (confirm('Reset demo state to initial first-year engineering baseline?')) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Student Profile & Study Constraints
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Adjust college timings, guaranteed sleep duration, and study intensity targets.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Academic Details Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Academic Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">College / Institution</label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">Course & Degree Program</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">Preparation Level</label>
              <select
                value={preparationLevel}
                onChange={(e: any) => setPreparationLevel(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
              >
                <option value="Beginner">Beginner (Foundational, Step-by-step)</option>
                <option value="Intermediate">Intermediate (University Standard)</option>
                <option value="Advanced">Advanced (High Intensity & Derivations)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule & Wellness Constraints Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-600" />
            Timetable Constraints & Sleep Guard
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700">College Hours (Free of Study)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="time"
                  value={collegeStart}
                  onChange={(e) => setCollegeStart(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                />
                <input
                  type="time"
                  value={collegeEnd}
                  onChange={(e) => setCollegeEnd(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 flex items-center justify-between">
                <span>Guaranteed Sleep Duration</span>
                <span className="text-indigo-600 font-bold">{sleepDurationHours} hours / night</span>
              </label>
              <input
                type="range"
                min={6}
                max={9}
                step={0.5}
                value={sleepDurationHours}
                onChange={(e) => setSleepDurationHours(parseFloat(e.target.value))}
                className="mt-2 w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                The AI Study Planner will never schedule tasks during your sleep window.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 flex items-center justify-between">
                <span>Daily Study Hours Target</span>
                <span className="text-indigo-600 font-bold">{dailyTargetHours} hours / day</span>
              </label>
              <input
                type="range"
                min={2}
                max={6}
                step={0.5}
                value={dailyTargetHours}
                onChange={(e) => setDailyTargetHours(parseFloat(e.target.value))}
                className="mt-2 w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Account, Export & Data Management */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Account & Data Privacy
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs">
          <div>
            <div className="font-semibold text-neutral-900">
              {currentUser?.email || userProfile?.email || 'Student Account'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {isDemoMode ? 'Demo Session (Data stored in local isolate)' : 'Authenticated via Firebase Auth'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>

            {isDemoMode && (
              <button
                onClick={handleResetDemo}
                className="px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo Data
              </button>
            )}

            <button
              onClick={() => logout()}
              className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
