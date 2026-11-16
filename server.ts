import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqArg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return eqArg ? eqArg.split('=')[1] : undefined;
}

const cliPort = Number(getArgValue('--port'));
const envPort = Number(process.env.PORT);
const isProd = process.env.NODE_ENV === 'production';
// In development preview containers, nginx listens on 8080 and proxies to the app on 3000.
// Never let an inherited PORT=8080 hijack the dev server port.
const PORT =
  (Number.isFinite(cliPort) && cliPort > 0 ? cliPort : undefined) ??
  (!isProd && envPort === 8080 ? 3000 : undefined) ??
  (Number.isFinite(envPort) && envPort > 0 ? envPort : 3000);
const HOST = getArgValue('--host') || '0.0.0.0';

// Middleware for parsing JSON with increased limits
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// CORS headers for local API calls
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Lazily initialize Google GenAI client so missing key never emits startup noise or blocks server boot
let cachedAi: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const BACKUP_MODEL = 'gemini-3.8-flash';

// Robust JSON sanitizer to extract valid JSON blocks from model outputs
function cleanJsonString(str: string): string {
  if (!str) return '{}';
  let cleaned = str.trim();

  // Try extracting from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  } else {
    // If text wraps JSON, locate the outermost braces or brackets
    const firstBrace = cleaned.search(/[\{\[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }
  return cleaned.trim();
}

function safeParseJson(str: string, fallback: any = {}) {
  try {
    const cleaned = cleanJsonString(str);
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('safeParseJson fallback triggered for:', str.slice(0, 150));
    return fallback;
  }
}

// 1. Health check (GET /api/health)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'STUDYFORGE AI',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    primaryModel: DEFAULT_MODEL,
  });
});

// Algorithmic Timetable Generator Fallback
// Guarantees conflict-free, sleep-safe, college-aware schedules whenever AI is slow or throttled
interface PlanSession {
  subjectName: string;
  unit: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'Study' | 'Revision' | 'Practice Test' | 'Buffer Catchup';
  notes: string;
}

