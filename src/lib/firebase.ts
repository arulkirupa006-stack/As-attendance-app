import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { UserAccount, Student, ClassSubject, AttendanceRecord, SchoolConfig } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

/**
 * Syncs user accounts with Firestore
 * Pulls all accounts from Firestore, merges with local accounts (preferring newest),
 * and writes back any missing ones.
 */
export async function syncAccountsWithCloud(localAccounts: UserAccount[]): Promise<UserAccount[]> {
  try {
    const accountsCol = collection(db, 'accounts');
    const snapshot = await getDocs(accountsCol);
    const cloudAccounts: UserAccount[] = [];
    
    snapshot.forEach((doc) => {
      cloudAccounts.push(doc.data() as UserAccount);
    });

    const mergedMap = new Map<string, UserAccount>();
    
    // 1. Add local accounts
    localAccounts.forEach(acc => mergedMap.set(acc.id, acc));
    
    // 2. Overwrite/add cloud accounts (cloud is source of truth or has newer registrations)
    cloudAccounts.forEach(acc => {
      const local = mergedMap.get(acc.id);
      if (!local || (acc.createdAt && (!local.createdAt || new Date(acc.createdAt) >= new Date(local.createdAt)))) {
        mergedMap.set(acc.id, acc);
      }
    });

    const mergedList = Array.from(mergedMap.values());

    // 3. Push local-only accounts to cloud
    const batch = writeBatch(db);
    let hasWrites = false;
    
    for (const acc of mergedList) {
      const cloudMatch = cloudAccounts.find(ca => ca.id === acc.id);
      if (!cloudMatch || JSON.stringify(cloudMatch) !== JSON.stringify(acc)) {
        const docRef = doc(db, 'accounts', acc.id);
        batch.set(docRef, acc, { merge: true });
        hasWrites = true;
      }
    }

    if (hasWrites) {
      await batch.commit();
    }

    return mergedList;
  } catch (error) {
    console.error('Firebase accounts sync failed, using local fallback:', error);
    return localAccounts;
  }
}

/**
 * Saves a single user account directly to the cloud
 */
export async function saveAccountToCloud(account: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, 'accounts', account.id);
    await setDoc(docRef, account, { merge: true });
  } catch (error) {
    console.error('Failed to save account to cloud:', error);
  }
}

/**
 * Deletes a user account from the cloud
 */
export async function deleteAccountFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'accounts', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete account from cloud:', error);
  }
}

/**
 * Syncs school config with Firestore
 */
export async function syncSchoolConfigWithCloud(localConfig: SchoolConfig): Promise<SchoolConfig> {
  try {
    const docRef = doc(db, 'config', 'school');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const cloudConfig = docSnap.data() as SchoolConfig;
      // If they are identical, return
      if (JSON.stringify(cloudConfig) === JSON.stringify(localConfig)) {
        return localConfig;
      }
      // Use local config if it is different, and upload it
      // Actually, since config can be changed on settings, let's treat the newest edit as master.
      // But simple rule: If cloud exists, let's pull it to allow synchronization across devices!
      return cloudConfig;
    } else {
      await setDoc(docRef, localConfig);
      return localConfig;
    }
  } catch (error) {
    console.error('Failed to sync school config with cloud:', error);
    return localConfig;
  }
}

/**
 * Saves school config to cloud
 */
export async function saveSchoolConfigToCloud(config: SchoolConfig): Promise<void> {
  try {
    const docRef = doc(db, 'config', 'school');
    await setDoc(docRef, config);
  } catch (error) {
    console.error('Failed to save school config to cloud:', error);
  }
}

/**
 * Syncs students with Firestore
 */
export async function syncStudentsWithCloud(localStudents: Student[]): Promise<Student[]> {
  try {
    const colRef = collection(db, 'students');
    const snapshot = await getDocs(colRef);
    const cloudStudents: Student[] = [];
    
    snapshot.forEach((doc) => {
      cloudStudents.push(doc.data() as Student);
    });

    const mergedMap = new Map<string, Student>();
    localStudents.forEach(s => mergedMap.set(s.id, s));
    cloudStudents.forEach(s => mergedMap.set(s.id, s));

    const mergedList = Array.from(mergedMap.values());

    const batch = writeBatch(db);
    let hasWrites = false;
    
    for (const s of mergedList) {
      const cloudMatch = cloudStudents.find(cs => cs.id === s.id);
      if (!cloudMatch || JSON.stringify(cloudMatch) !== JSON.stringify(s)) {
        const docRef = doc(db, 'students', s.id);
        batch.set(docRef, s, { merge: true });
        hasWrites = true;
      }
    }

    if (hasWrites) {
      await batch.commit();
    }

    return mergedList;
  } catch (error) {
    console.error('Failed to sync students with cloud:', error);
    return localStudents;
  }
}

