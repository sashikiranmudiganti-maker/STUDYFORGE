import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  HelpCircle,
  Copy,
  Check,
  Bookmark,
  FileText,
  RotateCcw,
  Zap,
  GraduationCap,
} from 'lucide-react';
import { Subject } from '../types';
import { sendChatMessage } from '../services/api';
import { saveStudyMaterial } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface ForgeAiViewProps {
  subjects: Subject[];
  initialTopic?: string;
  initialSubject?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const ForgeAiView: React.FC<ForgeAiViewProps> = ({
  subjects,
  initialTopic = '',
  initialSubject = '',
}) => {
  const { userProfile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${userProfile?.fullName?.split(' ')[0] || 'there'}! I am **FORGE AI**, your personal academic tutor.

I can help you:
- **Explain challenging topics from zero** with intuitive real-world analogies.
- **Formulate 5-mark and 10-mark university exam answers** complete with diagrams, formulas, and derivations.
- **Generate practice numerical problems** with step-by-step solutions.
- **Summarize your syllabus notes** for fast, high-retention revision.

Select an explanation level above, pick a subject context, or ask any academic question below!`,
      timestamp: 'Now',
    },
  ]);

  const [inputMessage, setInputMessage] = useState(
    initialTopic ? `Please explain "${initialTopic}" in ${initialSubject} with clear examples and formulas.` : ''
  );
  const [explanationLevel, setExplanationLevel] = useState<
    'Beginner' | 'Simple' | 'Intermediate' | 'Advanced'
  >('Intermediate');
  const [selectedContextSubject, setSelectedContextSubject] = useState<string>(
    initialSubject || subjects[0]?.name || ''
  );
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestedPrompts = [
    'Explain this topic from zero with simple analogies',
    'Prepare a 10-mark model answer with diagrams & formulas',
    'Give me 3 high-yield numerical problems with solutions',
    'Teach me like a senior engineering professor',
    'Summarize this into high-yield formula bullet points',
    'What are the most common student mistakes in this topic?',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      // Find current subject context
      const currSubj = subjects.find((s) => s.name === selectedContextSubject);

      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const reply = await sendChatMessage({
        message: text,
        history: historyPayload,
        context: currSubj
          ? {
              subjectName: currSubj.name,
              units: currSubj.units,
              examDate: currSubj.examDate,
            }
          : undefined,
        explanationLevel,
      });

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorAiMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `**Error:** ${err.message || 'Unable to generate response. Check Gemini API key in Settings > Secrets.'}`,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToMaterials = async (id: string, content: string) => {
    try {
      await saveStudyMaterial({
        id: `note_chat_${Date.now()}`,
        userId: userProfile?.uid || 'temp',
        subjectName: selectedContextSubject || 'General Knowledge',
        title: `FORGE AI Explanation (${new Date().toLocaleDateString()})`,
        category: 'Notes',
        content,
        tags: [selectedContextSubject, 'FORGE AI'],
        createdAt: new Date().toISOString(),
      });
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-150">
      {/* Top Assistant Control Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs mb-3 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">FORGE AI Assistant</h2>
              <p className="text-[11px] text-neutral-500">Gemini-powered academic tutor • Rigorous explanations</p>
            </div>
          </div>

          {/* Subject Context Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium shrink-0">Syllabus Context:</span>
            <select
              value={selectedContextSubject}
              onChange={(e) => setSelectedContextSubject(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">General Curriculum</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Explanation Level Switcher */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 overflow-x-auto">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0">
            Depth:
          </span>
          {(['Beginner', 'Simple', 'Intermediate', 'Advanced'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setExplanationLevel(lvl)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                explanationLevel === lvl
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-neutral-800 text-white'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {isUser ? 'You' : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-xs sm:text-sm leading-relaxed text-left ${
                    isUser
                      ? 'bg-neutral-900 text-white rounded-tr-xs'
                      : 'bg-neutral-50 border border-neutral-200/80 text-neutral-900 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                </div>

                {!isUser && msg.id !== 'welcome' && (
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 pt-0.5">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-neutral-700 flex items-center gap-0.5"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => handleSaveToMaterials(msg.id, msg.content)}
                      className="hover:text-indigo-600 flex items-center gap-0.5"
                    >
                      {savedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Bookmark className="w-3 h-3" />
                      )}
                      <span>{savedId === msg.id ? 'Saved in Library' : 'Save to Notes'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-500 animate-pulse">
              FORGE AI is synthesizing explanation with formulas and syllabus examples...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Chips */}
      <div className="py-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] whitespace-nowrap px-3 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-xs flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask FORGE AI about ${selectedContextSubject || 'any syllabus topic, derivation or question'}...`}
          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent focus:outline-none text-neutral-900 placeholder:text-neutral-400"
        />

        <button
          type="submit"
          disabled={loading || !inputMessage.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
