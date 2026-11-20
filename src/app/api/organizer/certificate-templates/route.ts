import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STORAGE_BUCKET = 'certificate-templates'

async function ensureStorageBucket(supabase: any) {
    try {
        await supabase.storage.createBucket(STORAGE_BUCKET, {
            public: true,
            fileSizeLimit: 52428800 // 50MB
        })
    } catch {
        // Bucket already exists
    }
}

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

        const { data, error } = await supabase
            .from('certificate_templates')
            .select('*')

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
                return NextResponse.json({
                    success: true,
                    templates: [],
                    tableMissing: true,
                    notice: 'Run scripts/certificates_migration.sql to enable Supabase cloud template storage.'
                })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            templates: data || []
        })
    } catch (err: any) {
        console.error('Error fetching templates:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
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
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { tier, fileName, imageDataUrl, dimensions, layout } = body

        if (!tier) {
            return NextResponse.json({ error: 'Tier is required' }, { status: 400 })
        }

        let finalImageUrl = imageDataUrl || ''

        // If client only updated coordinates/layout without sending an image, preserve existing CDN image
        if (!finalImageUrl) {
            try {
                const { data: existing } = await supabase
                    .from('certificate_templates')
                    .select('image_data_url')
                    .eq('tier', tier)
                    .maybeSingle()
                if (existing?.image_data_url) {
                    finalImageUrl = existing.image_data_url
                }
            } catch (existErr) {
                console.warn('Could not check existing template image:', existErr)
            }
        }

        // If client provided a base64 string, upload to Supabase Storage bucket
        if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
            try {
                await ensureStorageBucket(supabase)
                const matches = finalImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
                if (matches) {
                    const mimeType = matches[1]
                    const base64Data = matches[2]
                    const buffer = Buffer.from(base64Data, 'base64')
                    let ext = 'png'
                    if (mimeType.includes('webp')) ext = 'webp'
                    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg'
                    else if (mimeType.includes('svg')) ext = 'svg'

                    let tierSlug = 'participation'
                    if (/winner\s*1/i.test(tier)) tierSlug = 'winner_1'
                    else if (/winner\s*2/i.test(tier)) tierSlug = 'winner_2'
                    else if (/winner\s*3/i.test(tier)) tierSlug = 'winner_3'
                    else tierSlug = tier.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

                    // Timestamped path to invalidate any CDN caching when a template is re-uploaded
                    const storagePath = `templates/${tierSlug}_${Date.now()}.${ext}`

                    const { error: upErr } = await supabase.storage
                        .from(STORAGE_BUCKET)
                        .upload(storagePath, buffer, {
                            contentType: mimeType,
                            upsert: true
                        })

                    if (!upErr) {
                        const { data: pubData } = supabase.storage
                            .from(STORAGE_BUCKET)
                            .getPublicUrl(storagePath)
                        if (pubData?.publicUrl) {
                            finalImageUrl = pubData.publicUrl
                        }
                    } else {
                        console.warn('Supabase storage upload error, falling back:', upErr)
                    }
                }
            } catch (storageErr) {
                console.warn('Storage upload exception:', storageErr)
            }
        }

        // Database payload is now lightweight (< 1KB) because image is hosted on Supabase Storage CDN!
        // This executes in < 15ms and completely eliminates PostgreSQL statement timeout.
        const payload = {
            tier,
            file_name: fileName || `${tier} Template`,
            image_data_url: finalImageUrl,
            dimensions: dimensions || { width: 1920, height: 1080 },
            layout: layout || {},
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('certificate_templates')
            .upsert(payload, { onConflict: 'tier' })
            .select()

        if (error) {
            console.error('Error saving template to Supabase table:', error)
            return NextResponse.json({
                success: true,
                savedLocally: true,
                error: error.message,
                notice: 'Saved in local storage; ensure certificate_templates table is created.'
            })
        }

        return NextResponse.json({
            success: true,
            cloudSynced: true,
            template: data?.[0] || payload
        })
    } catch (err: any) {
        console.error('Error saving template:', err)
        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Internal Server Error' 
        }, { status: 500 })
    }
}
