import { UserProfile, Subject, StudySession, Flashcard, QuizAttempt, SavedMaterial } from '../types';

export const DEMO_USER_ID = 'demo_user_alex_sharma_001';

export const DEMO_STUDENT_PROFILE: UserProfile = {
  uid: DEMO_USER_ID,
  fullName: 'Alex Sharma',
  email: 'alex.sharma@college.edu',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  collegeName: 'National Institute of Technology',
  course: 'B.Tech Computer Science & Engineering',
  academicYear: '1st Year',
  semester: 'Semester 2',
  sleepDurationHours: 8,
  collegeStart: '09:00',
  collegeEnd: '16:30',
  dailyStudyTargetHours: 3.5,
  preparationLevel: 'Intermediate',
  onboardingCompleted: true,
  createdAt: '2026-11-01T10:00:00Z',
  lastLoginAt: '2026-11-07T08:30:00Z',
};

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'subj_maths_1',
    userId: DEMO_USER_ID,
    name: 'Engineering Mathematics-II',
    code: 'MATH201',
    examDate: '2026-11-18',
    examTime: '09:30 AM - 12:30 PM',
    priority: 'Critical',
    difficulty: 'Hard',
    units: [
      {
        unitNumber: 1,
        title: 'Ordinary Differential Equations & Applications',
        topics: [
          'First Order Linear Differential Equations',
          'Exact Differential Equations and Integrating Factors',
          'Higher Order Linear Equations with Constant Coefficients',
          'Cauchy-Euler Equations',
          'Applications to Electrical Circuits and Harmonic Oscillators',
        ],
      },
      {
        unitNumber: 2,
        title: 'Laplace Transforms & Inverse Transforms',
        topics: [
          'Definition and Existence of Laplace Transforms',
          'First and Second Shifting Theorems',
          'Transforms of Derivatives and Integrals',
          'Convolution Theorem and Applications',
          'Solving Initial Value Problems using Laplace',
        ],
      },
    ],
    completedTopics: [
      'First Order Linear Differential Equations',
      'Exact Differential Equations and Integrating Factors',
      'Definition and Existence of Laplace Transforms',
    ],
  },
  {
    id: 'subj_dsa_2',
    userId: DEMO_USER_ID,
    name: 'Data Structures & Algorithms',
    code: 'CS202',
    examDate: '2026-11-22',
    examTime: '02:00 PM - 05:00 PM',
    priority: 'High',
    difficulty: 'Hard',
    units: [
      {
        unitNumber: 1,
        title: 'Linear Data Structures & Complexity',
        topics: [
          'Asymptotic Notations: Big-O, Omega, Theta',
          'Singly and Doubly Linked Lists Implementations',
          'Stack Applications: Expression Evaluation & Infix to Postfix',
          'Circular and Priority Queues',
        ],
      },
      {
        unitNumber: 2,
        title: 'Non-Linear Structures: Trees & Graphs',
        topics: [
          'Binary Search Tree: Insertion, Deletion, Traversal',
          'AVL Trees and Balancing Rotations',
          'Graph Representation: Adjacency Matrix & Lists',
          'Breadth-First Search (BFS) and Depth-First Search (DFS)',
        ],
      },
    ],
    completedTopics: [
      'Asymptotic Notations: Big-O, Omega, Theta',
      'Singly and Doubly Linked Lists Implementations',
      'Stack Applications: Expression Evaluation & Infix to Postfix',
    ],
  },
  {
    id: 'subj_dld_3',
    userId: DEMO_USER_ID,
    name: 'Digital Logic & Computer Design',
    code: 'EC203',
    examDate: '2026-11-26',
    examTime: '09:30 AM - 12:30 PM',
    priority: 'Medium',
    difficulty: 'Medium',
    units: [
      {
        unitNumber: 1,
        title: 'Boolean Algebra & Combinational Circuits',
        topics: [
          'De Morgan’s Laws and Boolean Minimization',
          'Karnaugh Maps (K-Maps) up to 4 Variables',
          'Half and Full Adders, Subtractors',
          'Multiplexers, Demultiplexers, and Encoders',
        ],
      },
      {
        unitNumber: 2,
        title: 'Sequential Logic & Counters',
        topics: [
          'Latches vs Flip-Flops: SR, JK, D, T Flip-Flops',
          'Master-Slave JK Flip-Flop Race Condition',
          'Synchronous and Asynchronous Counters',
          'Shift Registers: SISO, SIPO, PISO, PIPO',
        ],
      },
    ],
    completedTopics: [
      'De Morgan’s Laws and Boolean Minimization',
      'Karnaugh Maps (K-Maps) up to 4 Variables',
    ],
  },
  {
    id: 'subj_es_4',
    userId: DEMO_USER_ID,
    name: 'Environmental Science & Sustainability',
    code: 'ENV104',
    examDate: '2026-11-30',
    examTime: '02:00 PM - 05:00 PM',
    priority: 'Low',
    difficulty: 'Easy',
    units: [
      {
        unitNumber: 1,
        title: 'Ecosystems & Biodiversity Conservation',
        topics: [
          'Structure and Function of Forest & Aquatic Ecosystems',
          'Food Chains, Food Webs, and Ecological Pyramids',
          'Threats to Biodiversity: Habitat Loss and Poaching',
          'In-situ and Ex-situ Conservation Strategies',
        ],
      },
      {
        unitNumber: 2,
        title: 'Renewable Energy & Pollution Management',
        topics: [
          'Air, Water, and Soil Pollution: Causes and Control',
          'Solid Waste Management and 3R Principles',
          'Solar, Wind, and Biomass Renewable Energy Sources',
          'Global Warming, Carbon Footprint, and Sustainable Development',
        ],
      },
    ],
    completedTopics: [
      'Structure and Function of Forest & Aquatic Ecosystems',
      'Air, Water, and Soil Pollution: Causes and Control',
    ],
  },
];

