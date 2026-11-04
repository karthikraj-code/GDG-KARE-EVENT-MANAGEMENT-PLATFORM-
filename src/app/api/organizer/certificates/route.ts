import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'

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
        const search = url.searchParams.get('q')?.toLowerCase() || ''
        const category = url.searchParams.get('category') || ''

        let query = supabase
            .from('certificates')
            .select('*')
            .order('created_at', { ascending: false })

        if (category && category !== 'All') {
            query = query.eq('category', category)
        }

        const { data: certificates, error } = await query

        if (error) {
            // If table doesn't exist yet, return gracefully with empty list
            if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
                return NextResponse.json({
                    success: true,
                    certificates: [],
                    tableMissing: true,
                    notice: 'Certificates table pending creation in Supabase SQL editor.'
                })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        let filtered = certificates || []
        if (search) {
            filtered = filtered.filter(c => 
                (c.name || '').toLowerCase().includes(search) ||
                (c.reg_no || '').toLowerCase().includes(search) ||
                (c.certificate_code || '').toLowerCase().includes(search) ||
                (c.dept || '').toLowerCase().includes(search)
            )
        }

        return NextResponse.json({
            success: true,
            certificates: filtered
        })
    } catch (error: any) {
        console.error('Error fetching certificates:', error)
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
        const { certificates } = body

        if (!Array.isArray(certificates) || certificates.length === 0) {
            return NextResponse.json({ error: 'Certificates array is required' }, { status: 400 })
        }

        const formatted = certificates.map(c => ({
            certificate_code: c.certificate_code || c.id,
            user_id: c.user_id || null,
            name: c.name?.trim() || 'Participant',
            reg_no: c.reg_no?.trim() || '',
            dept: c.dept?.trim() || null,
            section: c.section?.trim() || null,
            year: c.year?.trim() || null,
            team_name: c.team_name?.trim() || null,
            category: c.category || 'Group 3',
            template_name: c.template_name || 'Standard Certificate',
            award_tier: c.award_tier || c.template_name || 'Participation',
            winner_rank: c.winner_rank ?? null,
            metadata: {
                ...(c.metadata || {}),
                team_name: c.team_name,
                award_tier: c.award_tier || c.template_name,
                winner_rank: c.winner_rank
            }
        }))

        // Check for existing certificates in DB to preserve permanent certificate codes across re-generations / updates
        const regNos = Array.from(new Set(formatted.map(f => f.reg_no).filter(Boolean)))
        const userIds = Array.from(new Set(formatted.map(f => f.user_id).filter(Boolean)))

        const existingMap = new Map<string, string>() // key -> existing certificate_code
        try {
            if (regNos.length > 0) {
                const { data: existingRecords } = await supabase
                    .from('certificates')
                    .select('id, certificate_code, reg_no, user_id, award_tier, template_name')
                    .in('reg_no', regNos)

                if (existingRecords && Array.isArray(existingRecords)) {
                    for (const ex of existingRecords) {
                        if (ex.reg_no && ex.certificate_code) {
                            const r = ex.reg_no.trim().toLowerCase()
                            const tier = (ex.award_tier || ex.template_name || '').trim().toLowerCase()
                            existingMap.set(`${r}_${tier}`, ex.certificate_code)
                            if (!existingMap.has(r)) {
                                existingMap.set(r, ex.certificate_code)
                            }
                        }
                        if (ex.user_id && ex.certificate_code) {
                            const u = ex.user_id.trim().toLowerCase()
                            const tier = (ex.award_tier || ex.template_name || '').trim().toLowerCase()
                            existingMap.set(`${u}_${tier}`, ex.certificate_code)
                            if (!existingMap.has(u)) {
                                existingMap.set(u, ex.certificate_code)
                            }
                        }
                    }
                }
            }
        } catch (fetchErr) {
            console.warn('Could not query existing certificates:', fetchErr)
        }

        const normalized = formatted.map(c => {
            const cleanReg = (c.reg_no || '').trim().toLowerCase()
            const cleanUser = (c.user_id || '').trim().toLowerCase()
            const cleanTier = (c.award_tier || c.template_name || '').trim().toLowerCase()

            const existingCode = existingMap.get(`${cleanReg}_${cleanTier}`)
                || existingMap.get(cleanReg)
                || (cleanUser ? (existingMap.get(`${cleanUser}_${cleanTier}`) || existingMap.get(cleanUser)) : null)

            return {
                ...c,
                certificate_code: existingCode || c.certificate_code
            }
        })

        // Upsert into certificates table
        let { data, error } = await supabase
            .from('certificates')
            .upsert(normalized, { onConflict: 'certificate_code' })
            .select()

        // If newly added columns (team_name, award_tier, winner_rank) do not exist yet in DB,
        // retry gracefully without them while keeping them in metadata JSONB
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('team_name'))) {
            const stripped = normalized.map(({ team_name, award_tier, winner_rank, ...rest }) => rest)
            const fallbackRes = await supabase
                .from('certificates')
                .upsert(stripped, { onConflict: 'certificate_code' })
                .select()
            data = fallbackRes.data
            error = fallbackRes.error
        }

        if (error) {
            // If table doesn't exist yet, return soft success with tableMissing flag
            if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
                return NextResponse.json({
                    success: true,
                    count: formatted.length,
                    tableMissing: true,
                    notice: 'Certificates were generated in browser. Run scripts/certificates_migration.sql in Supabase to persist forever.'
                })
            }
            console.error('Error saving certificates:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || formatted.length,
            message: `Successfully registered ${formatted.length} certificate(s) in database.`
        })
    } catch (error: any) {
        console.error('Error inserting certificates:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
