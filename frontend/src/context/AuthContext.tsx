import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config'; 
import { Alert } from 'react-native'; // For displaying messages

// --- 1. Type Definitions ---
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface User {
    email: string;
    username: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean; // For tracking ongoing API calls
    isReady: boolean; // For checking if initial data load from storage is complete
    authTokens: AuthTokens | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
    register: (userData: any) => Promise<any>;
}

// --- 2. Create the Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- 3. Create the Provider Component ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initial check: load tokens from AsyncStorage when the app starts
    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const tokenString = await AsyncStorage.getItem('authTokens');
                if (tokenString) {
                    const data: AuthTokens = JSON.parse(tokenString);
                    setAuthTokens(data);
                    
                    // Note: In a real app, you'd decode the JWT payload 
                    // to get the user data (email, username, etc.) without another API call.
                    // For now, we'll assume a successful token means the user is valid.
                    // We'll update the user data during the signIn function itself.
                }
            } catch (e) {
                console.error("Failed to load auth data:", e);
                // Clear storage if corrupted
                await AsyncStorage.removeItem('authTokens');
            } finally {
                setIsReady(true);
            }
        };
        loadStoredData();
    }, []);

    // API Call: Registration
    const register = async (userData: any) => {
        setIsLoading(true);
        try {
            // Your Django endpoint is /api/auth/register/
            const response = await axios.post(`${BASE_URL}/api/auth/register/`, userData);
            setIsLoading(false);
            
            // Registration often succeeds without returning tokens; the user must log in next.
            return { success: true, message: "Registration successful! You can now log in." };
            
        } catch (error: any) {
            setIsLoading(false);
            
            // Format error response from Django Rest Framework
            let errorMessage = "Registration failed.";
            if (error.response && error.response.data) {
                // If the error is a specific field error (e.g., email already exists)
                if (error.response.data.email) {
                    errorMessage = `Email: ${error.response.data.email[0]}`;
                } else if (error.response.data.password) {
                    errorMessage = `Password: ${error.response.data.password[0]}`;
                } else if (error.response.data.username) {
                    errorMessage = `Username: ${error.response.data.username[0]}`;
                } else {
                    errorMessage = error.response.data.detail || JSON.stringify(error.response.data);
                }
            }
            
            Alert.alert("Registration Error", errorMessage);
            return { success: false, message: errorMessage, errors: error.response?.data };
        }
    };

    // API Call: Sign In (Login)
    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            // Your Django endpoint is /api/auth/login/
            const response = await axios.post(`${BASE_URL}/api/auth/login/`, { email, password });
            
            const data = response.data;
            const newAuthTokens: AuthTokens = { 
                accessToken: data.access, 
                refreshToken: data.refresh 
            };
            
            // Store data, update state, and set up user info
            await AsyncStorage.setItem('authTokens', JSON.stringify(newAuthTokens));
            setAuthTokens(newAuthTokens);
            // Assuming the token response includes username and email (if customized in the backend)
            // Otherwise, extract this from the token payload later.
            setUser({ email: email, username: data.username || email.split('@')[0] }); 

        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || "Login failed. Check your credentials.";
            Alert.alert("Login Error", errorMsg);
            throw new Error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Sign Out (Logout)
    const signOut = async () => {
        setAuthTokens(null);
        setUser(null);
        await AsyncStorage.removeItem('authTokens');
        Alert.alert("Signed Out", "You have been successfully logged out.");
    };

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        user,
        isLoading,
        isReady,
        authTokens,
        signIn,
        signOut,
        register,
    }), [user, isLoading, isReady, authTokens]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- 4. Custom Hook for easy consumption ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
```eof
