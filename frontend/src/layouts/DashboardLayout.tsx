import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Building2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import { useState } from 'react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getDashboardLink = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'admin':
                return '/admin';
            case 'business':
                return '/dashboard';
            case 'candidate':
                return '/candidate-dashboard';
            default:
                return '/dashboard';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Left: Logo & Nav */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                InterviewAI
                            </span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6">
                            <NavLink
                                to="/"
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                    }`
                                }
                            >
                                Trang chủ
                            </NavLink>
                            {user && (
                                <NavLink
                                    to={getDashboardLink()}
                                    className={({ isActive }) =>
                                        `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                        }`
                                    }
                                >
                                    Dashboard
                                </NavLink>
                            )}
                        </nav>
                    </div>

                    {/* Right: User Info & Actions */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                            <div className="flex items-center justify-center w-full h-full bg-primary/10 rounded-full text-primary">
                                                <User className="h-4 w-4" />
                                            </div>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{user.full_name}</p>
                                                <p className="text-xs leading-none text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Hồ sơ cá nhân</span>
                                        </DropdownMenuItem>
                                        {user.role === 'business' && (
                                            <DropdownMenuItem onClick={() => navigate('/company-profile')}>
                                                <Building2 className="mr-2 h-4 w-4" />
                                                <span>Hồ sơ công ty</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Đăng xuất</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <UserProfileDialog
                                    isOpen={isProfileOpen}
                                    onClose={() => setIsProfileOpen(false)}
                                />
                            </>
                        ) : (
                            <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
};
