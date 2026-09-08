import { UserAccount, UserRole } from '../types';
import { saveAccountToCloud, deleteAccountFromCloud } from '../lib/firebase';

const USERS_STORAGE_KEY = 'emis_user_accounts_v4';
const CURRENT_USER_KEY = 'emis_current_user_v4';

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-admin-1',
    username: 'admin',
    password: 'admin123',
    name: 'Sarah Jenkins',
    email: 'admin@school.edu',
    role: 'ADMIN',
    department: 'School Administration',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    createdAt: new Date().toISOString()
  }
];

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    
    // Migration: If the saved accounts contain any of the legacy demo teachers, force-reset to INITIAL_ACCOUNTS (only Admin)
    if (Array.isArray(parsed) && parsed.some(acc => acc.id === 'user-teacher-1' || acc.name.includes('Miller') || acc.name.includes('Davis'))) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACCOUNTS;
  } catch (err) {
    return INITIAL_ACCOUNTS;
  }
}

export function saveAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to localStorage', err);
  }
}

export function getStoredCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function setCurrentUserSession(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update session storage', err);
  }
}

export function createNewAccount(newAccountData: Omit<UserAccount, 'id' | 'createdAt'>): { success: boolean; error?: string; user?: UserAccount } {
  const accounts = getStoredAccounts();
  const cleanUsername = newAccountData.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'Username is required.' };
  }

  if (accounts.some(acc => acc.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: `Username "${cleanUsername}" is already taken. Please choose another.` };
  }

  const createdUser: UserAccount = {
    ...newAccountData,
    username: cleanUsername,
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    avatar: newAccountData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newAccountData.name)}`,
    createdAt: new Date().toISOString()
  };

  const updatedList = [...accounts, createdUser];
  saveAccounts(updatedList);
  
  // Async background upload
  saveAccountToCloud(createdUser).catch(e => console.error('Cloud save failed:', e));
  
  return { success: true, user: createdUser };
}

export function updateAccount(updatedAccount: UserAccount): { success: boolean; error?: string } {
  const accounts = getStoredAccounts();
  const cleanUsername = updatedAccount.username.trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'Username is required.' };
  }

  // Check if username conflicts with another account
  const conflict = accounts.find(
    acc => acc.id !== updatedAccount.id && acc.username.toLowerCase() === cleanUsername
  );
  if (conflict) {
    return { success: false, error: `Username "${cleanUsername}" is already taken by another account.` };
  }

  const index = accounts.findIndex(acc => acc.id === updatedAccount.id);
  if (index === -1) {
    return { success: false, error: 'Account not found.' };
  }

  const updatedList = [...accounts];
  updatedList[index] = {
    ...updatedAccount,
    username: cleanUsername
  };

  saveAccounts(updatedList);

  // Update current session if the active user was modified
  const current = getStoredCurrentUser();
  if (current && current.id === updatedAccount.id) {
    setCurrentUserSession(updatedList[index]);
  }

  // Async background update
  saveAccountToCloud(updatedList[index]).catch(e => console.error('Cloud update failed:', e));

  return { success: true };
}

export function deleteAccount(idToDelete: string, operatorRole?: UserRole): { success: boolean; error?: string } {
  const accounts = getStoredAccounts();
  const targetAcc = accounts.find(acc => acc.id === idToDelete);
  if (!targetAcc) return { success: false, error: 'Account not found.' };

  if (targetAcc.role === 'ADMIN' && operatorRole === 'TEACHER') {
    return { success: false, error: 'Permission denied: Teachers cannot delete Administrator accounts.' };
  }

  const filtered = accounts.filter(acc => acc.id !== idToDelete);
  if (filtered.length === accounts.length) return { success: false, error: 'Account not found.' };
  saveAccounts(filtered);

  // Async background delete
  deleteAccountFromCloud(idToDelete).catch(e => console.error('Cloud delete failed:', e));

  return { success: true };
}