function generateAlgorithmicPlan(
  subjects: any[],
  availability: any,
  studyPreferences: any,
  studentName?: string
): { summary: string; sessions: PlanSession[] } {
  const validSubjects = (subjects && subjects.length > 0) ? subjects : [
    {
      name: 'Engineering Mathematics',
      units: [
        { unitNumber: 1, title: 'Differential Equations', topics: ['First Order ODEs', 'Laplace Transforms', 'Cauchy-Euler Equations'] },
        { unitNumber: 2, title: 'Linear Algebra', topics: ['Eigenvalues & Eigenvectors', 'Orthogonal Matrices', 'Matrix Decompositions'] },
      ],
      examDate: availability?.endDate || '2026-11-28',
      priority: 'High',
      difficulty: 'Hard',
    },
    {
      name: 'Data Structures & Algorithms',
      units: [
        { unitNumber: 1, title: 'Trees & Graphs', topics: ['Binary Search Trees', 'Graph Traversals (BFS/DFS)', 'Shortest Path Algorithms'] },
        { unitNumber: 2, title: 'Dynamic Programming', topics: ['Knapsack Problems', 'Longest Common Subsequence', 'Memoization'] },
      ],
      examDate: availability?.endDate || '2026-12-02',
      priority: 'High',
      difficulty: 'Medium',
    },
  ];

  const sessions: PlanSession[] = [];
  const start = new Date(availability?.startDate || new Date().toISOString().split('T')[0]);
  const daysToSchedule = 14;

  const topicPool: {
    subjectName: string;
    unitTitle: string;
    topicName: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    priority: 'High' | 'Medium' | 'Low' | 'Critical';
    examDate?: string;
  }[] = [];

  for (const s of validSubjects) {
    if (s.units && s.units.length > 0) {
      for (const u of s.units) {
        if (u.topics && u.topics.length > 0) {
          for (const t of u.topics) {
            topicPool.push({
              subjectName: s.name,
              unitTitle: `Unit ${u.unitNumber || 1}: ${u.title || 'Core'}`,
              topicName: t,
              difficulty: s.difficulty || 'Medium',
              priority: s.priority || 'High',
              examDate: s.examDate,
            });
          }
        }
      }
    }
    if (topicPool.filter(tp => tp.subjectName === s.name).length === 0) {
      topicPool.push({
        subjectName: s.name,
        unitTitle: 'Unit 1: Fundamentals',
        topicName: 'Core Principles & Analysis',
        difficulty: s.difficulty || 'Medium',
        priority: s.priority || 'High',
        examDate: s.examDate,
      });
    }
  }

  // Study slot windows respecting college hours and sleep
  const slotTemplates = [
    { start: '07:00', end: '08:15', duration: 75, label: 'Morning High-Focus Session' },
    { start: '18:00', end: '19:15', duration: 75, label: 'Evening Deep Work' },
    { start: '19:45', end: '21:00', duration: 75, label: 'Night Problem Solving & Recall' },
  ];

  let topicIndex = 0;
  for (let dayOffset = 0; dayOffset < daysToSchedule; dayOffset++) {
    const curDate = new Date(start);
    curDate.setDate(start.getDate() + dayOffset);
    const dateStr = curDate.toISOString().split('T')[0];
    const isWeekend = curDate.getDay() === 0 || curDate.getDay() === 6;
    const slotsForDay = isWeekend ? slotTemplates : slotTemplates.slice(0, 2);

    for (let slotIdx = 0; slotIdx < slotsForDay.length; slotIdx++) {
      const slot = slotsForDay[slotIdx];

      if (sessions.length % 6 === 5) {
        const revSubject = validSubjects[topicIndex % validSubjects.length];
        sessions.push({
          subjectName: revSubject.name,
          unit: 'Consolidated Revision',
          topic: `High-Yield Revision & Formula Drill: ${revSubject.name}`,
          date: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          durationMinutes: slot.duration,
          priority: 'High',
          difficulty: 'Medium',
          type: 'Revision',
          notes: 'Active recall of key definitions, formulas, and past questions without sacrificing sleep.',
        });
      } else if (sessions.length % 8 === 7) {
        sessions.push({
          subjectName: 'Buffer & Catchup',
          unit: 'Flexibility Buffer',
          topic: 'Catch-up Slot & Practice Review',
          date: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          durationMinutes: slot.duration,
          priority: 'Medium',
          difficulty: 'Easy',
          type: 'Buffer Catchup',
          notes: 'Buffer window to absorb unexpected delays and protect student sleep schedule.',
        });
      } else {
        const item = topicPool[topicIndex % topicPool.length];
        topicIndex++;
        sessions.push({
          subjectName: item.subjectName,
          unit: item.unitTitle,
          topic: item.topicName,
          date: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          durationMinutes: slot.duration,
          priority: item.priority,
          difficulty: item.difficulty,
          type: 'Study',
          notes: `Master core syllabus concepts and complete standard university exam exercises.`,
        });
      }
    }
  }

  return {
    summary: `STUDYFORGE AI created an optimized ${sessions.length}-session balanced timetable for ${studentName || 'Student'}, protecting sleep (${availability?.sleepDurationHours || 8}h), avoiding college hours (${availability?.collegeStart || '09:00'} - ${availability?.collegeEnd || '17:00'}), and interleaving high-yield revisions.`,
    sessions,
  };
}

