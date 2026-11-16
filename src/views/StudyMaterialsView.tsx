import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Sparkles,
  Download,
  Printer,
  Trash2,
  Bookmark,
  Tag,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';
import { SavedMaterial, Subject } from '../types';
import { getSavedMaterials, saveStudyMaterial, deleteStudyMaterial } from '../services/db';
import { generateStudyNotes } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface StudyMaterialsViewProps {
  subjects: Subject[];
}

export const StudyMaterialsView: React.FC<StudyMaterialsViewProps> = ({ subjects }) => {
  const { userProfile } = useAuth();

  const [materials, setMaterials] = useState<SavedMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // AI Generator Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genSubject, setGenSubject] = useState(subjects[0]?.name || 'Engineering Mathematics');
  const [genTopic, setGenTopic] = useState('');
  const [genType, setGenType] = useState<'summary' | 'formula_sheet' | 'five_mark' | 'ten_mark'>('summary');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.uid) {
      getSavedMaterials(userProfile.uid).then((m) => {
        setMaterials(m);
        if (m.length > 0 && !selectedMaterialId) {
          setSelectedMaterialId(m[0].id);
        }
      });
    }
  }, [userProfile?.uid]);

  const categories = ['all', 'Notes', 'Formulas', 'Questions', 'Summary'];

  const filteredMaterials = materials.filter((m) => {
    if (activeCategory !== 'all' && m.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.subjectName.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedMaterial =
    materials.find((m) => m.id === selectedMaterialId) || filteredMaterials[0];

  const handleCopyContent = () => {
    if (!selectedMaterial) return;
    navigator.clipboard.writeText(selectedMaterial.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateAiMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic.trim()) return;

    setLoading(true);
    try {
      const res = await generateStudyNotes({
        subject: genSubject,
        topic: genTopic.trim(),
        type: genType,
      });

      const newMaterial: SavedMaterial = {
        id: `mat_${Date.now()}`,
        userId: userProfile?.uid || 'temp',
        subjectName: genSubject,
        title: res.title,
        category: res.category as any,
        content: res.contentMarkdown,
        tags: [genSubject, genType],
        createdAt: new Date().toISOString(),
      };

      await saveStudyMaterial(newMaterial);
      setMaterials((prev) => [newMaterial, ...prev]);
      setSelectedMaterialId(newMaterial.id);
      setShowGenerateModal(false);
      setGenTopic('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate notes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this saved material?')) {
      await deleteStudyMaterial(id, userProfile?.uid || 'temp');
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setSelectedMaterialId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Study Materials Library
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Formulas sheets, university 5/10-mark model answers, and syllabus revision summaries.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Generate Material
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-neutral-200 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, formulas, topics..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* 2-Column Split: Library Index & Content Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Material Cards Index */}
        <div className="space-y-3">
          {filteredMaterials.map((mat) => {
            const isSelected = selectedMaterial?.id === mat.id;
            return (
              <div
                key={mat.id}
                onClick={() => setSelectedMaterialId(mat.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      mat.category === 'Formulas'
                        ? 'bg-amber-50 text-amber-800'
                        : mat.category === 'Questions'
                        ? 'bg-teal-50 text-teal-800'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {mat.category}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(mat.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-neutral-900 mt-2 line-clamp-2">
                  {mat.title}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">{mat.subjectName}</p>
              </div>
            );
          })}

          {filteredMaterials.length === 0 && (
            <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-400">
              No materials found. Click "AI Generate Material" to produce formula sheets and notes.
            </div>
          )}
        </div>

        {/* Right Column: Full Content Markdown Preview */}
        <div className="lg:col-span-2">
          {selectedMaterial ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {selectedMaterial.category}
                    </span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-xs text-neutral-500">{selectedMaterial.subjectName}</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mt-0.5">
                    {selectedMaterial.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyContent}
                    className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="Print material"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => handleDelete(selectedMaterial.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Formatted Markdown Content */}
              <div className="prose prose-sm max-w-none text-neutral-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {selectedMaterial.content}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400">
              Select a study material to read and print.
            </div>
          )}
        </div>
      </div>

      {/* AI Generate Notes Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Generate Study Material with Gemini
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAiMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700">Subject</label>
                <select
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
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
                <label className="block text-xs font-medium text-neutral-700">Material Type</label>
                <select
                  value={genType}
                  onChange={(e: any) => setGenType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <option value="summary">Summary Notes</option>
                  <option value="formula_sheet">Formula & Derivation Sheet</option>
                  <option value="five_mark">Expected 5-Mark Exam Answer</option>
                  <option value="ten_mark">Comprehensive 10-Mark University Blueprint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700">Topic or Concept *</label>
                <input
                  type="text"
                  required
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Master-Slave JK Flip Flop Race Condition"
                  className="mt-1 w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Synthesizing...' : 'Generate Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
