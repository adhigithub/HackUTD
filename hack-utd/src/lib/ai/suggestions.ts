import type { Role } from '@/lib/auth/types';

/** Starter questions for Ask AI, tuned to what each role cares about. */
export const SUGGESTED_QUESTIONS: Record<Role, string[]> = {
  advisor: [
    'Summarize this report for the client in 3 bullets',
    'Why did the data center save the most?',
    'Write a short email to the owner about these results',
    'Where do these dollar numbers come from?',
  ],
  manager: [
    'What needs my attention right now?',
    'Summarize this report for the client in 3 bullets',
    'How much did leaving the AC on at night cost us?',
    'What happens if we ignore the warm server room until morning?',
  ],
  technician: [
    'Which equipment caused the most problems?',
    'What should I check at Galleria Mall?',
    'What happened in the overheating server room?',
  ],
};
