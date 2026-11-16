import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, Subject } from '../types';
import { getFlashcards, saveFlashcard, deleteFlashcard } from '../services/db';
import { generateFlashcards } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FlashcardsViewProps {
  subjects: Subject[];
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ subjects }) => {
  const { userProfile } = useAuth();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // AI Generator Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSubject, setAiSubject] = useState(subjects[0]?.name || 'Engineering Mathematics');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(6);
  const [loading, setLoading] = useState(false);

  // Manual Card Creation Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualSubj, setManualSubj] = useState(subjects[0]?.name || 'General');

  useEffect(() => {
    if (userProfile?.uid) {
      getFlashcards(userProfile.uid).then(setCards);
    }
  }, [userProfile?.uid]);

  const filteredCards = cards.filter((c) => {
    if (selectedSubjectFilter !== 'all' && c.subjectName !== selectedSubjectFilter) return false;
    return true;
  });

  const activeCard = filteredCards[currentCardIdx];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCardIdx((prev) => (prev + 1) % (filteredCards.length || 1));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentCardIdx((prev) => (prev - 1 + filteredCards.length) % (filteredCards.length || 1));
  };

  const handleRateCard = async (rating: 'Easy' | 'Medium' | 'Hard') => {
    if (!activeCard) return;

    const updated: Flashcard = {
      ...activeCard,
      difficulty: rating,
      status: rating === 'Easy' ? 'mastered' : rating === 'Medium' ? 'learning' : 'review',
      repetitions: (activeCard.repetitions || 0) + 1,
    };

    await saveFlashcard(updated);
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    if (rating === 'Easy') {
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } catch (e) {}
    }

    handleNext();
  };

  const handleGenerateAiDeck = async () => {
    setLoading(true);
    try {
      const res = await generateFlashcards({
        subject: aiSubject,
        topic: aiTopic || 'Key High-Yield Concepts',
        count: aiCount,
      });

      if (res.flashcards && res.flashcards.length > 0) {
        const userId = userProfile?.uid || 'temp';
        const newCards: Flashcard[] = res.flashcards.map((f, i) => ({
          id: `fc_ai_${Date.now()}_${i}`,
          userId,
          subjectName: aiSubject,
          topic: f.topic || aiTopic,
          front: f.front,
          back: f.back,
          difficulty: f.difficulty || 'Medium',
          status: 'new',
          repetitions: 0,
          createdAt: new Date().toISOString(),
        }));

        for (const card of newCards) {
          await saveFlashcard(card);
        }

        const refreshed = await getFlashcards(userId);
        setCards(refreshed);
        setShowAiModal(false);
        setAiTopic('');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate flashcards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFront.trim() || !manualBack.trim()) return;

    const newCard: Flashcard = {
      id: `fc_man_${Date.now()}`,
      userId: userProfile?.uid || 'temp',
      subjectName: manualSubj,
      front: manualFront.trim(),
      back: manualBack.trim(),
      difficulty: 'Medium',
      status: 'new',
      repetitions: 0,
      createdAt: new Date().toISOString(),
    };

    await saveFlashcard(newCard);
    setCards((prev) => [newCard, ...prev]);
    setShowManualModal(false);
    setManualFront('');
    setManualBack('');
  };

  const handleDeleteCard = async (id: string) => {
    await deleteFlashcard(id, userProfile?.uid || 'temp');
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const masteredCount = cards.filter((c) => c.status === 'mastered').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Active Recall Flashcards
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Spaced repetition and active recall drilling for high-yield exam retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Generate Deck
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Card
          </button>
        </div>
      </div>

      {/* Progress & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-neutral-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-neutral-800">
            Mastered: <span className="text-emerald-600">{masteredCount}</span> / {cards.length} cards
          </div>
          <div className="w-32 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${cards.length > 0 ? (masteredCount / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Filter Deck:</span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              setSelectedSubjectFilter(e.target.value);
              setCurrentCardIdx(0);
              setIsFlipped(false);
            }}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Subjects ({cards.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      {filteredCards.length > 0 && activeCard ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>
              Card {currentCardIdx + 1} of {filteredCards.length}
            </span>
            <span className="font-semibold text-neutral-700">{activeCard.subjectName}</span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[300px] sm:min-h-[340px] bg-white border border-neutral-200 hover:border-indigo-400 rounded-3xl p-8 sm:p-12 shadow-sm flex flex-col justify-between text-center cursor-pointer transition-all hover:shadow-md select-none relative"
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                {isFlipped ? 'Answer Key / Explanation' : 'Testing Question'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                {activeCard.difficulty}
              </span>
            </div>

            <div className="py-6 my-auto">
              <p className="text-base sm:text-xl font-bold text-neutral-900 leading-relaxed whitespace-pre-wrap">
                {isFlipped ? activeCard.back : activeCard.front}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Click card to flip</span>
            </div>
          </div>

          {/* Rating Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrev}
              className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 mr-1 hidden sm:inline">How did you do?</span>
              <button
                onClick={() => handleRateCard('Hard')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Hard (Review Soon)
              </button>
              <button
                onClick={() => handleRateCard('Medium')}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Medium (Good Recall)
              </button>
              <button
                onClick={() => handleRateCard('Easy')}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Easy (Mastered)
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400">
          <Layers className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
          <h3 className="text-sm font-bold text-neutral-800">No Flashcards in this deck yet</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Generate an instant revision deck with Gemini AI or create cards manually.
          </p>
          <button
            onClick={() => setShowAiModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
          >
            Generate AI Flashcards
          </button>
        </div>
      )}

      {/* AI Generate Deck Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                AI Flashcard Deck Generator
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject</label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
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
                <label className="block text-xs font-medium text-neutral-700">Topic or Concept *</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. De Morgan's Laws, AVL Rotations, Laplace Transforms"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Cards Count</label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value={4}>4 Flashcards</option>
                  <option value={6}>6 Flashcards (Standard)</option>
                  <option value={10}>10 Flashcards (Deep Drill)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAiDeck}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Generating...' : 'Create Flashcard Deck'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Card Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Create Flashcard</h3>
              <button onClick={() => setShowManualModal(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject</label>
                <select
                  value={manualSubj}
                  onChange={(e) => setManualSubj(e.target.value)}
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
                <label className="block text-xs font-medium text-neutral-700">Question / Front *</label>
                <textarea
                  rows={2}
                  required
                  value={manualFront}
                  onChange={(e) => setManualFront(e.target.value)}
                  placeholder="e.g. What is the time complexity of AVL insertion?"
                  className="mt-1 w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Answer / Back *</label>
                <textarea
                  rows={3}
                  required
                  value={manualBack}
                  onChange={(e) => setManualBack(e.target.value)}
                  placeholder="e.g. O(log n) worst-case due to balanced tree rotations."
                  className="mt-1 w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
