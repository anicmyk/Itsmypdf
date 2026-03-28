import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Share2, Check, Link, Facebook, Linkedin, Twitter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolCTAsProps {
    variant?: 'hero' | 'sidebar';
}

export const ToolCTAs: React.FC<ToolCTAsProps> = ({ variant = 'hero' }) => {
    const [bookmarkTooltip, setBookmarkTooltip] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowShareMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleBookmark = () => {
        setBookmarkTooltip(true);
        setTimeout(() => setBookmarkTooltip(false), 3000);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
            // Fallback
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
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

    const isHero = variant === 'hero';

    return (
        <div
            className={`flex items-center justify-center gap-3 ${isHero ? 'mt-8 z-10' : 'mt-4 pt-4 border-t border-gray-100 w-full'
                }`}
        >
            {/* Bookmark Button */}
            <div className="relative group">
                <Button
                    onClick={handleBookmark}
                    variant="outline"
                    size={isHero ? 'default' : 'sm'}
                    className={`
            transition-all duration-300 gap-2
            ${isHero
                            ? 'bg-white hover:bg-brand-blue-50 border-gray-200 hover:border-brand-blue-200 text-gray-700 hover:text-brand-blue-700 shadow-sm hover:shadow-md px-6'
                            : 'w-full bg-transparent border-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900 justify-start px-3'
                        }
          `}
                >
                    <Bookmark className={`
            transition-transform duration-300 group-hover:scale-110
            ${isHero ? 'h-4 w-4 text-brand-blue-500' : 'h-4 w-4'}
          `} />
                    <span className={isHero ? 'font-medium' : 'text-xs font-medium'}>
                        Bookmark Tool
                    </span>
                </Button>
                {bookmarkTooltip && (
                    // Wrapper for positioning - NO animation classes here
                    <div className={`
            absolute left-1/2 -translate-x-1/2 z-20 
            ${isHero ? '-top-14' : '-top-12'}
          `}>
                        {/* Inner container for animation */}
                        <div className={`
               bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap 
               animate-in fade-in zoom-in-95 duration-200 origin-bottom
            `}>
                            Press <kbd className="font-mono bg-gray-700 px-1 rounded">Ctrl+D</kbd> to bookmark
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                        </div>
                    </div>
                )}
            </div>

            {/* Share Button & Menu */}
            <div className="relative" ref={menuRef}>
                <Button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    variant="outline"
                    size={isHero ? 'default' : 'sm'}
                    className={`
            transition-all duration-300 gap-2
            ${isHero
                            ? 'bg-white hover:bg-brand-blue-50 border-gray-200 hover:border-brand-blue-200 text-gray-700 hover:text-brand-blue-700 shadow-sm hover:shadow-md px-6'
                            : 'w-full bg-transparent border-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900 justify-start px-3'
                        }
            ${showShareMenu ? 'border-brand-blue-500 text-brand-blue-600 ring-2 ring-brand-blue-100' : ''}
          `}
                >
                    <Share2 className={`
            transition-transform duration-300
            ${isHero ? 'h-4 w-4 text-brand-blue-500' : 'h-4 w-4'}
          `} />
                    <span className={isHero ? 'font-medium' : 'text-xs font-medium'}>
                        Share Tool
                    </span>
                </Button>

                {showShareMenu && (
                    // Wrapper for positioning - NO animation classes here
                    <div
                        className={`
              absolute z-50 w-64
              ${isHero
                                ? 'left-1/2 -translate-x-1/2 translate-y-2'
                                : 'bottom-full left-1/2 -translate-x-1/2 mb-3 '
                            }
            `}
                        style={{ top: isHero ? '100%' : 'auto' }}
                    >
                        {/* Animated Content Container */}
                        <div className={`
              bg-white border border-gray-200 rounded-xl shadow-xl w-full p-2
              animate-in fade-in zoom-in-95 duration-200
              ${isHero ? 'origin-top' : 'origin-bottom'}
            `}>
                            <div className="space-y-1">
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700 transition-colors"
                                    role="menuitem"
                                >
                                    <div className="p-1.5 bg-gray-100 rounded-md">
                                        {shareSuccess ? <Check className="h-4 w-4 text-green-600" /> : <Link className="h-4 w-4 text-gray-600" />}
                                    </div>
                                    <span className="font-medium">{shareSuccess ? "Copied!" : "Copy Link"}</span>
                                </button>

                                <div className="h-px bg-gray-100 my-1"></div>

                                <button
                                    onClick={() => shareToSocial('facebook')}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg text-sm text-gray-700 transition-colors group"
                                    role="menuitem"
                                >
                                    <div className="p-1.5 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
                                        <Facebook className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span>Facebook</span>
                                </button>

                                <button
                                    onClick={() => shareToSocial('twitter')}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sky-50 rounded-lg text-sm text-gray-700 transition-colors group"
                                    role="menuitem"
                                >
                                    <div className="p-1.5 bg-sky-100 rounded-md group-hover:bg-sky-200 transition-colors">
                                        <Twitter className="h-4 w-4 text-sky-500" />
                                    </div>
                                    <span>Twitter / X</span>
                                </button>

                                <button
                                    onClick={() => shareToSocial('linkedin')}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 rounded-lg text-sm text-gray-700 transition-colors group"
                                    role="menuitem"
                                >
                                    <div className="p-1.5 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
                                        <Linkedin className="h-4 w-4 text-blue-700" />
                                    </div>
                                    <span>LinkedIn</span>
                                </button>

                                <div className="h-px bg-gray-100 my-1"></div>

                                <button
                                    onClick={openTrustpilot}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 rounded-lg text-sm text-gray-700 transition-colors group"
                                    role="menuitem"
                                >
                                    <div className="p-1.5 bg-emerald-100 rounded-md group-hover:bg-emerald-200 transition-colors">
                                        <Star className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                                    </div>
                                    <span>Rate on Trustpilot</span>
                                </button>
                            </div>

                            {/* Arrow */}
                            <div className={`
                absolute left-1/2 -translate-x-1/2 w-0 h-0 
                border-x-8 border-x-transparent 
                ${isHero
                                    ? 'bottom-full border-b-8 border-b-white drop-shadow-sm -mt-[1px]'
                                    : 'top-full border-t-8 border-t-white drop-shadow-sm -mb-[1px]'
                                }
              `}
                                style={{ filter: isHero ? 'drop-shadow(0 -1px 0 rgb(229 231 235))' : 'drop-shadow(0 1px 0 rgb(229 231 235))' }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
