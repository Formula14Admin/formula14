import type { TemplateName } from '@/lib/email-templates'

// ─── Recipient helpers ────────────────────────────────────────────────────────

export const ADMIN_EMAILS = {
  matt: 'admin@formula14.com.au',
  jade: 'admin@formula14.com.au',
  accountant: 'accounts@formula14.com.au',
} as const

export type AdminRecipient = 'matt' | 'jade' | 'both'
export type FinanceRecipient = 'matt' | 'jade' | 'accountant'

// ─── Individual notification shapes ──────────────────────────────────────────

export interface BasicNotif   { enabled: boolean }
export interface AdminNotif   { enabled: boolean; sendTo: AdminRecipient }
export interface FinanceNotif { enabled: boolean; sendTo: FinanceRecipient[]; customEmail?: string }

export interface NotificationSettings {
  paused:       boolean
  sendingHours: { start: number; end: number }  // 0-23

  // Athlete
  bookingConfirmation:          BasicNotif
  bookingCancellation:          BasicNotif
  joinRequestApproved:          BasicNotif
  joinRequestDeclined:          BasicNotif
  sessionReminder:              BasicNotif & { timing: '24h' | '2h' | 'both' }
  casualShootingBump:           BasicNotif
  failedPaymentAthlete:         BasicNotif
  membershipRenewalReminder:    BasicNotif & { timing: '3days' | '1day' }
  programEnrolmentConfirmation: BasicNotif
  athleteWelcome:               BasicNotif
  // passwordReset is always on — not included here

  // Admin
  newJoinRequest:               AdminNotif
  newProgramEnrolmentRequest:   AdminNotif
  newAthleteRegistration:       AdminNotif
  failedPaymentAdmin:           AdminNotif
  lowCapacityAlert:             AdminNotif & { threshold: number }

  // Finance
  weeklyRevenueSummary:         FinanceNotif
  monthlyFinancialSummary:      FinanceNotif

  // HR
  documentExpiryWarning:        AdminNotif
  leaveRequestSubmitted:        AdminNotif
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  paused:       false,
  sendingHours: { start: 7, end: 21 },

  bookingConfirmation:          { enabled: true  },
  bookingCancellation:          { enabled: true  },
  joinRequestApproved:          { enabled: true  },
  joinRequestDeclined:          { enabled: true  },
  sessionReminder:              { enabled: false, timing: '2h' },
  casualShootingBump:           { enabled: true  },
  failedPaymentAthlete:         { enabled: true  },
  membershipRenewalReminder:    { enabled: false, timing: '3days' },
  programEnrolmentConfirmation: { enabled: true  },
  athleteWelcome:               { enabled: true  },

  newJoinRequest:               { enabled: true, sendTo: 'both'  },
  newProgramEnrolmentRequest:   { enabled: true, sendTo: 'both'  },
  newAthleteRegistration:       { enabled: true, sendTo: 'both'  },
  failedPaymentAdmin:           { enabled: true, sendTo: 'matt'  },
  lowCapacityAlert:             { enabled: false, sendTo: 'both', threshold: 2 },

  weeklyRevenueSummary:         { enabled: false, sendTo: ['matt'] },
  monthlyFinancialSummary:      { enabled: false, sendTo: ['matt', 'jade'] },

  documentExpiryWarning:        { enabled: true, sendTo: 'both' },
  leaveRequestSubmitted:        { enabled: true, sendTo: 'matt' },
}

export const NOTIFICATION_SETTINGS_KEY         = 'notification_settings'
export const NOTIFICATION_SETTINGS_STORAGE_KEY = 'f14_notification_settings'

export function mergeNotifWithDefaults(raw: Partial<NotificationSettings>): NotificationSettings {
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...raw }
}

// ─── Template → notification key mapping (used in API route) ─────────────────

export type CheckableNotifKey = keyof Omit<NotificationSettings, 'paused' | 'sendingHours'>

export const TEMPLATE_TO_NOTIF_KEY: Partial<Record<TemplateName, CheckableNotifKey>> = {
  'athlete-invitation':             'athleteWelcome',
  'booking-confirmation':           'bookingConfirmation',
  'booking-cancellation':           'bookingCancellation',
  'join-request-approved':          'joinRequestApproved',
  'join-request-declined':          'joinRequestDeclined',
  'casual-shooting-bump':           'casualShootingBump',
  'failed-payment':                 'failedPaymentAthlete',
  'program-enrolment-confirmation': 'programEnrolmentConfirmation',
  'program-enrolment-request':      'newProgramEnrolmentRequest',
  // 'finance-summary' checked separately — can be weekly or monthly
  // 'staff-invitation', 'password-reset' — always send, no check
}

// Templates that are always sent regardless of notification settings
export const ALWAYS_SEND_TEMPLATES: TemplateName[] = ['password-reset', 'staff-invitation']

// ─── Test email sample data ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEST_EMAIL_DATA: Partial<Record<TemplateName, Record<string, any>>> = {
  'athlete-invitation': {
    firstName: 'Alex', lastName: 'Test', email: 'alex@example.com',
  },
  'staff-invitation': {
    firstName: 'Sam', lastName: 'Test', email: 'sam@example.com',
    role: 'Head Coach', appRole: 'coach',
  },
  'booking-confirmation': {
    athleteName: 'Alex Test', sessionType: 'Individual Work Out',
    date: 'Monday, 30 June 2026', time: '9:00 AM',
    space: 'Primary Court', coach: 'Matt Brasser',
  },
  'booking-cancellation': {
    athleteName: 'Alex Test', sessionType: 'Small Group Session',
    date: 'Tuesday, 1 July 2026', time: '10:00 AM',
  },
  'join-request-approved': {
    athleteName: 'Alex Test', sessionType: 'Small Group Session',
    date: 'Wednesday, 2 July 2026', time: '5:00 PM', space: 'Secondary Court',
  },
  'join-request-declined': {
    athleteName: 'Alex Test', sessionType: 'Small Group Session',
    date: 'Wednesday, 2 July 2026',
  },
  'casual-shooting-bump': {
    athleteName: 'Alex Test', date: 'Thursday, 3 July 2026', time: '2:00 PM',
  },
  'failed-payment': {
    athleteName: 'Alex Test', amount: '75.00',
    sessionType: 'Individual Work Out', sessionDate: 'Friday, 4 July 2026',
  },
  'program-enrolment-confirmation': {
    athleteName: 'Alex Test', programName: 'Performance Lab',
    numSessions: 12, pricePerSession: 20, startDate: '7 July 2026',
  },
  'program-enrolment-request': {
    athleteName: 'Alex Test', athleteEmail: 'alex@example.com',
    programName: 'Domestic Academy', requestedAt: '28 June 2026',
  },
  'finance-summary': {
    recipientName: 'Matt', period: 'June 2026',
    includes: ['Revenue breakdown', 'Net profit / loss', 'Transaction list'],
    notes: 'Test summary — please ignore.',
    generatedAt: new Date().toLocaleString('en-AU'),
  },
  'password-reset': {
    email: 'test@example.com',
    resetUrl: 'https://formula14.com.au/reset-password?token=testtoken',
    expiresIn: '1 hour',
  },
}
