"use client";

import React, { useState, useEffect } from 'react';
import {
    Bell,
    X,
    Check,
    Trash2,
    Clock,
    Sparkles,
    Calendar,
    MessageSquare,
    Zap,
    CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/notification-store';
import { useUIStore } from '@/store/ui-store';
import { AINotification } from '@/types';
import { QuestionAnswerPopup } from './question-answer-popup';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Notification Manager - Shows all notifications with history
 */
export function NotificationManager() {
    const { isNotificationOpen, setNotificationOpen } = useUIStore();
    const [selectedQuestionNotification, setSelectedQuestionNotification] = useState<AINotification | null>(null);

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        clearNotification
    } = useNotificationStore();

    const handleClose = () => {
        setNotificationOpen(false);
    };

    const getNotificationIcon = (type: AINotification['type']) => {
        switch (type) {
            case 'reminder': return <Clock className="h-4 w-4" />;
            case 'encouragement': return <Zap className="h-4 w-4" />;
            case 'milestone': return <Sparkles className="h-4 w-4" />;
            case 'question': return <MessageSquare className="h-4 w-4" />;
            case 'tip': return <Sparkles className="h-4 w-4" />;
            default: return <Bell className="h-4 w-4" />;
        }
    };

    const getNotificationColor = (type: AINotification['type']) => {
        switch (type) {
            case 'reminder': return 'from-blue-500 to-cyan-500';
            case 'encouragement': return 'from-green-500 to-emerald-500';
            case 'milestone': return 'from-yellow-500 to-orange-500';
            case 'question': return 'from-purple-500 to-pink-500';
            case 'tip': return 'from-indigo-500 to-purple-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Notification Panel */}
            {isNotificationOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Panel */}
                    <div className="fixed right-6 top-20 w-96 max-h-[70vh] z-[70] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-white" />
                                <span className="font-bold text-sm text-white">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-[10px] rounded-lg bg-red-600 text-white font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-white/40 hover:text-white"
                                        onClick={markAllAsRead}
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                    </Button>
                                )}
                                {notifications.length > 0 && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-white/40 hover:text-red-400"
                                        onClick={clearAll}
                                        title="Clear all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-white/40 hover:text-white"
                                    onClick={handleClose}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto scrollbar-none">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mb-4">
                                        <Bell className="h-8 w-8 text-white/20" />
                                    </div>
                                    <h3 className="font-bold text-white mb-1">Stay Tuned</h3>
                                    <p className="text-sm text-white/20">You're all caught up for now!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                "p-4 hover:bg-white/5 transition-colors relative group cursor-pointer",
                                                !notification.read && "bg-blue-600/[0.03]"
                                            )}
                                            onClick={() => {
                                                if (notification.type === 'question') {
                                                    setSelectedQuestionNotification(notification);
                                                } else {
                                                    markAsRead(notification.id);
                                                }
                                            }}
                                        >
                                            <div className="flex gap-3">
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                                                    getNotificationColor(notification.type)
                                                )}>
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className={cn(
                                                            "font-bold text-sm truncate",
                                                            !notification.read ? "text-white" : "text-white/40"
                                                        )}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-white/30 mt-1 line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <span className="text-[10px] text-white/20 mt-2 block uppercase tracking-widest font-bold">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Delete Button */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400 rounded-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearNotification(notification.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Question Answer Popup */}
            {selectedQuestionNotification && (
                <QuestionAnswerPopup
                    notification={selectedQuestionNotification}
                    onClose={() => setSelectedQuestionNotification(null)}
                    onAnswered={() => setSelectedQuestionNotification(null)}
                />
            )}
        </>
    );
}
