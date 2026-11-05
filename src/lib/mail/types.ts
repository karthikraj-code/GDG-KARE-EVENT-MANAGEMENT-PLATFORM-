export type MailType = 'certificate' | 'announcement'

export type MailDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface MailRecipient {
    id?: string
    name: string
    email: string
    reg_no?: string
    dept?: string
    year?: string
    section?: string
    team_name?: string
    award_tier?: string
    certificate_code?: string
    certificate_url?: string
    category?: string
    attachments?: MailAttachment[]
    metadata?: Record<string, any>
}

export interface MailAttachment {
    filename: string
    content: string // base64 encoded content
    contentType?: string
}

export interface SendMailOptions {
    to: string
    name?: string
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
    attachments?: MailAttachment[]
}

export interface MailDeliveryResult {
    success: boolean
    messageId?: string
    provider: 'resend' | 'brevo' | 'smtp' | 'simulated'
    error?: string
}

export interface MailTemplate {
    id: string
    name: string
    category: MailType
    subject: string
    bodyHtml: string
    placeholders: string[]
    isSystem?: boolean
    description?: string
}

export interface MailCampaign {
    id: string
    title: string
    type: MailType
    templateId?: string
    subject: string
    totalRecipients: number
    sentCount: number
    deliveredCount: number
    failedCount: number
    pendingCount: number
    status: 'draft' | 'sending' | 'completed' | 'failed' | 'paused'
    createdAt: string
    completedAt?: string
}

export interface MailLogEntry {
    id: string
    campaignId?: string
    recipientEmail: string
    recipientName?: string
    recipientRegNo?: string
    teamName?: string
    type: MailType
    certificateCode?: string
    awardTier?: string
    subject: string
    status: MailDeliveryStatus
    errorMessage?: string
    attempts: number
    sentAt: string
}