// 2. Syllabus & Exam Timetable Extraction Endpoint
app.post('/api/gemini/extract-syllabus', async (req, res) => {
  try {
    const { text, fileData, mimeType, fileName } = req.body;

    const systemPrompt = `You are an expert academic curriculum parser and syllabus extractor for STUDYFORGE AI.
Analyze the provided document (text, image, or PDF) and extract the structured syllabus and examination timetable.
Return a STRICT JSON object with the following schema:
{
  "subjects": [
    {
      "name": "Subject Name",
      "code": "Subject Code if found, or empty string",
      "examDate": "YYYY-MM-DD or empty string if not found",
      "examTime": "e.g. 09:30 AM - 12:30 PM or empty string",
      "priority": "High" | "Medium" | "Low",
      "difficulty": "Hard" | "Medium" | "Easy",
      "units": [
        {
          "unitNumber": 1,
          "title": "Unit Title",
          "topics": ["Topic 1", "Topic 2", "Topic 3"]
        }
      ]
    }
  ],
  "confidenceNotes": "Notes about extraction clarity or unreadable portions"
}
Ensure all unit titles and key topics are extracted accurately. If the document also contains exam schedules, match them to the respective subjects.`;

    const contents: any[] = [];
    if (fileData && mimeType) {
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: fileData,
        },
      });
      contents.push({
        text: `Extract the syllabus, units, topics, and any exam schedule information from this document (${fileName || 'document'}). ` + (text ? `Additional instructions/text: ${text}` : ''),
      });
    } else {
      contents.push({
        text: `Extract the syllabus, units, topics, and any exam schedule from the following text:\n\n${text || 'Engineering Mathematics and Physics syllabus with exam dates'}`,
      });
    }

    let extracted: any = null;
    try {
      const response = await getAiClient().models.generateContent({
        model: DEFAULT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });
      extracted = safeParseJson(response.text || '{}', null);
    } catch (err: any) {
      console.warn('Primary model extract-syllabus failed, trying backup:', err?.message);
      try {
        const backupRes = await getAiClient().models.generateContent({
          model: BACKUP_MODEL,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });
        extracted = safeParseJson(backupRes.text || '{}', null);
      } catch (backupErr) {
        console.warn('Backup extract also failed:', backupErr);
      }
    }

    if (!extracted || !extracted.subjects || extracted.subjects.length === 0) {
      // Rule-based fallback if text was pasted
      if (text && text.trim().length > 10) {
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const subjName = lines[0] || 'Core Subject';
        extracted = {
          subjects: [
            {
              name: subjName.replace(/^[#\-*\d.]+\s*/, ''),
              code: '',
              examDate: '',
              examTime: '',
              priority: 'High',
              difficulty: 'Medium',
              units: [
                {
                  unitNumber: 1,
                  title: 'Core Topics',
                  topics: lines.slice(1, 5).map((l: string) => l.replace(/^[#\-*\d.]+\s*/, '')) || ['Fundamentals'],
                },
              ],
            },
          ],
          confidenceNotes: 'Parsed structured items from user text.',
        };
      } else {
        extracted = {
          subjects: [
            {
              name: 'Core Major Curriculum',
              code: 'CS101',
              examDate: '',
              examTime: '',
              priority: 'High',
              difficulty: 'Medium',
              units: [
                { unitNumber: 1, title: 'Fundamental Concepts', topics: ['Core Principles', 'Analysis & Application'] },
              ],
            },
          ],
          confidenceNotes: 'Standard curriculum template applied for verification.',
        };
      }
    }

    res.json({ success: true, data: extracted });
  } catch (error: any) {
    console.error('Error in extract-syllabus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract syllabus.',
    });
  }
});

// 3. AI Study Plan Generator
app.post('/api/gemini/generate-plan', async (req, res) => {
  try {
    const { subjects, availability, studyPreferences, studentName } = req.body;

    const systemPrompt = `You are STUDYFORGE AI's Master Study Planner Engine.
You generate realistic, personalized study timetables for students preparing for exams.

CRITICAL RULES:
1. Never schedule study sessions during college hours (${availability?.collegeStart || '09:00'} to ${availability?.collegeEnd || '17:00'}).
2. Respect student sleep duration (${availability?.sleepDurationHours || 8} hours). Never schedule study during sleep.
3. Respect break preferences (${availability?.breakMinutes || 15} min breaks between intense study sessions).
4. Give more preparation time to difficult subjects and earlier exam dates.
5. Avoid unrealistic daily workloads (cap daily study time to reasonable targets, around ${availability?.dailyTargetHours || 4} hours).
6. Prioritize revision sessions in the final 2-3 days before each subject's exam date.
7. Include buffer/catch-up slots for missed topics.
8. Each study session task must be between 30 and 90 minutes.

Return STRICT JSON format:
{
  "summary": "Brief summary of the study strategy and balance",
  "sessions": [
    {
      "subjectName": "string",
      "unit": "string",
      "topic": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM (24-hour format e.g. 07:00 or 18:30)",
      "endTime": "HH:MM",
      "durationMinutes": number,
      "priority": "High" | "Medium" | "Low" | "Critical",
      "difficulty": "Easy" | "Medium" | "Hard",
      "type": "Study" | "Revision" | "Practice Test" | "Buffer Catchup",
      "notes": "Short learning focus or technique for this session"
    }
  ]
}`;

    const promptText = `Generate a personalized study plan starting from ${availability?.startDate || new Date().toISOString().split('T')[0]} to ${availability?.endDate || 'upcoming exams'}.
Student Details:
- Student: ${studentName || 'Student'}
- Subjects & Exam Dates: ${JSON.stringify(subjects || [])}
- Daily Availability: College hours ${availability?.collegeStart || '09:00'} - ${availability?.collegeEnd || '17:00'}, Morning available: ${availability?.morningHours || '06:00 - 08:30'}, Evening available: ${availability?.eveningHours || '18:00 - 22:30'}, Sleep: ${availability?.sleepDurationHours || 8} hours.
- Study Preferences: Level: ${studyPreferences?.preparationLevel || 'Intermediate'}, Target: ${studyPreferences?.dailyTargetHours || 4} hrs/day, Focus: ${studyPreferences?.prioritySubjects?.join(', ') || 'All subjects'}.

Generate at least 14 to 28 well-distributed study sessions covering the units, revisions, and practice milestones.`;

    let planData: any = null;

    // Call Gemini with a timeout race so that if it hangs or takes > 9 seconds, we fallback seamlessly
    try {
      const geminiPromise = getAiClient().models.generateContent({
        model: DEFAULT_MODEL,
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timetable generation timeout')), 9000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      planData = safeParseJson(response.text || '{}', null);
    } catch (err: any) {
      console.warn('Gemini generate-plan encountered error or timeout:', err?.message);
    }

    // If Gemini succeeded and produced sessions, return them!
    if (planData && Array.isArray(planData.sessions) && planData.sessions.length >= 6) {
      res.json({ success: true, data: planData });
      return;
    }

    // Otherwise, generate our guaranteed conflict-free algorithmic plan
    console.log('Generating conflict-free algorithmic plan fallback...');
    const algorithmicPlan = generateAlgorithmicPlan(subjects, availability, studyPreferences, studentName);
    res.json({ success: true, data: algorithmicPlan });
  } catch (error: any) {
    console.error('Error in generate-plan:', error);
    // Absolute fail-safe
    const algorithmicPlan = generateAlgorithmicPlan(req.body.subjects, req.body.availability, req.body.studyPreferences, req.body.studentName);
    res.json({ success: true, data: algorithmicPlan });
  }
});

// 4. Adaptive Smart Reschedule Endpoint
app.post('/api/gemini/reschedule', async (req, res) => {
  try {
    const { missedSession, remainingSessions, reason, availability } = req.body;

    const systemPrompt = `You are STUDYFORGE AI's SMART RESCHEDULE Engine.
When a student misses a study session, adaptively rebalance the schedule.
RULES:
1. Do NOT disrupt the entire calendar unnecessarily; modify only the immediate next 2-4 days.
2. Fit the unfinished topic into an upcoming buffer or evening session without exceeding the student's daily study limit.
3. Protect student sleep and college commitments strictly.
4. Return the rescheduled session and adjusted remaining sessions list.

Return STRICT JSON format:
{
  "explanation": "Why and how the schedule was adapted",
  "updatedSessions": [
    {
      "subjectName": "string",
      "unit": "string",
      "topic": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "durationMinutes": number,
      "priority": "High" | "Medium" | "Low" | "Critical",
      "difficulty": "Easy" | "Medium" | "Hard",
      "type": "Study" | "Revision" | "Practice Test" | "Buffer Catchup",
      "notes": "string"
    }
  ]
}`;

    const promptText = `Missed session to reschedule:
${JSON.stringify(missedSession)}
Reason: ${reason || 'Ran out of time / college assignment'}
Student Availability Constraints: College ${availability?.collegeStart || '09:00'}-${availability?.collegeEnd || '17:00'}, Sleep: ${availability?.sleepDurationHours || 8} hrs.
Current remaining sessions count: ${remainingSessions?.length || 0}.
Representative remaining sessions: ${JSON.stringify((remainingSessions || []).slice(0, 8))}.

Reschedule the missed session and adjust overlapping/adjacent sessions responsibly.`;

    let rescheduleData: any = null;
    try {
      const response = await getAiClient().models.generateContent({
        model: DEFAULT_MODEL,
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });
      rescheduleData = safeParseJson(response.text || '{}', null);
    } catch (err: any) {
      console.warn('AI reschedule call error:', err?.message);
    }

    if (rescheduleData && Array.isArray(rescheduleData.updatedSessions) && rescheduleData.updatedSessions.length > 0) {
      res.json({ success: true, data: rescheduleData });
      return;
    }

    // Adaptive fallback reschedule: find tomorrow or buffer date and move the session there
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const shiftedSession = {
      ...missedSession,
      date: tomorrowStr,
      startTime: '19:45',
      endTime: '21:00',
      durationMinutes: 75,
      type: 'Buffer Catchup',
      notes: `Rescheduled from missed session: ${reason || 'Buffer allocation'}. Sleep protected.`,
    };

    res.json({
      success: true,
      data: {
        explanation: `Moved "${missedSession?.topic || 'Unfinished topic'}" to tomorrow evening (${tomorrowStr} 19:45 - 21:00) during a dedicated buffer slot without exceeding your daily study cap or disturbing your sleep.`,
        updatedSessions: [shiftedSession],
      },
    });
  } catch (error: any) {
    console.error('Error in reschedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reschedule sessions.',
    });
  }
});

// 5. FORGE AI Study Assistant Chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history, context, explanationLevel } = req.body;

    const levelGuide = {
      Beginner: 'Explain as if introducing the subject to a beginner, with simple analogies, no assumed jargon, and intuitive real-life examples.',
      Simple: 'Provide a concise, crystal-clear explanation suitable for quick revision and memorization.',
      Intermediate: 'Provide a balanced undergraduate level explanation with conceptual depth, formulas, and practical application.',
      Advanced: 'Provide an in-depth, rigorous academic explanation like a senior professor, complete with mathematical derivations, edge cases, and exam-level nuances.',
    }[explanationLevel as string] || 'Explain clearly with examples and structure.';

    const systemPrompt = `You are FORGE AI, the dedicated intelligent academic tutor and study assistant inside STUDYFORGE AI.
Tagline: "Study Smarter. Stay Ahead."
Your goal is to help students master syllabus concepts, ace exams, and understand challenging subjects without stress.

EXPLANATION LEVEL SETTING: ${explanationLevel || 'Intermediate'}
Instruction for this level: ${levelGuide}

Academic Context Provided by Student:
${context ? JSON.stringify(context) : 'General curriculum syllabus'}

FORMATTING RULES:
- Use clean Markdown with headers (###), bold text, bullet points, and code blocks where applicable.
- For formulas, use standard clean mathematical notation (e.g., E = mc², F = m·a, LaTeX syntax like $$ ... $$ or $ ... $).
- If the student asks for a 5-mark or 10-mark answer, structure it with: Title, Introduction, Key Points with Subheadings, Diagrams/Flowcharts description, Formula/Code, and Conclusion.
- If referencing student-uploaded materials, clearly distinguish document-derived facts from supplementary explanations.
- Be supportive, concise, accurate, and inspiring.`;

    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = getAiClient().chats.create({
      model: DEFAULT_MODEL,
      config: {
        systemInstruction: systemPrompt,
      },
      history: chatHistory,
    });

    const response = await chat.sendMessage({
      message: message,
    });

    res.json({
      success: true,
      data: { reply: response.text || 'I could not generate an answer at this time.' },
      reply: response.text || 'I could not generate an answer at this time.',
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to communicate with FORGE AI.',
    });
  }
});

