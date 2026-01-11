"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Calendar, Target, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLibraryStore } from "@/store/library-store";
import { Todo } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

export function TaskBoard({ className }: { className?: string }) {
    const { todos, addTodo, toggleTodo, deleteTodo, courses } = useLibraryStore();
    const [inputValue, setInputValue] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAdd = (type: 'daily' | 'weekly' | 'long-term') => {
        if (!inputValue.trim()) return;
        addTodo(inputValue, type);
        setInputValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent, type: 'daily' | 'weekly' | 'long-term') => {
        if (e.key === 'Enter') handleAdd(type);
    };

    const handleAiGenerate = async () => {
        setIsAiLoading(true);
        // Simulate AI or call actual service later
        setTimeout(() => {
            const activeCourse = courses.find(c => c.totalVideos > c.completedVideos);
            if (activeCourse) {
                addTodo(`Review first 2 videos of ${activeCourse.name}`, 'daily');
                addTodo(`Complete section 1 of ${activeCourse.name}`, 'weekly');
            } else {
                addTodo("Explore new courses in library", 'daily');
            }
            setIsAiLoading(false);
        }, 1500);
    };

    const renderTodoList = (type: 'daily' | 'weekly' | 'long-term') => {
        const filtered = todos.filter(t => t.type === type && !t.completed); // Pending
        const completed = todos.filter(t => t.type === type && t.completed); // Completed

        return (
            <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                    <Input
                        placeholder={`Add a ${type} task...`}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => handleKeyDown(e, type)}
                        className="bg-white/5 border-white/10"
                    />
                    <Button size="icon" onClick={() => handleAdd(type)}>
                        <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleAiGenerate} disabled={isAiLoading} title="Auto-generate tasks from courses">
                        <Sparkles className={cn("w-4 h-4 text-indigo-400", isAiLoading && "animate-spin")} />
                    </Button>
                </div>

                <ScrollArea className="h-[300px] pr-3">
                    {filtered.length === 0 && completed.length === 0 && (
                        <div className="text-center text-muted-foreground py-10 flex flex-col items-center">
                            <Target className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">No tasks yet. Plan your success!</p>
                        </div>
                    )}

                    <ul className="space-y-2">
                        <AnimatePresence>
                            {filtered.map(todo => (
                                <motion.li
                                    key={todo.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <button onClick={() => toggleTodo(todo.id)} className="text-muted-foreground hover:text-green-400 transition-colors">
                                        <Circle className="w-5 h-5" />
                                    </button>
                                    <span className="flex-1 text-sm font-medium">{todo.text}</span>
                                    <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-red-400 p-1 hover:bg-red-400/10 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>

                    {completed.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Completed</h4>
                            <ul className="space-y-2 opacity-60">
                                {completed.map(todo => (
                                    <li key={todo.id} className="flex items-center gap-3 p-2 rounded-lg bg-transparent border border-white/5 border-dashed">
                                        <button onClick={() => toggleTodo(todo.id)} className="text-green-500">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <span className="flex-1 text-sm line-through decoration-white/20">{todo.text}</span>
                                        <button onClick={() => deleteTodo(todo.id)} className="text-muted-foreground hover:text-red-400 p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </ScrollArea>
            </div>
        );
    };

    return (
        <Card className={cn("bg-[#0a0a0a] border-[#222] flex flex-col h-full", className)}>
            <Tabs defaultValue="daily" className="flex-1 w-full p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-500" />
                        My Plan
                    </h3>
                    <TabsList className="bg-black/40 border border-white/10">
                        <TabsTrigger value="daily" className="text-xs">Today</TabsTrigger>
                        <TabsTrigger value="weekly" className="text-xs">Week</TabsTrigger>
                        <TabsTrigger value="long-term" className="text-xs">Month</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="daily" className="mt-0">
                    {renderTodoList('daily')}
                </TabsContent>
                <TabsContent value="weekly" className="mt-0">
                    {renderTodoList('weekly')}
                </TabsContent>
                <TabsContent value="long-term" className="mt-0">
                    {renderTodoList('long-term')}
                </TabsContent>
            </Tabs>
        </Card>
    );
}
