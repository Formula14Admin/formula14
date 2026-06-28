export interface TemplateVariable {
  key:         string
  description: string
  sample:      string
}

export interface EmailTemplateDefinition {
  id:             string
  name:           string
  audience:       'Athlete' | 'Admin' | 'Finance' | 'HR'
  audienceColor:  string
  defaultSubject: string
  variables:      TemplateVariable[]
  defaultBody:    string
}

const AC = '#6BA3D6'
const AD = '#7C3AED'
const FI = '#D4A843'
const HR = '#059669'

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [

  // ── Athlete ────────────────────────────────────────────────────────────────

  {
    id: 'booking-confirmation',
    name: 'Booking Confirmation',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Booking Confirmed — {{session_type}} on {{session_date}}',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",       sample: 'Alex Smith' },
      { key: 'session_type',        description: 'Type of session',           sample: 'Individual Work Out' },
      { key: 'session_date',        description: 'Date of session',           sample: 'Monday, 30 June 2026' },
      { key: 'session_time',        description: 'Time of session',           sample: '9:00 AM' },
      { key: 'space',               description: 'Court / space',             sample: 'Primary Court' },
      { key: 'coach_name',          description: 'Assigned coach',            sample: 'Matt Brasser' },
      { key: 'cancellation_policy', description: 'Cancellation policy text',  sample: 'Sessions can be cancelled up to 2 hours before.' },
      { key: 'bookings_link',       description: 'Link to My Bookings',       sample: 'https://formula14.com.au/athlete/bookings' },
    ],
    defaultBody: `<h1>Booking Confirmed</h1>
<p>Hi <strong>{{athlete_name}}</strong>, your booking has been confirmed. Here are your session details:</p>
<p><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}<br><strong>Space:</strong> {{space}}<br><strong>Coach:</strong> {{coach_name}}</p>
<hr>
<p><em>{{cancellation_policy}}</em></p>
<p><a data-cta="true" href="{{bookings_link}}">View My Bookings →</a></p>`,
  },

  {
    id: 'booking-cancellation',
    name: 'Booking Cancellation',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Booking Cancelled — {{session_type}} on {{session_date}}',
    variables: [
      { key: 'athlete_name',  description: "Athlete's full name",         sample: 'Alex Smith' },
      { key: 'session_type',  description: 'Type of session',             sample: 'Small Group Session' },
      { key: 'session_date',  description: 'Date of session',             sample: 'Tuesday, 1 July 2026' },
      { key: 'session_time',  description: 'Time of session',             sample: '10:00 AM' },
      { key: 'reason',        description: 'Reason for cancellation',     sample: 'Cancelled by admin.' },
      { key: 'rebook_link',   description: 'Link to book again',          sample: 'https://formula14.com.au/athlete/book' },
    ],
    defaultBody: `<h1>Booking Cancelled</h1>
<p>Hi <strong>{{athlete_name}}</strong>, your booking has been cancelled.</p>
<p><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}</p>
<p>{{reason}}</p>
<p><a data-cta="true" href="{{rebook_link}}">Book Another Session →</a></p>`,
  },

  {
    id: 'join-request-approved',
    name: 'Join Request Approved',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: "You're in! {{session_type}} on {{session_date}}",
    variables: [
      { key: 'athlete_name',  description: "Athlete's full name", sample: 'Alex Smith' },
      { key: 'session_type',  description: 'Type of session',     sample: 'Small Group Session' },
      { key: 'session_date',  description: 'Date of session',     sample: 'Wednesday, 2 July 2026' },
      { key: 'session_time',  description: 'Time of session',     sample: '5:00 PM' },
      { key: 'space',         description: 'Court / space',       sample: 'Secondary Court' },
      { key: 'bookings_link', description: 'Link to My Bookings', sample: 'https://formula14.com.au/athlete/bookings' },
    ],
    defaultBody: `<h1>Join Request Approved!</h1>
<p>Hi <strong>{{athlete_name}}</strong>, great news — your request to join has been approved!</p>
<p><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}<br><strong>Space:</strong> {{space}}</p>
<p>We look forward to seeing you. Please arrive a few minutes before the session starts.</p>
<p><a data-cta="true" href="{{bookings_link}}">View My Bookings →</a></p>`,
  },

  {
    id: 'join-request-declined',
    name: 'Join Request Declined',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Update on your session request',
    variables: [
      { key: 'athlete_name',    description: "Athlete's full name",  sample: 'Alex Smith' },
      { key: 'session_type',    description: 'Type of session',      sample: 'Small Group Session' },
      { key: 'session_date',    description: 'Date of session',      sample: 'Wednesday, 2 July 2026' },
      { key: 'decline_reason',  description: 'Reason for declining', sample: 'Session is at capacity.' },
      { key: 'contact_email',   description: 'Contact email',        sample: 'admin@formula14.com.au' },
    ],
    defaultBody: `<h1>Update on your join request</h1>
<p>Hi <strong>{{athlete_name}}</strong>, unfortunately your request to join <strong>{{session_type}}</strong> on {{session_date}} wasn't approved.</p>
<p>{{decline_reason}}</p>
<p>If you have questions, contact us at <a href="mailto:{{contact_email}}">{{contact_email}}</a>.</p>
<p><a data-cta="true" href="https://formula14.com.au/athlete/book">Browse Other Sessions →</a></p>`,
  },

  {
    id: 'session-reminder',
    name: 'Session Reminder',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Reminder: {{session_type}} tomorrow at {{session_time}}',
    variables: [
      { key: 'athlete_name',    description: "Athlete's full name", sample: 'Alex Smith' },
      { key: 'session_type',    description: 'Type of session',     sample: 'Individual Work Out' },
      { key: 'session_date',    description: 'Date of session',     sample: 'Tomorrow, 30 June 2026' },
      { key: 'session_time',    description: 'Time of session',     sample: '9:00 AM' },
      { key: 'space',           description: 'Court / space',       sample: 'Primary Court' },
      { key: 'directions_link', description: 'Link to directions',  sample: 'https://maps.google.com' },
    ],
    defaultBody: `<h1>Session Reminder</h1>
<p>Hi <strong>{{athlete_name}}</strong>, just a reminder that you have a session coming up!</p>
<p><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}<br><strong>Space:</strong> {{space}}</p>
<p>See you on the court!</p>
<p><a data-cta="true" href="{{directions_link}}">Get Directions →</a></p>`,
  },

  {
    id: 'casual-shooting-bump',
    name: 'Casual Shooting Bump',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Your Casual Shooting booking has been updated',
    variables: [
      { key: 'athlete_name',  description: "Athlete's full name",    sample: 'Alex Smith' },
      { key: 'session_date',  description: 'Date of session',        sample: 'Thursday, 3 July 2026' },
      { key: 'session_time',  description: 'Time of session',        sample: '2:00 PM' },
      { key: 'reason',        description: 'Reason for the bump',    sample: 'A higher-priority member required this slot.' },
      { key: 'rebook_link',   description: 'Link to rebook',         sample: 'https://formula14.com.au/athlete/book' },
    ],
    defaultBody: `<h1>Booking Update</h1>
<p>Hi <strong>{{athlete_name}}</strong>, your Casual Shooting booking on <strong>{{session_date}} at {{session_time}}</strong> has been cancelled.</p>
<p>{{reason}}</p>
<p>We apologise for the inconvenience and recommend booking another available time.</p>
<p><a data-cta="true" href="{{rebook_link}}">Book Another Time →</a></p>`,
  },

  {
    id: 'failed-payment',
    name: 'Failed Payment',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Payment failed — action required',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",          sample: 'Alex Smith' },
      { key: 'amount',              description: 'Amount due',                   sample: '$75.00' },
      { key: 'session_type',        description: 'Session type',                 sample: 'Individual Work Out' },
      { key: 'session_date',        description: 'Session date',                 sample: 'Friday, 4 July 2026' },
      { key: 'outstanding_count',   description: 'Outstanding payment count',    sample: '1' },
      { key: 'update_payment_link', description: 'Link to update payment',       sample: 'https://formula14.com.au/athlete/membership' },
    ],
    defaultBody: `<h1>Payment Failed</h1>
<p>Hi <strong>{{athlete_name}}</strong>, we were unable to process a payment on your account.</p>
<p><strong>Amount:</strong> {{amount}}<br><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Outstanding payments:</strong> {{outstanding_count}}</p>
<p>3 outstanding payments will block new bookings on your account. Please update your payment details as soon as possible.</p>
<p><a data-cta="true" href="{{update_payment_link}}">Update Payment Details →</a></p>`,
  },

  {
    id: 'membership-renewal-reminder',
    name: 'Membership Renewal Reminder',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Your Formula14 membership renews in {{days_until_renewal}} days',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",   sample: 'Alex Smith' },
      { key: 'membership_tier',     description: 'Membership tier',       sample: 'Gold' },
      { key: 'renewal_date',        description: 'Renewal date',          sample: 'Monday, 7 July 2026' },
      { key: 'days_until_renewal',  description: 'Days until renewal',    sample: '3' },
      { key: 'amount',              description: 'Renewal amount',        sample: '$75.00' },
      { key: 'membership_link',     description: 'Link to membership',    sample: 'https://formula14.com.au/athlete/membership' },
    ],
    defaultBody: `<h1>Membership Renewal Reminder</h1>
<p>Hi <strong>{{athlete_name}}</strong>, your Formula14 membership renews in <strong>{{days_until_renewal}} days</strong>.</p>
<p><strong>Tier:</strong> {{membership_tier}}<br><strong>Renewal Date:</strong> {{renewal_date}}<br><strong>Amount:</strong> {{amount}}</p>
<p>Your membership will renew automatically. Visit your membership page if you have any questions.</p>
<p><a data-cta="true" href="{{membership_link}}">View My Membership →</a></p>`,
  },

  {
    id: 'program-enrolment-confirmation',
    name: 'Program Enrolment Confirmation',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Enrolment Confirmed — {{program_name}}',
    variables: [
      { key: 'athlete_name',  description: "Athlete's full name",   sample: 'Alex Smith' },
      { key: 'program_name',  description: 'Program name',          sample: 'Performance Lab' },
      { key: 'term_start',    description: 'Term start date',       sample: '7 July 2026' },
      { key: 'term_end',      description: 'Term end date',         sample: '28 September 2026' },
      { key: 'sessions_count',description: 'Number of sessions',   sample: '12' },
      { key: 'term_fee',      description: 'Total fee',             sample: '$240.00' },
      { key: 'schedule',      description: 'Session schedule',      sample: 'Every Tuesday 5:00 PM' },
    ],
    defaultBody: `<h1>Enrolment Confirmed!</h1>
<p>Hi <strong>{{athlete_name}}</strong>, you're enrolled in <strong>{{program_name}}</strong>!</p>
<p><strong>Start:</strong> {{term_start}}<br><strong>End:</strong> {{term_end}}<br><strong>Sessions:</strong> {{sessions_count}}<br><strong>Fee:</strong> {{term_fee}}<br><strong>Schedule:</strong> {{schedule}}</p>
<p>We're looking forward to having you in the program.</p>
<p><a data-cta="true" href="https://formula14.com.au/athlete/bookings">View My Bookings →</a></p>`,
  },

  {
    id: 'athlete-invitation',
    name: 'Welcome / Invitation',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Welcome to Formula14, {{athlete_name}}!',
    variables: [
      { key: 'athlete_name', description: "Athlete's first name",  sample: 'Alex' },
      { key: 'login_link',   description: 'Link to log in',        sample: 'https://formula14.com.au/login' },
    ],
    defaultBody: `<h1>Welcome to Formula14, {{athlete_name}}!</h1>
<p>You've been added to the Formula14 athlete app by our coaching team. You can now log in to manage your bookings, track your goals, and stay connected with your coaches.</p>
<ul>
<li>Book sessions and view your schedule</li>
<li>Track your weekly credits and membership details</li>
<li>Set goals and daily habits</li>
<li>Journal your training</li>
<li>Complete wellbeing check-ins</li>
</ul>
<p><a data-cta="true" href="{{login_link}}">Log in to Formula14 →</a></p>`,
  },

  {
    id: 'password-reset',
    name: 'Password Reset',
    audience: 'Athlete',
    audienceColor: AC,
    defaultSubject: 'Reset your Formula14 password',
    variables: [
      { key: 'reset_link',   description: 'Password reset link', sample: 'https://formula14.com.au/reset-password?token=test' },
      { key: 'expiry_time',  description: 'Link expiry time',    sample: '1 hour' },
    ],
    defaultBody: `<h1>Reset your password</h1>
<p>We received a request to reset the password for your Formula14 account.</p>
<p>Click the button below to set a new password. This link expires in <strong>{{expiry_time}}</strong>.</p>
<p><a data-cta="true" href="{{reset_link}}">Reset My Password →</a></p>
<hr>
<p><em>If you didn't request a password reset, you can safely ignore this email — your account has not been changed.</em></p>`,
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  {
    id: 'new-join-request',
    name: 'New Join Request Alert',
    audience: 'Admin',
    audienceColor: AD,
    defaultSubject: 'New join request — {{session_type}} on {{session_date}}',
    variables: [
      { key: 'athlete_name',  description: "Athlete's full name",  sample: 'Alex Smith' },
      { key: 'session_type',  description: 'Session type',         sample: 'Small Group Session' },
      { key: 'session_date',  description: 'Session date',         sample: 'Wednesday, 2 July 2026' },
      { key: 'session_time',  description: 'Session time',         sample: '5:00 PM' },
      { key: 'approve_link',  description: 'Link to approve',      sample: 'https://formula14.com.au/bookings' },
      { key: 'decline_link',  description: 'Link to decline',      sample: 'https://formula14.com.au/bookings' },
    ],
    defaultBody: `<h1>New Join Request</h1>
<p>A new join request has been submitted and is waiting for your approval.</p>
<p><strong>Athlete:</strong> {{athlete_name}}<br><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}</p>
<p><a data-cta="true" href="{{approve_link}}">Review in Bookings →</a></p>`,
  },

  {
    id: 'program-enrolment-request',
    name: 'New Program Enrolment Request',
    audience: 'Admin',
    audienceColor: AD,
    defaultSubject: 'Enrolment request — {{program_name}}',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",        sample: 'Alex Smith' },
      { key: 'program_name',        description: 'Program name',               sample: 'Domestic Academy' },
      { key: 'approve_link',        description: 'Link to approve',            sample: 'https://formula14.com.au/bookings' },
      { key: 'decline_link',        description: 'Link to decline',            sample: 'https://formula14.com.au/bookings' },
      { key: 'athlete_profile_link',description: 'Link to athlete profile',    sample: 'https://formula14.com.au/athletes' },
    ],
    defaultBody: `<h1>New Enrolment Request</h1>
<p>A new enrolment request has been submitted for <strong>{{program_name}}</strong>.</p>
<p><strong>Athlete:</strong> {{athlete_name}}<br><strong>Program:</strong> {{program_name}}</p>
<p><a data-cta="true" href="{{approve_link}}">Review in Bookings →</a></p>`,
  },

  {
    id: 'new-athlete-registration',
    name: 'New Athlete Registration',
    audience: 'Admin',
    audienceColor: AD,
    defaultSubject: 'New athlete signed up — {{athlete_name}}',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",     sample: 'Alex Smith' },
      { key: 'athlete_email',       description: "Athlete's email",         sample: 'alex@example.com' },
      { key: 'signup_date',         description: 'Sign-up date',            sample: '28 June 2026' },
      { key: 'athlete_profile_link',description: 'Link to athlete profile', sample: 'https://formula14.com.au/athletes' },
    ],
    defaultBody: `<h1>New Athlete Registration</h1>
<p>A new athlete has signed up through the registration page.</p>
<p><strong>Name:</strong> {{athlete_name}}<br><strong>Email:</strong> {{athlete_email}}<br><strong>Signed up:</strong> {{signup_date}}</p>
<p><a data-cta="true" href="{{athlete_profile_link}}">View Athlete Profile →</a></p>`,
  },

  {
    id: 'failed-payment-admin',
    name: 'Failed Payment Alert',
    audience: 'Admin',
    audienceColor: AD,
    defaultSubject: 'Payment failed — {{athlete_name}}',
    variables: [
      { key: 'athlete_name',        description: "Athlete's full name",     sample: 'Alex Smith' },
      { key: 'amount',              description: 'Amount',                  sample: '$75.00' },
      { key: 'session_type',        description: 'Session type',            sample: 'Individual Work Out' },
      { key: 'outstanding_count',   description: 'Outstanding count',       sample: '1' },
      { key: 'athlete_profile_link',description: 'Link to athlete profile', sample: 'https://formula14.com.au/athletes' },
    ],
    defaultBody: `<h1>Failed Payment Alert</h1>
<p>A payment has failed and may require follow-up.</p>
<p><strong>Athlete:</strong> {{athlete_name}}<br><strong>Amount:</strong> {{amount}}<br><strong>Session:</strong> {{session_type}}<br><strong>Outstanding payments:</strong> {{outstanding_count}}</p>
<p><a data-cta="true" href="{{athlete_profile_link}}">View Athlete Profile →</a></p>`,
  },

  {
    id: 'low-capacity-alert',
    name: 'Low Capacity Alert',
    audience: 'Admin',
    audienceColor: AD,
    defaultSubject: 'Low attendance alert — {{session_type}} on {{session_date}}',
    variables: [
      { key: 'session_type',       description: 'Session type',          sample: 'Small Group Session' },
      { key: 'session_date',       description: 'Session date',          sample: 'Monday, 30 June 2026' },
      { key: 'session_time',       description: 'Session time',          sample: '5:00 PM' },
      { key: 'current_athletes',   description: 'Current athlete count', sample: '1' },
      { key: 'minimum_threshold',  description: 'Minimum required',      sample: '3' },
      { key: 'session_link',       description: 'Link to session',       sample: 'https://formula14.com.au/bookings' },
    ],
    defaultBody: `<h1>Low Attendance Alert</h1>
<p>A session has fallen below the minimum attendance threshold.</p>
<p><strong>Session:</strong> {{session_type}}<br><strong>Date:</strong> {{session_date}}<br><strong>Time:</strong> {{session_time}}<br><strong>Current athletes:</strong> {{current_athletes}}<br><strong>Minimum required:</strong> {{minimum_threshold}}</p>
<p><a data-cta="true" href="{{session_link}}">View Session →</a></p>`,
  },

  // ── Finance ────────────────────────────────────────────────────────────────

  {
    id: 'weekly-revenue-summary',
    name: 'Weekly Revenue Summary',
    audience: 'Finance',
    audienceColor: FI,
    defaultSubject: 'Formula14 Weekly Summary — w/c {{week_start}}',
    variables: [
      { key: 'week_start',          description: 'Week commencing date',    sample: '23 June 2026' },
      { key: 'total_revenue',       description: 'Total revenue',           sample: '$4,850.00' },
      { key: 'total_expenses',      description: 'Total expenses',          sample: '$1,200.00' },
      { key: 'net_profit',          description: 'Net profit',              sample: '$3,650.00' },
      { key: 'outstanding_invoices',description: 'Outstanding invoices',    sample: '$450.00' },
      { key: 'sessions_count',      description: 'Sessions held',           sample: '48' },
    ],
    defaultBody: `<h1>Weekly Revenue Summary</h1>
<p>Formula14 weekly summary for the week commencing <strong>{{week_start}}</strong>.</p>
<p><strong>Total Revenue:</strong> {{total_revenue}}<br><strong>Total Expenses:</strong> {{total_expenses}}<br><strong>Net Profit:</strong> {{net_profit}}<br><strong>Outstanding:</strong> {{outstanding_invoices}}<br><strong>Sessions:</strong> {{sessions_count}}</p>
<p><a data-cta="true" href="https://formula14.com.au/finances">Open Finances Dashboard →</a></p>`,
  },

  {
    id: 'monthly-financial-summary',
    name: 'Monthly Financial Summary',
    audience: 'Finance',
    audienceColor: FI,
    defaultSubject: 'Formula14 Monthly Report — {{month}}',
    variables: [
      { key: 'month',              description: 'Month name',           sample: 'June 2026' },
      { key: 'total_revenue',      description: 'Total revenue',        sample: '$18,400.00' },
      { key: 'membership_revenue', description: 'Membership revenue',   sample: '$12,000.00' },
      { key: 'session_revenue',    description: 'Session revenue',      sample: '$6,400.00' },
      { key: 'total_expenses',     description: 'Total expenses',       sample: '$5,200.00' },
      { key: 'net_profit',         description: 'Net profit',           sample: '$13,200.00' },
      { key: 'outstanding_total',  description: 'Total outstanding',    sample: '$1,250.00' },
    ],
    defaultBody: `<h1>Monthly Financial Summary</h1>
<p>Formula14 monthly report for <strong>{{month}}</strong>.</p>
<p><strong>Total Revenue:</strong> {{total_revenue}}<br><strong>Membership Revenue:</strong> {{membership_revenue}}<br><strong>Session Revenue:</strong> {{session_revenue}}<br><strong>Total Expenses:</strong> {{total_expenses}}<br><strong>Net Profit:</strong> {{net_profit}}<br><strong>Outstanding:</strong> {{outstanding_total}}</p>
<p><a data-cta="true" href="https://formula14.com.au/finances">Open Finances Dashboard →</a></p>`,
  },

  // ── HR ─────────────────────────────────────────────────────────────────────

  {
    id: 'document-expiry-warning',
    name: 'Document Expiry Warning',
    audience: 'HR',
    audienceColor: HR,
    defaultSubject: 'Document expiring soon — {{document_type}} for {{staff_name}}',
    variables: [
      { key: 'staff_name',     description: "Staff member's name",  sample: 'Sam Coach' },
      { key: 'document_type',  description: 'Document type',        sample: 'Working With Children Check' },
      { key: 'expiry_date',    description: 'Expiry date',          sample: '15 July 2026' },
      { key: 'days_remaining', description: 'Days until expiry',    sample: '17' },
      { key: 'hr_link',        description: 'Link to HR page',      sample: 'https://formula14.com.au/hr' },
    ],
    defaultBody: `<h1>Document Expiry Warning</h1>
<p>A staff document is expiring soon and requires renewal.</p>
<p><strong>Staff Member:</strong> {{staff_name}}<br><strong>Document:</strong> {{document_type}}<br><strong>Expires:</strong> {{expiry_date}}<br><strong>Days Remaining:</strong> {{days_remaining}}</p>
<p>Please follow up with {{staff_name}} to ensure their documentation is renewed before the expiry date.</p>
<p><a data-cta="true" href="{{hr_link}}">View in HR →</a></p>`,
  },

  {
    id: 'leave-request-submitted',
    name: 'Leave Request Submitted',
    audience: 'HR',
    audienceColor: HR,
    defaultSubject: 'Leave request from {{staff_name}}',
    variables: [
      { key: 'staff_name',   description: "Staff member's name", sample: 'Sam Coach' },
      { key: 'leave_type',   description: 'Type of leave',       sample: 'Annual Leave' },
      { key: 'start_date',   description: 'Leave start date',    sample: '14 July 2026' },
      { key: 'end_date',     description: 'Leave end date',      sample: '18 July 2026' },
      { key: 'days_count',   description: 'Number of days',      sample: '5' },
      { key: 'approve_link', description: 'Link to approve',     sample: 'https://formula14.com.au/hr' },
      { key: 'decline_link', description: 'Link to decline',     sample: 'https://formula14.com.au/hr' },
    ],
    defaultBody: `<h1>Leave Request</h1>
<p>A leave request has been submitted and is awaiting your approval.</p>
<p><strong>Staff Member:</strong> {{staff_name}}<br><strong>Leave Type:</strong> {{leave_type}}<br><strong>From:</strong> {{start_date}}<br><strong>To:</strong> {{end_date}}<br><strong>Duration:</strong> {{days_count}} days</p>
<p><a data-cta="true" href="{{approve_link}}">Review Leave Request →</a></p>`,
  },
]

export function getTemplateDefinition(id: string): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATE_DEFINITIONS.find(t => t.id === id)
}

export function getSampleVars(def: EmailTemplateDefinition): Record<string, string> {
  return Object.fromEntries(def.variables.map(v => [v.key, v.sample]))
}
