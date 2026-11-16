import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Play,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  AlertCircle,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, QuizQuestion, QuizAttempt } from '../types';
import { generatePracticeQuestions, evaluateStudentAnswer } from '../services/api';
import { saveQuizAttempt, getQuizAttempts } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface PracticeTestsViewProps {
  subjects: Subject[];
  initialTopic?: string;
  initialSubject?: string;
  onNavigateToRevision?: (topic: string) => void;
}

export const PracticeTestsView: React.FC<PracticeTestsViewProps> = ({
  subjects,
  initialTopic = '',
  initialSubject = '',
  onNavigateToRevision,
}) => {
  const { userProfile } = useAuth();

  // Test setup form states
  const [selectedSubj, setSelectedSubj] = useState(initialSubject || subjects[0]?.name || '');
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [questionType, setQuestionType] = useState<string>('mcq');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [testDurationMinutes, setTestDurationMinutes] = useState<number>(15);

  // Active Test states
  const [isTestActive, setIsTestActive] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  // Test Result states
  const [testResult, setTestResult] = useState<QuizAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (userProfile?.uid) {
      getQuizAttempts(userProfile.uid).then(setPastAttempts);
    }
  }, [userProfile?.uid]);

  // Timer effect during active test
  useEffect(() => {
    let timer: any = null;
    if (isTestActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isTestActive && secondsRemaining === 0) {
      handleSubmitTest();
    }
    return () => clearInterval(timer);
  }, [isTestActive, secondsRemaining]);

  const startTestGeneration = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await generatePracticeQuestions({
        subject: selectedSubj,
        topic: selectedTopic || 'Core Syllabus Units',
        difficulty,
        questionType,
        count: questionCount,
      });

      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setStudentAnswers({});
        setFlaggedQuestions({});
        setCurrentQIndex(0);
        setSecondsRemaining(testDurationMinutes * 60);
        setIsTestActive(true);
        setTestResult(null);
      } else {
        setErrorMessage('Could not generate questions. Please try another topic or type.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate practice test.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId: string, answer: string) => {
    setStudentAnswers((prev) => ({ ...prev, [qId]: answer }));
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitTest = async () => {
    if (!confirm('Are you ready to submit your test for scoring and AI analysis?')) return;

    setIsEvaluating(true);
    try {
      let score = 0;
      const weakTopicsSet = new Set<string>();
      const evaluatedQuestions: QuizQuestion[] = [];

      for (const q of questions) {
        const studentAns = studentAnswers[q.id] || '';

        if (q.type === 'mcq' || q.type === 'true_false' || q.type === 'fill_blank') {
          // Objective evaluation
          const isCorrect =
            studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          if (isCorrect) score += 1;
          else weakTopicsSet.add(q.topic);

          evaluatedQuestions.push({
            ...q,
            studentAnswer: studentAns,
            evaluation: {
              marksAwarded: isCorrect ? 1 : 0,
              maxMarks: 1,
              isCorrect,
              feedback: isCorrect
                ? 'Correct response.'
                : `Incorrect. The correct answer is: ${q.correctAnswer}`,
            },
          });
        } else {
          // AI evaluation for descriptive / numerical / code answers
          const evalRes = await evaluateStudentAnswer({
            question: q.question,
            questionType: q.type,
            studentAnswer: studentAns,
            idealAnswer: q.correctAnswer,
            maxMarks: 5,
          });

          if (evalRes.marksAwarded >= 3) score += 1;
          if (evalRes.weakTopic) weakTopicsSet.add(evalRes.weakTopic);

          evaluatedQuestions.push({
            ...q,
            studentAnswer: studentAns,
            evaluation: {
              marksAwarded: evalRes.marksAwarded,
              maxMarks: evalRes.maxMarks,
              isCorrect: evalRes.isCorrect,
              feedback: evalRes.feedback,
            },
          });
        }
      }

      const accuracy = Math.round((score / questions.length) * 100);
      const attempt: QuizAttempt = {
        id: `qa_${Date.now()}`,
        userId: userProfile?.uid || 'temp',
        title: `${selectedSubj} • ${selectedTopic || 'Practice Test'}`,
        subjectName: selectedSubj,
        score,
        totalQuestions: questions.length,
        accuracyPercentage: accuracy,
        weakTopics: Array.from(weakTopicsSet),
        feedback:
          accuracy >= 80
            ? 'Excellent mastery of concepts. Solid retention ahead of examinations.'
            : accuracy >= 50
            ? 'Good attempt. Focus your revision on the weak topic areas listed below.'
            : 'Needs review. Recommend consulting FORGE AI tutor on flagged concepts.',
        createdAt: new Date().toISOString(),
      };

      await saveQuizAttempt(attempt);
      setQuestions(evaluatedQuestions);
      setTestResult(attempt);
      setIsTestActive(false);

      if (accuracy >= 70) {
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
      }

      // Refresh past attempts
      if (userProfile?.uid) {
        getQuizAttempts(userProfile.uid).then(setPastAttempts);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during test submission evaluation: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Practice Tests & Mock Examinations
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Simulated examination conditions, instant grading, and AI-assisted answer diagnosis.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STATE 1: SETUP TEST CONFIGURATION (When not actively in a test) */}
      {!isTestActive && !testResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2 Cols: Setup Form */}
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Generate Practice Examination
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject *</label>
                <select
                  value={selectedSubj}
                  onChange={(e) => setSelectedSubj(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Topic Focus</label>
                <input
                  type="text"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  placeholder="e.g. Higher Order Linear ODEs"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="fill_blank">Fill in Blanks</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Conceptual (2-3 Marks)</option>
                  <option value="numerical">Numerical Problems</option>
                  <option value="long_answer">10-Mark University Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e: any) => setDifficulty(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value="Easy">Easy (Foundations)</option>
                  <option value="Medium">Medium (University Standard)</option>
                  <option value="Hard">Hard (Gate / Tough Exam)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Questions Count</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value={5}>5 Questions (Quick Quiz)</option>
                  <option value={10}>10 Questions (Standard Test)</option>
                  <option value={15}>15 Questions (Full Section Mock)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={startTestGeneration}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                {loading ? 'Gemini Generating Exam Questions...' : 'Start Timed Practice Test'}
              </button>
            </div>
          </div>

          {/* 1 Col: Past Test History */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
              <span>Recent Test Attempts</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </h3>

            <div className="space-y-2.5 max-h-80 overflow-y-auto divide-y divide-neutral-100">
              {pastAttempts.map((att) => (
                <div key={att.id} className="pt-2 first:pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800 line-clamp-1">{att.title}</span>
                    <span
                      className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                        att.accuracyPercentage >= 75
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {att.score}/{att.totalQuestions} ({att.accuracyPercentage}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {new Date(att.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {pastAttempts.length === 0 && (
                <p className="text-xs text-neutral-400 py-4 text-center">No past test attempts yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE TIMED TEST RUNNER */}
      {isTestActive && currentQ && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden space-y-6 p-6">
          {/* Top Bar: Progress & Live Countdown Timer */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <h3 className="text-sm text-neutral-500 font-medium">{selectedSubj}</h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-sm">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <button
                onClick={() => toggleFlag(currentQ.id)}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                  flaggedQuestions[currentQ.id]
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
                title="Mark for review"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Review</span>
              </button>
            </div>
          </div>

          {/* Question Navigator Dots */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = !!studentAnswers[q.id];
              const isFlagged = !!flaggedQuestions[q.id];
              const isCurrent = idx === currentQIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/20 shadow-xs'
                      : isFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question Statement */}
          <div className="p-4 bg-neutral-50/70 border border-neutral-200/70 rounded-xl">
            <p className="text-sm sm:text-base font-semibold text-neutral-900 leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* Options (For MCQ) */}
          {currentQ.type === 'mcq' && currentQ.options && (
            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = studentAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    className={`w-full p-3.5 text-left rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold ring-2 ring-indigo-500/10'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-neutral-300'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {['True', 'False'].map((val) => {
                const isSelected = studentAnswers[currentQ.id] === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleSelectOption(currentQ.id, val)}
                    className={`p-4 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}

          {/* Descriptive / Text / Numerical input */}
          {currentQ.type !== 'mcq' && currentQ.type !== 'true_false' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Your Answer / Derivation / Steps:
              </label>
              <textarea
                rows={4}
                value={studentAnswers[currentQ.id] || ''}
                onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                placeholder="Type your response here..."
                className="w-full p-3 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {/* Bottom Navigation & Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <button
              onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
              disabled={currentQIndex === 0}
              className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {currentQIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQIndex(currentQIndex + 1)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  disabled={isEvaluating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isEvaluating ? 'Evaluating Answers...' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: RESULTS & AI DIAGNOSTIC REVIEW */}
      {testResult && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="text-center py-4 border-b border-neutral-100 space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Practice Examination Completed</h3>
            <p className="text-xs text-neutral-500">{testResult.title}</p>

            <div className="flex justify-center gap-6 pt-3">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-neutral-900">
                  {testResult.score} / {testResult.totalQuestions}
                </div>
                <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-indigo-600">
                  {testResult.accuracyPercentage}%
                </div>
                <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Accuracy
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-600 max-w-md mx-auto pt-2">{testResult.feedback}</p>
          </div>

          {/* Weak Topics Diagnostic */}
          {testResult.weakTopics.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Identified Weak Topics for Targeted Revision</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {testResult.weakTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => onNavigateToRevision?.(topic)}
                    className="px-3 py-1 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Review "{topic}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question-By-Question Detailed Breakdown */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-neutral-900">Question-by-Question Solution & Feedback</h4>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {questions.map((q, idx) => {
                const evalInfo = q.evaluation;
                const isCorrect = evalInfo?.isCorrect;

                return (
                  <div key={q.id} className="p-4 space-y-2 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-neutral-900">
                        {idx + 1}. {q.question}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                          isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {isCorrect ? 'Correct' : 'Needs Review'}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600">
                      <strong>Your Answer:</strong> {q.studentAnswer || '[Unanswered]'}
                    </div>

                    <div className="text-xs text-neutral-700">
                      <strong>Correct / Model Answer:</strong> {q.correctAnswer}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-neutral-100">
            <button
              onClick={() => {
                setTestResult(null);
                setIsTestActive(false);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Take Another Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
