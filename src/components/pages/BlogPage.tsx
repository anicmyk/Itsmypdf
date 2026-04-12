import { useState, useMemo } from 'react';
import { Search, ArrowRight, Clock, BookOpen, Shield, Wrench, FileText } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Blog post data                                                     */
/* ------------------------------------------------------------------ */

interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    readTime: string;
    category: 'how-to' | 'privacy' | 'updates';
    color: string;
    toolLink: string;
}

const POSTS: BlogPost[] = [
    {
        slug: 'merge-pdf-no-upload-2026',
        title: 'How to Merge PDF Files Without Uploading \u2014 A 2026 Guide',
        excerpt:
            'Most online PDF mergers quietly upload your documents to remote servers. Here is how to combine PDFs while keeping every page on your own device \u2014 no accounts, no cloud, no risk.',
        date: 'Feb 28, 2026',
        readTime: '8 min read',
        category: 'how-to',
        color: 'from-blue-500 to-blue-600',
        toolLink: '/blog/merge-pdf-no-upload',
    },
    // Future posts go here
];

const CATEGORIES = [
    { id: 'how-to', label: 'How-to Guides', icon: BookOpen },
    { id: 'privacy', label: 'Privacy Tips', icon: Shield },
    { id: 'updates', label: 'Tool Updates', icon: Wrench },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BlogPage() {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const filtered = useMemo(() => {
        return POSTS.filter((p) => {
            const matchesCat = activeCategory ? p.category === activeCategory : true;
            if (!query.trim()) return matchesCat;
            const q = query.toLowerCase();
            return matchesCat && (p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
        });
    }, [query, activeCategory]);

    return (
            

            <div className="min-h-screen bg-white">
                {/* Hero */}
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
                        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-3">
                            itsmy<span className="text-blue-600">pdf</span> Blog
                        </h1>
                        <p className="text-gray-600 text-sm sm:text-lg max-w-lg mx-auto">
                            Guides and tips for working with PDFs &mdash; privately and without uploads.
                        </p>
                    </div>
                </div>

                {/* Main content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

                        {/* ─── Posts column ─── */}
                        <div className="flex-1 min-w-0">
                            {/* Search bar */}
                            <div className="relative mb-8">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="blog-search"
                                    type="text"
                                    placeholder="Search posts..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Posts grid */}
                            {filtered.length === 0 ? (
                                <div className="text-center py-16">
                                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 text-sm font-medium">No posts found</p>
                                    <button
                                        onClick={() => { setQuery(''); setActiveCategory(null); }}
                                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                    {filtered.map((post) => (
                                        <a
                                            key={post.slug}
                                            href={post.toolLink}
                                            className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
                                        >
                                            {/* Colored header */}
                                            <div className={`h-44 bg-gradient-to-br ${post.color} flex items-center justify-center relative overflow-hidden`}>
                                                <div className="absolute inset-0 opacity-[0.12]">
                                                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white" />
                                                    <div className="absolute bottom-4 -left-4 w-20 h-20 rounded-full bg-white" />
                                                </div>
                                                <div className="relative z-10 flex flex-col items-center gap-2">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-8 h-10 rounded bg-white/90 shadow-sm flex items-center justify-center">
                                                            <FileText className="w-3 h-3 text-blue-400" />
                                                        </div>
                                                        <div className="w-8 h-10 rounded bg-white/90 shadow-sm flex items-center justify-center">
                                                            <FileText className="w-3 h-3 text-blue-400" />
                                                        </div>
                                                        <div className="w-8 h-10 rounded bg-white/90 shadow-sm flex items-center justify-center">
                                                            <FileText className="w-3 h-3 text-blue-400" />
                                                        </div>
                                                    </div>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/80">
                                                        <path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <div className="w-10 h-12 rounded bg-white shadow-md flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="flex flex-col flex-1 p-5 sm:p-6">
                                                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                                    <span>{post.date}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {post.readTime}
                                                    </span>
                                                </div>
                                                <h2 className="font-bold text-gray-900 text-[15px] sm:text-base leading-snug mb-3 group-hover:text-blue-600 transition-colors duration-200">
                                                    {post.title}
                                                </h2>
                                                <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-2 mb-5">
                                                    {post.excerpt}
                                                </p>
                                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all duration-200">
                                                    Read more
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ─── Sidebar ─── */}
                        <aside className="w-full lg:w-64 shrink-0">
                            <div className="lg:sticky lg:top-24 space-y-6 lg:space-y-8">
                                {/* Categories */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                                    <ul className="space-y-1">
                                        <li>
                                            <button
                                                onClick={() => setActiveCategory(null)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${!activeCategory
                                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                    }`}
                                            >
                                                <FileText className="w-4 h-4" />
                                                All Posts
                                            </button>
                                        </li>
                                        {CATEGORIES.map((cat) => {
                                            const Icon = cat.icon;
                                            return (
                                                <li key={cat.id}>
                                                    <button
                                                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${activeCategory === cat.id
                                                            ? 'bg-blue-50 text-blue-600 font-medium'
                                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {cat.label}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                {/* Quick links */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
                                    <ul className="space-y-2 text-sm">
                                        <li>
                                            <a href="/" className="text-gray-600 hover:text-blue-600 transition">
                                                &larr; Back to Home
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/merge-pdf" className="text-gray-600 hover:text-blue-600 transition">
                                                Merge PDF
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/split-pdf" className="text-gray-600 hover:text-blue-600 transition">
                                                Split PDF
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/compress-pdf" className="text-gray-600 hover:text-blue-600 transition">
                                                Compress PDF
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
  );
}

