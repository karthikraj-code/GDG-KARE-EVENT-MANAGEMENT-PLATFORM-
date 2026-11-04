import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'

export const dynamic = 'force-dynamic'

export async function GET() {
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
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 1. Try reading from certificate_templates with tier = 'event_config'
        try {
            const { data: configRow, error: configError } = await supabase
                .from('certificate_templates')
                .select('*')
                .eq('tier', 'event_config')
                .maybeSingle()

            if (!configError && configRow) {
                const layout = (configRow.layout as any) || {}
                const dbEventName = layout.dbEventName || configRow.file_name || 'GDG-KARE Event Management Platform'
                const excelEventName = layout.excelEventName || 'GDG-KARE Event'
                return NextResponse.json({
                    success: true,
                    dbEventName,
                    excelEventName
                })
            }
        } catch (templateErr) {
            console.warn('Could not read event_config from certificate_templates:', templateErr)
        }

        // 2. Fallback: check latest certificate record in certificates table
        try {
            const { data: latestCert, error: certError } = await supabase
                .from('certificates')
                .select('event_name, metadata')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (!certError && latestCert) {
                const eventName = latestCert.event_name || (latestCert.metadata as any)?.event_name
                if (eventName) {
                    return NextResponse.json({
                        success: true,
                        dbEventName: eventName,
                        excelEventName: 'GDG-KARE Event'
                    })
                }
            }
        } catch (certErr) {
            console.warn('Could not read event_name from certificates table:', certErr)
        }

        return NextResponse.json({
            success: true,
            dbEventName: 'GDG-KARE Event Management Platform',
            excelEventName: 'GDG-KARE Event'
        })
    } catch (err: any) {
        console.error('Error fetching event config:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
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
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { dbEventName, excelEventName } = body

        const cleanDbEventName = typeof dbEventName === 'string' && dbEventName.trim()
            ? dbEventName.trim()
            : undefined

        const cleanExcelEventName = typeof excelEventName === 'string' && excelEventName.trim()
            ? excelEventName.trim()
            : undefined

        // 1. Persist to certificate_templates with tier = 'event_config'
        try {
            // First fetch existing to merge
            const { data: existing } = await supabase
                .from('certificate_templates')
                .select('*')
                .eq('tier', 'event_config')
                .maybeSingle()

            const existingLayout = (existing?.layout as any) || {}
            const mergedDbEventName = cleanDbEventName ?? existingLayout.dbEventName ?? existing?.file_name ?? 'GDG-KARE Event Management Platform'
            const mergedExcelEventName = cleanExcelEventName ?? existingLayout.excelEventName ?? 'GDG-KARE Event'

            await supabase
                .from('certificate_templates')
                .upsert({
                    tier: 'event_config',
                    file_name: mergedDbEventName,
                    image_data_url: 'data:text/plain;base64,',
                    dimensions: { width: 1920, height: 1080 },
                    layout: {
                        dbEventName: mergedDbEventName,
                        excelEventName: mergedExcelEventName,
                        updated_at: new Date().toISOString()
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tier' })
        } catch (templateSaveErr) {
            console.warn('Could not persist event_config to certificate_templates:', templateSaveErr)
        }

        // 2. If dbEventName was updated, synchronize all existing records in certificates table
        if (cleanDbEventName) {
            try {
                await supabase
                    .from('certificates')
                    .update({ event_name: cleanDbEventName })
                    .neq('id', '00000000-0000-0000-0000-000000000000')
            } catch (certUpdateErr) {
                console.warn('Could not update certificates.event_name column:', certUpdateErr)
            }
        }

        return NextResponse.json({
            success: true,
            dbEventName: cleanDbEventName,
            excelEventName: cleanExcelEventName
        })
    } catch (err: any) {
        console.error('Error updating event config:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}

