import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebar?: React.ReactNode; // Sidebar tùy chỉnh cho từng role
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebar }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 1. Header Chung */}
            <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                        AI
                    </div>
                    <span className="font-bold text-xl tracking-tight">InterviewAI</span>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 rounded-full border-none outline-none">
                                <User className="w-4 h-4" />
                                <span className="font-medium">{user?.full_name || user?.email}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white p-2">
                            {user?.role === 'business' && (
                                <>
                                    <DropdownMenuItem onClick={() => navigate('/company-profile')} className="cursor-pointer py-2 px-3 rounded-md hover:bg-gray-50 flex items-center">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                                        Hồ sơ công ty
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1 border-gray-100" />
                                </>
                            )}
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 py-2 px-3 rounded-md flex items-center">
                                <LogOut className="w-4 h-4 mr-2" />
                                Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* 2. Body (Sidebar + Content) */}
            <div className="flex flex-1 container mx-auto max-w-7xl pt-6 gap-6 px-4 sm:px-6">
                {/* Sidebar Column */}
                {sidebar && (
                    <aside className="w-64 flex-shrink-0 hidden md:block">
                        <div className="bg-white rounded-lg border p-4 sticky top-24 min-h-[calc(100vh-8rem)]">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
                                Menu
                            </h3>
                            <div className="space-y-1">
                                {sidebar}
                            </div>
                        </div>
                    </aside>
                )}

                {/* Main Content Column */}
                <main className="flex-1 min-w-0">
                    <div className="bg-white rounded-lg border shadow-sm min-h-[calc(100vh-8rem)] p-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Footer nhỏ */}
            <footer className="py-6 text-center text-xs text-gray-400">
                © 2025 InterviewAI Platform.
            </footer>
        </div>
    );
};