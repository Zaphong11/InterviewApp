import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

// 1. Cập nhật Interface User để có thêm Role (quan trọng cho phân quyền)
interface User {
    id: string;
    email: string;
    full_name?: string;
    role: 'admin' | 'business' | 'candidate'; // Thêm dòng này
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, userData?: User) => Promise<User | null>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    // Mặc định loading true để chờ check token xong mới render app
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // --- SỬA Ở ĐÂY: Bỏ /api/v1 đi ---
                    const response = await api.get('/api/v1/auth/me');
                    setUser(response.data);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Token hết hạn hoặc lỗi:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                    setIsAuthenticated(false);
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = async (token: string, userData?: User): Promise<User | null> => {
        localStorage.setItem('token', token);

        // Nếu có sẵn userData (truyền từ Login page) thì dùng luôn đỡ phải gọi API
        if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            return userData;
        } else {
            // Nếu chưa có, gọi API lấy thông tin
            try {
                // --- SỬA Ở ĐÂY: Bỏ /api/v1 đi ---
                const response = await api.get('/api/v1/auth/me');

                const profile = response.data;
                setUser(profile);
                setIsAuthenticated(true);
                return profile;
            } catch (error) {
                console.error('Lỗi lấy thông tin user khi login:', error);
                // Nếu lấy thông tin lỗi thì coi như login thất bại
                localStorage.removeItem('token');
                setUser(null);
                setIsAuthenticated(false);
                throw error;
            }
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        // Có thể thêm navigate('/login') ở đây nếu muốn
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};