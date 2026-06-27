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

// ── Technique ratings ────────────────────────────────────────────────

export interface TechniqueRating {
  techniqueId: string;
  helpful: number;
  somewhat: number;
  no: number;
  lastRating: string; // 'helpful' | 'somewhat' | 'no'
  updatedAt: number;
}

/**
 * Increment the rating counter for a technique.
 * Stored at users/{uid}/techniqueRatings/{techniqueId}
 */
export async function rateTechnique(
  uid: string,
  techniqueId: string,
  rating: 'helpful' | 'somewhat' | 'no',
): Promise<void> {
  const ratingDocRef = doc(db, 'users', uid, 'techniqueRatings', techniqueId);
  const snap = await getDoc(ratingDocRef);

  const existing: Partial<TechniqueRating> = snap.exists()
    ? (snap.data() as TechniqueRating)
    : {};

  const updated: TechniqueRating = {
    techniqueId,
    helpful:   (existing.helpful   ?? 0) + (rating === 'helpful'  ? 1 : 0),
    somewhat:  (existing.somewhat  ?? 0) + (rating === 'somewhat' ? 1 : 0),
    no:        (existing.no        ?? 0) + (rating === 'no'       ? 1 : 0),
    lastRating: rating,
    updatedAt: Date.now(),
  };

  await setDoc(ratingDocRef, updated, { merge: true });
}

/**
 * Return technique ids that the user found most helpful (Yes/Somewhat),
 * sorted by score descending.
 */
export async function topHelpfulTechniqueIds(uid: string): Promise<string[]> {
  const colRef = collection(db, 'users', uid, 'techniqueRatings');
  const snapshot = await getDocs(colRef);

  const scored = snapshot.docs
    .map((d) => {
      const data = d.data() as TechniqueRating;
      // Weight: helpful=2, somewhat=1
      const score = (data.helpful ?? 0) * 2 + (data.somewhat ?? 0);
      return { id: data.techniqueId, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.id);
}
