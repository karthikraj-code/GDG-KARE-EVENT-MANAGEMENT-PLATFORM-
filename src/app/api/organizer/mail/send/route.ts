import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'
import { sendEmail, isValidEmail } from '@/lib/mail/mailer'
import { replacePlaceholders } from '@/lib/mail/templates'
import { generateCertificatePdf } from '@/lib/mail/certificatePdf'
import { MailRecipient } from '@/lib/mail/types'

export const dynamic = 'force-dynamic'

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createAdminClient()
        const dbUser = await ensureDbUser(user)
        const isOrganizer = user.role === 'organizer' || dbUser?.role === 'organizer'

        if (!isOrganizer) {
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        const body = await request.json()
        const {
            title,
            type = 'certificate',
            templateId,
            subject,
            bodyHtml,
            recipients = [],
            attachPdf = false,
            forceDuplicate = false,
            eventConfig = {}
        } = body

        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
        }

        if (!subject || !bodyHtml) {
            return NextResponse.json({ error: 'Email subject and body HTML are required' }, { status: 400 })
        }

        const campaignTitle = (title || `${type === 'certificate' ? 'Certificate Distribution' : 'Event Announcement'} - ${new Date().toLocaleDateString()}`).trim()
        const campaignId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

        // 1. Check for Duplicate Certificate Emails if duplicate protection is on
        const alreadySentSet = new Set<string>()
        if (type === 'certificate' && !forceDuplicate) {
            try {
                const { data: pastLogs } = await supabase
                    .from('mail_logs')
                    .select('certificate_code, recipient_reg_no, status')
                    .eq('type', 'certificate')
                    .in('status', ['sent', 'delivered'])

                if (pastLogs) {
                    for (const row of pastLogs) {
                        if (row.certificate_code) alreadySentSet.add(row.certificate_code.trim().toUpperCase())
                        if (row.recipient_reg_no) alreadySentSet.add(row.recipient_reg_no.trim().toUpperCase())
                    }
                }
            } catch (e) {
                // Table might not exist yet; safe to proceed
            }
        }

        // 2. Filter recipients and detect duplicates
        const toProcess: MailRecipient[] = []
        const skippedDuplicates: MailRecipient[] = []

        for (const r of recipients) {
            const certCode = (r.certificate_code || '').trim().toUpperCase()
            const regNo = (r.reg_no || '').trim().toUpperCase()

            const isDuplicate = type === 'certificate' && !forceDuplicate && (
                (certCode && alreadySentSet.has(certCode)) ||
                (regNo && alreadySentSet.has(regNo))
            )

            if (isDuplicate) {
                skippedDuplicates.push(r)
            } else {
                toProcess.push(r)
            }
        }

        // If all were skipped due to duplicate prevention
        if (toProcess.length === 0 && skippedDuplicates.length > 0) {
            return NextResponse.json({
                success: true,
                skippedAll: true,
                totalRecipients: recipients.length,
                sentCount: 0,
                failedCount: 0,
                skippedCount: skippedDuplicates.length,
                message: 'All selected recipients have already received their certificates. Check "Allow re-sending duplicate certificates" if you wish to override.'
            })
        }

        // 3. Create Campaign record in Supabase
        let hasCampaignTable = true
        try {
            await supabase.from('mail_campaigns').insert({
                id: campaignId,
                title: campaignTitle,
                type,
                template_id: templateId || null,
                subject: subject.trim(),
                total_recipients: toProcess.length,
                sent_count: 0,
                delivered_count: 0,
                failed_count: 0,
                pending_count: toProcess.length,
                status: 'sending',
                created_by: user.email || user.id
            })
        } catch (e) {
            hasCampaignTable = false
        }

        // 4. Batch Dispatch Loop (Chunk size: 4 recipients with 200ms pause)
        const CHUNK_SIZE = 4
        let sentCount = 0
        let deliveredCount = 0
        let failedCount = 0
        const logEntries: any[] = []

        for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
            const chunk = toProcess.slice(i, i + CHUNK_SIZE)

            await Promise.all(
                chunk.map(async (recipient) => {
                    const recipientEmail = (recipient.email || '').trim()

                    // Pre-validation of email
                    if (!isValidEmail(recipientEmail)) {
                        failedCount++
                        logEntries.push({
                            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                            campaign_id: campaignId,
                            recipient_email: recipientEmail || 'missing-email@invalid',
                            recipient_name: recipient.name || null,
                            recipient_reg_no: recipient.reg_no || null,
                            team_name: recipient.team_name || null,
                            type,
                            certificate_code: recipient.certificate_code || null,
                            award_tier: recipient.award_tier || null,
                            subject: subject.trim(),
                            status: 'failed',
                            error_message: `Invalid email address syntax: "${recipientEmail}"`,
                            attempts: 1,
                            provider: 'system',
                            sent_at: new Date().toISOString()
                        })
                        return
                    }

                    // Render personalized placeholders
                    const personalizedSubject = replacePlaceholders(subject, recipient, eventConfig)
                    const personalizedHtml = replacePlaceholders(bodyHtml, recipient, eventConfig)

                    // Attach pre-rendered certificate from Certificate Studio if passed, or generate fallback
                    let attachments = Array.isArray(recipient.attachments) && recipient.attachments.length > 0
                        ? recipient.attachments
                        : []

                    if (attachments.length === 0 && attachPdf && type === 'certificate') {
                        try {
                            const pdfAtt = await generateCertificatePdf({
                                recipient,
                                eventName: eventConfig.eventName,
                                eventDate: eventConfig.eventDate,
                                organizerName: eventConfig.organizerName,
                                certificateUrl: recipient.certificate_url
                            })
                            attachments.push(pdfAtt)
                        } catch (pdfErr: any) {
                            console.warn(`[PDF Attachment Warning] for ${recipient.name}:`, pdfErr)
                        }
                    }

                    // Dispatch via active Mailer provider
                    const result = await sendEmail({
                        to: recipientEmail,
                        name: recipient.name,
                        subject: personalizedSubject,
                        html: personalizedHtml,
                        attachments
                    })

                    const isSuccess = result.success
                    if (isSuccess) {
                        sentCount++
                        deliveredCount++
                    } else {
                        failedCount++
                    }

                    logEntries.push({
                        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        campaign_id: campaignId,
                        recipient_email: recipientEmail,
                        recipient_name: recipient.name || null,
                        recipient_reg_no: recipient.reg_no || null,
                        team_name: recipient.team_name || null,
                        type,
                        certificate_code: recipient.certificate_code || null,
                        award_tier: recipient.award_tier || null,
                        subject: personalizedSubject,
                        status: isSuccess ? 'delivered' : 'failed',
                        error_message: result.error || null,
                        attempts: 1,
                        provider: result.provider,
                        message_id: result.messageId || null,
                        sent_at: new Date().toISOString()
                    })
                })
            )

            // Sleep between chunks to respect rate limits
            if (i + CHUNK_SIZE < toProcess.length) {
                await sleep(200)
            }
        }

        // 5. Persist Logs and Update Campaign Status in Supabase
        try {
            if (logEntries.length > 0) {
                await supabase.from('mail_logs').insert(logEntries)
            }

            if (hasCampaignTable) {
                await supabase.from('mail_campaigns').update({
                    sent_count: sentCount,
                    delivered_count: deliveredCount,
                    failed_count: failedCount,
                    pending_count: 0,
                    status: failedCount === toProcess.length ? 'failed' : 'completed',
                    completed_at: new Date().toISOString()
                }).eq('id', campaignId)
            }
        } catch (dbErr) {
            console.warn('Could not record mail logs in database (tables pending migration):', dbErr)
        }

        return NextResponse.json({
            success: true,
            campaignId,
            campaignTitle,
            type,
            totalRecipients: recipients.length,
            processedCount: toProcess.length,
            sentCount,
            deliveredCount,
            failedCount,
            skippedDuplicatesCount: skippedDuplicates.length,
            logs: logEntries
        })
    } catch (error: any) {
        console.error('Error in batch mail send:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

