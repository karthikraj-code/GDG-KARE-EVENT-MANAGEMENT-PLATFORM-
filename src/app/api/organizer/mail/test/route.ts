import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'
import { sendEmail, isValidEmail } from '@/lib/mail/mailer'
import { replacePlaceholders } from '@/lib/mail/templates'
import { generateCertificatePdf } from '@/lib/mail/certificatePdf'
import { MailRecipient } from '@/lib/mail/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await ensureDbUser(user)
        const isOrganizer = user.role === 'organizer' || dbUser?.role === 'organizer'

        if (!isOrganizer) {
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        const body = await request.json()
        const {
            testEmail,
            subject,
            bodyHtml,
            renderedHtml: clientRenderedHtml,
            sampleRecipient: clientSampleRecipient,
            type = 'announcement',
            attachPdf = false,
            attachments: clientAttachments = [],
            eventConfig = {}
        } = body

        if (!testEmail || !isValidEmail(testEmail)) {
            return NextResponse.json({ error: 'A valid test email address is required' }, { status: 400 })
        }

        if (!subject || (!bodyHtml && !clientRenderedHtml)) {
            return NextResponse.json({ error: 'Subject and HTML content are required' }, { status: 400 })
        }

        const sampleRecipient: MailRecipient = clientSampleRecipient ? {
            ...clientSampleRecipient,
            email: testEmail.trim()
        } : {
            id: 'sample_test_user',
            name: user.name || 'Sample Participant',
            email: testEmail.trim(),
            reg_no: '9921004001',
            team_name: 'Team Alpha Pioneers',
            award_tier: type === 'certificate' ? 'Winner - 1st Place' : 'Participation',
            certificate_code: 'CERT-GDG-2026-TEST',
            category: 'Group 3',
            metadata: {
                track: 'AI / ML Innovation'
            }
        }

        // Render placeholders - Keep subject exact as composed (no [TEST EMAIL] forced prefix)
        const renderedSubject = replacePlaceholders(subject, sampleRecipient, eventConfig).trim()
        const renderedHtml = clientRenderedHtml || replacePlaceholders(bodyHtml, sampleRecipient, eventConfig)

        // Attach certificate from Certificate Studio if passed, or fallback to generated certificate
        let attachments = Array.isArray(clientAttachments) && clientAttachments.length > 0 ? clientAttachments : []
        if (attachments.length === 0 && attachPdf && type === 'certificate') {
            try {
                const pdfAtt = await generateCertificatePdf({
                    recipient: sampleRecipient,
                    eventName: eventConfig.eventName,
                    eventDate: eventConfig.eventDate,
                    organizerName: eventConfig.organizerName,
                    certificateUrl: sampleRecipient.certificate_url
                })
                attachments.push(pdfAtt)
            } catch (pdfErr) {
                console.warn('Failed to generate test certificate PDF:', pdfErr)
            }
        }

        const result = await sendEmail({
            to: testEmail.trim(),
            name: sampleRecipient.name,
            subject: renderedSubject,
            html: renderedHtml,
            attachments
        })

        if (!result.success) {
            return NextResponse.json({
                success: false,
                provider: result.provider,
                error: result.error || 'Test email delivery failed'
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            provider: result.provider,
            messageId: result.messageId,
            message: `Test email successfully dispatched to ${testEmail}`
        })
    } catch (error: any) {
        console.error('Error sending test email:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

