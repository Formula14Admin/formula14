export interface EmailBrandSettings {
  primaryColor: string
  headerBg:     string
  footerText:   string
  instagramUrl: string
  facebookUrl:  string
  tiktokUrl:    string
}

export const DEFAULT_BRAND_SETTINGS: EmailBrandSettings = {
  primaryColor: '#6BA3D6',
  headerBg:     '#1a1a1a',
  footerText:   'Formula14 Basketball Training — formula14.com.au',
  instagramUrl: '',
  facebookUrl:  '',
  tiktokUrl:    '',
}

export const EMAIL_BRAND_SETTINGS_KEY         = 'email_brand_settings'
export const EMAIL_BRAND_SETTINGS_STORAGE_KEY = 'f14_email_brand_settings'

export function mergeBrandWithDefaults(raw: Partial<EmailBrandSettings>): EmailBrandSettings {
  return { ...DEFAULT_BRAND_SETTINGS, ...raw }
}