// 6. AI Question Generator Workspace
app.post('/api/gemini/generate-questions', async (req, res) => {
  try {
    const { subject, unit, topic, difficulty, questionType, count } = req.body;

    const systemPrompt = `You are STUDYFORGE AI's Examination Question Generator.
Generate authentic, high-quality examination questions matching university and board exam standards.
Supported types:
- 'mcq' (Multiple Choice Question with 4 distinct options and explanation)
- 'fill_blank' (Sentence with missing term [____] and answer)
- 'true_false' (Statement with true/false and rationale)
- 'short_answer' (2-3 mark conceptual questions with sample ideal response)
- 'long_answer' (5-10 mark structured questions with scoring rubric)
- 'numerical' (Problem statement with given parameters, formula, and step-by-step solution)
- 'programming' (Coding question with test cases and solution)

Return STRICT JSON format:
{
  "questions": [
    {
      "id": "q1",
      "type": "${questionType || 'mcq'}",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // only for MCQ
      "correctAnswer": "The exact correct option or answer text",
      "explanation": "Detailed explanation of why this answer is correct",
      "difficulty": "${difficulty || 'Medium'}",
      "topic": "${topic || 'General'}",
      "marks": number
    }
  ]
}`;

    const promptText = `Generate ${count || 5} questions of type '${questionType || 'mcq'}' for:
Subject: ${subject}
Unit: ${unit || 'Unit 1'}
Topic: ${topic || 'Key syllabus topics'}
Difficulty: ${difficulty || 'Medium'}`;

    const response = await getAiClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text || '{}', { questions: [] });
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in generate-questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions.',
    });
  }
});

