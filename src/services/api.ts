import { Subject, StudySession, Flashcard, QuizQuestion } from '../types';

export interface ExtractionResult {
  subjects: Array<{
    name: string;
    code?: string;
    examDate?: string;
    examTime?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    units: Array<{
      unitNumber: number;
      title: string;
      topics: string[];
    }>;
  }>;
  confidenceNotes?: string;
}

export interface GeneratedPlanResult {
  summary: string;
  sessions: StudySession[];
}

export interface RescheduleResult {
  explanation: string;
  updatedSessions: StudySession[];
}

/**
 * Universal safe API caller:
 * Validates Content-Type before parsing JSON to prevent:
 * SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
 */
async function apiCall<T = any>(endpoint: string, payload?: any): Promise<T> {
  const options: RequestInit =
    payload !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      : {
          method: 'GET',
          headers: { Accept: 'application/json' },
        };

  let res: Response;
  try {
    res = await fetch(endpoint, options);
  } catch (netErr: any) {
    throw new Error(`Network connection error: ${netErr.message || 'Failed to reach server'}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    if (rawText.includes('<!doctype') || rawText.includes('<html')) {
      throw new Error(
        `Server initializing or temporarily busy (${res.status}). Please retry in a few seconds.`
      );
    }
    throw new Error(rawText || `Server returned status ${res.status}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    throw new Error('Received non-JSON response from server. Please retry.');
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}

export async function checkServerHealth() {
  try {
    return await apiCall('/api/health');
  } catch (err) {
    return { status: 'error', geminiConfigured: false };
  }
}

export async function extractSyllabus(payload: {
  text?: string;
  fileData?: string; // base64
  mimeType?: string;
  fileName?: string;
}): Promise<ExtractionResult> {
  return await apiCall<ExtractionResult>('/api/gemini/extract-syllabus', payload);
}

export async function generateStudyPlan(payload: {
  subjects: Subject[];
  availability: any;
  studyPreferences: any;
  studentName?: string;
}): Promise<GeneratedPlanResult> {
  return await apiCall<GeneratedPlanResult>('/api/gemini/generate-plan', payload);
}

export async function smartReschedule(payload: {
  missedSession: StudySession;
  remainingSessions: StudySession[];
  reason?: string;
  availability?: any;
}): Promise<RescheduleResult> {
  return await apiCall<RescheduleResult>('/api/gemini/reschedule', payload);
}

export async function sendChatMessage(payload: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: any;
  explanationLevel: 'Beginner' | 'Simple' | 'Intermediate' | 'Advanced';
}): Promise<string> {
  const result = await apiCall<{ reply: string }>('/api/gemini/chat', payload);
  return result?.reply || (result as any) || 'I could not generate an answer at this time.';
}

export async function generatePracticeQuestions(payload: {
  subject: string;
  unit?: string;
  topic?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionType: string;
  count: number;
}): Promise<{ questions: QuizQuestion[] }> {
  return await apiCall<{ questions: QuizQuestion[] }>('/api/gemini/generate-questions', payload);
}

export async function evaluateStudentAnswer(payload: {
  question: string;
  questionType: string;
  studentAnswer: string;
  idealAnswer?: string;
  maxMarks?: number;
}): Promise<{
  marksAwarded: number;
  maxMarks: number;
  percentage: number;
  isCorrect: boolean;
  feedback: string;
  missingPoints?: string[];
  weakTopic?: string;
  modelAnswer?: string;
}> {
  return await apiCall('/api/gemini/evaluate-answer', payload);
}

export async function generateFlashcards(payload: {
  subject: string;
  unit?: string;
  topic?: string;
  count?: number;
  notes?: string;
}): Promise<{ flashcards: Array<{ front: string; back: string; difficulty: 'Easy' | 'Medium' | 'Hard'; topic: string }> }> {
  return await apiCall('/api/gemini/generate-flashcards', payload);
}

export async function generateStudyNotes(payload: {
  subject: string;
  unit?: string;
  topic: string;
  type: 'summary' | 'formula_sheet' | 'five_mark' | 'ten_mark';
}): Promise<{
  title: string;
  category: 'Notes' | 'Formulas' | 'Summary';
  contentMarkdown: string;
  keyTakeaways: string[];
  suggestedExamQuestions: string[];
}> {
  return await apiCall('/api/gemini/generate-notes', payload);
}
