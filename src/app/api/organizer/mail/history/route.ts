import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'
import { sendEmail, isValidEmail } from '@/lib/mail/mailer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

        const url = new URL(request.url)
        const type = url.searchParams.get('type') || 'all'
        const status = url.searchParams.get('status') || 'all'
        const search = url.searchParams.get('search')?.toLowerCase() || ''
        const campaignId = url.searchParams.get('campaignId')

        // Fetch campaigns
        let campaigns: any[] = []
        try {
            let campQuery = supabase
                .from('mail_campaigns')
                .select('*')
                .order('created_at', { ascending: false })

            if (type !== 'all') {
                campQuery = campQuery.eq('type', type)
            }

            const { data: campData, error: campErr } = await campQuery
            if (!campErr && campData) {
                campaigns = campData
            }
        } catch (e) {
            console.warn('mail_campaigns table not yet ready')
        }

        // Fetch logs
        let logs: any[] = []
        try {
            let logQuery = supabase
                .from('mail_logs')
                .select('*')
                .order('sent_at', { ascending: false })
                .limit(500)

            if (type !== 'all') {
                logQuery = logQuery.eq('type', type)
            }

            if (status !== 'all') {
                logQuery = logQuery.eq('status', status)
            }

            if (campaignId) {
                logQuery = logQuery.eq('campaign_id', campaignId)
            }

            const { data: logData, error: logErr } = await logQuery
            if (!logErr && logData) {
                logs = logData
            }
        } catch (e) {
            console.warn('mail_logs table not yet ready')
        }

        // Apply search filter in-memory if requested
        if (search) {
            logs = logs.filter(l =>
                (l.recipient_email || '').toLowerCase().includes(search) ||
                (l.recipient_name || '').toLowerCase().includes(search) ||
                (l.recipient_reg_no || '').toLowerCase().includes(search) ||
                (l.certificate_code || '').toLowerCase().includes(search) ||
                (l.subject || '').toLowerCase().includes(search)
            )
        }

        // Calculate statistics
        const total = logs.length
        const delivered = logs.filter(l => l.status === 'delivered' || l.status === 'sent').length
        const failed = logs.filter(l => l.status === 'failed').length
        const pending = logs.filter(l => l.status === 'pending').length
        const certCount = logs.filter(l => l.type === 'certificate').length
        const announcementCount = logs.filter(l => l.type === 'announcement').length
        const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100

        return NextResponse.json({
            success: true,
            campaigns,
            logs,
            stats: {
                total,
                delivered,
                failed,
                pending,
                certCount,
                announcementCount,
                deliveryRate
            }
        })
    } catch (error: any) {
        console.error('Error fetching mail history:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
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
        const { logIds = [], retryAllFailed = false } = body

        let targetLogs: any[] = []

        if (retryAllFailed) {
            const { data } = await supabase
                .from('mail_logs')
                .select('*')
                .eq('status', 'failed')
                .limit(50)
            if (data) targetLogs = data
        } else if (Array.isArray(logIds) && logIds.length > 0) {
            const { data } = await supabase
                .from('mail_logs')
                .select('*')
                .in('id', logIds)
            if (data) targetLogs = data
        }

        if (targetLogs.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No failed deliveries found to retry',
                retriedCount: 0
            })
        }

        let retriedCount = 0
        let recoveredCount = 0

        for (const log of targetLogs) {
            if (!isValidEmail(log.recipient_email)) {
                continue
            }

            retriedCount++
            const result = await sendEmail({
                to: log.recipient_email,
                name: log.recipient_name,
                subject: log.subject,
                html: `<p>Retried email delivery:</p><p>${log.subject}</p>` // or keep placeholder if preserved
            })

            const isSuccess = result.success
            if (isSuccess) recoveredCount++

            try {
                await supabase
                    .from('mail_logs')
                    .update({
                        status: isSuccess ? 'delivered' : 'failed',
                        error_message: isSuccess ? null : (result.error || 'Retry failed'),
                        attempts: (log.attempts || 1) + 1,
                        provider: result.provider,
                        message_id: result.messageId || log.message_id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', log.id)
            } catch (updateErr) {
                console.warn('Could not update retried log row:', updateErr)
            }
        }

        return NextResponse.json({
            success: true,
            retriedCount,
            recoveredCount,
            message: `Retried ${retriedCount} failed emails. ${recoveredCount} succeeded.`
        })
    } catch (error: any) {
        console.error('Error retrying mail delivery:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

