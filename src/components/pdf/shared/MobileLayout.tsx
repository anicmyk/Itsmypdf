import React, { useState } from 'react';
import { Settings, X, Bookmark, Share2, Check, Link, Facebook, Twitter, Linkedin, FileText, Star } from 'lucide-react';

interface MobileLayoutProps {
    /** Content to show in the settings panel (same as desktop sidebar) */
    settingsContent: React.ReactNode;
    /** Settings panel title */
    settingsTitle?: string;
    /** Optional pages panel configuration */
    pagesPanel?: {
        content: React.ReactNode;
        title?: string;
    };
    /** Action button configuration */
    actionButton: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
        isProcessing?: boolean;
        processingText?: string;
        progress?: number;
    };
    /** Optional content to render directly above the action button (e.g., page navigation) */
    aboveActionContent?: React.ReactNode;
    /** Main content */
    children: React.ReactNode;
}

/**
 * Reusable mobile layout component for all PDF tools.
 * Provides:
 * - Floating settings button (bottom-right)
 * - Slide-in settings panel from right with dark overlay
 * - Fixed action button at bottom
 * - Smooth transitions
 */
export const MobileLayout: React.FC<MobileLayoutProps> = ({
    settingsContent,
    settingsTitle = 'Settings',
    pagesPanel,
    actionButton,
    aboveActionContent,
    children
}) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pagesOpen, setPagesOpen] = useState(false);

    return (
        <>
            {/* Main content */}
            {children}

            {/* Dark overlay - covers everything BELOW header when any panel is open */}
            {(settingsOpen || pagesOpen) && (
                <div
                    className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => {
                        setSettingsOpen(false);
                        setPagesOpen(false);
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Pages panel - slides in from LEFT, BELOW header */}
            {pagesPanel && (
                <div
                    className={`md:hidden fixed top-16 bottom-0 left-0 w-full max-w-xs bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${pagesOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    {/* Header with close button */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                        <h2 className="text-base font-bold text-gray-800">{pagesPanel.title || 'Pages'}</h2>
                        <button
                            onClick={() => setPagesOpen(false)}
                            className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                            aria-label="Close pages"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain">
                        {pagesPanel.content}
                    </div>
                </div>
            )}

            {/* Settings panel - slides in from RIGHT, BELOW header */}
            <div
                className={`md:hidden fixed top-16 bottom-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${settingsOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header with close button */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                    <h2 className="text-base font-bold text-gray-800">{settingsTitle}</h2>
                    <button
                        onClick={() => setSettingsOpen(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        aria-label="Close settings"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {settingsContent}
                </div>

                {/* Action button + CTAs INSIDE panel (only visible when panel open) */}
                <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0 space-y-2">
                    {/* Main action button */}
                    <button
                        onClick={actionButton.onClick}
                        disabled={actionButton.disabled || actionButton.isProcessing}
                        className="relative overflow-hidden w-full text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center text-base shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        style={{
                            background: actionButton.isProcessing ? '#9ca3af' : (actionButton.disabled ? '#9ca3af' : '#2563eb')
                        }}
                    >
                        {/* Progress fill animation */}
                        {actionButton.isProcessing && actionButton.progress !== undefined && (
                            <div
                                className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${actionButton.progress}%` }}
                            />
                        )}

                        {/* Button content */}
                        <span className="relative z-10 flex items-center">
                            {actionButton.isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    {actionButton.processingText || 'Processing...'}
                                    {actionButton.progress !== undefined && ` ${actionButton.progress}%`}
                                </>
                            ) : (
                                actionButton.label
                            )}
                        </span>
                    </button>

                    {/* Bookmark & Share buttons - compact for mobile */}
                    <MobileShareBookmarkButtons />
                </div>
            </div>

            {/* Fixed bottom bar - visible when both panels CLOSED */}
            <div
                className={`md:hidden fixed bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-200 z-30 transition-all duration-300 ${settingsOpen || pagesOpen ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'
                    }`}
            >
                {/* Optional content above action button (e.g., page navigation) */}
                {aboveActionContent && (
                    <div className="mb-2">
                        {aboveActionContent}
                    </div>
                )}

                {/* Main action button */}
                <button
                    onClick={actionButton.onClick}
                    disabled={actionButton.disabled || actionButton.isProcessing}
                    className="relative overflow-hidden w-full text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center text-base shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 mb-2"
                    style={{
                        background: actionButton.isProcessing ? '#9ca3af' : (actionButton.disabled ? '#9ca3af' : '#2563eb')
                    }}
                >
                    {/* Progress fill animation */}
                    {actionButton.isProcessing && actionButton.progress !== undefined && (
                        <div
                            className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                            style={{ width: `${actionButton.progress}%` }}
                        />
                    )}

                    {/* Button content */}
                    <span className="relative z-10 flex items-center">
                        {actionButton.isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                {actionButton.processingText || 'Processing...'}
                                {actionButton.progress !== undefined && ` ${actionButton.progress}%`}
                            </>
                        ) : (
                            actionButton.label
                        )}
                    </span>
                </button>

                {/* Bookmark & Share buttons */}
                <MobileShareBookmarkButtons />
            </div>

            {/* Floating Pages button - LEFT side (only if pagesPanel is provided) */}
            {pagesPanel && (
                <button
                    onClick={() => setPagesOpen(true)}
                    className={`md:hidden fixed left-4 w-12 h-12 bg-brand-blue-600 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 z-30 flex items-center justify-center ${pagesOpen || settingsOpen ? 'bottom-4 opacity-0 pointer-events-none' : 'bottom-[8rem] opacity-100'
                        }`}
                    aria-label="Open pages"
                >
                    <FileText className="w-5 h-5" />
                </button>
            )}

            {/* Floating Settings button - RIGHT side (always visible on mobile) */}
            <button
                onClick={() => setSettingsOpen(true)}
                className={`md:hidden fixed right-4 w-12 h-12 bg-brand-blue-600 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 z-30 flex items-center justify-center ${settingsOpen || pagesOpen ? 'bottom-4 opacity-0 pointer-events-none' : 'bottom-[8rem] opacity-100'
                    }`}
                aria-label="Open settings"
            >
                <Settings className="w-5 h-5" />
            </button>
        </>
    );
};

/**
 * Bookmark and Share buttons for mobile - matches desktop ToolCTAs
 */
const MobileShareBookmarkButtons: React.FC = () => {
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);

    const handleBookmark = () => {
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        // Show mobile-friendly bookmark message
        const message = 'To bookmark: Tap browser menu → Add to Bookmarks';

        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl z-[70] text-sm max-w-xs text-center animate-in fade-in slide-in-from-top-2 duration-300';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-2');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    };

    const handleShare = async () => {
        // Use native mobile share if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'itsmypdf - PDF Tools',
                    text: 'Check out this awesome PDF tool!',
                    url: window.location.href
                });
            } catch (err) {
                // User cancelled or error - ignore
                if ((err as Error).name !== 'AbortError') {
                    // Fallback to copy link
                    handleCopyLink();
                }
            }
        } else {
            // Fallback: show share menu
            setShowShareMenu(!showShareMenu);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareSuccess(true);

            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            setTimeout(() => setShareSuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    // Helper function to open a centered popup window
    const openCenteredPopup = (url: string, width: number = 600, height: number = 500) => {
        const left = Math.max(0, (window.screen.width - width) / 2 + (window.screenX || window.screenLeft || 0));
        const top = Math.max(0, (window.screen.height - height) / 2 + (window.screenY || window.screenTop || 0));
        window.open(
            url,
            '_blank',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
    };

    const shareToSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent("Check out this awesome PDF tool!");
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
        }

        if (shareUrl) {
            openCenteredPopup(shareUrl, 600, 500);
        }
        setShowShareMenu(false);
    };

    const openTrustpilot = () => {
        openCenteredPopup('https://www.trustpilot.com/evaluate/itsmypdf.com', 700, 500);
        setShowShareMenu(false);
    };

    return (
        <div className="flex items-center justify-center gap-2">
            {/* Bookmark button - compact */}
            <button
                onClick={handleBookmark}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-md transition-colors"
            >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="font-medium">Bookmark</span>
            </button>

            {/* Share button - compact */}
            <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-md transition-colors"
            >
                <Share2 className="w-3.5 h-3.5" />
                <span className="font-medium">Share</span>
            </button>

            {/* Share menu (fallback for browsers without native share) */}
            {showShareMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowShareMenu(false)}
                    />

                    {/* Share menu */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                        <div className="space-y-1">
                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                            >
                                <div className="p-1.5 bg-gray-100 rounded-md">
                                    {shareSuccess ? <Check className="h-4 w-4 text-green-600" /> : <Link className="h-4 w-4 text-gray-600" />}
                                </div>
                                <span className="font-medium">{shareSuccess ? "Copied!" : "Copy Link"}</span>
                            </button>

                            <div className="h-px bg-gray-100 my-1"></div>

                            <button
                                onClick={() => shareToSocial('facebook')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 rounded-lg text-sm text-gray-700 transition-colors"
                            >
                                <div className="p-1.5 bg-blue-100 rounded-md">
                                    <Facebook className="h-4 w-4 text-blue-600" />
                                </div>
                                <span>Facebook</span>
                            </button>

                            <button
                                onClick={() => shareToSocial('twitter')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sky-50 active:bg-sky-100 rounded-lg text-sm text-gray-700 transition-colors"
                            >
                                <div className="p-1.5 bg-sky-100 rounded-md">
                                    <Twitter className="h-4 w-4 text-sky-500" />
                                </div>
                                <span>Twitter / X</span>
                            </button>

                            <button
                                onClick={() => shareToSocial('linkedin')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 rounded-lg text-sm text-gray-700 transition-colors"
                            >
                                <div className="p-1.5 bg-blue-100 rounded-md">
                                    <Linkedin className="h-4 w-4 text-blue-700" />
                                </div>
                                <span>LinkedIn</span>
                            </button>

                            <div className="h-px bg-gray-100 my-1"></div>

                            <button
                                onClick={openTrustpilot}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 active:bg-emerald-100 rounded-lg text-sm text-gray-700 transition-colors"
                            >
                                <div className="p-1.5 bg-emerald-100 rounded-md">
                                    <Star className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                                </div>
                                <span>Rate on Trustpilot</span>
                            </button>
                        </div>

                        {/* Arrow pointing down */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-sm"></div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MobileLayout;