/**
 * Saves a single student or multiple students to cloud
 */
export async function saveStudentsToCloud(students: Student[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    students.forEach(s => {
      const docRef = doc(db, 'students', s.id);
      batch.set(docRef, s, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to save students to cloud:', error);
  }
}

/**
 * Deletes a student from cloud
 */
export async function deleteStudentFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'students', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete student from cloud:', error);
  }
}

/**
 * Syncs classes with Firestore
 */
export async function syncClassesWithCloud(localClasses: ClassSubject[]): Promise<ClassSubject[]> {
  try {
    const colRef = collection(db, 'classes');
    const snapshot = await getDocs(colRef);
    const cloudClasses: ClassSubject[] = [];
    
    snapshot.forEach((doc) => {
      cloudClasses.push(doc.data() as ClassSubject);
    });

    const mergedMap = new Map<string, ClassSubject>();
    localClasses.forEach(c => mergedMap.set(c.id, c));
    cloudClasses.forEach(c => mergedMap.set(c.id, c));

    const mergedList = Array.from(mergedMap.values());

    const batch = writeBatch(db);
    let hasWrites = false;
    
    for (const c of mergedList) {
      const cloudMatch = cloudClasses.find(cc => cc.id === c.id);
      if (!cloudMatch || JSON.stringify(cloudMatch) !== JSON.stringify(c)) {
        const docRef = doc(db, 'classes', c.id);
        batch.set(docRef, c, { merge: true });
        hasWrites = true;
      }
    }

    if (hasWrites) {
      await batch.commit();
    }

    return mergedList;
  } catch (error) {
    console.error('Failed to sync classes with cloud:', error);
    return localClasses;
  }
}

/**
 * Saves classes to cloud
 */
export async function saveClassesToCloud(classes: ClassSubject[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    classes.forEach(c => {
      const docRef = doc(db, 'classes', c.id);
      batch.set(docRef, c, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to save classes to cloud:', error);
  }
}

/**
 * Deletes a class from cloud
 */
export async function deleteClassFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'classes', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete class from cloud:', error);
  }
}

/**
 * Syncs attendance records with Firestore
 */
export async function syncRecordsWithCloud(localRecords: AttendanceRecord[]): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, 'records');
    const snapshot = await getDocs(colRef);
    const cloudRecords: AttendanceRecord[] = [];
    
    snapshot.forEach((doc) => {
      cloudRecords.push(doc.data() as AttendanceRecord);
    });

    const mergedMap = new Map<string, AttendanceRecord>();
    localRecords.forEach(r => mergedMap.set(r.id, r));
    cloudRecords.forEach(r => mergedMap.set(r.id, r));

    const mergedList = Array.from(mergedMap.values());

    const batch = writeBatch(db);
    let hasWrites = false;
    
    // Split batch writes to avoid size limits (max 500 documents per batch)
    // Here we'll just write up to 400 for safety or loop batches if needed
    let count = 0;
    for (const r of mergedList) {
      const cloudMatch = cloudRecords.find(cr => cr.id === r.id);
      if (!cloudMatch || JSON.stringify(cloudMatch) !== JSON.stringify(r)) {
        const docRef = doc(db, 'records', r.id);
        batch.set(docRef, r, { merge: true });
        hasWrites = true;
        count++;
        if (count >= 400) {
          break; // Avoid hitting batch write limit in single turn
        }
      }
    }

    if (hasWrites) {
      await batch.commit();
    }

    return mergedList;
  } catch (error) {
    console.error('Failed to sync records with cloud:', error);
    return localRecords;
  }
}

/**
 * Saves attendance records to cloud
 */
export async function saveRecordsToCloud(records: AttendanceRecord[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    records.forEach(r => {
      const docRef = doc(db, 'records', r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Failed to save records to cloud:', error);
  }
}

/**
 * Deletes an attendance record from cloud
 */
export async function deleteRecordFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'records', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Failed to delete record from cloud:', error);
  }
}
