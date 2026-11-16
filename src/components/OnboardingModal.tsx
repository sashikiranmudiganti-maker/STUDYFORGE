import React, { useState } from 'react';
import {
  GraduationCap,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Moon,
  Coffee,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Subject, AvailabilitySettings, PreparationLevel } from '../types';
import { extractSyllabus, generateStudyPlan } from '../services/api';
import { saveSubject, saveBatchStudySessions } from '../services/db';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { userProfile, updateProfileData } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Profile
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [collegeName, setCollegeName] = useState(userProfile?.collegeName || '');
  const [course, setCourse] = useState(userProfile?.course || 'B.Tech Computer Science');
  const [academicYear, setAcademicYear] = useState(userProfile?.academicYear || '1st Year');
  const [semester, setSemester] = useState(userProfile?.semester || 'Semester 2');

  // Step 2: Syllabus & Documents
  const [rawTextSyllabus, setRawTextSyllabus] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);
  const [extractedSubjects, setExtractedSubjects] = useState<Subject[]>([]);
  const [confidenceNote, setConfidenceNote] = useState('');

  // Step 3: Availability
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextMonthStr);
  const [collegeStart, setCollegeStart] = useState(userProfile?.collegeStart || '09:00');
  const [collegeEnd, setCollegeEnd] = useState(userProfile?.collegeEnd || '16:30');
  const [commuteMinutes, setCommuteMinutes] = useState(45);
  const [sleepDurationHours, setSleepDurationHours] = useState(userProfile?.sleepDurationHours || 8);
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [morningHours, setMorningHours] = useState('06:30 - 08:30');
  const [eveningHours, setEveningHours] = useState('17:30 - 22:30');

  // Step 4: Study Preferences
  const [preparationLevel, setPreparationLevel] = useState<PreparationLevel>(
    userProfile?.preparationLevel || 'Intermediate'
  );
  const [dailyTargetHours, setDailyTargetHours] = useState(
    userProfile?.dailyStudyTargetHours || 4
  );
  const [prioritySubjects, setPrioritySubjects] = useState<string[]>([]);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedMimeType(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setUploadedBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini AI Extraction
  const handleExtractWithGemini = async () => {
    if (!uploadedBase64 && !rawTextSyllabus.trim()) {
      setErrorMessage('Please upload a syllabus document or paste syllabus text.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await extractSyllabus({
        text: rawTextSyllabus,
        fileData: uploadedBase64 || undefined,
        mimeType: uploadedMimeType || undefined,
        fileName: uploadedFileName,
      });

      if (res.subjects && res.subjects.length > 0) {
        const mapped: Subject[] = res.subjects.map((s, idx) => ({
          id: `subj_${Date.now()}_${idx}`,
          userId: userProfile?.uid || 'temp',
          name: s.name,
          code: s.code || '',
          examDate: s.examDate || '',
          examTime: s.examTime || '',
          priority: s.priority || 'Medium',
          difficulty: s.difficulty || 'Medium',
          units: s.units || [
            { unitNumber: 1, title: 'Introduction & Core Concepts', topics: ['Core fundamentals', 'Key theorems'] },
          ],
        }));
        setExtractedSubjects(mapped);
        setConfidenceNote(res.confidenceNotes || 'Successfully extracted subjects and units.');
        setPrioritySubjects(mapped.slice(0, 2).map((s) => s.name));
      } else {
        setErrorMessage('No subjects could be parsed from the document. Please verify the content.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gemini extraction failed. Check document format or API key.');
    } finally {
      setLoading(false);
    }
  };

  // Final Step 5: Save subjects, Generate Timetable and Complete Onboarding
  const handleFinishOnboarding = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const userId = userProfile?.uid || 'temp_user';

      // 1. If user didn't extract subjects, create 2 standard fallback subjects
      let finalSubjects = extractedSubjects;
      if (finalSubjects.length === 0) {
        finalSubjects = [
          {
            id: `subj_${Date.now()}_1`,
            userId,
            name: 'Engineering Mathematics',
            code: 'MATH101',
            examDate: endDate,
            priority: 'High',
            difficulty: 'Hard',
            units: [
              { unitNumber: 1, title: 'Differential Equations', topics: ['First Order ODEs', 'Laplace Transforms'] },
              { unitNumber: 2, title: 'Linear Algebra', topics: ['Eigenvalues & Eigenvectors', 'Matrix Decompositions'] },
            ],
          },
          {
            id: `subj_${Date.now()}_2`,
            userId,
            name: 'Core Major Specialization',
            code: 'CS201',
            examDate: endDate,
            priority: 'High',
            difficulty: 'Medium',
            units: [
              { unitNumber: 1, title: 'Data Structures & Algorithms', topics: ['Trees & Graphs', 'Dynamic Programming'] },
              { unitNumber: 2, title: 'System Architecture', topics: ['Processor Design', 'Memory Hierarchy'] },
            ],
          },
        ];
      }

      // Save subjects to DB
      for (const subj of finalSubjects) {
        await saveSubject({ ...subj, userId });
      }

      // 2. Call Gemini Study Plan Generator
      const planRes = await generateStudyPlan({
        subjects: finalSubjects,
        availability: {
          startDate,
          endDate,
          collegeStart,
          collegeEnd,
          sleepDurationHours,
          breakMinutes,
          dailyTargetHours,
          morningHours,
          eveningHours,
        },
        studyPreferences: {
          preparationLevel,
          dailyTargetHours,
          prioritySubjects,
        },
        studentName: fullName || userProfile?.fullName || 'Student',
      });

      // Save generated sessions to DB
      const sessionsToSave = (planRes && planRes.sessions && planRes.sessions.length > 0)
        ? planRes.sessions
        : [
            {
              subjectName: finalSubjects[0].name,
              unit: finalSubjects[0].units[0]?.title || 'Unit 1',
              topic: finalSubjects[0].units[0]?.topics[0] || 'Core Foundation',
              date: startDate,
              startTime: '18:00',
              endTime: '19:15',
              durationMinutes: 75,
              priority: 'High' as const,
              difficulty: 'Medium' as const,
              type: 'Study' as const,
              notes: 'Fundamental concept mastery and active recall session.',
            },
          ];

      const sessionsWithUser = sessionsToSave.map((s: any, idx: number) => ({
        ...s,
        id: `session_${Date.now()}_${idx}`,
        userId,
        status: 'pending' as const,
      }));
      await saveBatchStudySessions(sessionsWithUser);

      // 3. Update User Profile to completed
      await updateProfileData({
        fullName: fullName || userProfile?.fullName || 'Student',
        collegeName,
        course,
        academicYear,
        semester,
        sleepDurationHours,
        collegeStart,
        collegeEnd,
        dailyStudyTargetHours: dailyTargetHours,
        preparationLevel,
        onboardingCompleted: true,
      });

      onComplete();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to complete onboarding and generate plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Step Indicator Header */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">STUDYFORGE AI Setup</h2>
              <p className="text-[11px] text-neutral-500">Step {step} of 5</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step
                    ? 'w-6 bg-indigo-600'
                    : i < step
                    ? 'w-3 bg-emerald-500'
                    : 'w-3 bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Student Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Student Academic Profile</h3>
                <p className="text-xs text-neutral-500">Tell us about your college and current degree program.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Student Name / Nickname *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Sharma"
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">College / University Name</label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. National Institute of Tech"
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Course & Branch *</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Current Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="1st Year">1st Year (Freshman)</option>
                    <option value="2nd Year">2nd Year (Sophomore)</option>
                    <option value="3rd Year">3rd Year (Junior)</option>
                    <option value="Final Year">Final Year (Senior)</option>
                    <option value="High School">High School / Pre-University</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Syllabus & Timetable Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Upload Syllabus & Exam Timetable</h3>
                <p className="text-xs text-neutral-500">
                  Upload PDF, PNG, JPG files or paste your syllabus text. Gemini will extract units and exam dates.
                </p>
              </div>

              {/* Upload box */}
              <div className="border-2 border-dashed border-neutral-200 hover:border-indigo-400 rounded-xl p-6 text-center bg-neutral-50/50 transition-colors">
                <input
                  type="file"
                  id="syllabus-file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="syllabus-file" className="cursor-pointer flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-900">
                    {uploadedFileName ? uploadedFileName : 'Click to upload syllabus or exam timetable'}
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-0.5">Supports PDF, PNG, JPG (up to 15MB)</span>
                </label>
              </div>

              {/* Or paste syllabus text */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Or paste syllabus & exam schedule text directly
                </label>
                <textarea
                  rows={4}
                  value={rawTextSyllabus}
                  onChange={(e) => setRawTextSyllabus(e.target.value)}
                  placeholder="e.g. Engineering Mathematics-II: Unit 1 Differential Equations (topics: ODEs, Laplace), Exam Date: 2026-11-20..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleExtractWithGemini}
                  disabled={loading || (!uploadedBase64 && !rawTextSyllabus.trim())}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Gemini Extracting...' : 'Extract with Gemini AI'}
                </button>

                {extractedSubjects.length > 0 && (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {extractedSubjects.length} subjects extracted
                  </span>
                )}
              </div>

              {/* Display Extracted Subjects for Confirmation */}
              {extractedSubjects.length > 0 && (
                <div className="mt-4 border border-neutral-200 rounded-xl p-3 bg-white divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pb-2">
                    Confirmed Extracted Subjects & Units
                  </div>
                  {extractedSubjects.map((s, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-neutral-900">{s.name} {s.code && `(${s.code})`}</div>
                        <div className="text-[11px] text-neutral-500">
                          {s.units.length} Units • Exam: {s.examDate || 'TBD'}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                        {s.difficulty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Student Availability */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Daily Availability & Fixed Schedule</h3>
                <p className="text-xs text-neutral-500">
                  We protect your sleep duration and college commitments so you never burn out.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Preparation Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Final Exam End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700">College / School Timings</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="time"
                      value={collegeStart}
                      onChange={(e) => setCollegeStart(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg"
                    />
                    <input
                      type="time"
                      value={collegeEnd}
                      onChange={(e) => setCollegeEnd(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 flex items-center justify-between">
                    <span>Preferred Sleep Duration</span>
                    <span className="text-indigo-600 font-semibold">{sleepDurationHours} hrs / night</span>
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
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>6 hrs (Min)</span>
                    <span>8 hrs (Recommended)</span>
                    <span>9 hrs</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700">Morning Study Window</label>
                  <input
                    type="text"
                    value={morningHours}
                    onChange={(e) => setMorningHours(e.target.value)}
                    placeholder="06:30 - 08:30"
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700">Evening Study Window</label>
                  <input
                    type="text"
                    value={eveningHours}
                    onChange={(e) => setEveningHours(e.target.value)}
                    placeholder="17:30 - 22:30"
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Study Preferences */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Study Preferences & Pacing</h3>
                <p className="text-xs text-neutral-500">Fine-tune the timetable intensity and target hours.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Preparation Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Beginner', 'Intermediate', 'Advanced'] as PreparationLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPreparationLevel(lvl)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        preparationLevel === lvl
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{lvl}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {lvl === 'Beginner' && 'Detailed breakdown, more basic examples'}
                        {lvl === 'Intermediate' && 'Standard university prep with tests'}
                        {lvl === 'Advanced' && 'Intense problem solving and revision'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 flex items-center justify-between">
                  <span>Daily Study Target</span>
                  <span className="text-indigo-600 font-semibold">{dailyTargetHours} Hours / day</span>
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

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Subjects Requiring Extra Focus / Attention
                </label>
                <div className="flex flex-wrap gap-2">
                  {extractedSubjects.map((s) => {
                    const isSelected = prioritySubjects.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setPrioritySubjects(prioritySubjects.filter((p) => p !== s.name));
                          } else {
                            setPrioritySubjects([...prioritySubjects, s.name]);
                          }
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  {extractedSubjects.length === 0 && (
                    <span className="text-xs text-neutral-400 italic">
                      Upload or extract subjects in Step 2 to select focus areas.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Ready to Generate */}
          {step === 5 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-neutral-900">Generate Your Personalized AI Study Plan</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                  Google Gemini will build an conflict-free, sleep-safe timetable matching your exact syllabus,
                  college timings ({collegeStart} - {collegeEnd}), and examination milestones.
                </p>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Student:</span>
                  <span className="font-semibold text-neutral-900">{fullName || 'Student'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Daily Study Target:</span>
                  <span className="font-semibold text-neutral-900">{dailyTargetHours} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Sleep Guaranteed:</span>
                  <span className="font-semibold text-neutral-900">{sleepDurationHours} hours / night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Subjects to Cover:</span>
                  <span className="font-semibold text-indigo-600">
                    {extractedSubjects.length > 0 ? `${extractedSubjects.length} subjects` : 'Core engineering syllabus'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setStep(step + 1);
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Generating AI Timetable...' : 'Generate My Study Plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
