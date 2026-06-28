// ─── Shared layout ────────────────────────────────────────────────────────────

const ACCENT  = '#6BA3D6'
const DARK    = '#1a1a1a'
const BG      = '#f4f6f9'
const CARD_BG = '#ffffff'

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Formula14</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="background:${DARK};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
          <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;font-family:sans-serif;">
            FORMULA<span style="color:${ACCENT}">14</span>
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:${CARD_BG};padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${DARK};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Formula14 Basketball Training &mdash;
            <a href="https://formula14.com.au" style="color:${ACCENT};text-decoration:none;">formula14.com.au</a>
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">
            You&rsquo;re receiving this because you have an account with Formula14.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.3px;padding:12px 28px;border-radius:8px;text-decoration:none;">${text}</a>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">${text}</h1>`
}

function p(text: string, muted = false): string {
  return `<p style="margin:12px 0;font-size:15px;line-height:1.6;color:${muted ? '#6b7280' : '#374151'};">${text}</p>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#6b7280;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:500;">${value}</td>
  </tr>`
}

function infoTable(rows: [string, string][]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;margin:20px 0;">
    ${rows.map(([l, v]) => infoRow(l, v)).join('\n')}
  </table>`
}

// ─── 1. Athlete Invitation ─────────────────────────────────────────────────────

export interface AthleteInvitationData {
  firstName:          string
  lastName:           string
  email:              string
  temporaryPassword:  string
  membershipPlan?:    string  // e.g. "Gold — $75/week"
  loginUrl?:          string
}

export function athleteInvitation(d: AthleteInvitationData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/login'
  const credRows: [string, string][] = [
    ['Email',              d.email],
    ['Temporary password', d.temporaryPassword],
    ['Login page',         'formula14.com.au/login'],
  ]
  if (d.membershipPlan) credRows.splice(2, 0, ['Membership plan', d.membershipPlan])
  return {
    subject: 'Welcome to Formula14 — your account is ready',
    html: layout(`
      ${h1(`Welcome to Formula14, ${d.firstName}!`)}
      ${p(`Your Formula14 athlete account has been created by our coaching team. Use the login details below to access the app — you will be asked to set a new password when you first sign in.`)}
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin:20px 0;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#0369a1;">Your Login Details</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${credRows.map(([l, v]) => `<tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#64748b;width:40%;">${l}</td>
            <td style="padding:5px 0;font-size:14px;color:#0f172a;font-weight:600;font-family:monospace;">${v}</td>
          </tr>`).join('\n')}
        </table>
      </div>
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;">🔒 For security, please change your password after your first login. You will be prompted to do this automatically.</p>
      </div>
      ${btn('Log In Now', url)}
      ${divider()}
      ${p(`Once you&rsquo;re in, you can:`, true)}
      <ul style="margin:8px 0;padding-left:20px;color:#6b7280;font-size:14px;line-height:1.8;">
        <li>Book training sessions and view your schedule</li>
        <li>Track your membership credits and billing</li>
        <li>Set goals and daily habits</li>
        <li>Journal your training progress</li>
        <li>Complete wellbeing check-ins</li>
      </ul>
      ${divider()}
      ${p(`Questions? Contact us at <a href="mailto:admin@formula14.com.au" style="color:${ACCENT};">admin@formula14.com.au</a>`, true)}
    `),
  }
}

// ─── 2. Staff Invitation ───────────────────────────────────────────────────────

export interface StaffInvitationData {
  firstName: string
  lastName:  string
  email:     string
  role:      string
  appRole:   string
  loginUrl?: string
}

export function staffInvitation(d: StaffInvitationData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/login'
  return {
    subject: "You've been added to the Formula14 team",
    html: layout(`
      ${h1(`Welcome to the team, ${d.firstName}!`)}
      ${p(`You&rsquo;ve been added to the Formula14 Operations Hub. As <strong>${d.role}</strong>, you now have access to the tools and information you need to deliver great training.`)}
      ${infoTable([
        ['Name',      `${d.firstName} ${d.lastName}`],
        ['Email',     d.email],
        ['Role',      d.role],
        ['App Access', d.appRole.charAt(0).toUpperCase() + d.appRole.slice(1)],
      ])}
      ${p(`Click below to set up your password and access your account for the first time.`, true)}
      ${btn('Set up your account', url)}
      ${divider()}
      ${p(`If you have any questions, contact us at <a href="mailto:admin@formula14.com.au" style="color:${ACCENT};">admin@formula14.com.au</a>`, true)}
    `),
  }
}

