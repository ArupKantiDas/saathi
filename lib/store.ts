'use client';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Analysis } from '@/lib/ai/schemas';

// ── Types ────────────────────────────────────────────────────────────

export interface Entry {
  id?: string;
  createdAt: number;
  exam: string;
  entryText: string;
  mood: number | null;
  analysis: Analysis | null;
  techniqueId: string;
  crisisFlagged: boolean;
}

type EntryInput = Omit<Entry, 'id'>;

// ── Entry CRUD ───────────────────────────────────────────────────────

export async function addEntry(uid: string, entry: EntryInput): Promise<string> {
  const colRef = collection(db, 'users', uid, 'entries');
  const docRef = await addDoc(colRef, entry);
  return docRef.id;
}

export async function listEntries(uid: string): Promise<Entry[]> {
  const colRef = collection(db, 'users', uid, 'entries');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as EntryInput) }));
}

// ── Exam preference ──────────────────────────────────────────────────

const LS_EXAM_KEY = 'saathi_exam';

export async function saveExam(uid: string, exam: string): Promise<void> {
  // Mirror to localStorage for instant reads
  if (typeof window !== 'undefined') {
    localStorage.setItem(LS_EXAM_KEY, exam);
  }
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, { exam }, { merge: true });
}

export async function loadExam(uid: string): Promise<string | null> {
  // Fast path: localStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LS_EXAM_KEY);
    if (cached) return cached;
  }
  // Firestore fallback
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    const data = snap.data() as { exam?: string };
    if (data.exam) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_EXAM_KEY, data.exam);
      }
      return data.exam;
    }
  }
  return null;
}
