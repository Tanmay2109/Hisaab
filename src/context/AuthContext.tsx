import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { CurrencyCode, UserProfile } from '../types';
import { cleanForFirestore } from '../services/firestoreService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, fullName: string, preferredCurrency: CurrencyCode) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  enterDemoMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOrCreateUserProfile = async (firebaseUser: User, defaultName?: string, defaultCurrency: CurrencyCode = 'INR') => {
    const localProfileKey = `hisaab_profile_${firebaseUser.uid}`;
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);
        localStorage.setItem(localProfileKey, JSON.stringify(profile));
        // update lastActiveAt
        await updateDoc(userDocRef, { lastActiveAt: new Date().toISOString() }).catch(() => {});
      } else {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          fullName: defaultName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          preferredCurrency: defaultCurrency,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          notificationPreferences: {
            email: true,
            bills: true,
            budgets: true,
            groups: true,
            settlements: true,
          },
        };
        await setDoc(userDocRef, cleanForFirestore(newProfile)).catch((e) =>
          console.warn('Set profile to Firestore fallback:', e)
        );
        setUserProfile(newProfile);
        localStorage.setItem(localProfileKey, JSON.stringify(newProfile));
      }
    } catch (err) {
      console.warn('Notice: Firestore user profile query fallback (offline/cached):', err);
      // Fallback local profile if Firestore permissions or offline
      let localCached: UserProfile | null = null;
      try {
        const raw = localStorage.getItem(localProfileKey);
        if (raw) localCached = JSON.parse(raw);
      } catch {}

      const fallbackProfile: UserProfile = localCached || {
        uid: firebaseUser.uid,
        fullName: defaultName || firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        preferredCurrency: defaultCurrency,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      setUserProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchOrCreateUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await fetchOrCreateUserProfile(res.user);
    setLoading(false);
  };

  const signupWithEmail = async (email: string, pass: string, fullName: string, preferredCurrency: CurrencyCode) => {
    setLoading(true);
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateFirebaseProfile(res.user, { displayName: fullName });
    await fetchOrCreateUserProfile(res.user, fullName, preferredCurrency);
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await fetchOrCreateUserProfile(res.user);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        throw new Error(
          `Domain "${window.location.hostname}" is not authorized for Google OAuth in Firebase Console. Please sign in with Email & Password or use the Sandbox Demo Mode below.`
        );
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        throw new Error('Google Sign-In popup was closed before completing.');
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    const updated = { ...userProfile, ...data };
    setUserProfile(updated);
    const localProfileKey = `hisaab_profile_${user.uid}`;
    try {
      localStorage.setItem(localProfileKey, JSON.stringify(updated));
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, cleanForFirestore(data));
    } catch (err) {
      console.warn('Failed to update user profile in Firestore (saved locally):', err);
    }
  };

  const enterDemoMode = async () => {
    setLoading(true);
    try {
      const demoEmail = 'demo.user@hisaab.app';
      const demoPass = 'HisaabDemo2026!';
      let demoUser: User | null = null;
      try {
        const res = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
        demoUser = res.user;
      } catch {
        try {
          const res = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
          demoUser = res.user;
        } catch (createErr) {
          console.warn('Could not authenticate remote demo user, using local session:', createErr);
        }
      }

      if (demoUser) {
        try {
          await updateFirebaseProfile(demoUser, { displayName: 'Rajesh Kumar (Demo)' });
        } catch {}
        await fetchOrCreateUserProfile(demoUser, 'Rajesh Kumar (Demo)', 'INR');
      } else {
        const localUid = 'demo_user_local';
        const mockUser: any = {
          uid: localUid,
          displayName: 'Rajesh Kumar (Demo)',
          email: demoEmail,
        };
        setUser(mockUser);
        setUserProfile({
          uid: localUid,
          fullName: 'Rajesh Kumar (Demo)',
          email: demoEmail,
          preferredCurrency: 'INR',
          role: 'user',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          notificationPreferences: {
            email: true,
            bills: true,
            budgets: true,
            groups: true,
            settlements: true,
          },
        });
      }
    } catch (err) {
      console.error('Demo auth failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        updateProfileData,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
