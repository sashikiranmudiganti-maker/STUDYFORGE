import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  FileText,
  HelpCircle,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Subject, SubjectUnit } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveSubject, deleteSubject, saveStudyMaterial } from '../services/db';
import { extractSyllabus, generateStudyNotes } from '../services/api';

interface SyllabusViewProps {
  subjects: Subject[];
  onRefreshSubjects: () => void;
  onAskForgeAi: (topic: string, subject: string) => void;
  onPracticeTopic: (topic: string, subject: string) => void;
}

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  subjects,
  onRefreshSubjects,
  onAskForgeAi,
  onPracticeTopic,
}) => {
  const { userProfile } = useAuth();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    subjects[0]?.id || null
  );
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({
    1: true,
    2: true,
  });

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteGeneratingTopic, setNoteGeneratingTopic] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Subject Form
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjExamDate, setNewSubjExamDate] = useState('');
  const [newSubjPriority, setNewSubjPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');
  const [newSubjDifficulty, setNewSubjDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Hard');

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const toggleUnit = (unitNumber: number) => {
    setExpandedUnits((prev) => ({ ...prev, [unitNumber]: !prev[unitNumber] }));
  };

  const handleToggleTopicCompletion = async (subject: Subject, topicName: string) => {
    const currentCompleted = subject.completedTopics || [];
    const isCompleted = currentCompleted.includes(topicName);
    const updatedCompleted = isCompleted
      ? currentCompleted.filter((t) => t !== topicName)
      : [...currentCompleted, topicName];

    const updatedSubj: Subject = {
      ...subject,
      completedTopics: updatedCompleted,
    };

    await saveSubject(updatedSubj);
    onRefreshSubjects();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileMime(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractSyllabus = async () => {
    if (!fileBase64 && !uploadText.trim()) {
      setErrorMsg('Please select a file or paste syllabus text.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await extractSyllabus({
        text: uploadText,
        fileData: fileBase64 || undefined,
        mimeType: fileMime || undefined,
        fileName: fileName,
      });

      if (res.subjects && res.subjects.length > 0) {
        for (const s of res.subjects) {
          const newSubj: Subject = {
            id: `subj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: userProfile?.uid || 'temp',
            name: s.name,
            code: s.code || '',
            examDate: s.examDate || '',
            examTime: s.examTime || '',
            priority: s.priority || 'Medium',
            difficulty: s.difficulty || 'Medium',
            units: s.units || [{ unitNumber: 1, title: 'Unit 1: Fundamentals', topics: ['Core Concepts'] }],
            completedTopics: [],
          };
          await saveSubject(newSubj);
        }

        onRefreshSubjects();
        setShowUploadModal(false);
        setActionSuccessMsg(`Successfully extracted and added ${res.subjects.length} subjects!`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to extract syllabus with Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotes = async (topic: string, subjectName: string) => {
    setNoteGeneratingTopic(topic);
    try {
      const res = await generateStudyNotes({
        subject: subjectName,
        topic,
        type: 'summary',
      });

      await saveStudyMaterial({
        id: `mat_${Date.now()}`,
        userId: userProfile?.uid || 'temp',
        subjectName,
        title: res.title,
        category: 'Notes',
        content: res.contentMarkdown,
        tags: [subjectName, topic],
        createdAt: new Date().toISOString(),
      });

      setActionSuccessMsg(`Generated notes for "${topic}" and saved to Study Materials library!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate notes.');
    } finally {
      setNoteGeneratingTopic(null);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;

    const newSubj: Subject = {
      id: `subj_${Date.now()}`,
      userId: userProfile?.uid || 'temp',
      name: newSubjName.trim(),
      code: newSubjCode.trim() || undefined,
      examDate: newSubjExamDate || undefined,
      priority: newSubjPriority,
      difficulty: newSubjDifficulty,
      units: [
        {
          unitNumber: 1,
          title: 'Unit 1: Core Principles',
          topics: ['Introduction to ' + newSubjName, 'Fundamental Theory'],
        },
        {
          unitNumber: 2,
          title: 'Unit 2: Applied Analysis',
          topics: ['Problem Solving', 'Case Studies & Applications'],
        },
      ],
      completedTopics: [],
    };

    await saveSubject(newSubj);
    onRefreshSubjects();
    setSelectedSubjectId(newSubj.id);
    setShowAddSubjectModal(false);
    setNewSubjName('');
    setNewSubjCode('');
    setNewSubjExamDate('');
  };

  const handleDeleteSubj = async (subjId: string) => {
    if (confirm('Are you sure you want to delete this subject and its units?')) {
      await deleteSubject(subjId, userProfile?.uid || 'temp');
      onRefreshSubjects();
      setSelectedSubjectId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            My Syllabus & Curriculum
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Track unit-wise topic completion, generate instant study notes, and calibrate exam coverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Syllabus Document
          </button>
          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Horizontal Subject Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((s) => {
          let totalTopics = 0;
          s.units.forEach((u) => (totalTopics += u.topics.length));
          const completedCount = s.completedTopics?.length || 0;
          const pct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
          const isSelected = selectedSubject?.id === s.id;

          return (
            <div
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {s.code || 'COURSE'}
                  </span>
                  <h3 className="text-sm font-bold text-neutral-900 mt-0.5 line-clamp-1">{s.name}</h3>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    s.priority === 'Critical'
                      ? 'bg-rose-50 text-rose-700'
                      : s.priority === 'High'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {s.priority}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>{s.units.length} Units</span>
                <span className="font-semibold text-neutral-800 font-mono">{pct}%</span>
              </div>

              <div className="mt-1.5 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {s.examDate && (
                <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>Exam: {s.examDate}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Subject Details & Expandable Units */}
      {selectedSubject && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {selectedSubject.code || 'Syllabus Breakdown'}
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500">Difficulty: {selectedSubject.difficulty}</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mt-0.5">{selectedSubject.name}</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeleteSubj(selectedSubject.id)}
                className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Units list */}
          <div className="space-y-4">
            {selectedSubject.units.map((unit) => {
              const isExpanded = expandedUnits[unit.unitNumber] ?? true;
              return (
                <div key={unit.unitNumber} className="border border-neutral-200/80 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleUnit(unit.unitNumber)}
                    className="w-full px-4 py-3 bg-neutral-50/70 hover:bg-neutral-50 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-neutral-900">
                          Unit {unit.unitNumber}: {unit.title}
                        </span>
                        <span className="text-[11px] text-neutral-500 ml-2">
                          ({unit.topics.length} topics)
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white divide-y divide-neutral-100">
                      {unit.topics.map((topic, tIdx) => {
                        const isDone = selectedSubject.completedTopics?.includes(topic);
                        const isGenerating = noteGeneratingTopic === topic;

                        return (
                          <div
                            key={tIdx}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTopicCompletion(selectedSubject, topic)}
                                className="mt-0.5 text-neutral-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                                ) : (
                                  <Circle className="w-4 h-4 text-neutral-300 hover:text-indigo-500" />
                                )}
                              </button>
                              <span
                                className={`text-xs ${
                                  isDone ? 'line-through text-neutral-400' : 'text-neutral-800 font-medium'
                                }`}
                              >
                                {topic}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                              {/* Ask Forge AI */}
                              <button
                                onClick={() => onAskForgeAi(topic, selectedSubject.name)}
                                className="px-2.5 py-1 text-[11px] bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                Ask AI
                              </button>

                              {/* Generate Note */}
                              <button
                                onClick={() => handleGenerateNotes(topic, selectedSubject.name)}
                                disabled={isGenerating}
                                className="px-2.5 py-1 text-[11px] bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-md border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <FileText className="w-3 h-3" />
                                {isGenerating ? 'Generating...' : 'Summary Note'}
                              </button>

                              {/* Practice Test */}
                              <button
                                onClick={() => onPracticeTopic(topic, selectedSubject.name)}
                                className="px-2.5 py-1 text-[11px] bg-teal-50 hover:bg-teal-100/80 text-teal-800 rounded-md border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                Practice Test
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Syllabus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Upload Academic Syllabus</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-xs text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="border-2 border-dashed border-neutral-200 hover:border-indigo-400 rounded-xl p-6 text-center bg-neutral-50/50">
              <input
                type="file"
                id="modal-upload"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="modal-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-indigo-600 mb-1" />
                <span className="text-xs font-semibold text-neutral-900">
                  {fileName || 'Choose PDF or image syllabus file'}
                </span>
                <span className="text-[11px] text-neutral-400">PDF, JPG, PNG supported</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Or paste syllabus text directly:
              </label>
              <textarea
                rows={4}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste course outline, units, and exam dates here..."
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtractSyllabus}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Gemini Extracting...' : 'Extract & Add Subjects'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Add Subject</h3>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Subject Code</label>
                  <input
                    type="text"
                    value={newSubjCode}
                    onChange={(e) => setNewSubjCode(e.target.value)}
                    placeholder="e.g. CS301"
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Exam Date</label>
                  <input
                    type="date"
                    value={newSubjExamDate}
                    onChange={(e) => setNewSubjExamDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Priority</label>
                  <select
                    value={newSubjPriority}
                    onChange={(e: any) => setNewSubjPriority(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700">Difficulty</label>
                  <select
                    value={newSubjDifficulty}
                    onChange={(e: any) => setNewSubjDifficulty(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  >
                    <option value="Hard">Hard</option>
                    <option value="Medium">Medium</option>
                    <option value="Easy">Easy</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
