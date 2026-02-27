import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    getNewsCategories, createNewsCategory, updateNewsCategory, deleteNewsCategory,
    getNewsArticles, searchNewsArticles, createNewsArticle, updateNewsArticle,
    publishNewsArticle, archiveNewsArticle, deleteNewsArticle, getArticlesByCategory,
} from '../../services/news.service';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['draft', 'published', 'archived'];
const FILTER_KEYS = ['all', 'weather', 'dam-status', 'emergency'];

const priorityColors = {
    low: 'bg-gray-50 text-gray-600 border-gray-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-orange-100 text-orange-600',
};

// ─── Reusable tiny components ──────────────────────────────────────────────────

function Badge({ children, className }) {
    return (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>
            {children}
        </span>
    );
}
function Skeleton({ className }) {
    return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}
function Input({ label, error, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <input
                className={`w-full text-sm px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`}
                {...props}
            />
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}
function Textarea({ label, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <textarea
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition resize-none"
                {...props}
            />
        </div>
    );
}
function SelectField({ label, children, ...props }) {
    return (
        <div>
            {label && <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>}
            <select
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white transition"
                {...props}
            >
                {children}
            </select>
        </div>
    );
}

// ─── Stats Cards ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

// ─── Category Form Modal ───────────────────────────────────────────────────────

function CategoryModal({ category, onClose, onSaved }) {
    const isEdit = !!category;
    const EMPTY = { code: '', name: '', nameSi: '', description: '', icon: '', color: '#3B82F6', filterKey: 'all', displayOrder: 0, isActive: true };
    const [form, setForm] = useState(isEdit ? {
        code: category.code || '', name: category.name || '', nameSi: category.nameSi || '',
        description: category.description || '', icon: category.icon || '', color: category.color || '#3B82F6',
        filterKey: category.filterKey || 'all', displayOrder: category.displayOrder || 0, isActive: category.isActive ?? true,
    } : EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.code.trim()) e.code = 'Required';
        if (!form.name.trim()) e.name = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form, displayOrder: Number(form.displayOrder) };
            const result = isEdit
                ? await updateNewsCategory(category.id, payload)
                : await createNewsCategory(payload);
            toast.success(`Category "${result.name}" ${isEdit ? 'updated' : 'created'}`);
            onSaved(result, isEdit);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Category' : 'New Category'}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code *" placeholder="weather_alert" value={form.code} onChange={e => set('code', e.target.value)} error={errors.code} disabled={isEdit} />
                        <Input label="Name *" placeholder="Weather Alert" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
                    </div>
                    <Input label="Name (Sinhala)" placeholder="කාලගුණ අනතුරු ඇඟවීම" value={form.nameSi} onChange={e => set('nameSi', e.target.value)} />
                    <Textarea label="Description" placeholder="Category description…" value={form.description} onChange={e => set('description', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Icon name" placeholder="weather-partly-cloudy" value={form.icon} onChange={e => set('icon', e.target.value)} />
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Colour</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="w-10 h-9 rounded border border-gray-300 cursor-pointer" />
                                <span className="text-sm text-gray-600 font-mono">{form.color}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <SelectField label="Filter Key" value={form.filterKey} onChange={e => set('filterKey', e.target.value)}>
                            {FILTER_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                        </SelectField>
                        <Input label="Display Order" type="number" min="0" value={form.displayOrder} onChange={e => set('displayOrder', e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Article Form Modal ────────────────────────────────────────────────────────

function ArticleModal({ article, categories, onClose, onSaved }) {
    const isEdit = !!article;
    const EMPTY = {
        categoryId: categories[0]?.id || '', title: '', titleSi: '', titleTa: '',
        summary: '', summarySi: '', content: '', contentSi: '',
        imageUrl: '', source: '', priorityLevel: 'medium', isNationwide: false,
        status: 'draft', isFeatured: false,
    };
    const [form, setForm] = useState(isEdit ? {
        categoryId: article.categoryId || '', title: article.title || '',
        titleSi: article.titleSi || '', titleTa: article.titleTa || '',
        summary: article.summary || '', summarySi: article.summarySi || '',
        content: article.content || '', contentSi: article.contentSi || '',
        imageUrl: article.imageUrl || '', source: article.source || '',
        priorityLevel: article.priorityLevel || 'medium',
        isNationwide: article.isNationwide || false,
        status: article.status || 'draft', isFeatured: article.isFeatured || false,
    } : EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('basic'); // basic | content | media

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.categoryId) e.categoryId = 'Required';
        if (!form.title.trim()) e.title = 'Required';
        if (!form.summary.trim()) e.summary = 'Required';
        if (!form.content.trim()) e.content = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form, categoryId: Number(form.categoryId) };
            const result = isEdit
                ? await updateNewsArticle(article.id, payload)
                : await createNewsArticle(payload);
            toast.success(`Article "${result.title}" ${isEdit ? 'updated' : 'created'}`);
            onSaved(result, isEdit);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save article');
        } finally {
            setSaving(false);
        }
    };

    const tabs = ['basic', 'content', 'media'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Article' : 'New Article'}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 shrink-0">
                    {tabs.map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 text-xs font-medium capitalize rounded-t-lg transition ${tab === t ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                {/* Body */}
                <form onSubmit={submit} className="overflow-y-auto flex-1 p-6 space-y-4">
                    {tab === 'basic' && (
                        <>
                            <SelectField label="Category *" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} error={errors.categoryId}>
                                <option value="">Select category…</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </SelectField>
                            <Input label="Title (English) *" placeholder="Heavy Rain Warning" value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Title (Sinhala)" placeholder="තද වැසි…" value={form.titleSi} onChange={e => set('titleSi', e.target.value)} />
                                <Input label="Title (Tamil)" value={form.titleTa} onChange={e => set('titleTa', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField label="Priority" value={form.priorityLevel} onChange={e => set('priorityLevel', e.target.value)}>
                                    {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                                </SelectField>
                                <SelectField label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </SelectField>
                            </div>
                            <Input label="Source" placeholder="Meteorology Dept" value={form.source} onChange={e => set('source', e.target.value)} />
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isNationwide} onChange={e => set('isNationwide', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                                    <span className="text-sm text-gray-700">Nationwide</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                                    <span className="text-sm text-gray-700">Featured</span>
                                </label>
                            </div>
                        </>
                    )}
                    {tab === 'content' && (
                        <>
                            <Textarea label="Summary (English) *" rows={3} placeholder="Short preview text…" value={form.summary} onChange={e => set('summary', e.target.value)} />
                            {errors.summary && <p className="text-xs text-red-500 -mt-2">{errors.summary}</p>}
                            <Textarea label="Summary (Sinhala)" rows={2} value={form.summarySi} onChange={e => set('summarySi', e.target.value)} />
                            <Textarea label="Full Content (English) *" rows={6} placeholder="Full article text…" value={form.content} onChange={e => set('content', e.target.value)} />
                            {errors.content && <p className="text-xs text-red-500 -mt-2">{errors.content}</p>}
                            <Textarea label="Full Content (Sinhala)" rows={4} value={form.contentSi} onChange={e => set('contentSi', e.target.value)} />
                        </>
                    )}
                    {tab === 'media' && (
                        <>
                            <Input label="Image URL" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
                            {form.imageUrl && (
                                <div className="rounded-lg border border-gray-200 overflow-hidden h-40">
                                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                </div>
                            )}
                        </>
                    )}
                </form>
                {/* Footer always visible */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
                        {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteModal({ title, onClose, onConfirm }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        try { await onConfirm(); onClose(); }
        catch { /* error toasted by caller */ }
        finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">⚠</span>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Confirm Delete</h2>
                        <p className="text-xs text-gray-500">This action cannot be undone</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 mb-5">Delete <strong>{title}</strong>?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Categories Panel ──────────────────────────────────────────────────────────

function CategoriesPanel({ categories, loading, onAdd, onEdit, onDelete }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Categories <span className="text-gray-400 font-normal">({categories.length})</span></h2>
                <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                    + Add Category
                </button>
            </div>
            <div className="divide-y divide-gray-50">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <Skeleton className="h-4 flex-1" />
                        </div>
                    ))
                ) : categories.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No categories yet</p>
                ) : categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0" style={{ background: cat.color || '#6B7280' }}>
                            {cat.icon ? '📰' : cat.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                            <p className="text-xs text-gray-400 truncate">{cat.code} · {cat.filterKey}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => onEdit(cat)} className="text-xs text-blue-600 hover:underline font-medium px-1">Edit</button>
                            <button onClick={() => onDelete(cat)} className="text-xs text-red-500 hover:underline font-medium px-1">Del</button>
                        </div>
                        {!cat.isActive && <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">Inactive</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewsPage() {
    // ── State ──
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loadingArticles, setLoadingArticles] = useState(true);
    const [loadingCats, setLoadingCats] = useState(true);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const [showCreateArticle, setShowCreateArticle] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [deletingArticle, setDeletingArticle] = useState(null);

    const [showCreateCat, setShowCreateCat] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [deletingCat, setDeletingCat] = useState(null);

    const [activeTab, setActiveTab] = useState('articles'); // 'articles' | 'categories'

    const PAGE_SIZE = 15;
    const searchTimer = useRef(null);

    // ── Load categories ──
    const loadCategories = useCallback(async () => {
        setLoadingCats(true);
        try {
            const data = await getNewsCategories();
            setCategories(Array.isArray(data) ? data : (data.data ?? []));
        } catch { toast.error('Failed to load categories'); }
        finally { setLoadingCats(false); }
    }, []);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    // ── Load articles ──
    const loadArticles = useCallback(async (p = 0) => {
        setLoadingArticles(true);
        try {
            let data;
            if (search.trim()) {
                data = await searchNewsArticles(search.trim(), p, PAGE_SIZE);
            } else if (filterCategory) {
                data = await getArticlesByCategory(filterCategory, p, PAGE_SIZE);
            } else {
                data = await getNewsArticles(p, PAGE_SIZE, filterStatus);
            }
            const content = data?.content ?? data ?? [];
            setArticles(content);
            setTotal(data?.totalElements ?? content.length);
            setTotalPages(data?.totalPages ?? 1);
            setPage(data?.number ?? p);
        } catch { toast.error('Failed to load articles'); }
        finally { setLoadingArticles(false); }
    }, [search, filterStatus, filterCategory]);

    useEffect(() => { loadArticles(0); }, [filterStatus, filterCategory]);

    // Debounce search
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => loadArticles(0), 400);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    // ── Article actions ──
    const handlePublish = async (article) => {
        try {
            const updated = await publishNewsArticle(article.id);
            toast.success(`"${article.title}" published`);
            setArticles(prev => prev.map(a => a.id === article.id ? updated : a));
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to publish'); }
    };
    const handleArchive = async (article) => {
        try {
            const updated = await archiveNewsArticle(article.id);
            toast.success(`"${article.title}" archived`);
            setArticles(prev => prev.map(a => a.id === article.id ? updated : a));
        } catch (err) { toast.error(err?.response?.data?.message || 'Failed to archive'); }
    };
    const handleDeleteArticle = async () => {
        try {
            await deleteNewsArticle(deletingArticle.id);
            toast.success(`"${deletingArticle.title}" deleted`);
            setArticles(prev => prev.filter(a => a.id !== deletingArticle.id));
            setTotal(t => t - 1);
            setDeletingArticle(null);
        } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); throw err; }
    };
    const handleArticleSaved = (result, isEdit) => {
        if (isEdit) {
            setArticles(prev => prev.map(a => a.id === result.id ? result : a));
        } else {
            setArticles(prev => [result, ...prev]);
            setTotal(t => t + 1);
        }
    };

    // ── Category actions ──
    const handleCatSaved = (result, isEdit) => {
        if (isEdit) {
            setCategories(prev => prev.map(c => c.id === result.id ? result : c));
        } else {
            setCategories(prev => [...prev, result]);
        }
    };
    const handleDeleteCategory = async () => {
        try {
            await deleteNewsCategory(deletingCat.id);
            toast.success(`Category "${deletingCat.name}" deleted`);
            setCategories(prev => prev.filter(c => c.id !== deletingCat.id));
            setDeletingCat(null);
        } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); throw err; }
    };

    // ── Stats ──
    const totalPublished = articles.filter(a => a.status === 'published').length;
    const totalDraft = articles.filter(a => a.status === 'draft').length;
    const totalFeatured = articles.filter(a => a.isFeatured).length;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">News Management</h1>
                    <p className="text-sm text-gray-400">{loadingArticles ? '…' : `${total} articles · ${categories.length} categories`}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setActiveTab('categories'); setShowCreateCat(true); }}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm"
                    >
                        🏷️ New Category
                    </button>
                    <button
                        onClick={() => { setActiveTab('articles'); setShowCreateArticle(true); }}
                        className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                        <span className="text-base leading-none">+</span> New Article
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Articles" value={total} icon="📰" color="bg-blue-50" />
                <StatCard label="Published" value={totalPublished} icon="✅" color="bg-emerald-50" />
                <StatCard label="Drafts" value={totalDraft} icon="✏️" color="bg-amber-50" />
                <StatCard label="Featured" value={totalFeatured} icon="⭐" color="bg-purple-50" />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                {['articles', 'categories'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={`px-5 py-2.5 text-sm font-medium capitalize transition border-b-2 ${activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t === 'articles' ? `📰 Articles` : `🏷️ Categories`}
                    </button>
                ))}
            </div>

            {activeTab === 'categories' ? (
                <CategoriesPanel
                    categories={categories}
                    loading={loadingCats}
                    onAdd={() => setShowCreateCat(true)}
                    onEdit={cat => setEditingCat(cat)}
                    onDelete={cat => setDeletingCat(cat)}
                />
            ) : (
                <>
                    {/* Search + Filters */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                                <input
                                    className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                                    placeholder="Search by title…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="min-w-[140px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setFilterCategory(''); }}>
                                <option value="">All statuses</option>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[160px]">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                            <select className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterStatus(''); }}>
                                <option value="">All categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {(filterStatus || filterCategory || search) && (
                            <button onClick={() => { setFilterStatus(''); setFilterCategory(''); setSearch(''); }} className="text-xs text-gray-500 hover:text-gray-800 underline self-end pb-2">Clear all</button>
                        )}
                    </div>

                    {/* Articles Table */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                        {['Image', 'Title', 'Category', 'Priority', 'Status', 'Views', 'Saves', 'Featured', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingArticles ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i}>
                                                {Array.from({ length: 9 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : articles.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center">
                                                <p className="text-4xl mb-3">📰</p>
                                                <p className="text-sm text-gray-400">No articles found</p>
                                                <p className="text-xs text-gray-300 mt-1">Try adjusting filters or create a new article</p>
                                            </td>
                                        </tr>
                                    ) : articles.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                                                    {a.imageUrl ? (
                                                        <img src={a.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">📰</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 max-w-[220px]">
                                                <p className="font-medium text-gray-900 truncate" title={a.title}>{a.title}</p>
                                                {a.source && <p className="text-[11px] text-gray-400 truncate">{a.source}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                    {a.categoryName || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge className={priorityColors[a.priorityLevel] || priorityColors.medium}>
                                                    {a.priorityLevel || 'medium'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[a.status] || statusColors.draft}`}>
                                                    {a.status || 'draft'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{a.viewCount ?? 0}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{a.saveCount ?? 0}</td>
                                            <td className="px-4 py-3 text-center">{a.isFeatured ? '⭐' : '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <button onClick={() => setEditingArticle(a)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                                                    {a.status === 'draft' && (
                                                        <button onClick={() => handlePublish(a)} className="text-xs text-emerald-600 hover:underline font-medium">Publish</button>
                                                    )}
                                                    {a.status === 'published' && (
                                                        <button onClick={() => handleArchive(a)} className="text-xs text-orange-500 hover:underline font-medium">Archive</button>
                                                    )}
                                                    <button onClick={() => setDeletingArticle(a)} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500">Page {page + 1} of {totalPages} · {total} total articles</p>
                                <div className="flex items-center gap-1">
                                    <button disabled={page === 0} onClick={() => loadArticles(page - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">← Prev</button>
                                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                        const pg = Math.max(0, page - 2) + i;
                                        if (pg >= totalPages) return null;
                                        return (
                                            <button key={pg} onClick={() => loadArticles(pg)}
                                                className={`w-8 h-8 text-xs font-medium rounded-lg border transition ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                {pg + 1}
                                            </button>
                                        );
                                    })}
                                    <button disabled={page + 1 >= totalPages} onClick={() => loadArticles(page + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Modals ── */}
            {showCreateArticle && (
                <ArticleModal categories={categories} onClose={() => setShowCreateArticle(false)} onSaved={handleArticleSaved} />
            )}
            {editingArticle && (
                <ArticleModal article={editingArticle} categories={categories} onClose={() => setEditingArticle(null)} onSaved={handleArticleSaved} />
            )}
            {deletingArticle && (
                <DeleteModal title={deletingArticle.title} onClose={() => setDeletingArticle(null)} onConfirm={handleDeleteArticle} />
            )}
            {(showCreateCat || editingCat) && (
                <CategoryModal category={editingCat} onClose={() => { setShowCreateCat(false); setEditingCat(null); }} onSaved={handleCatSaved} />
            )}
            {deletingCat && (
                <DeleteModal title={deletingCat.name} onClose={() => setDeletingCat(null)} onConfirm={handleDeleteCategory} />
            )}
        </div>
    );
}
