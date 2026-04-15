/**
 * OfflineQuiz.jsx  ─  Full offline quiz workflow
 *
 * Step 1 – Configure  : pick country / exam / difficulty / count / student name
 * Step 2 – Download   : preview questions, download Student PDF + Answer Key
 * Step 3 – Scan       : upload PHOTO (jpg/png/webp) OR PDF of completed answer
 *                       sheet → AI Vision reads and evaluates it
 * Step 4 – Results    : per-question breakdown, save to Performance Hub
 *
 * Key design decisions:
 *  - Scan step now accepts both image AND pdf uploads  (multipart FormData)
 *  - Download uses authenticated axios blob fetch (not bare <a href>)
 *  - All API calls use the shared offlineAPI from @/services/api
 *  - No external hooks required (self-contained state management)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { offlineAPI, quizAPI, getErrMsg } from '@/services/api';
import api from '@/services/api';  // still used for /offline/scan multipart POST
import { useAuth } from '@/context/AuthContext';
import { generateQuizPDF, generateAnswerKeyPDF } from '@/utils/OfflineQuizPDF';
import toast from 'react-hot-toast';
import {
    Zap, Printer, Camera, CheckCircle, XCircle,
    ArrowRight, ArrowLeft, BookOpen, Star, Info,
    QrCode, RefreshCw, TrendingUp, BarChart3,
    Image as ImageIcon, FileText, Download, Eye,
    Upload, Scan, Globe, Clock,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
    { n: 1, label: 'Configure', icon: Zap },
    { n: 2, label: 'Download', icon: Printer },
    { n: 3, label: 'Scan', icon: Scan },
    { n: 4, label: 'Results', icon: CheckCircle },
];

const DIFFICULTIES = [
    { val: 'easy', label: 'Easy', activeCls: 'bg-emerald/15 border-emerald/40 text-emerald' },
    { val: 'medium', label: 'Medium', activeCls: 'bg-amber/15   border-amber/40   text-amber' },
    { val: 'hard', label: 'Hard', activeCls: 'bg-rose/15    border-rose/40    text-rose' },
];

// Accepted MIME types for scan upload
const SCAN_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const MAX_FILE_MB = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StepBar({ current }) {
    return (
        <div className="flex items-center mb-10">
            {STEPS.map((s, i) => {
                const done = s.n < current;
                const active = s.n === current;
                return (
                    <div key={s.n} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all duration-300"
                                style={{
                                    backgroundColor: done ? '#00f5d4' : active ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                                    color: done ? '#0a0f1e' : active ? '#fff' : 'rgba(255,255,255,0.35)',
                                    border: `2px solid ${done ? '#00f5d4' : active ? '#7c3aed' : 'rgba(255,255,255,0.12)'}`,
                                }}
                            >
                                {done ? <CheckCircle size={17} /> : <s.icon size={16} />}
                            </div>
                            <span
                                className="text-xs font-display hidden sm:block"
                                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className="flex-1 h-0.5 mx-2 mt-[-10px] transition-all duration-500"
                                style={{ backgroundColor: done ? '#00f5d4' : 'rgba(255,255,255,0.1)' }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Circular score ring used on the Results screen
function ScoreRing({ pct }) {
    const color = pct >= 70 ? '#00f5d4' : pct >= 50 ? '#f59e0b' : '#f43f5e';
    const circ = 2 * Math.PI * 52;   // r=52, viewBox 120
    const filled = (pct / 100) * circ;
    const label = pct >= 80 ? 'Excellent! 🎉' : pct >= 60 ? 'Good Job! 👍' : pct >= 40 ? 'Keep Going! 💪' : "Don't Give Up! 🌟";
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
                    <circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke={color} strokeWidth="9" strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ}`}
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-display font-black" style={{ color }}>{pct.toFixed(0)}%</span>
                    <span className="text-xs text-white/40">score</span>
                </div>
            </div>
            <p className="text-base font-display font-bold text-white">{label}</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function OfflineQuiz() {
    const { user } = useAuth();

    // ── Step tracking ──────────────────────────────────────────────────────
    const [step, setStep] = useState(1);

    // ── Step 1 ─────────────────────────────────────────────────────────────
    const [countries, setCountries] = useState([]);
    const [exams, setExams] = useState([]);
    const [loadingExams, setLoadingExams] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [form, setForm] = useState({
        countryId: '',
        examId: '',
        examName: '',
        difficulty: 'medium',
        count: 10,
        studentName: '',
    });

    // ── Step 2 ─────────────────────────────────────────────────────────────
    const [quizData, setQuizData] = useState(null);
    const [downloading, setDownloading] = useState({ student: false, key: false });  // local PDF gen state

    // ── Step 3 ─────────────────────────────────────────────────────────────
    // file: { raw: File, preview: string|null, isPdf: bool }
    const [uploadFile, setUploadFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const fileInputRef = useRef(null);

    // ── Step 4 ─────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [resultId, setResultId] = useState(null);

    // ── Load countries ─────────────────────────────────────────────────────
    useEffect(() => {
        quizAPI.getCountries()
            .then(r => setCountries(r.data))
            .catch(() => { });
    }, []);

    // ── Load exams when country changes ────────────────────────────────────
    useEffect(() => {
        if (!form.countryId) { setExams([]); return; }
        setLoadingExams(true);
        quizAPI.getExams(form.countryId)
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : [];
                setExams(list);
                if (list.length > 0)
                    setForm(f => ({ ...f, examId: list[0]._id || list[0].id, examName: list[0].name }));
            })
            .catch(() => { })
            .finally(() => setLoadingExams(false));
    }, [form.countryId]);

    // ── Handlers ───────────────────────────────────────────────────────────

    async function handleGenerate() {
        if (!form.countryId) { toast.error('Please select a country'); return; }
        if (!form.examId) { toast.error('Please select an exam'); return; }
        setGenerating(true);
        try {
            const res = await offlineAPI.generate({
                country_id: form.countryId,
                exam_id: form.examId,
                exam_name: form.examName,
                difficulty: form.difficulty,
                count: form.count,
                student_name: form.studentName,
            });
            setQuizData(res.data);
            toast.success(`Quiz generated!  Code: ${res.data.quiz_code}`);
            setStep(2);
        } catch (err) {
            toast.error(getErrMsg(err));
        } finally {
            setGenerating(false);
        }
    }

    // Frontend PDF generation — no backend round-trip needed
    function handleDownload(answerKey = false) {
        const label = answerKey ? 'key' : 'student';
        setDownloading(d => ({ ...d, [label]: true }));
        try {
            if (answerKey) {
                generateAnswerKeyPDF(quizData);
                toast.success('Answer key downloaded!');
            } else {
                generateQuizPDF(quizData);
                toast.success('Student copy downloaded!');
            }
        } catch (err) {
            toast.error('PDF generation failed. Please try again.');
            console.error('PDF error:', err);
        } finally {
            setDownloading(d => ({ ...d, [label]: false }));
        }
    }

    // File selection (image or PDF)
    const handleFileSelect = useCallback((file) => {
        if (!file) return;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImg = file.type.startsWith('image/');
        if (!isPdf && !isImg) { toast.error('Please upload an image (JPG/PNG/WebP) or a PDF'); return; }
        if (file.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`File must be under ${MAX_FILE_MB} MB`); return; }

        if (isPdf) {
            setUploadFile({ raw: file, preview: null, isPdf: true });
        } else {
            const reader = new FileReader();
            reader.onload = ev => setUploadFile({ raw: file, preview: ev.target.result, isPdf: false });
            reader.readAsDataURL(file);
        }
    }, []);

    function onFileInputChange(e) { handleFileSelect(e.target.files?.[0]); }

    function onDrop(e) {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files?.[0]);
    }

    // Scan — sends multipart FormData so server gets the raw file
    async function handleScan() {
        if (!uploadFile) { toast.error('Please upload a photo or PDF of the answer sheet'); return; }
        setScanning(true);
        try {
            const fd = new FormData();
            fd.append('quiz_code', quizData.quiz_code);
            fd.append('image', uploadFile.raw);           // field name: image

            const res = await api.post('/offline/scan', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setScanResult(res.data.scan_result);
            toast.success('Answer sheet evaluated!');
            setStep(4);
        } catch (err) {
            toast.error(getErrMsg(err));
        } finally {
            setScanning(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const res = await offlineAPI.saveResult({ quiz_code: quizData.quiz_code });
            setResultId(res.data.result_id);
            setSaved(true);
            toast.success('Result saved to your Performance Hub!');
        } catch (err) {
            toast.error(getErrMsg(err));
        } finally {
            setSaving(false);
        }
    }

    function resetAll() {
        setStep(1); setQuizData(null); setUploadFile(null);
        setScanResult(null); setSaved(false); setResultId(null);
    }

    const pct = scanResult?.score_percentage || 0;

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Layout>
            <div className="page max-w-3xl">

                {/* Page header */}
                <div className="mb-8">
                    <div className="badge-violet inline-flex mb-3"><Printer size={11} /> Offline Mode</div>
                    <h1 className="text-3xl font-display font-bold text-white mb-1">Offline Quiz</h1>
                    <p className="text-sm text-white/40">
                        Generate → Print → Take the exam offline → Scan with your camera or upload PDF → Get instant AI feedback
                    </p>
                </div>

                <StepBar current={step} />

                {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Configure
        ══════════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="glass p-8 space-y-6 animate-fade-in">
                        <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                            <Zap size={18} className="text-neon" /> Configure Your Quiz
                        </h2>

                        {/* Country */}
                        <div>
                            <label className="label">Country</label>
                            <select
                                className="select"
                                value={form.countryId}
                                onChange={e => setForm(f => ({ ...f, countryId: e.target.value, examId: '', examName: '' }))}
                            >
                                <option value="">Select Country…</option>
                                {countries.map(c => (
                                    <option key={c._id} value={c._id}>{c.flag} {c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Exam */}
                        <div>
                            <label className="label">Exam</label>
                            <div className="relative">
                                <select
                                    className="select"
                                    value={form.examId}
                                    disabled={!form.countryId || loadingExams}
                                    onChange={e => {
                                        const ex = exams.find(x => (x._id || x.id) === e.target.value);
                                        setForm(f => ({ ...f, examId: e.target.value, examName: ex?.name || '' }));
                                    }}
                                >
                                    <option value="">
                                        {loadingExams ? 'Loading…' : !form.countryId ? 'Select country first' : 'Select Exam…'}
                                    </option>
                                    {exams.map(e => (
                                        <option key={e._id || e.id} value={e._id || e.id}>{e.name}</option>
                                    ))}
                                </select>
                                {loadingExams && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>
                                )}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="label">Difficulty</label>
                            <div className="flex gap-3">
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.val}
                                        onClick={() => setForm(f => ({ ...f, difficulty: d.val }))}
                                        className={`flex-1 py-3 rounded-xl text-sm font-display font-semibold border transition-all ${form.difficulty === d.val
                                                ? d.activeCls
                                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question count slider */}
                        <div>
                            <label className="label">
                                Number of Questions:&nbsp;
                                <span className="text-neon font-bold">{form.count}</span>
                            </label>
                            <input
                                type="range" min={5} max={30} step={5}
                                value={form.count}
                                onChange={e => setForm(f => ({ ...f, count: +e.target.value }))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: '#00f5d4' }}
                            />
                            <div className="flex justify-between text-xs mt-1 text-white/30">
                                {[5, 10, 15, 20, 25, 30].map(n => <span key={n}>{n}</span>)}
                            </div>
                        </div>

                        {/* Student name (optional) */}
                        <div>
                            <label className="label">
                                Student Name&nbsp;
                                <span className="font-normal normal-case text-white/30">(optional — pre-fills on PDF)</span>
                            </label>
                            <input
                                className="input"
                                placeholder="e.g. Arjun Sharma"
                                value={form.studentName}
                                onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating || !form.examId}
                            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-40"
                        >
                            {generating
                                ? <><Spinner size="sm" color="dark" /> Generating {form.count} Questions…</>
                                : <><Zap size={16} /> Generate Quiz</>}
                        </button>

                        {/* How it works */}
                        <div className="pt-2 border-t border-white/8">
                            <p className="text-xs font-display font-semibold text-white/40 uppercase tracking-widest mb-3">
                                <Info size={11} className="inline mr-1" />How it works
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { icon: Zap, color: 'text-neon', bg: 'bg-neon/10', label: 'Generate', desc: 'AI creates exam-style questions' },
                                    { icon: Printer, color: 'text-violet-300', bg: 'bg-violet/10', label: 'Print', desc: 'Download & print the paper' },
                                    { icon: Camera, color: 'text-amber', bg: 'bg-amber/10', label: 'Scan', desc: 'Photo or PDF of your sheet' },
                                    { icon: BarChart3, color: 'text-emerald', bg: 'bg-emerald/10', label: 'Results', desc: 'Instant AI evaluation' },
                                ].map(s => (
                                    <div key={s.label} className="text-center p-3">
                                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                                            <s.icon size={18} className={s.color} />
                                        </div>
                                        <p className="text-xs font-display font-semibold text-white mb-0.5">{s.label}</p>
                                        <p className="text-xs text-white/40">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Download
        ══════════════════════════════════════════════════════════════════ */}
                {step === 2 && quizData && (
                    <div className="space-y-5 animate-fade-in">

                        {/* Quiz code hero */}
                        <div className="glass p-8 text-center relative overflow-hidden">
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.08) 0%, transparent 70%)' }}
                            />
                            <div className="relative z-10">
                                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Your Quiz Code</p>
                                <div className="text-5xl font-display font-black tracking-widest text-neon mb-3">
                                    {quizData.quiz_code}
                                </div>
                                <p className="text-sm text-white/60 mb-1">{quizData.exam_name}</p>
                                <div className="flex items-center justify-center gap-5 text-xs text-white/35 flex-wrap">
                                    <span className="flex items-center gap-1"><BookOpen size={11} /> {quizData.count} questions</span>
                                    <span className="flex items-center gap-1"><Star size={11} /> {quizData.total_marks} marks</span>
                                    <span className={`font-semibold ${form.difficulty === 'hard' ? 'text-rose' :
                                            form.difficulty === 'medium' ? 'text-amber' : 'text-emerald'
                                        }`}>
                                        {form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Info callout */}
                        <div
                            className="flex items-start gap-3 p-4 rounded-xl"
                            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
                        >
                            <Info size={15} className="text-amber shrink-0 mt-0.5" />
                            <p className="text-xs text-white/60 leading-relaxed">
                                Save your quiz code <strong className="text-amber">{quizData.quiz_code}</strong> — you'll need it when scanning.
                                Print the <strong className="text-white">Student Copy</strong> for the exam.
                                The <strong className="text-white">Answer Key</strong> is for the teacher only.
                            </p>
                        </div>

                        {/* Download buttons */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                <Download size={15} className="text-neon" /> Download PDF
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleDownload(false)}
                                    disabled={downloading.student}
                                    className="btn-primary justify-center py-4 text-sm disabled:opacity-60"
                                >
                                    {downloading.student
                                        ? <><Spinner size="sm" color="dark" /> Downloading…</>
                                        : <><Printer size={15} /> Student Copy</>}
                                </button>
                                <button
                                    onClick={() => handleDownload(true)}
                                    disabled={downloading.key}
                                    className="btn-secondary justify-center py-4 text-sm disabled:opacity-60"
                                >
                                    {downloading.key
                                        ? <><Spinner size="sm" /> Downloading…</>
                                        : <><Eye size={15} /> Answer Key (Teacher)</>}
                                </button>
                            </div>
                            <p className="text-xs text-white/30 text-center mt-3">
                                Open in your PDF viewer and use Ctrl/Cmd + P to print
                            </p>
                        </div>

                        {/* Question preview */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                <BookOpen size={14} className="text-violet-300" /> Question Preview
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {quizData.questions?.slice(0, 5).map((q, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/8">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="badge-neon text-xs">Q{i + 1}</span>
                                            {q.topic && <span className="badge-grey text-xs">{q.topic}</span>}
                                            {q.difficulty && (
                                                <span className={`badge text-xs ${q.difficulty === 'hard' ? 'badge-rose' :
                                                        q.difficulty === 'medium' ? 'badge-amber' : 'badge-emerald'
                                                    }`}>{q.difficulty}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-white/80">{q.text}</p>
                                    </div>
                                ))}
                                {(quizData.questions?.length || 0) > 5 && (
                                    <p className="text-xs text-white/30 text-center">
                                        + {quizData.questions.length - 5} more questions in the PDF
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="btn-ghost">
                                <ArrowLeft size={14} /> Regenerate
                            </button>
                            <button onClick={() => setStep(3)} className="btn-primary flex-1 justify-center">
                                I've printed & completed it — Scan Now <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — Scan / Upload
        ══════════════════════════════════════════════════════════════════ */}
                {step === 3 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="glass p-8">
                            <h2 className="font-display font-bold text-xl text-white mb-1 flex items-center gap-2">
                                <Camera size={18} className="text-neon" /> Upload Answer Sheet
                            </h2>
                            <p className="text-sm text-white/50 mb-6">
                                Upload a <strong className="text-white">photo</strong> (JPG/PNG/WebP) or the
                                <strong className="text-white"> PDF</strong> of the completed answer sheet.
                                AI Vision will read and evaluate every answer automatically.
                            </p>

                            {/* Quiz code reminder */}
                            <div
                                className="flex items-center gap-3 p-3 rounded-xl mb-6"
                                style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.2)' }}
                            >
                                <QrCode size={16} className="text-neon shrink-0" />
                                <div>
                                    <p className="text-xs text-white/40">Scanning quiz</p>
                                    <p className="font-display font-bold text-neon">
                                        {quizData?.quiz_code} — {quizData?.exam_name}
                                    </p>
                                </div>
                            </div>

                            {/* Upload area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => {
                                    e.preventDefault();
                                    e.currentTarget.style.borderColor = '#00f5d4';
                                    e.currentTarget.style.backgroundColor = 'rgba(0,245,212,0.05)';
                                }}
                                onDragLeave={e => {
                                    e.currentTarget.style.borderColor = uploadFile ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.12)';
                                    e.currentTarget.style.backgroundColor = uploadFile ? 'rgba(0,245,212,0.04)' : 'transparent';
                                }}
                                onDrop={onDrop}
                                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                                style={{
                                    borderColor: uploadFile ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.12)',
                                    backgroundColor: uploadFile ? 'rgba(0,245,212,0.04)' : 'transparent',
                                }}
                            >
                                {uploadFile ? (
                                    <div className="flex flex-col items-center gap-3">
                                        {/* Preview */}
                                        {uploadFile.isPdf ? (
                                            <div className="w-20 h-20 rounded-2xl bg-violet/15 border border-violet/30 flex flex-col items-center justify-center">
                                                <FileText size={28} className="text-violet-300 mb-1" />
                                                <span className="text-xs text-violet-300 font-semibold">PDF</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={uploadFile.preview}
                                                alt="Answer sheet"
                                                className="max-h-52 rounded-xl object-contain shadow-lg border border-white/10"
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-neon">{uploadFile.raw.name}</p>
                                            <p className="text-xs text-white/35 mt-0.5">
                                                {(uploadFile.raw.size / 1024).toFixed(0)} KB
                                                &nbsp;·&nbsp;
                                                {uploadFile.isPdf ? 'PDF (first page will be scanned)' : 'Image'}
                                                &nbsp;·&nbsp;
                                                <span className="text-neon/70">Click to change</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center">
                                            <Upload size={26} className="text-neon" />
                                        </div>
                                        <div>
                                            <p className="font-display font-semibold text-white mb-1">
                                                Click to upload or drag &amp; drop
                                            </p>
                                            <p className="text-sm text-white/40">
                                                JPG, PNG, WebP, or PDF — up to {MAX_FILE_MB} MB
                                            </p>
                                        </div>
                                        {/* Format badges */}
                                        <div className="flex gap-2 mt-1">
                                            {['JPG', 'PNG', 'WebP', 'PDF'].map(fmt => (
                                                <span
                                                    key={fmt}
                                                    className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                                                    style={{
                                                        backgroundColor: fmt === 'PDF'
                                                            ? 'rgba(124,58,237,0.12)'
                                                            : 'rgba(0,245,212,0.08)',
                                                        borderColor: fmt === 'PDF'
                                                            ? 'rgba(124,58,237,0.3)'
                                                            : 'rgba(0,245,212,0.2)',
                                                        color: fmt === 'PDF' ? '#b8aaff' : '#00f5d4',
                                                    }}
                                                >
                                                    {fmt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={SCAN_ACCEPT}
                                className="hidden"
                                onChange={onFileInputChange}
                                capture="environment"
                            />

                            {/* Tips */}
                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { icon: '💡', tip: 'Good lighting — avoid shadows on the paper' },
                                    { icon: '📐', tip: 'Keep the paper flat and fully in frame' },
                                    { icon: '🎯', tip: 'All bubbled answers must be clearly visible' },
                                ].map((t, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl text-center bg-white/5 border border-white/8"
                                    >
                                        <div className="text-xl mb-1">{t.icon}</div>
                                        <p className="text-xs text-white/50">{t.tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button
                                onClick={handleScan}
                                disabled={scanning || !uploadFile}
                                className="btn-primary flex-1 justify-center py-4 disabled:opacity-40"
                            >
                                {scanning
                                    ? <><Spinner size="sm" color="dark" /> AI is reading your answers…</>
                                    : <><Scan size={16} /> Evaluate with AI Vision</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════════
            STEP 4 — Results
        ══════════════════════════════════════════════════════════════════ */}
                {step === 4 && scanResult && (
                    <div className="space-y-5 animate-fade-in">

                        {/* Score hero */}
                        <div className="glass p-8 text-center relative overflow-hidden">
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: `radial-gradient(ellipse at 50% 0%, ${pct >= 70 ? 'rgba(0,245,212,0.10)' :
                                            pct >= 50 ? 'rgba(245,158,11,0.10)' :
                                                'rgba(244,63,94,0.10)'
                                        } 0%, transparent 70%)`,
                                }}
                            />
                            <div className="relative z-10">
                                <ScoreRing pct={pct} />

                                <div className="flex items-center justify-center gap-7 mt-5 text-sm flex-wrap">
                                    <span className="flex items-center gap-1.5 text-neon font-semibold">
                                        <CheckCircle size={14} /> {scanResult.total_correct} Correct
                                    </span>
                                    <span className="flex items-center gap-1.5 text-rose font-semibold">
                                        <XCircle size={14} /> {scanResult.total_questions - scanResult.total_correct} Wrong
                                    </span>
                                    <span className="text-white/35">/ {scanResult.total_questions} Total</span>
                                </div>

                                {scanResult.overall_feedback && (
                                    <div
                                        className="mt-5 p-3 rounded-xl text-sm text-left"
                                        style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.15)' }}
                                    >
                                        <p className="text-white/70">💬 {scanResult.overall_feedback}</p>
                                    </div>
                                )}

                                {/* Demo warning */}
                                {scanResult.scan_notes?.includes('DEMO') && (
                                    <div
                                        className="mt-3 p-3 rounded-xl text-xs text-amber text-left"
                                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                                    >
                                        ⚠️ {scanResult.scan_notes}
                                    </div>
                                )}

                                {/* Model used */}
                                {scanResult.model_used && scanResult.model_used !== 'mock' && (
                                    <p className="text-xs text-white/25 mt-3">
                                        Evaluated by {scanResult.model_used}
                                        {scanResult.legibility && ` · legibility: ${scanResult.legibility}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Per-question breakdown */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                <BarChart3 size={14} className="text-violet-300" /> Answer Breakdown
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {scanResult.answers?.map((a, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 rounded-xl"
                                        style={{
                                            background: a.is_correct
                                                ? 'rgba(0,245,212,0.04)'
                                                : 'rgba(244,63,94,0.04)',
                                            border: `1px solid ${a.is_correct
                                                ? 'rgba(0,245,212,0.15)'
                                                : 'rgba(244,63,94,0.15)'}`,
                                        }}
                                    >
                                        {a.is_correct
                                            ? <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" />
                                            : <XCircle size={15} className="text-rose shrink-0 mt-0.5" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="text-xs font-bold text-white/50">Q{a.question_number}</span>
                                                <span className={`text-xs font-semibold ${a.is_correct ? 'text-neon' : 'text-rose'}`}>
                                                    {a.is_correct ? `+${a.marks_obtained}` : '0'} / {a.marks_total} marks
                                                </span>
                                                {a.confidence && (
                                                    <span className="text-xs text-white/30">
                                                        confidence: {a.confidence}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/80 leading-relaxed">
                                                {a.question_text || `Question ${a.question_number}`}
                                            </p>
                                            <div className="flex gap-4 mt-1 text-xs flex-wrap">
                                                <span className="text-white/40">
                                                    Your answer:{' '}
                                                    <span className="font-semibold text-white/70">
                                                        {a.student_answer_raw || 'Unanswered'}
                                                    </span>
                                                </span>
                                                {!a.is_correct && (
                                                    <span className="text-white/40">
                                                        Correct:{' '}
                                                        <span className="font-semibold text-neon">
                                                            {'ABCD'[a.correct_answer_index] ?? '—'}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save to Performance Hub */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-1">
                                Save to Performance Hub
                            </h3>
                            <p className="text-sm text-white/50 mb-4">
                                Save this result so it counts toward your analytics, topic mastery, and study recommendations.
                            </p>
                            {saved ? (
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-2 text-neon font-semibold text-sm">
                                        <CheckCircle size={16} /> Result saved!
                                    </span>
                                    <Link to="/performance" className="btn-secondary text-sm">
                                        <TrendingUp size={13} /> View Performance
                                    </Link>
                                </div>
                            ) : (
                                <button onClick={handleSave} disabled={saving} className="btn-primary">
                                    {saving
                                        ? <><Spinner size="sm" color="dark" /> Saving…</>
                                        : <><TrendingUp size={15} /> Save Result</>}
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={resetAll} className="btn-secondary flex-1 justify-center text-sm">
                                <RefreshCw size={13} /> New Quiz
                            </button>
                            <button
                                onClick={() => { setUploadFile(null); setStep(3); }}
                                className="btn-ghost text-sm"
                            >
                                <Camera size={13} /> Re-scan
                            </button>
                            <Link to="/recommendations" className="btn-ghost text-sm">
                                Study Plan →
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}