// ─── 3. Booking Confirmation ───────────────────────────────────────────────────

export interface BookingConfirmationData {
  athleteName:  string
  sessionType:  string
  date:         string
  time:         string
  space:        string
  coach:        string
  loginUrl?:    string
}

export function bookingConfirmation(d: BookingConfirmationData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/bookings'
  return {
    subject: `Booking confirmed — ${d.sessionType} on ${d.date}`,
    html: layout(`
      ${h1('Booking Confirmed')}
      ${p(`Hi ${d.athleteName}, your booking has been confirmed. Here are your session details:`)}
      ${infoTable([
        ['Session',  d.sessionType],
        ['Date',     d.date],
        ['Time',     d.time],
        ['Space',    d.space],
        ['Coach',    d.coach || 'TBD'],
      ])}
      ${p(`<strong>Cancellation policy:</strong> Sessions can be cancelled up to 2 hours before the start time. Late cancellations or no-shows may affect your weekly credit allocation.`, true)}
      ${btn('View My Bookings', url)}
    `),
  }
}

// ─── 4. Join Request Approved ─────────────────────────────────────────────────

export interface JoinRequestApprovedData {
  athleteName:  string
  sessionType:  string
  date:         string
  time:         string
  space:        string
  loginUrl?:    string
}

export function joinRequestApproved(d: JoinRequestApprovedData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/bookings'
  return {
    subject: `Your join request has been approved — ${d.sessionType} on ${d.date}`,
    html: layout(`
      ${h1('Join Request Approved!')}
      ${p(`Hi ${d.athleteName}, great news — your request to join a session has been approved. You&rsquo;re now booked in:`)}
      ${infoTable([
        ['Session',  d.sessionType],
        ['Date',     d.date],
        ['Time',     d.time],
        ['Space',    d.space],
      ])}
      ${p(`We look forward to seeing you. Please arrive a few minutes before the session starts.`, true)}
      ${btn('View My Bookings', url)}
    `),
  }
}

// ─── 5. Join Request Declined ─────────────────────────────────────────────────

export interface JoinRequestDeclinedData {
  athleteName:  string
  sessionType:  string
  date:         string
  loginUrl?:    string
}

export function joinRequestDeclined(d: JoinRequestDeclinedData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/book'
  return {
    subject: 'Update on your join request',
    html: layout(`
      ${h1('Update on your join request')}
      ${p(`Hi ${d.athleteName}, unfortunately your request to join the <strong>${d.sessionType}</strong> on ${d.date} wasn&rsquo;t able to be approved this time.`)}
      ${p(`This might be due to capacity limits or session requirements. Don&rsquo;t worry — there are plenty of other sessions available.`)}
      ${p(`You can browse and book available sessions using the button below. If you have any questions, feel free to reach out to the coaching team.`, true)}
      ${btn('Book Another Session', url)}
    `),
  }
}

// ─── 6. Casual Shooting Bump ──────────────────────────────────────────────────

export interface CasualShootingBumpData {
  athleteName:  string
  date:         string
  time:         string
  loginUrl?:    string
}

export function casualShootingBump(d: CasualShootingBumpData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/book'
  return {
    subject: 'Your Casual Shooting booking has been cancelled',
    html: layout(`
      ${h1('Booking Update')}
      ${p(`Hi ${d.athleteName}, we&rsquo;re writing to let you know that your Casual Shooting booking on <strong>${d.date} at ${d.time}</strong> has been cancelled.`)}
      ${p(`A higher-priority member required that time slot, so we&rsquo;ve had to make room for them. We sincerely apologise for the inconvenience.`)}
      ${p(`Casual Shooting spots are allocated on a priority basis (Platinum → Gold → Silver → Bronze → Casual). We recommend booking another available time slot.`, true)}
      ${btn('Book Another Time', url)}
      ${divider()}
      ${p(`If you have any questions or concerns, please contact us at <a href="mailto:admin@formula14.com.au" style="color:${ACCENT};">admin@formula14.com.au</a>`, true)}
    `),
  }
}

