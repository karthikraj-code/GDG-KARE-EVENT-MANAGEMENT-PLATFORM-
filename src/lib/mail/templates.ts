import { MailRecipient, MailTemplate } from './types'

// Placeholders taken directly from Certificate Studio
export const CERTIFICATE_STUDIO_PLACEHOLDERS = [
    '{{certificate_title}}',
    '{{participant_name}}',
    '{{reg_no}}',
    '{{team_name}}',
    '{{dept}}',
    '{{year}}',
    '{{section}}',
    '{{category}}',
    '{{award_tier}}',
    '{{certificate_code}}',
    '{{event_name}}',
    '{{organizer_name}}'
]

// Dynamic Placeholders for Database-sourced recipients
export const DB_DYNAMIC_PLACEHOLDERS = [
    '{{participant_name}}',
    '{{email}}',
    '{{reg_no}}',
    '{{team_name}}',
    '{{category}}',
    '{{dept}}',
    '{{year}}',
    '{{section}}',
    '{{award_tier}}',
    '{{event_name}}',
    '{{event_date}}',
    '{{event_venue}}',
    '{{organizer_name}}'
]

export const DB_PLACEHOLDERS = DB_DYNAMIC_PLACEHOLDERS

// For Excel recipients, dynamic placeholders are strictly derived from the uploaded sheet columns
export const DEFAULT_EXCEL_PLACEHOLDERS: string[] = []

export const DEFAULT_PLACEHOLDERS = DB_DYNAMIC_PLACEHOLDERS

