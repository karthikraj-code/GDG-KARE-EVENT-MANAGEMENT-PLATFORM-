import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'
import { SYSTEM_MAIL_TEMPLATES, DEFAULT_PLACEHOLDERS, EVENT_ANNOUNCEMENT_TEMPLATE } from '@/lib/mail/templates'
import { MailTemplate } from '@/lib/mail/types'

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
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        let customTemplates: MailTemplate[] = []
        try {
            const { data, error } = await supabase
                .from('mail_templates')
                .select('*')
                .order('created_at', { ascending: false })

            if (!error && data) {
                customTemplates = data.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    category: t.category,
                    subject: t.subject,
                    bodyHtml: t.body_html,
                    placeholders: t.placeholders || DEFAULT_PLACEHOLDERS,
                    isSystem: !!t.is_system,
                    description: t.description
                }))
            }
        } catch (e) {
            console.warn('mail_templates table not queryable yet, using system templates only')
        }

        // If an organizer-saved version of tpl_event_announcement exists in Supabase, override the default
        const savedAnnouncement = customTemplates.find(t => t.id === 'tpl_event_announcement')

        const sanitizeSubject = (s?: string) => {
            if (!s) return 'Important Updates for Participants'
            const trimmed = s.trim()
            if (
                trimmed.includes('{{') ||
                trimmed.includes('event_name') ||
                trimmed.includes('Important Event Announcement') ||
                trimmed.includes('Important Update') ||
                trimmed.startsWith('📢')
            ) {
                return 'Important Updates for Participants'
            }
            return trimmed
        }

        const effectiveAnnouncementTemplate: MailTemplate = savedAnnouncement
            ? {
                ...EVENT_ANNOUNCEMENT_TEMPLATE,
                subject: sanitizeSubject(savedAnnouncement.subject),
                bodyHtml: savedAnnouncement.bodyHtml,
                description: savedAnnouncement.description || EVENT_ANNOUNCEMENT_TEMPLATE.description
            }
            : EVENT_ANNOUNCEMENT_TEMPLATE

        // Combine system templates with custom ones
        const allTemplates = [
            effectiveAnnouncementTemplate,
            ...SYSTEM_MAIL_TEMPLATES.filter(t => t.id !== 'tpl_event_announcement'),
            ...customTemplates.filter(t => t.id !== 'tpl_event_announcement')
        ]

        const sanitizedSavedAnnouncement = savedAnnouncement ? {
            ...savedAnnouncement,
            subject: sanitizeSubject(savedAnnouncement.subject)
        } : null

        return NextResponse.json({
            success: true,
            templates: allTemplates,
            savedAnnouncement: sanitizedSavedAnnouncement,
            systemTemplates: SYSTEM_MAIL_TEMPLATES,
            customTemplates
        })
    } catch (error: any) {
        console.error('Error fetching mail templates:', error)
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
        const { name, category, subject, bodyHtml, description } = body

        if (!name || !category || !subject || !bodyHtml) {
            return NextResponse.json({ error: 'Name, category, subject, and bodyHtml are required' }, { status: 400 })
        }

        const newId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

        const { data, error } = await supabase
            .from('mail_templates')
            .insert({
                id: newId,
                name: name.trim(),
                category,
                subject: subject.trim(),
                body_html: bodyHtml,
                placeholders: DEFAULT_PLACEHOLDERS,
                description: description?.trim() || null,
                is_system: false,
                created_by: user.email || user.id
            })
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
                // Table doesn't exist yet, return ephemeral template
                return NextResponse.json({
                    success: true,
                    template: {
                        id: newId,
                        name: name.trim(),
                        category,
                        subject: subject.trim(),
                        bodyHtml,
                        placeholders: DEFAULT_PLACEHOLDERS,
                        isSystem: false,
                        description: description?.trim() || null
                    },
                    notice: 'Template created in session. Please run migration script in Supabase SQL editor to persist permanently.'
                })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            template: {
                id: data.id,
                name: data.name,
                category: data.category,
                subject: data.subject,
                bodyHtml: data.body_html,
                placeholders: data.placeholders || DEFAULT_PLACEHOLDERS,
                isSystem: false,
                description: data.description
            }
        })
    } catch (error: any) {
        console.error('Error creating mail template:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
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
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        const body = await request.json()
        const { id, name, category, subject, bodyHtml, description } = body

        if (!id) {
            return NextResponse.json({ error: 'Template id is required' }, { status: 400 })
        }

        // Allow updating/upserting the announcement template as well as custom templates
        if (id.startsWith('tpl_cert_')) {
            return NextResponse.json({ error: 'Certificate templates are managed in Certificate Studio' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('mail_templates')
            .upsert({
                id,
                name: name?.trim() || 'Event Related Announcement or Updates',
                category: category || 'announcement',
                subject: subject?.trim(),
                body_html: bodyHtml,
                description: description?.trim() || null,
                is_system: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            template: data
        })
    } catch (error: any) {
        console.error('Error updating mail template:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
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
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Template id is required' }, { status: 400 })
        }

        if (id.startsWith('tpl_cert_') || id.startsWith('tpl_event_')) {
            return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 400 })
        }

        const { error } = await supabase
            .from('mail_templates')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting mail template:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

