import nodemailer from 'nodemailer'
import { SendMailOptions, MailDeliveryResult } from './types'

export interface MailProviderStatus {
    provider: 'smtp' | 'resend' | 'brevo' | 'simulated'
    isConfigured: boolean
    fromAddress: string
    details: string
}

/**
 * Detects the active mail delivery provider based on environment variables.
 */
export function getMailProviderConfig(): MailProviderStatus {
    const resendKey = process.env.RESEND_API_KEY?.trim()
    const brevoKey = process.env.BREVO_API_KEY?.trim()
    let smtpHost = process.env.SMTP_HOST?.trim() || ''
    const smtpUser = process.env.SMTP_USER?.trim() || ''
    const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)?.trim() || ''
    let defaultFrom = process.env.MAIL_FROM || process.env.SMTP_FROM || 'GDG-KARE Hackathon <noreply@gdgkare.com>'

    // Auto-detect & auto-correct SMTP Host if user set email address as host or used Google Workspace
    if (smtpHost.includes('@') || smtpHost === 'gmail.com' || (!smtpHost && (smtpUser.endsWith('@gmail.com') || smtpUser.endsWith('@klu.ac.in')))) {
        smtpHost = 'smtp.gmail.com'
    }

    // Auto-ensure sender RFC format contains an email address
    if (!defaultFrom.includes('@') && smtpUser) {
        defaultFrom = `"${defaultFrom.replace(/"/g, '').trim()}" <${smtpUser}>`
    }

    if (resendKey) {
        return {
            provider: 'resend',
            isConfigured: true,
            fromAddress: defaultFrom,
            details: 'Connected via Resend API'
        }
    }

    if (brevoKey) {
        return {
            provider: 'brevo',
            isConfigured: true,
            fromAddress: defaultFrom,
            details: 'Connected via Brevo REST API'
        }
    }

    if (smtpHost && smtpUser && smtpPass) {
        return {
            provider: 'smtp',
            isConfigured: true,
            fromAddress: defaultFrom,
            details: `Connected to SMTP Server (${smtpHost})`
        }
    }

    return {
        provider: 'simulated',
        isConfigured: false,
        fromAddress: defaultFrom,
        details: 'Development Simulation Mode (Emails logged to platform history without external SMTP credentials)'
    }
}

/**
 * Validates an email address.
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false
    const trimmed = email.trim()
    // Standard RFC-5322 compliant regex for web mail
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    return regex.test(trimmed)
}

/**
 * Dispatches an email using the active provider with automatic fallback and error reporting.
 */
export async function sendEmail(options: SendMailOptions): Promise<MailDeliveryResult> {
    const config = getMailProviderConfig()
    const cleanTo = (options.to || '').trim()

    if (!isValidEmail(cleanTo)) {
        return {
            success: false,
            provider: config.provider,
            error: `Invalid recipient email address: "${cleanTo}"`
        }
    }

    const fromAddress = options.from || config.fromAddress

    // 1. RESEND API
    if (config.provider === 'resend') {
        try {
            const apiKey = process.env.RESEND_API_KEY?.trim()
            const payload: any = {
                from: fromAddress,
                to: [cleanTo],
                subject: options.subject,
                html: options.html,
                text: options.text || options.subject
            }

            if (options.attachments && options.attachments.length > 0) {
                payload.attachments = options.attachments.map(att => {
                    const raw = att.content || ''
                    const cleanBase64 = raw.includes(';base64,') ? raw.split(';base64,')[1] : raw
                    return {
                        filename: att.filename,
                        content: cleanBase64
                    }
                })
            }

            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || data.error || 'Resend API error')
            }

            return {
                success: true,
                messageId: data.id,
                provider: 'resend'
            }
        } catch (err: any) {
            console.error('[Mailer Resend Error]:', err)
            return {
                success: false,
                provider: 'resend',
                error: err.message || 'Resend delivery failed'
            }
        }
    }

    // 2. BREVO API
    if (config.provider === 'brevo') {
        try {
            const apiKey = process.env.BREVO_API_KEY?.trim()
            const payload: any = {
                sender: { email: fromAddress.includes('<') ? fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress : fromAddress, name: 'GDG-KARE Hackathon' },
                to: [{ email: cleanTo, name: options.name || cleanTo }],
                subject: options.subject,
                htmlContent: options.html
            }

            if (options.attachments && options.attachments.length > 0) {
                payload.attachment = options.attachments.map(att => {
                    const raw = att.content || ''
                    const cleanBase64 = raw.includes(';base64,') ? raw.split(';base64,')[1] : raw
                    return {
                        name: att.filename,
                        content: cleanBase64
                    }
                })
            }

            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': apiKey!,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || 'Brevo API error')
            }

            return {
                success: true,
                messageId: data.messageId,
                provider: 'brevo'
            }
        } catch (err: any) {
            console.error('[Mailer Brevo Error]:', err)
            return {
                success: false,
                provider: 'brevo',
                error: err.message || 'Brevo delivery failed'
            }
        }
    }

    // 3. SMTP (NODEMAILER)
    if (config.provider === 'smtp') {
        try {
            const port = parseInt(process.env.SMTP_PORT || '465', 10)
            const isSecure = process.env.SMTP_SECURE === 'true' || port === 465
            let smtpHost = process.env.SMTP_HOST?.trim() || ''
            const smtpUser = process.env.SMTP_USER?.trim() || ''
            const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)?.trim() || ''

            if (smtpHost.includes('@') || smtpHost === 'gmail.com' || (!smtpHost && (smtpUser.endsWith('@gmail.com') || smtpUser.endsWith('@klu.ac.in')))) {
                smtpHost = 'smtp.gmail.com'
            }

            let effectiveFrom = fromAddress
            if (!effectiveFrom.includes('@') && smtpUser) {
                effectiveFrom = `"${effectiveFrom.replace(/"/g, '').trim()}" <${smtpUser}>`
            }

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: port,
                secure: isSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                },
                tls: {
                    rejectUnauthorized: false // avoids strict TLS blocking on local/sandbox
                }
            })

            const mailOptions: any = {
                from: effectiveFrom,
                to: cleanTo,
                subject: options.subject,
                html: options.html,
                text: options.text || options.subject
            }

            if (options.attachments && options.attachments.length > 0) {
                mailOptions.attachments = options.attachments.map(att => {
                    const raw = att.content || ''
                    const cleanBase64 = raw.includes(';base64,') ? raw.split(';base64,')[1] : raw
                    return {
                        filename: att.filename,
                        content: Buffer.from(cleanBase64, 'base64'),
                        contentType: att.contentType || 'application/pdf'
                    }
                })
            }

            const info = await transporter.sendMail(mailOptions)
            return {
                success: true,
                messageId: info.messageId,
                provider: 'smtp'
            }
        } catch (err: any) {
            console.error('[Mailer SMTP Error]:', err)
            return {
                success: false,
                provider: 'smtp',
                error: err.message || 'SMTP transmission error'
            }
        }
    }

    // 4. DEVELOPMENT SIMULATION MODE (Safe fallback when no external SMTP/API keys configured)
    console.log(`\n======================================================`)
    console.log(`[MAILER SIMULATION DISPATCH]`)
    console.log(`To: ${cleanTo}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`From: ${fromAddress}`)
    console.log(`Attachments: ${options.attachments?.length || 0}`)
    console.log(`Status: Successfully simulated delivery. (Configure SMTP or RESEND_API_KEY in .env.local to send live emails)`)
    console.log(`======================================================\n`)

    return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        provider: 'simulated'
    }
}

