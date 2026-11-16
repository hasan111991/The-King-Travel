import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import type { UserProfile } from '../types/travel';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authReady: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { name: string; phone: string; whatsapp: string; nationality: string }) => Promise<void>;
  changeUserPassword: (newPassword: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const syncUserProfileAndRoles = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }

    if (!userSnap.exists()) {
      // Create initial customer profile if email is verified (Google Sign-In is verified immediately)
      if (firebaseUser.emailVerified) {
        const newProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Traveler',
          email: firebaseUser.email || '',
          phone: '',
          whatsapp: '',
          nationality: 'Pakistan',
          role: 'customer' as const,
          status: 'active' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(userRef, newProfile);
          userSnap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
        }
      }
    }

    if (userSnap && userSnap.exists()) {
      setProfile(userSnap.data() as UserProfile);
    }

    // Check authoritative admin status
    const isBootstrapped =
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

    if (isBootstrapped) {
      setIsAdmin(true);
      setIsSuperAdmin(true);
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
      if (adminSnap.exists()) {
        const adminData = adminSnap.data();
        setIsAdmin(true);
        setIsSuperAdmin(adminData.role === 'super_admin');
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        await syncUserProfileAndRoles(firebaseUser);
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [syncUserProfileAndRoles]);

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfileAndRoles(cred.user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await syncUserProfileAndRoles(cred.user);
  };

  const registerWithEmail = async (name: string, email: string, password: string, phone?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user);
    if (cred.user.emailVerified) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone || '',
        whatsapp: phone || '',
        nationality: 'Pakistan',
        role: 'customer',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  const updateUserProfile = async (updates: {
    name: string;
    phone: string;
    whatsapp: string;
    nationality: string;
  }) => {
    if (!user) throw new Error('Not signed in');
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: updates.name.trim(),
        phone: updates.phone.trim(),
        whatsapp: updates.whatsapp.trim(),
        nationality: updates.nationality.trim(),
        updatedAt: serverTimestamp(),
      });
      await syncUserProfileAndRoles(user);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const changeUserPassword = async (newPassword: string) => {
    if (!user) throw new Error('Not signed in');
    await updatePassword(user, newPassword);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    await syncUserProfileAndRoles(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isSuperAdmin,
        authReady,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateUserProfile,
        changeUserPassword,
        sendResetEmail,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
