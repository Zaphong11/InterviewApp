import React from 'react';

interface DashboardLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, children }) => {
    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">Recruiter Portal</h1>
                </div>
                <div className="flex-1 py-4">
                    {sidebar}
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
};
