// C:\Dev\Sanguis AI\Track1\Frontend\contexts\AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    loading: boolean;
    authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    }, []);

    const authenticatedFetch = useCallback(async (url: string, options?: RequestInit) => {
        
        // Initialize as Headers object, which is mutable and type-safe for setting properties
        const requestHeaders = new Headers(options?.headers);

        if (token) {
            requestHeaders.set('Authorization', `Bearer ${token}`);
        }

        // Add Content-Type for requests that have a body (POST, PUT, PATCH)
        // Only set if not already explicitly set by the caller and if there's a body.
        if (options?.body && !requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/json');
        }

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options, // Spread other options like method, cache, etc.
                headers: requestHeaders, // Use the Headers object
            });

            if (response.status === 401) {
                console.warn('Unauthorized request. Logging out user.');
                logout();
            }

            return response;
        } catch (error) {
            console.error('authenticatedFetch error:', error);
            throw error;
        }
    }, [token, logout]);


    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token, authenticatedFetch]);


    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch('/auth/me', {
                method: 'GET'
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                localStorage.removeItem('token');
                setToken(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('token');
            setToken(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
    };

    const register = async (name: string, email: string, password: string, phone?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, phone }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
    };

    const googleLogin = async (idToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Google login failed');
        }

        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
    };

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    };

    const value: AuthContextType = {
        user,
        token,
        login,
        register,
        googleLogin,
        logout,
        updateUser,
        loading,
        authenticatedFetch,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};