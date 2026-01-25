"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Target,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    User,
    BookOpen,
    Clock,
    Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLibraryStore } from '@/store/library-store';

export default function WelcomePage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const { updateUserProfile, updateAiProfile } = useLibraryStore();

    // Form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [goal, setGoal] = useState('2');
    const [studyStyle, setStudyStyle] = useState('visual');

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleFinish = () => {
        updateUserProfile({
            name: name || 'Student',
            age: parseInt(age) || 0,
            studyGoal: parseInt(goal) || 2
        });

        updateAiProfile({
            learningStyle: studyStyle as any
        });

        localStorage.setItem('hasFinishedOnboarding', 'true');
        router.push('/');
    };

    const containerVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="min-h-screen bg-[#0A0C14] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Progress Indicator */}
                <div className="flex justify-center gap-1.5 mb-12">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-blue-500' : 'w-2 bg-white/10'}`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            variants={containerVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-8"
                        >
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">Study Stream</h1>
                                <p className="text-white/50 text-lg">Your premium companion for focused educational learning.</p>
                            </div>

                            <Button
                                onClick={handleNext}
                                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-bold group shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    Get Started
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Button>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={containerVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Tell us about you</h2>
                                <p className="text-white/40 text-sm">Personalize your study experience.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-white/60 ml-1">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                                        <Input
                                            id="name"
                                            placeholder="Rohit"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-black/40 border-white/10 pl-10 h-12 rounded-xl focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="age" className="text-white/60 ml-1">Your Age</Label>
                                    <Input
                                        id="age"
                                        type="number"
                                        placeholder="20"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        className="bg-black/40 border-white/10 h-12 rounded-xl focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" onClick={handleBack} className="h-14 w-14 rounded-xl border border-white/5">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Button onClick={handleNext} disabled={!name} className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold">
                                    Next Step
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={containerVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Study Focus</h2>
                                <p className="text-white/40 text-sm">How do you prefer to learn?</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="goal" className="text-white/60 ml-1">Daily Study Goal (Hours)</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                                        <Input
                                            id="goal"
                                            type="number"
                                            value={goal}
                                            onChange={(e) => setGoal(e.target.value)}
                                            className="bg-black/40 border-white/10 pl-10 h-12 rounded-xl"
                                            min={1}
                                            max={24}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white/60 ml-1">Learning Style</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['visual', 'text', 'practical'].map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => setStudyStyle(style)}
                                                className={`p-3 rounded-xl border transition-all text-sm capitalize ${studyStyle === style ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/40 border-white/10 text-white/40 hover:border-white/20'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" onClick={handleBack} className="h-14 w-14 rounded-xl border border-white/5">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Button onClick={handleFinish} className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                                    Start Learning
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-center mt-8 text-white/20 text-xs">
                    Your data is stored locally. Always private. Always yours.
                </p>
            </div>
        </div>
    );
}
