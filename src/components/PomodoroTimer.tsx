import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Droplets,
  Moon,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onTimerTick?: (formattedTime: string, isRunning: boolean) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  isOpen,
  onClose,
  onTimerTick,
}) => {
  const [mode, setMode] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(3);

  const durationMap = {
    study: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
      // Play audio chime or notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(mode === 'study' ? 'Time for a 5-minute break!' : 'Break ended! Ready to focus?');
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, mode]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  useEffect(() => {
    onTimerTick?.(formatted, isRunning);
  }, [formatted, isRunning, onTimerTick]);

  const switchMode = (newMode: 'study' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setIsRunning(false);
    setSecondsLeft(durationMap[newMode]);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(durationMap[mode]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Study Focus & Wellness</h3>
              <p className="text-[11px] text-neutral-500">Pomodoro 25/5 rhythm • Health over cramming</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-6">
          {/* Mode Switch Tabs */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl text-xs font-medium">
            <button
              onClick={() => switchMode('study')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'study'
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => switchMode('shortBreak')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'shortBreak'
                  ? 'bg-white text-teal-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => switchMode('longBreak')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'longBreak'
                  ? 'bg-white text-teal-700 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Long Rest (15m)
            </button>
          </div>

          {/* Large Countdown Display */}
          <div className="py-2">
            <div className="text-6xl font-mono font-bold tracking-tight text-neutral-900">
              {formatted}
            </div>
            <p className="text-xs text-neutral-500 mt-2 font-medium">
              {mode === 'study' ? 'Deep Work: Single-tasking on current syllabus topic' : 'Step away from screen, breathe and stretch'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs flex items-center gap-2 cursor-pointer transition-colors ${
                isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause' : 'Start Focus'}
            </button>
            <button
              onClick={resetTimer}
              className="p-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Wellness Checklist & Tips */}
          <div className="pt-4 border-t border-neutral-100 text-left space-y-3">
            {/* Water Tracker */}
            <div className="flex items-center justify-between text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
              <div className="flex items-center gap-2 text-neutral-700">
                <Droplets className="w-4 h-4 text-sky-500" />
                <span>Hydration goal (8 cups):</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <button
                    key={g}
                    onClick={() => setWaterGlasses(g === waterGlasses ? g - 1 : g)}
                    className={`w-4 h-5 rounded-xs transition-colors ${
                      g <= waterGlasses ? 'bg-sky-500' : 'bg-neutral-200'
                    }`}
                    title={`Cup ${g}`}
                  />
                ))}
              </div>
            </div>

            {/* Exam Stress Tip */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <HeartHandshake className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Health Rule: </span>
                Never pull an all-nighter before exams. Quality 8-hour sleep consolidates hippocampal memory far better than fatigued cramming.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