// Generate dates dynamically around today's date
const now = new Date();
const formatDate = (offsetDays: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const DEMO_STUDY_SESSIONS: StudySession[] = [
  // Today's sessions
  {
    id: 'session_demo_1',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 1: Differential Equations',
    topic: 'Higher Order Linear Equations with Constant Coefficients',
    date: formatDate(0),
    startTime: '06:45',
    endTime: '08:00',
    durationMinutes: 75,
    priority: 'Critical',
    difficulty: 'Hard',
    status: 'completed',
    type: 'Study',
    notes: 'Master finding complementary function (CF) and particular integral (PI).',
    completedAt: `${formatDate(0)}T08:00:00Z`,
  },
  {
    id: 'session_demo_2',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 2: Trees & Graphs',
    topic: 'Binary Search Tree: Insertion, Deletion, and Inorder Traversal',
    date: formatDate(0),
    startTime: '17:30',
    endTime: '18:45',
    durationMinutes: 75,
    priority: 'High',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
    notes: 'Trace 3-case deletion algorithm on BST step-by-step.',
  },
  {
    id: 'session_demo_3',
    userId: DEMO_USER_ID,
    subjectName: 'Digital Logic & Computer Design',
    unit: 'Unit 1: Combinational Circuits',
    topic: 'Multiplexers, Demultiplexers, and Logic Implementation',
    date: formatDate(0),
    startTime: '19:15',
    endTime: '20:15',
    durationMinutes: 60,
    priority: 'Medium',
    difficulty: 'Medium',
    status: 'pending',
    type: 'Practice Test',
    notes: 'Solve 4:1 MUX implementation questions from previous university paper.',
  },
  {
    id: 'session_demo_4',
    userId: DEMO_USER_ID,
    subjectName: 'Environmental Science & Sustainability',
    unit: 'Unit 1: Ecosystems',
    topic: 'In-situ and Ex-situ Conservation Strategies Summary',
    date: formatDate(0),
    startTime: '20:45',
    endTime: '21:30',
    durationMinutes: 45,
    priority: 'Low',
    difficulty: 'Easy',
    status: 'pending',
    type: 'Revision',
    notes: 'Quick active recall of National Parks vs Wildlife Sanctuaries vs Seed Banks.',
  },

  // Tomorrow's sessions
  {
    id: 'session_demo_5',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 1: Differential Equations',
    topic: 'Cauchy-Euler Equations & Circuit Applications',
    date: formatDate(1),
    startTime: '06:45',
    endTime: '08:00',
    durationMinutes: 75,
    priority: 'Critical',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
    notes: 'Substitute x = e^z and solve LCR circuit second-order equations.',
  },
  {
    id: 'session_demo_6',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 2: Trees & Graphs',
    topic: 'AVL Trees & Balancing Rotations (LL, RR, LR, RL)',
    date: formatDate(1),
    startTime: '17:30',
    endTime: '18:50',
    durationMinutes: 80,
    priority: 'High',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
    notes: 'Visual rotation walk-through for maintaining O(log n) height invariant.',
  },
  {
    id: 'session_demo_7',
    userId: DEMO_USER_ID,
    subjectName: 'Digital Logic & Computer Design',
    unit: 'Unit 2: Sequential Logic',
    topic: 'Latches vs Flip-Flops: SR and JK Flip-Flops Characteristic Tables',
    date: formatDate(1),
    startTime: '19:30',
    endTime: '20:45',
    durationMinutes: 75,
    priority: 'Medium',
    difficulty: 'Medium',
    status: 'pending',
    type: 'Study',
    notes: 'Write excitation tables and draw logic gate schematics.',
  },

  // Day 2
  {
    id: 'session_demo_8',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 2: Laplace Transforms',
    topic: 'First and Second Shifting Theorems with Step Functions',
    date: formatDate(2),
    startTime: '06:45',
    endTime: '08:00',
    durationMinutes: 75,
    priority: 'Critical',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
  },
  {
    id: 'session_demo_9',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 2: Trees & Graphs',
    topic: 'Graph Traversal: BFS vs DFS Algorithms & Complexities',
    date: formatDate(2),
    startTime: '17:30',
    endTime: '18:45',
    durationMinutes: 75,
    priority: 'High',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
  },
  {
    id: 'session_demo_10',
    userId: DEMO_USER_ID,
    subjectName: 'Environmental Science & Sustainability',
    unit: 'Unit 2: Renewable Energy',
    topic: 'Solid Waste Management & 3R Principles 5-Mark Answer',
    date: formatDate(2),
    startTime: '19:15',
    endTime: '20:15',
    durationMinutes: 60,
    priority: 'Low',
    difficulty: 'Easy',
    status: 'pending',
    type: 'Revision',
  },

  // Day 3 (Buffer Catchup session included)
  {
    id: 'session_demo_11',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 2: Laplace Transforms',
    topic: 'Convolution Theorem & Solving Initial Value Problems',
    date: formatDate(3),
    startTime: '06:45',
    endTime: '08:15',
    durationMinutes: 90,
    priority: 'Critical',
    difficulty: 'Hard',
    status: 'pending',
    type: 'Study',
  },
  {
    id: 'session_demo_12',
    userId: DEMO_USER_ID,
    subjectName: 'Schedule Buffer',
    unit: 'Catch-up & Review',
    topic: 'AI Buffer Slot: Catch up on any delayed topics or formula drilling',
    date: formatDate(3),
    startTime: '17:30',
    endTime: '18:30',
    durationMinutes: 60,
    priority: 'Medium',
    difficulty: 'Medium',
    status: 'pending',
    type: 'Buffer Catchup',
  },
  {
    id: 'session_demo_13',
    userId: DEMO_USER_ID,
    subjectName: 'Digital Logic & Computer Design',
    unit: 'Unit 2: Sequential Logic',
    topic: 'Synchronous and Asynchronous Counters Design Procedure',
    date: formatDate(3),
    startTime: '19:00',
    endTime: '20:30',
    durationMinutes: 90,
    priority: 'High',
    difficulty: 'Medium',
    status: 'pending',
    type: 'Study',
  },

  // Yesterday's sessions (completed to show streak & analytics)
  {
    id: 'session_demo_prev1',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 1: Differential Equations',
    topic: 'Exact Differential Equations and Integrating Factors',
    date: formatDate(-1),
    startTime: '06:45',
    endTime: '08:00',
    durationMinutes: 75,
    priority: 'Critical',
    difficulty: 'Hard',
    status: 'completed',
    type: 'Study',
    completedAt: `${formatDate(-1)}T08:00:00Z`,
  },
  {
    id: 'session_demo_prev2',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 1: Linear Data Structures',
    topic: 'Stack Applications: Infix to Postfix Conversion',
    date: formatDate(-1),
    startTime: '17:30',
    endTime: '18:45',
    durationMinutes: 75,
    priority: 'High',
    difficulty: 'Hard',
    status: 'completed',
    type: 'Study',
    completedAt: `${formatDate(-1)}T18:45:00Z`,
  },
];

export const DEMO_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc_1',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 1',
    topic: 'Exact Differential Equations',
    front: 'What is the necessary and sufficient condition for M(x,y)dx + N(x,y)dy = 0 to be exact?',
    back: 'The condition is: (∂M/∂y) = (∂N/∂x). When this holds, a potential function u(x,y) exists such that du = M dx + N dy = 0, giving solution u(x,y) = C.',
    difficulty: 'Medium',
    status: 'mastered',
  },
  {
    id: 'fc_2',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 2',
    topic: 'AVL Trees',
    front: 'What is the Balance Factor in an AVL Tree and what are its allowed values?',
    back: 'Balance Factor (BF) = Height(Left Subtree) - Height(Right Subtree).\nAllowed values for an AVL tree: BF ∈ {-1, 0, +1}. If BF becomes +2 or -2, tree rotation (LL, RR, LR, or RL) is required.',
    difficulty: 'Hard',
    status: 'learning',
  },
  {
    id: 'fc_3',
    userId: DEMO_USER_ID,
    subjectName: 'Digital Logic & Computer Design',
    unit: 'Unit 1',
    topic: 'Boolean Algebra',
    front: 'State De Morgan’s Laws in Boolean Algebra.',
    back: '1. (A · B)\' = A\' + B\' (The complement of a product is the sum of complements)\n2. (A + B)\' = A\' · B\' (The complement of a sum is the product of complements)',
    difficulty: 'Easy',
    status: 'mastered',
  },
  {
    id: 'fc_4',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    unit: 'Unit 2',
    topic: 'Laplace Transforms',
    front: 'What is the Laplace transform of eat · cos(bt)?',
    back: 'Using the First Shifting Theorem:\nL{e^(at) cos(bt)} = (s - a) / [ (s - a)² + b² ], for s > a.',
    difficulty: 'Hard',
    status: 'review',
  },
  {
    id: 'fc_5',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    unit: 'Unit 1',
    topic: 'Complexity',
    front: 'What is the time complexity of searching in a balanced BST vs worst-case skewed BST?',
    back: 'Balanced BST (e.g. AVL / Red-Black): O(log n).\nWorst-case skewed BST (degenerate into linked list): O(n).',
    difficulty: 'Easy',
    status: 'mastered',
  },
  {
    id: 'fc_6',
    userId: DEMO_USER_ID,
    subjectName: 'Environmental Science',
    unit: 'Unit 1',
    topic: 'Biodiversity',
    front: 'Distinguish between In-situ and Ex-situ conservation with examples.',
    back: 'In-situ: Conservation within natural habitat. Examples: Biosphere reserves, National parks, Wildlife sanctuaries.\nEx-situ: Conservation outside natural habitat in artificial environments. Examples: Botanical gardens, Seed banks, Cryopreservation, Zoos.',
    difficulty: 'Easy',
    status: 'mastered',
  },
];

