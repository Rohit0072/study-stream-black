"use client";

import React, { useState } from 'react';
import {
    Plus,
    Calendar,
    Clock,
    Check,
    X,
    Play,
    Pause,
    MoreHorizontal,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/schedule-store';
import { useLibraryStore } from '@/store/library-store';
import { ScheduledTask } from '@/types';

/**
 * Schedule Manager - Create and manage study tasks
 */
export function ScheduleManager() {
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        courseId: ''
    });

    const {
        tasks,
        addTask,
        deleteTask,
        startTask,
        completeTask,
        getTodaysTasks
    } = useScheduleStore();

    const { courses } = useLibraryStore();

    const todaysTasks = getTodaysTasks();
    const upcomingTasks = tasks
        .filter(t => t.status === 'pending' && t.scheduledStart > Date.now())
        .sort((a, b) => a.scheduledStart - b.scheduledStart)
        .slice(0, 5);

    const handleAddTask = () => {
        if (!newTask.title || !newTask.date || !newTask.startTime || !newTask.endTime) return;

        const startDate = new Date(`${newTask.date}T${newTask.startTime}`);
        const endDate = new Date(`${newTask.date}T${newTask.endTime}`);

        addTask({
            title: newTask.title,
            courseId: newTask.courseId || undefined,
            scheduledStart: startDate.getTime(),
            scheduledEnd: endDate.getTime()
        });

        setNewTask({ title: '', date: '', startTime: '', endTime: '', courseId: '' });
        setIsAddingTask(false);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const getStatusBadge = (task: ScheduledTask) => {
        switch (task.status) {
            case 'started':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">In Progress</span>;
            case 'completed':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Completed</span>;
            case 'missed':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Missed</span>;
            case 'snoozed':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Snoozed</span>;
            default:
                return <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">Pending</span>;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Study Schedule</h3>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 border-white/10"
                    onClick={() => setIsAddingTask(true)}
                >
                    <Plus className="h-3 w-3" />
                    Add Task
                </Button>
            </div>

            {/* Add Task Form */}
            {isAddingTask && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="What do you want to study?"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                            <input
                                type="date"
                                value={newTask.date}
                                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                            <input
                                type="time"
                                value={newTask.startTime}
                                onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">End</label>
                            <input
                                type="time"
                                value={newTask.endTime}
                                onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {courses.length > 0 && (
                        <select
                            value={newTask.courseId}
                            onChange={(e) => setNewTask({ ...newTask, courseId: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="">Link to course (optional)</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingTask(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-blue-500"
                            onClick={handleAddTask}
                        >
                            Create Task
                        </Button>
                    </div>
                </div>
            )}

            {/* Today's Tasks */}
            {todaysTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">TODAY</h4>
                    {todaysTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onStart={() => startTask(task.id)}
                            onComplete={() => completeTask(task.id)}
                            onDelete={() => deleteTask(task.id)}
                            formatTime={formatTime}
                            getStatusBadge={getStatusBadge}
                            courses={courses}
                        />
                    ))}
                </div>
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">UPCOMING</h4>
                    {upcomingTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onStart={() => startTask(task.id)}
                            onComplete={() => completeTask(task.id)}
                            onDelete={() => deleteTask(task.id)}
                            formatTime={formatTime}
                            formatDate={formatDate}
                            getStatusBadge={getStatusBadge}
                            courses={courses}
                            showDate
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {tasks.length === 0 && !isAddingTask && (
                <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No study sessions scheduled</p>
                    <p className="text-xs mt-1">Add a task to get reminders!</p>
                </div>
            )}
        </div>
    );
}

// Task Card Component
interface TaskCardProps {
    task: ScheduledTask;
    onStart: () => void;
    onComplete: () => void;
    onDelete: () => void;
    formatTime: (ts: number) => string;
    formatDate?: (ts: number) => string;
    getStatusBadge: (task: ScheduledTask) => React.ReactNode;
    courses: any[];
    showDate?: boolean;
}

function TaskCard({
    task,
    onStart,
    onComplete,
    onDelete,
    formatTime,
    formatDate,
    getStatusBadge,
    courses,
    showDate
}: TaskCardProps) {
    const course = courses.find(c => c.id === task.courseId);

    return (
        <div className={cn(
            "p-3 rounded-lg border transition-colors",
            task.status === 'completed'
                ? "bg-green-500/5 border-green-500/20"
                : task.status === 'started'
                    ? "bg-blue-500/5 border-blue-500/20"
                    : "bg-white/5 border-white/10"
        )}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h5 className={cn(
                            "font-medium text-sm truncate",
                            task.status === 'completed' && "line-through opacity-60"
                        )}>
                            {task.title}
                        </h5>
                        {getStatusBadge(task)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(task.scheduledStart)} - {formatTime(task.scheduledEnd)}
                        </span>
                        {showDate && formatDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.scheduledStart)}
                            </span>
                        )}
                    </div>

                    {course && (
                        <div className="mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                                {course.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {task.status === 'pending' && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={onStart}
                        >
                            <Play className="h-3 w-3" />
                        </Button>
                    )}
                    {task.status === 'started' && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-400"
                            onClick={onComplete}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
