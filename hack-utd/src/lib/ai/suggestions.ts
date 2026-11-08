import type { Role } from '@/lib/auth/types';

/** Starter questions for Ask AI, tuned to what each role cares about. */
export const SUGGESTED_QUESTIONS: Record<Role, string[]> = {
  advisor: [
    'Summarize this report for the client in 3 bullets',
    'Why did Dallas DC-2 save the most?',
    'Draft a short email to the owner about these results',
    'Where do these dollar numbers come from?',
  ],
  manager: [
    'What needs my attention right now?',
    'Summarize this report for the client in 3 bullets',
    'How much did overnight HVAC waste cost us?',
    'What happens if we ignore Server Room 3 until morning?',
  ],
  technician: [
    'What equipment caused the most problems?',
    'What should I check at Galleria Mall Panel D?',
    'What happened with Server Room 2?',
  ],
};