export const DEMO_QUIZ_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'qa_1',
    userId: DEMO_USER_ID,
    title: 'Differential Equations & Linear Structures Mid-Term Practice',
    subjectName: 'Engineering Mathematics-II',
    score: 8,
    totalQuestions: 10,
    accuracyPercentage: 80,
    weakTopics: ['Cauchy-Euler Equations', 'Integrating Factors with variables'],
    feedback: 'Excellent work on first order ODEs and CF calculations. Review substitution rules for variable coefficient differential equations before finals.',
    createdAt: `${formatDate(-2)}T14:20:00Z`,
  },
  {
    id: 'qa_2',
    userId: DEMO_USER_ID,
    title: 'Stacks, Queues & Tree Traversals Diagnostic',
    subjectName: 'Data Structures & Algorithms',
    score: 9,
    totalQuestions: 10,
    accuracyPercentage: 90,
    weakTopics: ['Double rotation (LR/RL) case in AVL deletion'],
    feedback: 'High conceptual clarity on asymptotic notation and recursive tree traversals. Minor brushup needed on tricky deletion rotations in balanced trees.',
    createdAt: `${formatDate(-4)}T19:40:00Z`,
  },
];

export const DEMO_SAVED_MATERIALS: SavedMaterial[] = [
  {
    id: 'mat_1',
    userId: DEMO_USER_ID,
    subjectName: 'Engineering Mathematics-II',
    title: 'High-Yield Formula Sheet: Laplace Transforms & ODEs',
    category: 'Formulas',
    content: `# Laplace Transforms & Differential Equations Quick Sheet

## Standard Transforms
- $L\\{1\\} = \\frac{1}{s}$
- $L\\{t^n\\} = \\frac{n!}{s^{n+1}}$
- $L\\{e^{at}\\} = \\frac{1}{s - a}$
- $L\\{\\sin(at)\\} = \\frac{a}{s^2 + a^2}$
- $L\\{\\cos(at)\\} = \\frac{s}{s^2 + a^2}$
- $L\\{e^{at}f(t)\\} = F(s - a)$ (First Shifting)

## Particular Integral (P.I.) Shortcut Rules
For $(D^2 + aD + b)y = X$:
1. If $X = e^{ax}$: $P.I. = \\frac{1}{f(D)}e^{ax} = \\frac{1}{f(a)}e^{ax}$, provided $f(a) \\neq 0$.
2. If $X = \\sin(ax)$ or $\\cos(ax)$: Replace $D^2 \\rightarrow -a^2$.
3. If $X = x^m$: Expand $\\frac{1}{f(D)}$ using binomial expansion $(1 \\pm D)^{-1}$.`,
    tags: ['Maths', 'Formulas', 'Exam Ready'],
    createdAt: '2026-11-03T11:00:00Z',
  },
  {
    id: 'mat_2',
    userId: DEMO_USER_ID,
    subjectName: 'Data Structures & Algorithms',
    title: 'Model 10-Mark Answer: AVL Tree Balancing and Rotations',
    category: 'Notes',
    content: `# AVL Tree Balancing and Rotations (10-Mark Exam Blueprint)

### 1. Introduction & Definition
An **AVL Tree** (Adelson-Velsky and Landis) is a self-balancing binary search tree where the heights of the two child subtrees of any node differ by at most one.
- **Balance Factor (BF)**: $\\text{Height}(Left) - \\text{Height}(Right) \\in \\{-1, 0, +1\\}$.
- **Worst-case Search, Insertion, Deletion Time**: $\\mathcal{O}(\\log n)$.

### 2. Four Unbalance Scenarios and Rotations
1. **Left-Left (LL) Unbalance**: Node inserted into left subtree of left child. Fixed by **Single Right Rotation**.
2. **Right-Right (RR) Unbalance**: Node inserted into right subtree of right child. Fixed by **Single Left Rotation**.
3. **Left-Right (LR) Unbalance**: Node inserted into right subtree of left child. Fixed by **Left Rotation on Left Child followed by Right Rotation on Root**.
4. **Right-Left (RL) Unbalance**: Node inserted into left subtree of right child. Fixed by **Right Rotation on Right Child followed by Left Rotation on Root**.

### 3. Comparison with Plain BST
In an unbalanced BST, worst-case sequential insertions yield a degenerated linear linked list with $\\mathcal{O}(n)$ lookup. AVL enforces $\\mathcal{O}(\\log n)$ strictly at the minor cost of pointer updates during insertion/deletion.`,
    tags: ['Trees', 'Algorithms', '10-Mark Answer'],
    createdAt: '2026-11-04T16:30:00Z',
  },
  {
    id: 'mat_3',
    userId: DEMO_USER_ID,
    subjectName: 'Digital Logic & Computer Design',
    title: 'Important 5-Mark Questions & Answers Collection',
    category: 'Questions',
    content: `# Digital Logic 5-Mark Expected University Questions

### Q1: Why is Master-Slave JK Flip-Flop preferred over standard JK Flip-Flop?
**Answer**: In a standard clocked JK flip-flop, when both J=1 and K=1, the outputs toggle. If the clock pulse width $t_p > t_{pd}$ (propagation delay), the output toggles repeatedly within a single clock pulse, causing the **Race-Around Condition**.
The Master-Slave configuration resolves this by chaining two flip-flops:
- The **Master** flip-flop responds during the positive clock edge.
- The **Slave** flip-flop responds during the negative clock edge (inverted clock).
This isolates input changes from output during clock transitions, eliminating race-around entirely.`,
    tags: ['Digital Logic', 'Flip Flops', 'University Questions'],
    createdAt: '2026-11-05T09:15:00Z',
  },
];
