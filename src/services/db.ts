import {
  db,
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  UserProfile,
  Subject,
  StudySession,
  Flashcard,
  QuizAttempt,
  SavedMaterial,
} from '../types';
import {
  DEMO_USER_ID,
  DEMO_STUDENT_PROFILE,
  DEMO_SUBJECTS,
  DEMO_STUDY_SESSIONS,
  DEMO_FLASHCARDS,
  DEMO_QUIZ_ATTEMPTS,
  DEMO_SAVED_MATERIALS,
} from '../data/demoData';

function safeStorageParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const trimmed = raw.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype')) {
      localStorage.removeItem(key);
      return fallback;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

// User Profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_profile_${userId}`, DEMO_STUDENT_PROFILE);
  }

  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (profile.uid === DEMO_USER_ID) {
    localStorage.setItem(`studyforge_profile_${profile.uid}`, JSON.stringify(profile));
    return;
  }

  const path = `users/${profile.uid}`;
  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subjects
export async function getSubjects(userId: string): Promise<Subject[]> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_subjects_${userId}`, DEMO_SUBJECTS);
  }

  const path = 'subjects';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subject, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveSubject(subject: Subject): Promise<void> {
  if (subject.userId === DEMO_USER_ID) {
    const current = await getSubjects(DEMO_USER_ID);
    const idx = current.findIndex((s) => s.id === subject.id);
    const updated = idx >= 0 ? current.map((s) => (s.id === subject.id ? subject : s)) : [...current, subject];
    localStorage.setItem(`studyforge_subjects_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `subjects/${subject.id}`;
  try {
    const docRef = doc(db, 'subjects', subject.id);
    const { id, ...data } = subject;
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubject(subjectId: string, userId: string): Promise<void> {
  if (userId === DEMO_USER_ID) {
    const current = await getSubjects(DEMO_USER_ID);
    const updated = current.filter((s) => s.id !== subjectId);
    localStorage.setItem(`studyforge_subjects_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Study Sessions
export async function getStudySessions(userId: string): Promise<StudySession[]> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_sessions_${userId}`, DEMO_STUDY_SESSIONS);
  }

  const path = 'study_sessions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudySession, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStudySession(session: StudySession): Promise<void> {
  if (session.userId === DEMO_USER_ID) {
    const current = await getStudySessions(DEMO_USER_ID);
    const idx = current.findIndex((s) => s.id === session.id);
    const updated = idx >= 0 ? current.map((s) => (s.id === session.id ? session : s)) : [...current, session];
    localStorage.setItem(`studyforge_sessions_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `study_sessions/${session.id}`;
  try {
    const docRef = doc(db, 'study_sessions', session.id);
    const { id, ...data } = session;
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBatchStudySessions(sessions: StudySession[]): Promise<void> {
  if (sessions.length === 0) return;
  const userId = sessions[0].userId;

  if (userId === DEMO_USER_ID) {
    const current = await getStudySessions(DEMO_USER_ID);
    // Merge or replace
    const sessionMap = new Map(current.map((s) => [s.id, s]));
    sessions.forEach((s) => sessionMap.set(s.id, s));
    localStorage.setItem(`studyforge_sessions_${DEMO_USER_ID}`, JSON.stringify(Array.from(sessionMap.values())));
    return;
  }

  for (const session of sessions) {
    await saveStudySession(session);
  }
}

export async function updateSessionStatus(
  sessionId: string,
  userId: string,
  status: 'pending' | 'completed' | 'missed'
): Promise<void> {
  if (userId === DEMO_USER_ID) {
    const current = await getStudySessions(DEMO_USER_ID);
    const updated = current.map((s) =>
      s.id === sessionId
        ? { ...s, status, completedAt: status === 'completed' ? new Date().toISOString() : undefined }
        : s
    );
    localStorage.setItem(`studyforge_sessions_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `study_sessions/${sessionId}`;
  try {
    const docRef = doc(db, 'study_sessions', sessionId);
    await updateDoc(docRef, {
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudySession(sessionId: string, userId: string): Promise<void> {
  if (userId === DEMO_USER_ID) {
    const current = await getStudySessions(DEMO_USER_ID);
    const updated = current.filter((s) => s.id !== sessionId);
    localStorage.setItem(`studyforge_sessions_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `study_sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'study_sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Flashcards
export async function getFlashcards(userId: string): Promise<Flashcard[]> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_flashcards_${userId}`, DEMO_FLASHCARDS);
  }

  const path = 'flashcards';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Flashcard, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveFlashcard(card: Flashcard): Promise<void> {
  if (card.userId === DEMO_USER_ID) {
    const current = await getFlashcards(DEMO_USER_ID);
    const idx = current.findIndex((c) => c.id === card.id);
    const updated = idx >= 0 ? current.map((c) => (c.id === card.id ? card : c)) : [card, ...current];
    localStorage.setItem(`studyforge_flashcards_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `flashcards/${card.id}`;
  try {
    const docRef = doc(db, 'flashcards', card.id);
    const { id, ...data } = card;
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFlashcard(cardId: string, userId: string): Promise<void> {
  if (userId === DEMO_USER_ID) {
    const current = await getFlashcards(DEMO_USER_ID);
    const updated = current.filter((c) => c.id !== cardId);
    localStorage.setItem(`studyforge_flashcards_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `flashcards/${cardId}`;
  try {
    await deleteDoc(doc(db, 'flashcards', cardId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Quiz Attempts
export async function getQuizAttempts(userId: string): Promise<QuizAttempt[]> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_quizzes_${userId}`, DEMO_QUIZ_ATTEMPTS);
  }

  const path = 'quiz_attempts';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuizAttempt, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveQuizAttempt(attempt: QuizAttempt): Promise<void> {
  if (attempt.userId === DEMO_USER_ID) {
    const current = await getQuizAttempts(DEMO_USER_ID);
    const updated = [attempt, ...current];
    localStorage.setItem(`studyforge_quizzes_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `quiz_attempts/${attempt.id}`;
  try {
    const docRef = doc(db, 'quiz_attempts', attempt.id);
    const { id, ...data } = attempt;
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Saved Materials Library
export async function getSavedMaterials(userId: string): Promise<SavedMaterial[]> {
  if (userId === DEMO_USER_ID) {
    return safeStorageParse(`studyforge_materials_${userId}`, DEMO_SAVED_MATERIALS);
  }

  const path = 'saved_materials';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedMaterial, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStudyMaterial(material: SavedMaterial): Promise<void> {
  if (material.userId === DEMO_USER_ID) {
    const current = await getSavedMaterials(DEMO_USER_ID);
    const idx = current.findIndex((m) => m.id === material.id);
    const updated = idx >= 0 ? current.map((m) => (m.id === material.id ? material : m)) : [material, ...current];
    localStorage.setItem(`studyforge_materials_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `saved_materials/${material.id}`;
  try {
    const docRef = doc(db, 'saved_materials', material.id);
    const { id, ...data } = material;
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudyMaterial(materialId: string, userId: string): Promise<void> {
  if (userId === DEMO_USER_ID) {
    const current = await getSavedMaterials(DEMO_USER_ID);
    const updated = current.filter((m) => m.id !== materialId);
    localStorage.setItem(`studyforge_materials_${DEMO_USER_ID}`, JSON.stringify(updated));
    return;
  }

  const path = `saved_materials/${materialId}`;
  try {
    await deleteDoc(doc(db, 'saved_materials', materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function resetDemoData() {
  localStorage.removeItem(`studyforge_profile_${DEMO_USER_ID}`);
  localStorage.removeItem(`studyforge_subjects_${DEMO_USER_ID}`);
  localStorage.removeItem(`studyforge_sessions_${DEMO_USER_ID}`);
  localStorage.removeItem(`studyforge_flashcards_${DEMO_USER_ID}`);
  localStorage.removeItem(`studyforge_quizzes_${DEMO_USER_ID}`);
  localStorage.removeItem(`studyforge_materials_${DEMO_USER_ID}`);
}