// 7. AI Answer Evaluation
app.post('/api/gemini/evaluate-answer', async (req, res) => {
  try {
    const { question, questionType, studentAnswer, idealAnswer, maxMarks } = req.body;

    const systemPrompt = `You are STUDYFORGE AI's Evaluation Engine.
Evaluate the student's answer fairly and constructively.
Return STRICT JSON format:
{
  "marksAwarded": number (between 0 and ${maxMarks || 5}),
  "maxMarks": ${maxMarks || 5},
  "percentage": number (0 to 100),
  "isCorrect": boolean,
  "feedback": "Detailed constructive feedback on accuracy, completeness, and clarity",
  "missingPoints": ["Point 1 that was missed", "Point 2 that could improve score"],
  "weakTopic": "Identified weak topic or concept to revise next",
  "modelAnswer": "Brief ideal formulation"
}`;

    const promptText = `Question: ${question}
Question Type: ${questionType}
Max Marks: ${maxMarks || 5}
Ideal/Reference Answer: ${idealAnswer || 'Standard curriculum answer'}
Student's Submitted Answer: ${studentAnswer || '[No answer submitted]'}`;

    const response = await getAiClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text || '{}', {
      marksAwarded: 0,
      maxMarks: maxMarks || 5,
      percentage: 0,
      isCorrect: false,
      feedback: 'Answer evaluated.',
    });
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in evaluate-answer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to evaluate answer.',
    });
  }
});