// ─── 7. Booking Cancellation ──────────────────────────────────────────────────

export interface BookingCancellationData {
  athleteName:  string
  sessionType:  string
  date:         string
  time:         string
  loginUrl?:    string
}

export function bookingCancellation(d: BookingCancellationData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/book'
  return {
    subject: `Booking cancelled — ${d.sessionType} on ${d.date}`,
    html: layout(`
      ${h1('Booking Cancelled')}
      ${p(`Hi ${d.athleteName}, your booking has been cancelled. Here are the details of the cancelled session:`)}
      ${infoTable([
        ['Session',  d.sessionType],
        ['Date',     d.date],
        ['Time',     d.time],
      ])}
      ${p(`If you didn&rsquo;t request this cancellation, please contact us immediately at <a href="mailto:admin@formula14.com.au" style="color:${ACCENT};">admin@formula14.com.au</a>`, true)}
      ${p(`Ready to rebook? We&rsquo;d love to see you back on the court.`, true)}
      ${btn('Book a New Session', url)}
    `),
  }
}

// ─── 8. Failed Payment ────────────────────────────────────────────────────────

export interface FailedPaymentData {
  athleteName:   string
  amount:        string
  sessionDate?:  string
  sessionType?:  string
  membershipUrl?: string
}

export function failedPayment(d: FailedPaymentData): { subject: string; html: string } {
  const url = d.membershipUrl ?? 'https://formula14.com.au/athlete/membership'
  const rows: [string, string][] = [['Amount Due', `$${d.amount}`]]
  if (d.sessionType) rows.push(['Session', d.sessionType])
  if (d.sessionDate) rows.push(['Session Date', d.sessionDate])
  return {
    subject: 'Payment failed — action required',
    html: layout(`
      ${h1('Payment Failed')}
      ${p(`Hi ${d.athleteName}, we were unable to process a payment on your account. Please update your payment details as soon as possible to avoid disruption to your bookings.`)}
      ${infoTable(rows)}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#b91c1c;font-weight:600;">Important: 3 failed payments will temporarily block new bookings on your account.</p>
      </div>
      ${p(`Please visit your membership page to update your payment method or contact us if you need assistance.`, true)}
      ${btn('Update Payment Details', url)}
      ${divider()}
      ${p(`Need help? Contact us at <a href="mailto:admin@formula14.com.au" style="color:${ACCENT};">admin@formula14.com.au</a>`, true)}
    `),
  }
}

// ─── 9. Finance Summary ───────────────────────────────────────────────────────

export interface FinanceSummaryData {
  recipientName: string
  period:        string
  includes:      string[]
  notes?:        string
  generatedAt:   string
}

export function financeSummary(d: FinanceSummaryData): { subject: string; html: string } {
  const includeRows = d.includes.map(i =>
    `<li style="margin:4px 0;font-size:14px;color:#374151;">${i}</li>`
  ).join('\n')
  const notesBlock = d.notes?.trim()
    ? `${divider()}${p(`<strong>Notes from sender:</strong> ${d.notes}`, true)}`
    : ''
  return {
    subject: `Formula14 Financial Summary — ${d.period}`,
    html: layout(`
      ${h1(`Financial Summary — ${d.period}`)}
      ${p(`Hi ${d.recipientName}, please find below the Formula14 financial summary for <strong>${d.period}</strong>, generated on ${d.generatedAt}.`)}
      ${divider()}
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Included in this summary</p>
      <ul style="margin:8px 0;padding-left:20px;">
        ${includeRows}
      </ul>
      ${divider()}
      ${p(`This summary was generated by the Formula14 Operations Hub. For full financial data and reports, log in to the admin dashboard.`, true)}
      ${notesBlock}
      ${btn('Open Finances Dashboard', 'https://formula14.com.au/finances')}
    `),
  }
}

// ─── 10. Password Reset ───────────────────────────────────────────────────────

export interface PasswordResetData {
  email:     string
  resetUrl:  string
  expiresIn?: string
}

