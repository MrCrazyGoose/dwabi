// Point values and anti-farming limits. Shared so the UI can show the same
// numbers the server enforces.

export const POINTS = {
  SCAN: 2, // any item scanned and sorted
  CONTAMINATION_BONUS: 5, // scan where contamination / a banned item was caught
  QUIZ_PER_CORRECT: 10, // weekly Zero-Waste Quiz, per correct answer
  QUIZ_PERFECT_BONUS: 10,
  BATCH: 15, // logged household batch
  BATCH_CHECKLIST_BONUS: 5, // every prep checklist item confirmed
};

export const LIMITS = {
  SCAN_POINTS_PER_DAY: 60,
  BATCHES_PER_DAY: 2,
  QUIZ_QUESTIONS: 5,
};

export const BATCH_CHECKLIST = [
  { id: 'no-bags', label: 'Recyclables are loose in the bin — no plastic bags' },
  { id: 'rinsed', label: 'Containers are empty, rinsed and clean' },
  { id: 'cardboard-flat', label: 'Cardboard is flattened and grease-free' },
  { id: 'paper-separate', label: 'Paper is in the mixed-paper cart, containers in the blue bin' },
  { id: 'hazards-out', label: 'No batteries, electronics or hazardous items in any bin' },
];

export const BATCH_FIELDS = [
  { id: 'blueBin', label: 'Blue bin items' },
  { id: 'paper', label: 'Paper & cardboard items' },
  { id: 'dropoff', label: 'Drop-off / Shady Grove items' },
  { id: 'trash', label: 'Items correctly sent to trash' },
];