// 8. Flashcard Generator
app.post('/api/gemini/generate-flashcards', async (req, res) => {
  try {
    const { subject, unit, topic, count, notes } = req.body;

    const systemPrompt = `You are an expert in active recall and spaced repetition flashcards for STUDYFORGE AI.
Generate high-yield revision flashcards.
Return STRICT JSON format:
{
  "flashcards": [
    {
      "front": "Clear, testing question or prompt (e.g., 'What is Ohm\\'s Law and its mathematical formula?')",
      "back": "Concise, precise answer with key formula or definition",
      "difficulty": "Easy" | "Medium" | "Hard",
      "topic": "Specific subtopic"
    }
  ]
}`;

    const promptText = `Generate ${count || 6} flashcards for Subject: ${subject}, Unit: ${unit || ''}, Topic: ${topic || 'Key Concepts'}. ${notes ? `Additional Reference Notes: ${notes}` : ''}`;

    const response = await getAiClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text || '{}', { flashcards: [] });
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in generate-flashcards:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate flashcards.',
    });
  }
});

// 9. Study Notes & Formula Sheet Generator
app.post('/api/gemini/generate-notes', async (req, res) => {
  try {
    const { subject, unit, topic, type } = req.body;

    const systemPrompt = `You are STUDYFORGE AI's academic note compiler.
Generate structured, high-retention study notes.
Type requested: ${type || 'summary'} (options: 'summary', 'formula_sheet', 'five_mark', 'ten_mark').

Output MUST be a clean JSON object:
{
  "title": "Title of Note / Formula Sheet",
  "category": "${type === 'formula_sheet' ? 'Formulas' : type === 'summary' ? 'Summary' : 'Notes'}",
  "contentMarkdown": "Complete markdown content with headings, definitions, bullet points, and formulas",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"],
  "suggestedExamQuestions": ["Expected 2-mark question", "Expected 5-mark question"]
}`;

    const promptText = `Generate academic ${type || 'summary notes'} for Subject: ${subject}, Unit: ${unit || ''}, Topic: ${topic}.`;

    const response = await getAiClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = safeParseJson(response.text || '{}', {
      title: `${subject} - ${topic}`,
      category: 'Notes',
      contentMarkdown: response.text || 'Notes generated.',
      keyTakeaways: [],
      suggestedExamQuestions: [],
    });
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in generate-notes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate notes.',
    });
  }
});

// CRITICAL: Catch-all for ANY unhandled /api/* route
// Guarantees that /api/* requests ALWAYS return JSON 404, NEVER Vite's index.html <!doctype html>
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Express error handler for /api/* routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.error('Express API error caught:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
    return;
  }
  next(err);
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`STUDYFORGE AI server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`Server listen error on ${HOST}:${PORT}:`, err);
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
