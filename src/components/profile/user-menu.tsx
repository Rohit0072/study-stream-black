"use client";

import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLibraryStore } from "@/store/library-store";
import { useUIStore } from "@/store/ui-store";
import { User, Settings, LogOut, Shield } from "lucide-react";

export function UserMenu() {
    const { userProfile } = useLibraryStore();
    const { setProfileModalOpen } = useUIStore();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold border-2 border-white/10 hover:border-blue-400 transition-all shadow-lg shadow-blue-600/10">
                    {userProfile.name?.charAt(0) || 'S'}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-[#0f0f0f] border-white/10 text-white p-2 rounded-2xl shadow-2xl" align="end" sideOffset={8}>
                <DropdownMenuLabel className="font-normal px-3 py-3">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                {userProfile.name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-bold text-white">{userProfile.name}</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                                    {userProfile.age} Years Old
                                </p>
                            </div>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5 mx-1" />
                <DropdownMenuItem
                    onClick={() => setProfileModalOpen(true)}
                    className="flex items-center px-3 py-2.5 rounded-xl focus:bg-white/5 focus:text-white cursor-pointer transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <Settings className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm">Update Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-3 py-2.5 rounded-xl focus:bg-white/5 focus:text-white cursor-pointer transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 transition-colors">
                        <Shield className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm">Security</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5 mx-1" />
                <DropdownMenuItem className="flex items-center px-3 py-2.5 rounded-xl focus:bg-red-500/10 focus:text-red-500 cursor-pointer text-red-400 font-bold transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mr-3">
                        <LogOut className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