export function passwordReset(d: PasswordResetData): { subject: string; html: string } {
  return {
    subject: 'Reset your Formula14 password',
    html: layout(`
      ${h1('Reset your password')}
      ${p(`We received a request to reset the password for the Formula14 account associated with <strong>${d.email}</strong>.`)}
      ${p(`Click the button below to set a new password. This link expires in <strong>${d.expiresIn ?? '1 hour'}</strong>.`)}
      ${btn('Reset my password', d.resetUrl)}
      ${divider()}
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;">If you didn&rsquo;t request a password reset, you can safely ignore this email — your account has not been changed.</p>
      </div>
    `),
  }
}

// ─── 11. Program Enrolment Confirmation ───────────────────────────────────────

export interface ProgramEnrolmentData {
  athleteName:  string
  programName:  string
  numSessions:  number
  pricePerSession: number
  startDate?:   string
  loginUrl?:    string
}

export function programEnrolmentConfirmation(d: ProgramEnrolmentData): { subject: string; html: string } {
  const url = d.loginUrl ?? 'https://formula14.com.au/athlete/bookings'
  const total = (d.numSessions * d.pricePerSession).toFixed(2)
  const rows: [string, string][] = [
    ['Program',    d.programName],
    ['Sessions',   `${d.numSessions} sessions`],
    ['Per Session', `$${d.pricePerSession.toFixed(2)}`],
    ['Total',      `$${total}`],
  ]
  if (d.startDate) rows.push(['Starts', d.startDate])
  return {
    subject: `Enrolment confirmed — ${d.programName}`,
    html: layout(`
      ${h1('Enrolment Confirmed!')}
      ${p(`Hi ${d.athleteName}, you&rsquo;re all set! Your enrolment in <strong>${d.programName}</strong> has been confirmed.`)}
      ${infoTable(rows)}
      ${p(`We&rsquo;re looking forward to having you in the program. Please check your bookings page for the full session schedule.`, true)}
      ${btn('View My Bookings', url)}
    `),
  }
}

// ─── 12. Program Enrolment Request (to admin) ─────────────────────────────────

export interface ProgramEnrolmentRequestData {
  athleteName:    string
  athleteEmail:   string
  programName:    string
  requestedAt:    string
  adminDashUrl?:  string
}

export function programEnrolmentRequest(d: ProgramEnrolmentRequestData): { subject: string; html: string } {
  const url = d.adminDashUrl ?? 'https://formula14.com.au/bookings'
  return {
    subject: `New enrolment request — ${d.programName}`,
    html: layout(`
      ${h1('New Enrolment Request')}
      ${p(`A new enrolment request has been submitted for <strong>${d.programName}</strong> and is waiting for your approval.`)}
      ${infoTable([
        ['Athlete',   d.athleteName],
        ['Email',     d.athleteEmail],
        ['Program',   d.programName],
        ['Submitted', d.requestedAt],
      ])}
      ${p(`Log in to the admin dashboard to approve or decline this request.`, true)}
      ${btn('Review in Bookings', url)}
    `),
  }
}

// ─── Template registry ────────────────────────────────────────────────────────

export type TemplateName =
  | 'athlete-invitation'
  | 'staff-invitation'
  | 'booking-confirmation'
  | 'join-request-approved'
  | 'join-request-declined'
  | 'casual-shooting-bump'
  | 'booking-cancellation'
  | 'failed-payment'
  | 'finance-summary'
  | 'password-reset'
  | 'program-enrolment-confirmation'
  | 'program-enrolment-request'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderTemplate(name: TemplateName, data: any): { subject: string; html: string } {
  switch (name) {
    case 'athlete-invitation':             return athleteInvitation(data)
    case 'staff-invitation':               return staffInvitation(data)
    case 'booking-confirmation':           return bookingConfirmation(data)
    case 'join-request-approved':          return joinRequestApproved(data)
    case 'join-request-declined':          return joinRequestDeclined(data)
    case 'casual-shooting-bump':           return casualShootingBump(data)
    case 'booking-cancellation':           return bookingCancellation(data)
    case 'failed-payment':                 return failedPayment(data)
    case 'finance-summary':                return financeSummary(data)
    case 'password-reset':                 return passwordReset(data)
    case 'program-enrolment-confirmation': return programEnrolmentConfirmation(data)
    case 'program-enrolment-request':      return programEnrolmentRequest(data)
    default:
      throw new Error(`Unknown email template: ${name}`)
  }
}
