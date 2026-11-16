import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  FirebaseUser,
} from '../firebase';
import { UserProfile } from '../types';
import { getUserProfile, saveUserProfile } from '../services/db';
import { DEMO_USER_ID, DEMO_STUDENT_PROFILE } from '../data/demoData';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  enableDemoMode: () => void;
  exitDemoMode: () => void;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('studyforge_demo_active') === 'true';
  });

  useEffect(() => {
    // If demo mode active initially
    if (isDemoMode) {
      getUserProfile(DEMO_USER_ID).then((prof) => {
        setUserProfile(prof);
        setLoading(false);
      });
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // First time login - create default profile
            profile = {
              uid: user.uid,
              fullName: user.displayName || user.email?.split('@')[0] || 'Student',
              email: user.email || '',
              photoURL: user.photoURL || undefined,
              sleepDurationHours: 8,
              collegeStart: '09:00',
              collegeEnd: '17:00',
              dailyStudyTargetHours: 4,
              preparationLevel: 'Intermediate',
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await saveUserProfile(profile);
          } else {
            // Update last login
            profile = { ...profile, lastLoginAt: new Date().toISOString() };
            await saveUserProfile(profile);
          }
          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const loginWithEmail = async (email: string, pass: string) => {
    if (isDemoMode) exitDemoMode();
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string) => {
    if (isDemoMode) exitDemoMode();
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    const newProfile: UserProfile = {
      uid: user.uid,
      fullName: fullName.trim(),
      email: user.email || email,
      sleepDurationHours: 8,
      collegeStart: '09:00',
      collegeEnd: '17:00',
      dailyStudyTargetHours: 4,
      preparationLevel: 'Intermediate',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await saveUserProfile(newProfile);
    setUserProfile(newProfile);

    // Send verification email
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send verification email automatically:', e);
    }
  };

  const loginWithGoogle = async () => {
    if (isDemoMode) exitDemoMode();
    await signInWithPopup(auth, googleProvider);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      exitDemoMode();
    } else {
      await signOut(auth);
    }
    setUserProfile(null);
  };

  const enableDemoMode = () => {
    localStorage.setItem('studyforge_demo_active', 'true');
    setIsDemoMode(true);
    getUserProfile(DEMO_USER_ID).then((prof) => {
      setUserProfile(prof);
    });
  };

  const exitDemoMode = () => {
    localStorage.removeItem('studyforge_demo_active');
    setIsDemoMode(false);
    setUserProfile(null);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...updates };
    setUserProfile(updated);
    await saveUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isDemoMode,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordReset,
        resendVerification,
        logout,
        enableDemoMode,
        exitDemoMode,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