// =============================================================================
// CANONICAL GOOGLE-COLORED CERTIFICATE EMAIL TEMPLATE
// Features: Google Colors bar, recipient details table, unique ID, attachment note.
// CRITICAL: NO download or view links/buttons per user requirement.
// =============================================================================
export const GOOGLE_CERTIFICATE_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{certificate_title}}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 24px 12px; color: #202124; }
.card-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #dadce0; box-shadow: 0 4px 16px rgba(60,64,67,0.08); }
.google-bar { height: 5px; width: 100%; background: linear-gradient(90deg, #4285F4 0% 25%, #EA4335 25% 50%, #FBBC05 50% 75%, #34A853 75% 100%); }
.inner-padding { padding: 32px 28px; }
.brand-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #202124; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.dot-b { background: #4285F4; }
.dot-r { background: #EA4335; }
.dot-y { background: #FBBC05; }
.dot-g { background: #34A853; }
.title { font-size: 22px; font-weight: 700; color: #202124; margin: 0 0 8px 0; letter-spacing: -0.3px; }
.subtitle { font-size: 14px; line-height: 1.5; color: #5f6368; margin: 0 0 24px 0; }
.details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8f9fa; border: 1px solid #e8eaed; border-radius: 12px; overflow: hidden; }
.details-table td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e8eaed; }
.details-table tr:last-child td { border-bottom: none; }
.d-label { color: #5f6368; font-weight: 600; width: 38%; }
.d-val { color: #202124; font-weight: 700; text-align: right; }
.tier-badge { display: inline-block; padding: 3px 10px; background: #e8f0fe; color: #1a73e8; border-radius: 9999px; font-weight: 700; font-size: 12px; border: 1px solid #c2e7ff; }
.cert-id-box { background: #f1f3f4; border: 1px solid #dadce0; border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 20px; }
.cert-id-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #5f6368; font-weight: 700; margin-bottom: 4px; }
.cert-id-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 16px; font-weight: 700; color: #1a73e8; letter-spacing: 1px; }
.attachment-alert { background: #e6f4ea; border-left: 4px solid #34A853; border-radius: 0 10px 10px 0; padding: 14px 16px; margin-bottom: 22px; }
.attachment-title { font-weight: 700; font-size: 13px; color: #137333; margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }
.attachment-desc { font-size: 12.5px; color: #3c4043; line-height: 1.45; }
.footer { border-top: 1px solid #e8eaed; padding-top: 18px; margin-top: 10px; font-size: 12px; color: #5f6368; text-align: center; line-height: 1.5; }
</style>
</head>
<body>
<div class="card-wrapper">
    <div class="google-bar"></div>
    <div class="inner-padding">
        <div class="brand-pill">
            <span class="dot dot-b"></span>
            <span class="dot dot-r"></span>
            <span class="dot dot-y"></span>
            <span class="dot dot-g"></span>
            <span>Google Developer Groups • {{event_name}}</span>
        </div>
        <h1 class="title">{{certificate_title}}</h1>
        <p class="subtitle">
            Hello <strong>{{participant_name}}</strong>, we are pleased to deliver your official credential for your participation and performance at <strong>{{event_name}}</strong>.
        </p>

        <!-- PARTICIPANT & CREDENTIAL DETAILS TABLE -->
        <table class="details-table">
            <tr>
                <td class="d-label">Participant:</td>
                <td class="d-val">{{participant_name}}</td>
            </tr>
            <tr>
                <td class="d-label">Registration No:</td>
                <td class="d-val">{{reg_no}}</td>
            </tr>
            <tr>
                <td class="d-label">Team:</td>
                <td class="d-val">{{team_name}}</td>
            </tr>
            <tr>
                <td class="d-label">Department & Year:</td>
                <td class="d-val">{{dept}} • {{year}}</td>
            </tr>
            <tr>
                <td class="d-label">Section / Cohort:</td>
                <td class="d-val">{{section}}</td>
            </tr>
            <tr>
                <td class="d-label">Category:</td>
                <td class="d-val">{{category}}</td>
            </tr>
            <tr>
                <td class="d-label">Award Tier:</td>
                <td class="d-val"><span class="tier-badge">{{award_tier}}</span></td>
            </tr>
        </table>

        <!-- CERTIFICATE UNIQUE ID -->
        <div class="cert-id-box">
            <div class="cert-id-label">Official Certificate ID</div>
            <div class="cert-id-code">{{certificate_code}}</div>
            <div style="font-size: 11px; color: #5f6368; margin-top: 4px;">Cryptographically registered credential record</div>
        </div>

        <!-- ATTACHMENT NOTICE (NO DOWNLOAD / VIEW ONLINE BUTTONS) -->
        <div class="attachment-alert">
            <div class="attachment-title">📎 Official High-Resolution Certificate Attached</div>
            <div class="attachment-desc">
                Your print-ready certificate is attached directly to this email as <strong>{{reg_no}}.png</strong>. You can save the attached file to your device.
            </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            Organized by <strong>{{organizer_name}}</strong><br>
            Google Developer Groups on Campus
        </div>
    </div>
</div>
</body>
</html>`

// 1. PARTICIPATION CERTIFICATE EMAIL TEMPLATE
export const CERTIFICATE_PARTICIPATION_TEMPLATE: MailTemplate = {
    id: 'tpl_cert_participation',
    name: 'Certificate of Participation',
    category: 'certificate',
    isSystem: true,
    description: 'Google-colored certificate template delivering official participation credential attached.',
    subject: '🎓 Your Official Certificate of Participation for {{event_name}}',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: GOOGLE_CERTIFICATE_EMAIL_TEMPLATE
}

// 2. WINNER CERTIFICATE EMAIL TEMPLATE
export const CERTIFICATE_WINNER_TEMPLATE: MailTemplate = {
    id: 'tpl_cert_winner',
    name: 'Certificate of Excellence (Winners)',
    category: 'certificate',
    isSystem: true,
    description: 'Google-colored honors template for winner credential attached.',
    subject: '🏆 Congratulations! Your Winner Certificate for {{event_name}}',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: GOOGLE_CERTIFICATE_EMAIL_TEMPLATE
}

// 3. SPECIAL MENTION / FINALIST CERTIFICATE EMAIL TEMPLATE
export const CERTIFICATE_SPECIAL_MENTION_TEMPLATE: MailTemplate = {
    id: 'tpl_cert_special_mention',
    name: 'Certificate of Special Recognition',
    category: 'certificate',
    isSystem: true,
    description: 'Google-colored template for Special Mention and Finalist honors attached.',
    subject: '⭐ Special Recognition Honors for {{event_name}}',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: GOOGLE_CERTIFICATE_EMAIL_TEMPLATE
}

// 4. EVENT ANNOUNCEMENT & UPDATES TEMPLATE
export const EVENT_ANNOUNCEMENT_TEMPLATE: MailTemplate = {
    id: 'tpl_event_announcement',
    name: 'Event Related Announcement or Updates',
    category: 'announcement',
    isSystem: true,
    description: 'General communication template for announcing rounds, keynotes, or important instructions.',
    subject: 'Important Updates for Participants',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Event Announcement</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
.wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; }
.header { background: #0f172a; padding: 32px 30px; text-align: left; color: #ffffff; }
.brand { font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px; }
.title { font-size: 22px; font-weight: 800; margin: 0; }
.content { padding: 32px 30px; }
.message { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 22px; }
.highlight-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px; font-size: 14px; }
.info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
.info-table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
.info-label { color: #64748b; font-weight: 600; width: 35%; }
.info-val { color: #0f172a; font-weight: 700; }
.footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="brand">{{event_name}}</div>
        <h1 class="title">Event Announcement</h1>
    </div>
    <div class="content">
        <p style="font-size: 16px; font-weight: 700; margin-top: 0;">Hi {{participant_name}},</p>
        <p class="message">
            We are sharing an important update regarding <strong>{{event_name}}</strong> for team <strong>{{team_name}}</strong>.
        </p>

        <div class="highlight-box">
            <strong>Key Announcement:</strong><br>
            Please check the event platform for updated round guidelines, submission links, and schedule announcements.
        </div>

        <table class="info-table">
            <tr>
                <td class="info-label">Event Date:</td>
                <td class="info-val">{{event_date}}</td>
            </tr>
            <tr>
                <td class="info-label">Venue / Mode:</td>
                <td class="info-val">{{event_venue}}</td>
            </tr>
            <tr>
                <td class="info-label">Your Team:</td>
                <td class="info-val">{{team_name}}</td>
            </tr>
        </table>

        <p class="message">
            If you have any questions or require support, reach out to the organizers or volunteers through the helpdesk.
        </p>
    </div>
    <div class="footer">
        <p style="margin: 0;">Sent by <strong>{{organizer_name}}</strong></p>
    </div>
</div>
</body>
</html>`
}

// 5. SCHEDULE & MILESTONE UPDATE TEMPLATE
export const SCHEDULE_MILESTONE_TEMPLATE: MailTemplate = {
    id: 'tpl_schedule_milestone',
    name: 'Schedule & Milestone Reminder',
    category: 'announcement',
    isSystem: true,
    description: 'Alert participants about upcoming submission deadlines, check-ins, or schedule milestones.',
    subject: '⏰ Important Schedule Reminder: {{event_name}}',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Schedule Update</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
.wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; }
.header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 30px; text-align: left; color: #ffffff; }
.brand { font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #bfdbfe; margin-bottom: 6px; }
.title { font-size: 22px; font-weight: 800; margin: 0; }
.content { padding: 32px 30px; }
.message { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 22px; }
.timeline-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px; }
.footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="brand">{{event_name}}</div>
        <h1 class="title">Schedule & Milestone Reminder</h1>
    </div>
    <div class="content">
        <p style="font-size: 16px; font-weight: 700; margin-top: 0;">Hi {{participant_name}},</p>
        <p class="message">
            This is a quick reminder regarding key milestones and deadlines for team <strong>{{team_name}}</strong> in <strong>{{event_name}}</strong>.
        </p>
        <div class="timeline-card">
            <h4 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 14px;">Next Action Items:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.6;">
                <li>Complete your milestone check-in with your assigned mentor.</li>
                <li>Ensure all project repository links and demo slides are updated on the portal.</li>
                <li>Be ready for the review presentation at <strong>{{event_venue}}</strong>.</li>
            </ul>
        </div>
        <p class="message">
            If you need assistance, please ping the organizing team in the discussion channels.
        </p>
    </div>
    <div class="footer">
        <p style="margin: 0;">Sent by <strong>{{organizer_name}}</strong></p>
    </div>
</div>
</body>
</html>`
}

// 6. WORKSHOP & KEYNOTE INVITE TEMPLATE
export const WORKSHOP_INVITE_TEMPLATE: MailTemplate = {
    id: 'tpl_workshop_invite',
    name: 'Workshop & Speaker Session Invite',
    category: 'announcement',
    isSystem: true,
    description: 'Invite participants to specialized technical workshops, mentor sessions, or keynote talks.',
    subject: '🚀 Upcoming Tech Workshop & Mentor Session: {{event_name}}',
    placeholders: DEFAULT_PLACEHOLDERS,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workshop Session</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
.wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; }
.header { background: #0f172a; padding: 32px 30px; text-align: left; color: #ffffff; }
.brand { font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #60a5fa; margin-bottom: 6px; }
.title { font-size: 22px; font-weight: 800; margin: 0; }
.content { padding: 32px 30px; }
.message { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 22px; }
.session-box { background: #eff6ff; border-radius: 12px; padding: 18px; margin-bottom: 22px; border: 1px solid #bfdbfe; }
.footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="brand">{{event_name}}</div>
        <h1 class="title">Exclusive Workshop & Mentor Hours</h1>
    </div>
    <div class="content">
        <p style="font-size: 16px; font-weight: 700; margin-top: 0;">Hi {{participant_name}},</p>
        <p class="message">
            Join our upcoming interactive hands-on workshop designed to help your team <strong>{{team_name}}</strong> accelerate development in <strong>{{event_name}}</strong>!
        </p>
        <div class="session-box">
            <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 15px;">Session Details:</h4>
            <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6;">
                <strong>Date:</strong> {{event_date}}<br>
                <strong>Venue:</strong> {{event_venue}}<br>
                <strong>Organizer:</strong> {{organizer_name}}
            </p>
        </div>
        <p class="message">
            Attendance is highly encouraged for all registered hackathon teams. See you there!
        </p>
    </div>
    <div class="footer">
        <p style="margin: 0;">Sent by <strong>{{organizer_name}}</strong></p>
    </div>
</div>
</body>
</html>`
}

export const SYSTEM_MAIL_TEMPLATES: MailTemplate[] = [
    CERTIFICATE_PARTICIPATION_TEMPLATE,
    CERTIFICATE_WINNER_TEMPLATE,
    CERTIFICATE_SPECIAL_MENTION_TEMPLATE,
    EVENT_ANNOUNCEMENT_TEMPLATE,
    SCHEDULE_MILESTONE_TEMPLATE,
    WORKSHOP_INVITE_TEMPLATE
]

/**
 * Safely replaces dynamic placeholders in an HTML template string or subject line.
 */
export function replacePlaceholders(
    templateStr: string,
    recipient: MailRecipient,
    eventConfig: {
        eventName?: string
        eventDate?: string
        eventVenue?: string
        organizerName?: string
        baseUrl?: string
    }
): string {
    const eventName = eventConfig.eventName || 'GDG-KARE Event'
    const eventDate = eventConfig.eventDate || 'November 2026'
    const eventVenue = eventConfig.eventVenue || 'Kalasalingam Academy of Research and Education'
    const organizerName = eventConfig.organizerName || 'GDG-KARE Organizing Committee'
    const baseUrl = eventConfig.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://hackare.vercel.app')

    const certCode = recipient.certificate_code || recipient.reg_no || 'CERT'
    const certUrl = recipient.certificate_url || `${baseUrl}/verify-certificate?id=${encodeURIComponent(certCode)}`

    // Determine accurate certificate title and kind dynamically based on award tier
    const rawTier = recipient.award_tier || 'Participation'
    const lowerTier = rawTier.toLowerCase()
    let certTitle = 'Official Certificate of Participation'
    let certKind = 'Participation'

    if (
        lowerTier.includes('winner') ||
        lowerTier.includes('1st') ||
        lowerTier.includes('2nd') ||
        lowerTier.includes('3rd') ||
        lowerTier.includes('first') ||
        lowerTier.includes('second') ||
        lowerTier.includes('third')
    ) {
        certTitle = 'Official Certificate of Achievement'
        certKind = 'Achievement'
    } else if (
        lowerTier.includes('special') ||
        lowerTier.includes('mention') ||
        lowerTier.includes('merit') ||
        lowerTier.includes('finalist')
    ) {
        certTitle = 'Official Certificate of Special Recognition'
        certKind = 'Special Recognition'
    } else if (lowerTier.includes('participation')) {
        certTitle = 'Official Certificate of Participation'
        certKind = 'Participation'
    } else if (rawTier && rawTier !== 'General' && rawTier !== 'Individual Track') {
        certTitle = `Official Certificate of ${rawTier}`
        certKind = rawTier
    }

    const map: Record<string, string> = {
        '{{certificate_title}}': certTitle,
        '{{cert_title}}': certTitle,
        '{{certificate_kind}}': certKind,
        '{{cert_kind}}': certKind,
        '{{participant_name}}': recipient.name || 'Participant',
        '{{name}}': recipient.name || 'Participant',
        '{{email}}': recipient.email || '',
        '{{team_name}}': recipient.team_name || 'Individual Track',
        '{{team}}': recipient.team_name || 'Individual Track',
        '{{event_name}}': eventName,
        '{{award_tier}}': recipient.award_tier || 'Participation',
        '{{certificate_code}}': certCode,
        '{{cert_id}}': certCode,
        '{{unique_id}}': certCode,
        '{{certificate_url}}': certUrl,
        '{{qr_code}}': certUrl,
        '{{qr}}': certUrl,
        '{{reg_no}}': recipient.reg_no || '—',
        '{{regno}}': recipient.reg_no || '—',
        '{{event_date}}': eventDate,
        '{{event_venue}}': eventVenue,
        '{{organizer_name}}': organizerName,
        '{{category}}': recipient.category !== undefined && recipient.category !== null ? String(recipient.category) : '',
        '{{credit}}': recipient.category !== undefined && recipient.category !== null ? String(recipient.category) : '',
        '{{dept}}': (recipient as any).dept || recipient.metadata?.dept || '',
        '{{year}}': (recipient as any).year || recipient.metadata?.year || '',
        '{{section}}': (recipient as any).section || recipient.metadata?.section || ''
    }

    // Also support any custom metadata keys as placeholders: {{key}}
    if (recipient.metadata && typeof recipient.metadata === 'object') {
        for (const [metaKey, metaVal] of Object.entries(recipient.metadata)) {
            if (metaVal !== undefined && metaVal !== null) {
                const str = String(metaVal)
                map[`{{${metaKey}}}`] = str
                map[`{{${metaKey.trim()}}}`] = str
                map[`{{${metaKey.toLowerCase()}}}`] = str
                map[`{{${metaKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')}}}`] = str
            }
        }
    }

    let result = templateStr
    for (const [key, val] of Object.entries(map)) {
        // Replace all instances of placeholder
        result = result.split(key).join(val)
    }

    // Safeguard: If the template contained literal "Official Certificate of Achievement" or "Certificate of Achievement",
    // but this recipient is a Participation participant (or not a winner), replace it with their true title!
    if (
        !lowerTier.includes('winner') &&
        !lowerTier.includes('achievement') &&
        !lowerTier.includes('1st') &&
        !lowerTier.includes('2nd') &&
        !lowerTier.includes('3rd') &&
        !lowerTier.includes('first') &&
        !lowerTier.includes('second') &&
        !lowerTier.includes('third')
    ) {
        result = result.split('Official Certificate of Achievement').join(certTitle)
        result = result.split('Certificate of Achievement').join(certTitle)
    }

    return result
}

/**
 * Strips/removes specific or all dynamic placeholder tokens (e.g. {{category}}) from a string.
 */
export function stripPlaceholders(content: string, placeholderTags?: string[]): string {
    if (!content) return ''
    if (placeholderTags && placeholderTags.length > 0) {
        let result = content
        for (const tag of placeholderTags) {
            result = result.split(tag).join('')
        }
        return result
    }
    // Remove any {{...}} token
    return content.replace(/\{\{[a-zA-Z0-9_-]+\}\}/g, '')
}

