export type PreparationLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type SessionStatus = 'pending' | 'completed' | 'missed';
export type SessionType = 'Study' | 'Revision' | 'Practice Test' | 'Buffer Catchup';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  collegeName?: string;
  course?: string;
  academicYear?: string;
  semester?: string;
  sleepDurationHours: number;
  collegeStart: string;
  collegeEnd: string;
  dailyStudyTargetHours: number;
  preparationLevel: PreparationLevel;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface UnitTopic {
  title: string;
  completed?: boolean;
}

export interface SubjectUnit {
  unitNumber: number;
  title: string;
  topics: string[];
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code?: string;
  examDate?: string;
  examTime?: string;
  priority: PriorityLevel;
  difficulty: DifficultyLevel;
  units: SubjectUnit[];
  completedTopics?: string[]; // list of completed topic keys e.g. "unit1-topicName"
  createdAt?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectName: string;
  subjectId?: string;
  unit: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  priority: PriorityLevel;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  type?: SessionType;
  notes?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  subjectName: string;
  unit?: string;
  topic?: string;
  front: string;
  back: string;
  difficulty: DifficultyLevel;
  status: 'new' | 'learning' | 'mastered' | 'review';
  repetitions?: number;
  nextReviewDate?: string;
  createdAt?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'fill_blank' | 'true_false' | 'short_answer' | 'long_answer' | 'numerical' | 'programming';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: DifficultyLevel;
  topic: string;
  marks?: number;
  studentAnswer?: string;
  evaluation?: {
    marksAwarded: number;
    maxMarks: number;
    isCorrect: boolean;
    feedback: string;
  };
}

export interface QuizAttempt {
  id: string;
  userId: string;
  title: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  accuracyPercentage: number;
  weakTopics: string[];
  feedback: string;
  createdAt: string;
}

export interface SavedMaterial {
  id: string;
  userId: string;
  subjectName: string;
  title: string;
  category: 'Notes' | 'Formulas' | 'Questions' | 'Summary' | 'Explanations';
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface AcademicReminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'exam' | 'assignment' | 'revision' | 'session' | 'wellness';
  completed?: boolean;
}

export interface AvailabilitySettings {
  startDate: string;
  endDate: string;
  collegeStart: string;
  collegeEnd: string;
  commuteMinutes: number;
  morningHours: string;
  eveningHours: string;
  weekendAvailabilityHours: number;
  sleepDurationHours: number;
  breakMinutes: number;
  dailyTargetHours: number;
}
