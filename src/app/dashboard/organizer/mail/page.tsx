'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    Mail,
    Send,
    FileSpreadsheet,
    Database,
    Award,
    Megaphone,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCw,
    Search,
    Filter,
    Plus,
    Eye,
    Code,
    FileCheck,
    FileX,
    Upload,
    Download,
    Trash2,
    RotateCcw,
    ChevronRight,
    ExternalLink,
    ShieldCheck,
    Sparkles,
    Check,
    Info,
    Server,
    Sliders,
    Layers,
    X,
    AlertTriangle,
    FileText,
    Save,
    Copy
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { MailRecipient, MailTemplate, MailLogEntry, MailCampaign, MailType } from '@/lib/mail/types'
import {
    EVENT_ANNOUNCEMENT_TEMPLATE,
    replacePlaceholders,
    CERTIFICATE_STUDIO_PLACEHOLDERS,
    DB_PLACEHOLDERS,
    DB_DYNAMIC_PLACEHOLDERS,
    DEFAULT_EXCEL_PLACEHOLDERS,
    DEFAULT_PLACEHOLDERS
} from '@/lib/mail/templates'

export default function MailManagementPage() {
    // Top Tabs: composer | history (Template selection & editing is integrated directly in composer)
    const [activeTab, setActiveTab] = useState<'composer' | 'history'>('composer')

    // Toast notification state
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
    const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
        setAlert({ type, message })
        setTimeout(() => setAlert(null), 5000)
    }

    // Provider Configuration Status
    const [providerStatus, setProviderStatus] = useState<{
        provider: string
        isConfigured: boolean
        fromAddress: string
        details: string
    } | null>(null)
    const [showProviderModal, setShowProviderModal] = useState(false)

    // =========================================================================
    // 1. CAMPAIGN COMPOSER STATE (EVENT ANNOUNCEMENTS & COMMUNICATION)
    // =========================================================================
    const mailType: MailType = 'announcement'
    const [recipientSource, setRecipientSource] = useState<'database' | 'excel'>('database')
    const [campaignTitle, setCampaignTitle] = useState('')

    // Templates: Single canonical template: "Event Related Announcement or Updates"
    const [templates, setTemplates] = useState<MailTemplate[]>([EVENT_ANNOUNCEMENT_TEMPLATE])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(EVENT_ANNOUNCEMENT_TEMPLATE.id)
    const [subject, setSubject] = useState<string>(EVENT_ANNOUNCEMENT_TEMPLATE.subject)
    const [bodyHtml, setBodyHtml] = useState<string>(EVENT_ANNOUNCEMENT_TEMPLATE.bodyHtml)
    const [editorTab, setEditorTab] = useState<'preview' | 'code'>('preview')

    // Event details
    const [eventDetails, setEventDetails] = useState({
        eventName: 'GDG-KARE Event Management Platform',
        eventDate: 'November 2026',
        eventVenue: 'Kalasalingam Academy of Research and Education',
        organizerName: 'GDG-KARE Organizing Committee'
    })

    // DB Participants
    const [dbParticipants, setDbParticipants] = useState<any[]>([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)
    const [participantSearch, setParticipantSearch] = useState('')
    const [tierFilter, setTierFilter] = useState('all')
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())

    // Excel Uploaded Recipients
    const [excelRecipients, setExcelRecipients] = useState<MailRecipient[]>([])
    const [excelFileName, setExcelFileName] = useState<string | null>(null)
    const [excelHeaders, setExcelHeaders] = useState<string[]>([])
    const [rawExcelRows, setRawExcelRows] = useState<any[]>([])
    const [excelColumnMapping, setExcelColumnMapping] = useState<{
        emailCol: string
        nameCol: string
        regCol: string
        teamCol: string
        categoryCol: string
        tierCol: string
    }>({
        emailCol: '',
        nameCol: '',
        regCol: '',
        teamCol: '',
        categoryCol: '',
        tierCol: ''
    })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Column Visibility and Mapping for Database Participants Table
    const DB_COLUMN_DEFINITIONS = [
        { key: 'name', label: 'Participant', tag: '{{participant_name}}', required: true },
        { key: 'email', label: 'Email', tag: '{{email}}', required: true },
        { key: 'reg_no', label: 'Reg No', tag: '{{reg_no}}', required: false },
        { key: 'team', label: 'Team', tag: '{{team_name}}', required: false },
        { key: 'category', label: 'Category (DB)', tag: '{{category}}', required: false },
        { key: 'tier', label: 'Award / Cert Tier', tag: '{{award_tier}}', required: false },
        { key: 'status', label: 'Certificate Status', tag: '{{certificate_code}}', required: false }
    ] as const

    const [dbColumns, setDbColumns] = useState({
        reg_no: true,
        team: true,
        category: true,
        tier: true,
        status: true
    })

    // Hidden Column Names for Excel Participants Table
    const [excelHiddenColumns, setExcelHiddenColumns] = useState<Set<string>>(new Set())
    const [isMounted, setIsMounted] = useState(false)

    // Dynamic placeholders are strictly derived 1-to-1 from the visible columns in the active participants table!
    const activePlaceholders = useMemo(() => {
        if (recipientSource === 'database') {
            return DB_COLUMN_DEFINITIONS
                .filter(col => col.required || (dbColumns as any)[col.key])
                .map(col => col.tag)
        } else {
            if (excelHeaders.length === 0) return []
            return excelHeaders
                .filter(h => !excelHiddenColumns.has(h.trim()))
                .map(h => `{{${h.trim()}}}`)
        }
    }, [recipientSource, dbColumns, excelHeaders, excelHiddenColumns])

    // Template Saving State
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Test Email Modal
    const [showTestModal, setShowTestModal] = useState(false)
    const [testEmailAddress, setTestEmailAddress] = useState('')
    const [sendingTest, setSendingTest] = useState(false)

    // Dispatching Progress State
    const [isDispatching, setIsDispatching] = useState(false)
    const [dispatchProgress, setDispatchProgress] = useState({
        total: 0,
        sent: 0,
        failed: 0,
        status: '',
        isComplete: false
    })
    const [showConfirmDispatchModal, setShowConfirmDispatchModal] = useState(false)

    // Acknowledgement Pop-up Modal State (for both Test and Real dispatch)
    interface MailAckModalData {
        isOpen: boolean
        mode: 'test' | 'real'
        targetEmail?: string
        subject: string
        provider?: string
        messageId?: string
        sampleName?: string
        sampleRegNo?: string
        totalSent?: number
        totalFailed?: number
        totalRecipients?: number
        recipients?: MailRecipient[]
        timestamp: string
        campaignTitle?: string
    }
    const [mailAckModal, setMailAckModal] = useState<MailAckModalData | null>(null)
    const [copiedAckId, setCopiedAckId] = useState(false)

    // =========================================================================
    // 2. MAIL HISTORY STATE
    // =========================================================================
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [campaigns, setCampaigns] = useState<MailCampaign[]>([])
    const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([])
    const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'certificate' | 'announcement'>('all')
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'delivered' | 'failed' | 'pending'>('all')
    const [historySearch, setHistorySearch] = useState('')
    const [historyStats, setHistoryStats] = useState({
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        certCount: 0,
        announcementCount: 0,
        deliveryRate: 100
    })
    const [retryingFailed, setRetryingFailed] = useState(false)

    // =========================================================================
    // INITIALIZATION & DATA FETCHING
    // =========================================================================
    // Safe Client-Mount Effect (loads localStorage column preferences without SSR hydration mismatch)
    useEffect(() => {
        setIsMounted(true)
        try {
            const savedDbCols = localStorage.getItem('gdg_mail_db_columns')
            if (savedDbCols) setDbColumns(JSON.parse(savedDbCols))
            const savedExcelHidden = localStorage.getItem('gdg_mail_excel_hidden_cols')
            if (savedExcelHidden) setExcelHiddenColumns(new Set(JSON.parse(savedExcelHidden)))
        } catch (e) {}
    }, [])

    // Keyboard shortcut handler for dismissing open modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (mailAckModal?.isOpen) {
                    setMailAckModal(null)
                    return
                }
                if (showTestModal) {
                    setShowTestModal(false)
                    return
                }
                if (showConfirmDispatchModal) {
                    setShowConfirmDispatchModal(false)
                    return
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [mailAckModal, showTestModal, showConfirmDispatchModal])

    useEffect(() => {
        fetchProviderConfig()
        fetchEventConfig()
        fetchTemplates()
        fetchDbParticipants()
    }, [])

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory()
        }
    }, [activeTab, historyTypeFilter, historyStatusFilter])

    const fetchProviderConfig = async () => {
        try {
            const res = await fetch('/api/organizer/mail/config')
            const data = await res.json()
            if (data.success) {
                setProviderStatus({
                    provider: data.provider,
                    isConfigured: data.isConfigured,
                    fromAddress: data.fromAddress,
                    details: data.details
                })
            }
        } catch (e) {
            console.warn('Could not fetch mail config', e)
        }
    }

    const fetchEventConfig = async () => {
        try {
            const res = await fetch('/api/organizer/event-config')
            const data = await res.json()
            if (data.success && data.dbEventName) {
                setEventDetails(prev => ({
                    ...prev,
                    eventName: data.dbEventName
                }))
            }
        } catch (e) {
            // keep defaults
        }
    }

    const cleanSubject = (s?: string): string => {
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

    const fetchTemplates = async () => {
        // Fetch saved announcement template from Supabase
        try {
            const res = await fetch('/api/organizer/mail/templates')
            const data = await res.json()
            if (data.success && data.savedAnnouncement) {
                setSubject(cleanSubject(data.savedAnnouncement.subject))
                setBodyHtml(data.savedAnnouncement.bodyHtml)
                setTemplates([data.savedAnnouncement])
                setSelectedTemplateId(data.savedAnnouncement.id)
                return
            }
        } catch (e) {
            console.warn('Could not fetch saved template from server, checking local cache')
        }

        // Check local storage cache fallback
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('gdg_mail_saved_announcement_template')
                if (saved) {
                    const parsed = JSON.parse(saved)
                    setSubject(cleanSubject(parsed.subject))
                    if (parsed.bodyHtml) setBodyHtml(parsed.bodyHtml)
                    return
                }
            } catch (e) {}
        }

        // Canonical default announcement template
        setSubject(EVENT_ANNOUNCEMENT_TEMPLATE.subject)
        setBodyHtml(EVENT_ANNOUNCEMENT_TEMPLATE.bodyHtml)
        setTemplates([EVENT_ANNOUNCEMENT_TEMPLATE])
        setSelectedTemplateId(EVENT_ANNOUNCEMENT_TEMPLATE.id)
    }

    const fetchDbParticipants = async () => {
        setLoadingParticipants(true)
        try {
            const res = await fetch('/api/organizer/mail/participants')
            const data = await res.json()
            if (data.success && Array.isArray(data.participants)) {
                setDbParticipants(data.participants)
                const validIds = new Set<string>()
                data.participants.forEach((p: any) => {
                    if (p.email && p.email.includes('@')) {
                        validIds.add(p.id)
                    }
                })
                setSelectedRecipientIds(validIds)
            }
        } catch (e) {
            console.error('Error fetching DB participants:', e)
        } finally {
            setLoadingParticipants(false)
        }
    }

    const fetchHistory = async () => {
        setLoadingHistory(true)
        try {
            const params = new URLSearchParams()
            if (historyTypeFilter !== 'all') params.set('type', historyTypeFilter)
            if (historyStatusFilter !== 'all') params.set('status', historyStatusFilter)
            if (historySearch) params.set('search', historySearch)

            const res = await fetch(`/api/organizer/mail/history?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setCampaigns(data.campaigns || [])
                setMailLogs(data.logs || [])
                setHistoryStats(data.stats || {
                    total: 0,
                    delivered: 0,
                    failed: 0,
                    pending: 0,
                    certCount: 0,
                    announcementCount: 0,
                    deliveryRate: 100
                })
            }
        } catch (e) {
            console.error('Error fetching mail history:', e)
        } finally {
            setLoadingHistory(false)
        }
    }

    // =========================================================================
    // EXCEL / CSV PARSER & DYNAMIC COLUMN MAPPING
    // =========================================================================
    const applyExcelMapping = (
        rows: any[],
        headers: string[],
        mapping: {
            emailCol: string
            nameCol: string
            regCol: string
            teamCol: string
            categoryCol: string
            tierCol: string
        }
    ) => {
        const { emailCol, nameCol, regCol, teamCol, categoryCol, tierCol } = mapping

        const parsed: MailRecipient[] = rows.map((row, idx) => {
            // Category taken directly from the mapped column or Excel row
            const rawCategory = categoryCol ? row[categoryCol] : (row['Category'] || row['category'] || row['Cat'] || '')
            const category = String(rawCategory !== undefined && rawCategory !== null ? rawCategory : '').trim()

            // Columns saved to metadata for custom Excel column placeholders (exact name, trimmed, and normalized)
            const metadata: Record<string, any> = {}
            headers.forEach(h => {
                const rawVal = row[h] !== undefined && row[h] !== null ? String(row[h]).trim() : ''
                metadata[h] = rawVal
                metadata[h.trim()] = rawVal
                metadata[h.toLowerCase().trim()] = rawVal
                metadata[h.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = rawVal
            })

            return {
                id: `excel_${idx + 1}`,
                email: String(row[emailCol] || '').trim(),
                name: String(row[nameCol] || row['Name'] || row['name'] || 'Participant').trim(),
                reg_no: String(row[regCol] || '').trim(),
                team_name: String(row[teamCol] || '').trim() || 'Individual Track',
                award_tier: String(row[tierCol] || '').trim() || 'Participation',
                certificate_code: `EXCEL-${idx + 1}-${String(row[regCol] || Math.random().toString(36).substring(2, 6)).toUpperCase()}`,
                category: category, // TAKEN DIRECTLY FROM EXCEL SHEET!
                dept: String(row['dept'] || row['department'] || row['branch'] || '').trim(),
                year: String(row['year'] || row['academic year'] || '').trim(),
                section: String(row['section'] || row['sec'] || '').trim(),
                metadata
            }
        })

        setExcelRecipients(parsed)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setExcelFileName(file.name)
        const reader = new FileReader()

        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

                if (data.length === 0) {
                    showAlert('error', 'The uploaded spreadsheet is empty')
                    return
                }

                const firstRow = data[0]
                const headers = Object.keys(firstRow)

                const findCol = (keywords: string[]) => {
                    return headers.find(h => {
                        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '')
                        return keywords.some(k => clean.includes(k))
                    }) || ''
                }

                const emailCol = findCol(['email', 'mail'])
                const nameCol = findCol(['name', 'student', 'participant', 'recipient'])
                const regCol = findCol(['reg', 'roll', 'id', 'urn'])
                const teamCol = findCol(['team', 'group', 'squad'])
                const categoryCol = findCol(['category', 'cat', 'studentcategory', 'deptcategory', 'eecredit', 'group3', 'track'])
                const tierCol = findCol(['awardtier', 'tier', 'award', 'prize', 'rank', 'position'])

                const mapping = { emailCol, nameCol, regCol, teamCol, categoryCol, tierCol }
                setExcelHeaders(headers)
                setRawExcelRows(data)
                setExcelColumnMapping(mapping)

                applyExcelMapping(data, headers, mapping)

                showAlert('success', `Loaded ${data.length} participant rows from "${file.name}" (Category column: ${categoryCol ? `"${categoryCol}"` : 'Auto-detected'})`)
            } catch (err: any) {
                console.error('Excel parse error:', err)
                showAlert('error', 'Failed to read spreadsheet: ' + err.message)
            }
        }

        reader.readAsBinaryString(file)
    }

    const handleColumnMappingChange = (field: keyof typeof excelColumnMapping, value: string) => {
        const updated = { ...excelColumnMapping, [field]: value }
        setExcelColumnMapping(updated)
        if (rawExcelRows.length > 0) {
            applyExcelMapping(rawExcelRows, excelHeaders, updated)
            showAlert('info', `Re-mapped ${field} to column "${value}"`)
        }
    }

    // =========================================================================
    // PARTICIPANTS TABLE COLUMN & DYNAMIC PLACEHOLDER SYNCHRONIZATION
    // =========================================================================
    const handleToggleDbColumn = (key: 'reg_no' | 'team' | 'category' | 'tier' | 'status', visible: boolean) => {
        setDbColumns(prev => {
            const next = { ...prev, [key]: visible }
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('gdg_mail_db_columns', JSON.stringify(next))
                } catch (e) {}
            }
            return next
        })

        const colDef = DB_COLUMN_DEFINITIONS.find(c => c.key === key)
        if (colDef) {
            if (!visible) {
                setBodyHtml(prev => prev.split(colDef.tag).join(''))
                setSubject(prev => prev.split(colDef.tag).join(''))
                showAlert('info', `Removed ${colDef.label} column and dynamic placeholder ${colDef.tag}`)
            } else {
                showAlert('success', `Restored ${colDef.label} column and dynamic placeholder ${colDef.tag}`)
            }
        }
    }

    const handleRestoreAllDbColumns = () => {
        const restored = { reg_no: true, team: true, category: true, tier: true, status: true }
        setDbColumns(restored)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('gdg_mail_db_columns', JSON.stringify(restored))
            } catch (e) {}
        }
        showAlert('success', 'Restored all database table columns and dynamic placeholders.')
    }

    const handleToggleExcelColumn = (header: string, visible: boolean) => {
        const cleanHeader = header.trim()
        const tag = `{{${cleanHeader}}}`
        setExcelHiddenColumns(prev => {
            const next = new Set(prev)
            if (!visible) {
                next.add(cleanHeader)
            } else {
                next.delete(cleanHeader)
            }
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('gdg_mail_excel_hidden_cols', JSON.stringify(Array.from(next)))
                } catch (e) {}
            }
            return next
        })

        if (!visible) {
            setBodyHtml(prev => prev.split(tag).join(''))
            setSubject(prev => prev.split(tag).join(''))
            showAlert('info', `Removed ${header} column and dynamic placeholder ${tag}`)
        } else {
            showAlert('success', `Restored ${header} column and dynamic placeholder ${tag}`)
        }
    }

    const handleRestoreAllExcelColumns = () => {
        setExcelHiddenColumns(new Set())
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('gdg_mail_excel_hidden_cols')
            } catch (e) {}
        }
        showAlert('success', 'Restored all Excel table columns and dynamic placeholders.')
    }

    const handleRemovePlaceholderTag = (tag: string) => {
        if (recipientSource === 'database') {
            const colDef = DB_COLUMN_DEFINITIONS.find(c => c.tag === tag)
            if (colDef && !colDef.required) {
                handleToggleDbColumn(colDef.key as any, false)
            } else {
                setBodyHtml(prev => prev.split(tag).join(''))
                setSubject(prev => prev.split(tag).join(''))
                showAlert('info', `Removed ${tag} from template.`)
            }
        } else {
            const rawHeader = tag.replace(/^\{\{/, '').replace(/\}\}$/, '').trim()
            handleToggleExcelColumn(rawHeader, false)
        }
    }

    // =========================================================================
    // TEMPLATE PERSISTENCE (SUPABASE + LOCALSTORAGE FALLBACK)
    // =========================================================================
    const handleSaveTemplate = async () => {
        if (!bodyHtml.trim()) {
            showAlert('error', 'Template HTML code cannot be empty.')
            return
        }
        if (!subject.trim()) {
            showAlert('error', 'Template Subject cannot be empty.')
            return
        }

        setSavingTemplate(true)
        try {
            // 1. Save directly into Supabase mail_templates table via API
            const res = await fetch('/api/organizer/mail/templates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 'tpl_event_announcement',
                    name: 'Event Related Announcement or Updates',
                    category: 'announcement',
                    subject: subject.trim(),
                    bodyHtml: bodyHtml,
                    description: 'Custom organizer announcement template'
                })
            })
            const data = await res.json()

            // 2. Cache in localStorage for immediate offline restoration
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('gdg_mail_saved_announcement_template', JSON.stringify({
                        subject: subject.trim(),
                        bodyHtml: bodyHtml,
                        savedAt: new Date().toISOString()
                    }))
                } catch (e) {}
            }

            if (res.ok && data.success) {
                showAlert('success', 'HTML Template & Subject successfully saved to Supabase!')
            } else {
                showAlert('info', 'Template saved to local browser cache.')
            }
        } catch (e: any) {
            console.error('Error saving template:', e)
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('gdg_mail_saved_announcement_template', JSON.stringify({
                        subject: subject.trim(),
                        bodyHtml: bodyHtml,
                        savedAt: new Date().toISOString()
                    }))
                } catch (err) {}
            }
            showAlert('success', 'Template saved locally to browser storage!')
        } finally {
            setSavingTemplate(false)
        }
    }

    const handleResetTemplate = () => {
        if (typeof window !== 'undefined' && window.confirm('Reset this template to the default Google-themed announcement layout? Any unsaved edits will be replaced.')) {
            setSubject(EVENT_ANNOUNCEMENT_TEMPLATE.subject)
            setBodyHtml(EVENT_ANNOUNCEMENT_TEMPLATE.bodyHtml)
            try {
                localStorage.removeItem('gdg_mail_saved_announcement_template')
            } catch (e) {}
            showAlert('info', 'Template reset to default layout.')
        }
    }

    // =========================================================================
    // RECIPIENT LIST CALCULATION
    // =========================================================================
    const filteredDbParticipants = useMemo(() => {
        return dbParticipants.filter(p => {
            const matchesSearch = !participantSearch ||
                (p.name || '').toLowerCase().includes(participantSearch.toLowerCase()) ||
                (p.email || '').toLowerCase().includes(participantSearch.toLowerCase()) ||
                (p.reg_no || '').toLowerCase().includes(participantSearch.toLowerCase()) ||
                (p.team_name || '').toLowerCase().includes(participantSearch.toLowerCase())

            const matchesTier = tierFilter === 'all' ||
                (tierFilter === 'winners' && (p.award_tier || '').toLowerCase().includes('winner')) ||
                (tierFilter === 'mention' && (p.award_tier || '').toLowerCase().includes('mention')) ||
                (tierFilter === 'participation' && (p.award_tier || '').toLowerCase().includes('participation')) ||
                (tierFilter === 'has_cert' && p.has_certificate) ||
                (tierFilter === 'unsent' && !p.is_cert_sent)

            return matchesSearch && matchesTier
        })
    }, [dbParticipants, participantSearch, tierFilter])

    const targetRecipients: MailRecipient[] = useMemo(() => {
        if (recipientSource === 'excel') {
            return excelRecipients
        }
        return dbParticipants.filter(p => selectedRecipientIds.has(p.id))
    }, [recipientSource, excelRecipients, dbParticipants, selectedRecipientIds])

    const recipientMetrics = useMemo(() => {
        const total = targetRecipients.length
        let validEmailCount = 0
        let invalidEmailCount = 0
        let alreadySentCount = 0

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        targetRecipients.forEach(r => {
            if (r.email && emailRegex.test(r.email.trim())) {
                validEmailCount++
            } else {
                invalidEmailCount++
            }

            if ((r as any).is_cert_sent) {
                alreadySentCount++
            }
        })

        return {
            total,
            validEmailCount,
            invalidEmailCount,
            alreadySentCount
        }
    }, [targetRecipients])

    const sampleRecipient: MailRecipient = useMemo(() => {
        if (targetRecipients.length > 0) {
            return targetRecipients[0]
        }
        if (recipientSource === 'excel') {
            const sampleMetadata: Record<string, string> = {}
            excelHeaders.forEach(h => {
                sampleMetadata[h] = `[${h}]`
                sampleMetadata[h.toLowerCase()] = `[${h}]`
                sampleMetadata[h.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = `[${h}]`
            })
            return {
                name: 'Excel Participant',
                email: 'participant@example.com',
                reg_no: 'EXCEL-001',
                team_name: 'Excel Team',
                award_tier: 'Participation',
                certificate_code: '',
                certificate_url: '',
                category: 'General',
                metadata: sampleMetadata
            }
        }
        return {
            name: 'Alex Johnson',
            email: 'alex.johnson@example.com',
            reg_no: '9921004123',
            team_name: 'Team CyberPulse',
            award_tier: 'General Track',
            certificate_code: '',
            certificate_url: '',
            category: 'Group 3'
        }
    }, [targetRecipients, recipientSource, excelHeaders])

    const renderedPreviewHtml = useMemo(() => {
        if (!bodyHtml) return ''
        return replacePlaceholders(bodyHtml, sampleRecipient, eventDetails)
    }, [bodyHtml, sampleRecipient, eventDetails])

    // =========================================================================
    // DISPATCH ACTIONS
    // =========================================================================
    const handleSendTestEmail = async () => {
        if (!testEmailAddress || !testEmailAddress.includes('@')) {
            showAlert('error', 'Please enter a valid email address for the test.')
            return
        }

        setSendingTest(true)
        try {
            const res = await fetch('/api/organizer/mail/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testEmail: testEmailAddress.trim(),
                    subject: subject.trim(),
                    bodyHtml,
                    renderedHtml: renderedPreviewHtml,
                    sampleRecipient: {
                        ...sampleRecipient,
                        email: testEmailAddress.trim()
                    },
                    type: 'announcement',
                    attachPdf: false,
                    attachments: [],
                    eventConfig: eventDetails
                })
            })

            const data = await res.json()
            if (data.success) {
                showAlert('success', `Test email dispatched to ${testEmailAddress.trim()} via ${data.provider}`)
                setShowTestModal(false)
                setMailAckModal({
                    isOpen: true,
                    mode: 'test',
                    targetEmail: testEmailAddress.trim(),
                    subject: subject.trim(),
                    provider: data.provider || 'Active Mailer',
                    messageId: data.messageId,
                    sampleName: sampleRecipient?.name || 'Sample Participant',
                    sampleRegNo: sampleRecipient?.reg_no || '—',
                    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                })
            } else {
                showAlert('error', data.error || 'Failed to dispatch test email')
            }
        } catch (err: any) {
            showAlert('error', err.message || 'Error sending test email')
        } finally {
            setSendingTest(false)
        }
    }

    const handleExecuteBulkCampaign = async () => {
        setShowConfirmDispatchModal(false)
        setIsDispatching(true)
        setDispatchProgress({
            total: targetRecipients.length,
            sent: 0,
            failed: 0,
            status: 'Preparing personalized recipient batches...',
            isComplete: false
        })

        try {
            const res = await fetch('/api/organizer/mail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: campaignTitle || `Event Announcement - ${new Date().toLocaleDateString()}`,
                    type: 'announcement',
                    templateId: selectedTemplateId,
                    subject,
                    bodyHtml,
                    recipients: targetRecipients,
                    attachPdf: false,
                    forceDuplicate: true,
                    eventConfig: eventDetails
                })
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Batch execution failed')
            }

            if (data.skippedAll) {
                setDispatchProgress({
                    total: targetRecipients.length,
                    sent: 0,
                    failed: 0,
                    status: data.message,
                    isComplete: true
                })
                showAlert('info', data.message)
                return
            }

            // Clear progress modal so the UI Pop Acknowledgement modal is front and center
            setDispatchProgress({
                total: 0,
                sent: 0,
                failed: 0,
                status: '',
                isComplete: false
            })

            // Open the UI Pop Acknowledgement for real dispatch
            setMailAckModal({
                isOpen: true,
                mode: 'real',
                subject: subject.trim(),
                campaignTitle: campaignTitle || `Event Announcement - ${new Date().toLocaleDateString()}`,
                provider: data.provider || 'Active Mailer',
                totalSent: data.sentCount,
                totalFailed: data.failedCount,
                totalRecipients: data.totalRecipients || targetRecipients.length,
                recipients: targetRecipients,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            })

            showAlert('success', `Campaign completed: ${data.sentCount} emails delivered.`)
            fetchHistory()
            fetchDbParticipants()
        } catch (err: any) {
            console.error('Bulk dispatch error:', err)
            showAlert('error', err.message || 'Bulk dispatch encountered an error.')
            setDispatchProgress(prev => ({
                ...prev,
                status: `Error: ${err.message}`,
                isComplete: true
            }))
        } finally {
            setIsDispatching(false)
        }
    }

    // =========================================================================
    // HISTORY ACTIONS (RETRY FAILED)
    // =========================================================================
    const handleRetryFailed = async (logIds?: string[]) => {
        setRetryingFailed(true)
        try {
            const res = await fetch('/api/organizer/mail/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logIds: logIds || [],
                    retryAllFailed: !logIds || logIds.length === 0
                })
            })

            const data = await res.json()
            if (data.success) {
                showAlert('success', data.message || `Retried ${data.retriedCount} emails.`)
                fetchHistory()
            } else {
                showAlert('error', data.error || 'Retry failed')
            }
        } catch (err: any) {
            showAlert('error', err.message || 'Error retrying failed emails')
        } finally {
            setRetryingFailed(false)
        }
    }

    const handleExportLogsCsv = () => {
        if (mailLogs.length === 0) {
            showAlert('info', 'No logs available to export.')
            return
        }

        const csvRows = [
            ['Recipient Name', 'Recipient Email', 'Reg No', 'Team', 'Type', 'Certificate ID', 'Status', 'Sent At', 'Error Reason', 'Message ID']
        ]

        mailLogs.forEach(l => {
            csvRows.push([
                `"${(l.recipientName || '').replace(/"/g, '""')}"`,
                `"${(l.recipientEmail || '').replace(/"/g, '""')}"`,
                `"${(l.recipientRegNo || '').replace(/"/g, '""')}"`,
                `"${(l.teamName || '').replace(/"/g, '""')}"`,
                `"${l.type}"`,
                `"${(l.certificateCode || '').replace(/"/g, '""')}"`,
                `"${l.status}"`,
                `"${new Date(l.sentAt).toLocaleString()}"`,
                `"${(l.errorMessage || '').replace(/"/g, '""')}"`,
                `"${l.id}"`
            ])
        })

        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `mail_dispatch_logs_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // =========================================================================
    // RENDER UI - BLUE & WHITE THEME (MATCHING LANDING PAGE)
    // =========================================================================
    return (
        <div className="space-y-6 pb-16 bg-white text-black min-h-screen">
            {/* ALERT NOTIFICATION TOAST */}
            {alert && (
                <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
                    alert.type === 'success'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : alert.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                    <div className="flex items-center gap-3">
                        {alert.type === 'success' && <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0" />}
                        {alert.type === 'error' && <AlertCircle size={20} className="text-red-600 flex-shrink-0" />}
                        {alert.type === 'info' && <Info size={20} className="text-blue-600 flex-shrink-0" />}
                        <p className="text-sm font-semibold">{alert.message}</p>
                    </div>
                    <button onClick={() => setAlert(null)} className="text-gray-400 hover:text-black p-1 transition">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* TOP HEADER & PROVIDER STATUS BANNER (BLUE & WHITE LIKE LANDING PAGE) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200 mb-2">
                            <Mail size={13} className="text-blue-600" />
                            <span>Organizer Mail Service</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black leading-tight flex items-center gap-2.5">
                            Event Communication & Announcements Hub
                        </h1>
                        <p className="text-sm text-gray-700 mt-1 max-w-2xl leading-relaxed">
                            Broadcast bulk customizable HTML announcements, milestone updates, and meeting notices to hackathon participants from database records or Excel spreadsheets.
                        </p>
                    </div>

                    {/* Active Provider Pill */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowProviderModal(true)}
                            className="bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl px-4 py-2.5 flex items-center gap-3 text-left transition shadow-xs group"
                        >
                            <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                            <div>
                                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Active Provider</div>
                                <div className="text-xs font-bold text-black flex items-center gap-1.5 capitalize group-hover:text-blue-600 transition">
                                    {providerStatus?.provider || 'Detecting...'}
                                    <Info size={12} className="text-blue-600" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* PRIMARY TAB NAVIGATION */}
                <div className="flex border-b border-gray-200 mt-6 -mb-2 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('composer')}
                        className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                            activeTab === 'composer'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                        <Send size={16} />
                        Campaign Composer & Dispatcher
                    </button>

                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                            activeTab === 'history'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                        <Clock size={16} />
                        Delivery History & Tracking
                        {historyStats.failed > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
                                {historyStats.failed} failed
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ================================================================= */}
            {/* TAB 1: CAMPAIGN COMPOSER & DISPATCHER */}
            {/* ================================================================= */}
            {activeTab === 'composer' && (
                <div className="space-y-6">
                    {/* CAMPAIGN BANNER (ANNOUNCEMENTS & COMMUNICATION) */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                                <Megaphone size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Event Announcement & Bulk Communication</h3>
                                <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
                                    Broadcast official updates, milestone deadlines, workshop invites, and custom HTML announcements to participants using database records or uploaded spreadsheets.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* STEP 1: RECIPIENT SOURCE SELECTOR */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                                    Target Recipients Selection
                                </h2>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    Choose recipient source: Platform Database participants or import from Excel spreadsheet
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
                                <button
                                    onClick={() => setRecipientSource('database')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                        recipientSource === 'database'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-gray-700 hover:text-black hover:bg-white'
                                    }`}
                                >
                                    <Database size={14} />
                                    Database ({dbParticipants.length})
                                </button>
                                <button
                                    onClick={() => setRecipientSource('excel')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                        recipientSource === 'excel'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-gray-700 hover:text-black hover:bg-white'
                                    }`}
                                >
                                    <FileSpreadsheet size={14} />
                                    Excel Import ({excelRecipients.length})
                                </button>
                            </div>
                        </div>

                        {/* SUB-PANEL: DATABASE PARTICIPANTS */}
                        {recipientSource === 'database' && (
                            <div className="mt-5 space-y-4">
                                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search by name, reg no, team, email..."
                                            value={participantSearch}
                                            onChange={(e) => setParticipantSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-black placeholder-gray-400 focus:outline-none focus:border-blue-600 font-medium"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                        <select
                                            value={tierFilter}
                                            onChange={(e) => setTierFilter(e.target.value)}
                                            className="bg-white border border-gray-300 text-black text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600"
                                        >
                                            <option value="all">All Tiers / Categories</option>
                                            <option value="winners">Winners (1st, 2nd, 3rd)</option>
                                            <option value="mention">Special Mention</option>
                                            <option value="participation">Participation</option>
                                            <option value="has_cert">Has Generated Certificate</option>
                                            <option value="unsent">Unsent Certificates Only</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allIds = new Set(filteredDbParticipants.map(p => p.id))
                                                setSelectedRecipientIds(allIds)
                                            }}
                                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs rounded-xl font-bold transition"
                                        >
                                            Select Filtered ({filteredDbParticipants.length})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedRecipientIds(new Set())}
                                            className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs rounded-xl font-semibold transition"
                                        >
                                            Deselect All
                                        </button>

                                        <button
                                            type="button"
                                            onClick={fetchDbParticipants}
                                            disabled={loadingParticipants}
                                            className="p-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl transition"
                                            title="Reload participants"
                                        >
                                            <RefreshCw size={14} className={loadingParticipants ? 'animate-spin text-blue-600' : ''} />
                                        </button>
                                    </div>
                                </div>

                                {/* DB Table Hidden Columns Toolbar */}
                                {Object.values(dbColumns).some(v => !v) && (
                                    <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 flex-wrap">
                                        <span className="text-[11px] font-bold text-gray-500 uppercase">Hidden Columns:</span>
                                        {!dbColumns.reg_no && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDbColumn('reg_no', true)}
                                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                title="Restore Reg No column & {{reg_no}} dynamic placeholder"
                                            >
                                                <Plus size={11} className="text-blue-600" /> Reg No
                                            </button>
                                        )}
                                        {!dbColumns.team && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDbColumn('team', true)}
                                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                title="Restore Team column & {{team_name}} dynamic placeholder"
                                            >
                                                <Plus size={11} className="text-blue-600" /> Team
                                            </button>
                                        )}
                                        {!dbColumns.category && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDbColumn('category', true)}
                                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                title="Restore Category column & {{category}} dynamic placeholder"
                                            >
                                                <Plus size={11} className="text-blue-600" /> Category
                                            </button>
                                        )}
                                        {!dbColumns.tier && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDbColumn('tier', true)}
                                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                title="Restore Award Tier column & {{award_tier}} dynamic placeholder"
                                            >
                                                <Plus size={11} className="text-blue-600" /> Award Tier
                                            </button>
                                        )}
                                        {!dbColumns.status && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDbColumn('status', true)}
                                                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                title="Restore Status column & {{certificate_code}} dynamic placeholder"
                                            >
                                                <Plus size={11} className="text-blue-600" /> Status
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleRestoreAllDbColumns}
                                            className="text-[11px] text-blue-600 hover:underline font-semibold ml-auto cursor-pointer"
                                        >
                                            Restore all columns
                                        </button>
                                    </div>
                                )}

                                {/* Participant Table */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-700 uppercase font-bold sticky top-0 z-10 border-b border-gray-200">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8">
                                                    <input
                                                        type="checkbox"
                                                        checked={filteredDbParticipants.length > 0 && filteredDbParticipants.every(p => selectedRecipientIds.has(p.id))}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedRecipientIds)
                                                            if (e.target.checked) {
                                                                filteredDbParticipants.forEach(p => newSet.add(p.id))
                                                            } else {
                                                                filteredDbParticipants.forEach(p => newSet.delete(p.id))
                                                            }
                                                            setSelectedRecipientIds(newSet)
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </th>
                                                <th className="py-2.5 px-3">Participant</th>
                                                <th className="py-2.5 px-3">Email</th>
                                                {dbColumns.reg_no && (
                                                    <th className="py-2.5 px-3">
                                                        <div className="flex items-center justify-between gap-1 group">
                                                            <span>Reg No</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleDbColumn('reg_no', false)}
                                                                className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                title="Remove Reg No column & {{reg_no}} dynamic placeholder"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                )}
                                                {dbColumns.team && (
                                                    <th className="py-2.5 px-3">
                                                        <div className="flex items-center justify-between gap-1 group">
                                                            <span>Team</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleDbColumn('team', false)}
                                                                className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                title="Remove Team column & {{team_name}} dynamic placeholder"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                )}
                                                {dbColumns.category && (
                                                    <th className="py-2.5 px-3">
                                                        <div className="flex items-center justify-between gap-1 group">
                                                            <span>Category (DB)</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleDbColumn('category', false)}
                                                                className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                title="Remove Category column & {{category}} dynamic placeholder"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                )}
                                                {dbColumns.tier && (
                                                    <th className="py-2.5 px-3">
                                                        <div className="flex items-center justify-between gap-1 group">
                                                            <span>Award / Cert Tier</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleDbColumn('tier', false)}
                                                                className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                title="Remove Award Tier column & {{award_tier}} dynamic placeholder"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                )}
                                                {dbColumns.status && (
                                                    <th className="py-2.5 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 group">
                                                            <span>Certificate Status</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleDbColumn('status', false)}
                                                                className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                title="Remove Status column & {{certificate_code}} dynamic placeholder"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-800 bg-white">
                                            {loadingParticipants ? (
                                                <tr>
                                                    <td colSpan={3 + (dbColumns.reg_no ? 1 : 0) + (dbColumns.team ? 1 : 0) + (dbColumns.category ? 1 : 0) + (dbColumns.tier ? 1 : 0) + (dbColumns.status ? 1 : 0)} className="text-center py-8 text-gray-500">
                                                        <RefreshCw className="animate-spin inline mr-2 text-blue-600" size={16} /> Loading participants...
                                                    </td>
                                                </tr>
                                            ) : filteredDbParticipants.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3 + (dbColumns.reg_no ? 1 : 0) + (dbColumns.team ? 1 : 0) + (dbColumns.category ? 1 : 0) + (dbColumns.tier ? 1 : 0) + (dbColumns.status ? 1 : 0)} className="text-center py-8 text-gray-500">
                                                        No participants match the selected filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDbParticipants.map(p => {
                                                    const isSelected = selectedRecipientIds.has(p.id)
                                                    const hasValidEmail = p.email && p.email.includes('@')
                                                    return (
                                                        <tr
                                                            key={p.id}
                                                            onClick={() => {
                                                                const newSet = new Set(selectedRecipientIds)
                                                                if (isSelected) newSet.delete(p.id)
                                                                else newSet.add(p.id)
                                                                setSelectedRecipientIds(newSet)
                                                            }}
                                                            className={`cursor-pointer transition ${
                                                                isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {
                                                                        const newSet = new Set(selectedRecipientIds)
                                                                        if (isSelected) newSet.delete(p.id)
                                                                        else newSet.add(p.id)
                                                                        setSelectedRecipientIds(newSet)
                                                                    }}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-3 font-bold text-black">
                                                                {p.name}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                {hasValidEmail ? (
                                                                    <span className="text-gray-700 font-mono text-[11px]">{p.email}</span>
                                                                ) : (
                                                                    <span className="text-red-600 font-bold flex items-center gap-1">
                                                                        <AlertCircle size={12} /> Invalid Email
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {dbColumns.reg_no && (
                                                                <td className="py-2 px-3 text-gray-600 font-mono text-[11px]">{p.reg_no || '—'}</td>
                                                            )}
                                                            {dbColumns.team && (
                                                                <td className="py-2 px-3 text-gray-600">{p.team_name || 'Individual Track'}</td>
                                                            )}
                                                            {dbColumns.category && (
                                                                <td className="py-2 px-3">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                                                                        {p.category || '—'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {dbColumns.tier && (
                                                                <td className="py-2 px-3">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                        {p.award_tier || 'Participation'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {dbColumns.status && (
                                                                <td className="py-2 px-3 text-right">
                                                                    {p.is_cert_sent ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                            <CheckCircle2 size={10} className="text-blue-600" /> Delivered
                                                                        </span>
                                                                    ) : p.has_certificate ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                                                                            <Award size={10} className="text-blue-600" /> Ready
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-[11px]">Unissued</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SUB-PANEL: EXCEL UPLOAD */}
                        {recipientSource === 'excel' && (
                            <div className="mt-5 space-y-4">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 hover:border-blue-600 rounded-2xl p-8 text-center cursor-pointer transition bg-gray-50/60 hover:bg-blue-50/20 group"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <FileSpreadsheet className="mx-auto text-blue-600 group-hover:scale-105 transition mb-2" size={38} />
                                    <h4 className="text-sm font-bold text-black">Click or drag & drop participant spreadsheet (.xlsx, .xls, .csv)</h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Columns automatically mapped: Email, Name, Registration No, Team Name, Category, Award Tier
                                    </p>
                                    {excelFileName && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                            <FileCheck size={14} className="text-blue-600" /> {excelFileName} ({excelRecipients.length} rows loaded)
                                        </div>
                                    )}
                                </div>

                                {excelRecipients.length > 0 && (
                                    <div className="space-y-3">
                                        {/* Column Mapping Selector (including Category column from Excel) */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                                                    <Sliders size={13} className="text-blue-600" />
                                                    Spreadsheet Column Mapping (Category & Details)
                                                </span>
                                                <span className="text-[11px] text-gray-500">Auto-detected from file headers</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Email</label>
                                                    <select
                                                        value={excelColumnMapping.emailCol}
                                                        onChange={(e) => handleColumnMappingChange('emailCol', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-black font-semibold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Name</label>
                                                    <select
                                                        value={excelColumnMapping.nameCol}
                                                        onChange={(e) => handleColumnMappingChange('nameCol', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-black font-semibold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Reg No</label>
                                                    <select
                                                        value={excelColumnMapping.regCol}
                                                        onChange={(e) => handleColumnMappingChange('regCol', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-black font-semibold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Team</label>
                                                    <select
                                                        value={excelColumnMapping.teamCol}
                                                        onChange={(e) => handleColumnMappingChange('teamCol', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-black font-semibold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                                <div className="bg-blue-50/80 p-1.5 rounded-lg border border-blue-200">
                                                    <label className="text-[10px] font-bold text-blue-900 uppercase block mb-1">★ Category</label>
                                                    <select
                                                        value={excelColumnMapping.categoryCol}
                                                        onChange={(e) => handleColumnMappingChange('categoryCol', e.target.value)}
                                                        className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-black font-bold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Award Tier</label>
                                                    <select
                                                        value={excelColumnMapping.tierCol}
                                                        onChange={(e) => handleColumnMappingChange('tierCol', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-black font-semibold text-xs focus:border-blue-600"
                                                    >
                                                        <option value="">-- None --</option>
                                                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-600 font-semibold">
                                                Previewing imported participants from Excel
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setExcelRecipients([])
                                                    setExcelFileName(null)
                                                    setRawExcelRows([])
                                                    setExcelHeaders([])
                                                }}
                                                className="text-xs text-red-600 hover:underline flex items-center gap-1 font-bold"
                                            >
                                                <Trash2 size={12} /> Clear Spreadsheet
                                            </button>
                                        </div>

                                        {/* Excel Table Hidden Columns Toolbar */}
                                        {excelHiddenColumns.size > 0 && (
                                            <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 flex-wrap">
                                                <span className="text-[11px] font-bold text-gray-500 uppercase">Hidden Columns:</span>
                                                {Array.from(excelHiddenColumns).map(col => (
                                                    <button
                                                        key={col}
                                                        type="button"
                                                        onClick={() => handleToggleExcelColumn(col, true)}
                                                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-[11px] font-semibold border border-gray-300 flex items-center gap-1 transition cursor-pointer"
                                                        title={`Restore ${col} column & {{${col}}} dynamic placeholder`}
                                                    >
                                                        <Plus size={11} className="text-blue-600" /> {col}
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={handleRestoreAllExcelColumns}
                                                    className="text-[11px] text-blue-600 hover:underline font-semibold ml-auto cursor-pointer"
                                                >
                                                    Restore all columns
                                                </button>
                                            </div>
                                        )}

                                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold sticky top-0 border-b border-gray-200">
                                                    <tr>
                                                        <th className="py-2 px-3 w-8">#</th>
                                                        {excelHeaders.filter(h => !excelHiddenColumns.has(h.trim())).map(header => (
                                                            <th key={header} className="py-2 px-3">
                                                                <div className="flex items-center justify-between gap-1 group">
                                                                    <span>{header}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleExcelColumn(header, false)}
                                                                        className="text-gray-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                                        title={`Remove ${header} column & {{${header}}} dynamic placeholder`}
                                                                    >
                                                                        <X size={11} />
                                                                    </button>
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-800 bg-white">
                                                    {excelRecipients.slice(0, 50).map((r, i) => (
                                                        <tr key={r.id || i} className="hover:bg-blue-50/30">
                                                            <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                                                            {excelHeaders.filter(h => !excelHiddenColumns.has(h.trim())).map(header => (
                                                                <td key={header} className="py-2 px-3 text-gray-700 font-medium">
                                                                    {r.metadata?.[header] || (r as any)[header] || '—'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RECIPIENT SELECTION METRICS BAR */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-600">
                                    Target Recipients: <strong className="text-black text-sm">{recipientMetrics.total}</strong>
                                </span>
                                <span className="text-blue-700 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    <CheckCircle2 size={13} className="text-blue-600" /> {recipientMetrics.validEmailCount} valid emails
                                </span>
                                {recipientMetrics.invalidEmailCount > 0 && (
                                    <span className="text-red-700 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                        <AlertCircle size={13} className="text-red-600" /> {recipientMetrics.invalidEmailCount} invalid/missing
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: TEMPLATE & MESSAGE COMPOSER */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                                    Announcement Content & Templates
                                </h2>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    Select an announcement layout or compose custom HTML with dynamic recipient tags
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-700 font-bold hidden sm:inline">Template:</span>
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
                                    <FileText size={13} className="text-blue-600" />
                                    Event Related Announcement or Updates
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSaveTemplate}
                                    disabled={savingTemplate}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                    title="Save HTML template code & subject to Supabase"
                                >
                                    {savingTemplate ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={12} />
                                            Save Template
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetTemplate}
                                    className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg border border-gray-200 font-semibold transition cursor-pointer"
                                    title="Reset template to default content"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Email Subject Line (Plain Editable Text) */}
                        <div>
                            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                                Email Subject Line
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Important Updates for Participants"
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none focus:border-blue-600 font-semibold shadow-xs"
                            />
                        </div>

                        {/* Dynamic Placeholders Display */}
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-black uppercase tracking-wider">
                                        Dynamic Placeholders
                                    </label>
                                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold">
                                        {recipientSource === 'database'
                                            ? `Database Table Columns (${activePlaceholders.length})`
                                            : `Excel Table Columns (${activePlaceholders.length})`}
                                    </span>
                                </div>
                                {isMounted && (recipientSource === 'database'
                                    ? Object.values(dbColumns).some(v => !v)
                                    : excelHiddenColumns.size > 0
                                ) && (
                                    <button
                                        type="button"
                                        onClick={recipientSource === 'database' ? handleRestoreAllDbColumns : handleRestoreAllExcelColumns}
                                        className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold transition cursor-pointer"
                                        title="Restore all removed table columns and dynamic placeholders"
                                    >
                                        Restore all ({recipientSource === 'database'
                                            ? Object.values(dbColumns).filter(v => !v).length
                                            : excelHiddenColumns.size} removed)
                                    </button>
                                )}
                            </div>

                            {/* Placeholders List with Individual Remove (✕) Buttons */}
                            {activePlaceholders.length === 0 ? (
                                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                                    <Info size={14} className="text-blue-600 shrink-0" />
                                    <span>
                                        {recipientSource === 'excel'
                                            ? 'No Excel sheet uploaded yet. Upload an Excel or CSV file in Step 1 to load columns as dynamic placeholders.'
                                            : 'All database table columns and dynamic placeholders have been removed.'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {activePlaceholders.map(ph => (
                                        <span
                                            key={ph}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono font-bold shadow-2xs"
                                        >
                                            <span>{ph}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePlaceholderTag(ph)}
                                                className="text-blue-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                                title={`Remove ${ph} (removes column from table & template)`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* HTML Editor & Live Preview Switcher */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-1.5 bg-gray-200/80 p-0.5 rounded-lg border border-gray-300">
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('preview')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                                            editorTab === 'preview'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-gray-700 hover:text-black'
                                        }`}
                                    >
                                        <Eye size={13} />
                                        Interactive Preview
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorTab('code')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                                            editorTab === 'code'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-gray-700 hover:text-black'
                                        }`}
                                    >
                                        <Code size={13} />
                                        HTML Code Editor
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                                        <span className="hidden sm:inline">Preview for:</span>
                                        <strong className="text-blue-600 font-bold">{sampleRecipient.name}</strong>
                                    </div>
                                </div>
                            </div>

                            {editorTab === 'code' ? (
                                <textarea
                                    value={bodyHtml}
                                    onChange={(e) => setBodyHtml(e.target.value)}
                                    rows={16}
                                    className="w-full p-4 bg-gray-50 text-black font-mono text-xs focus:outline-none resize-y border-0"
                                    placeholder="<!DOCTYPE html>..."
                                    spellCheck={false}
                                />
                            ) : (
                                <div className="p-4 bg-gray-100 min-h-[400px] flex justify-center">
                                    <div className="w-full max-w-[620px] bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                                        <iframe
                                            title="Email Preview"
                                            srcDoc={renderedPreviewHtml}
                                            className="w-full h-[520px] border-0"
                                            sandbox="allow-same-origin allow-scripts"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ACTION BAR: TEST EMAIL & BULK DISPATCH */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
                            <div className="text-xs text-gray-600 font-medium">
                                Ready to dispatch to <strong className="text-black font-bold">{recipientMetrics.validEmailCount}</strong> verified recipients.
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowTestModal(true)}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Eye size={14} className="text-blue-600" />
                                    Send Test Email
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDispatchModal(true)}
                                    disabled={recipientMetrics.validEmailCount === 0 || isDispatching}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Send size={14} />
                                    Launch Announcement Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2: MAIL HISTORY & TRACKING ANALYTICS */}
            {/* ================================================================= */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Emails Sent</span>
                            <div className="text-3xl font-black text-black mt-1">{historyStats.total}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">Across all platform campaigns</div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">Delivered Successfully</span>
                            <div className="text-3xl font-black text-blue-600 mt-1">{historyStats.delivered}</div>
                            <div className="text-[11px] text-blue-600/90 font-semibold mt-0.5">{historyStats.deliveryRate}% delivery success rate</div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <span className="text-xs text-red-600 font-bold uppercase tracking-wider">Failed Deliveries</span>
                            <div className="text-3xl font-black text-red-600 mt-1">{historyStats.failed}</div>
                            <div className="text-[11px] text-red-600/90 font-medium mt-0.5">
                                {historyStats.failed > 0 ? (
                                    <button
                                        onClick={() => handleRetryFailed()}
                                        disabled={retryingFailed}
                                        className="text-red-700 underline font-bold hover:text-red-900"
                                    >
                                        Retry All Failed
                                    </button>
                                ) : 'Zero dispatch errors'}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">Certificates Distributed</span>
                            <div className="text-3xl font-black text-black mt-1">{historyStats.certCount}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{historyStats.announcementCount} announcements</div>
                        </div>
                    </div>

                    {/* HISTORY & LOGS TABLE */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-7 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                                    <Clock size={20} className="text-blue-600" />
                                    Delivery Analysis &amp; Tracking
                                </h2>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    Audited delivery record of candidate credentials and event announcements
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={historyTypeFilter}
                                    onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                                    className="bg-white border border-gray-300 text-black text-xs font-semibold rounded-xl px-3 py-2 shadow-xs"
                                >
                                    <option value="all">All Campaign Types</option>
                                    <option value="certificate">🎓 Certificate Dispatches</option>
                                    <option value="announcement">📢 Event Announcements</option>
                                </select>

                                <select
                                    value={historyStatusFilter}
                                    onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                                    className="bg-white border border-gray-300 text-black text-xs font-semibold rounded-xl px-3 py-2 shadow-xs"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="delivered">Delivered / Sent</option>
                                    <option value="failed">Failed Only</option>
                                    <option value="pending">Pending</option>
                                </select>

                                <button
                                    onClick={fetchHistory}
                                    disabled={loadingHistory}
                                    className="p-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl transition"
                                    title="Refresh logs"
                                >
                                    <RefreshCw size={14} className={loadingHistory ? 'animate-spin text-blue-600' : ''} />
                                </button>

                                <button
                                    onClick={handleExportLogsCsv}
                                    className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-900 text-xs font-bold rounded-xl border border-gray-300 transition shadow-xs flex items-center gap-1.5"
                                >
                                    <Download size={14} className="text-blue-600" /> Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Search in History */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Filter logs by recipient email, name, cert ID..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-black placeholder-gray-400 focus:outline-none focus:border-blue-600 font-medium"
                            />
                        </div>

                        {/* DELIVERY ANALYSIS TABLE */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3">Name &amp; Category</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3">Subject</th>
                                        <th className="py-2.5 px-3">Mail ID</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3 text-right">Sent at Date &amp; Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-800 bg-white">
                                    {loadingHistory ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-gray-500">
                                                <RefreshCw className="animate-spin inline mr-2 text-blue-600" size={16} /> Loading delivery analysis...
                                            </td>
                                        </tr>
                                    ) : mailLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-gray-500">
                                                No emails sent yet under this filter. Launch your first campaign from the Campaign Composer!
                                            </td>
                                        </tr>
                                    ) : (
                                        mailLogs.map(log => {
                                            const isSuccess = log.status === 'delivered' || log.status === 'sent'
                                            const tierOrCat = String((log as any).award_tier || log.awardTier || (log as any).category || 'Participation').trim()
                                            const isWinner = tierOrCat.toLowerCase().includes('winner')
                                            const isSpecial = tierOrCat.toLowerCase().includes('special') || tierOrCat.toLowerCase().includes('mention')
                                            const isPart = tierOrCat.toLowerCase().includes('part')
                                            const catBadgeText = isWinner ? (tierOrCat.length > 20 ? 'Winner' : tierOrCat) : isSpecial ? 'Special Ment.' : isPart ? 'Part.' : (tierOrCat || 'Part.')
                                            const catBadgeStyle = isWinner
                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                : isSpecial
                                                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'

                                            const logType = String(log.type || '').toLowerCase()
                                            const isCertType = logType.includes('cert')

                                            return (
                                                <tr key={log.id} className="hover:bg-blue-50/30">
                                                    {/* 1. Name & Category */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-bold text-black">{log.recipientName || (log as any).recipient_name || 'Participant'}</div>
                                                        <div className="mt-0.5">
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${catBadgeStyle}`}>
                                                                <span>{isWinner ? '🏆' : isSpecial ? '⭐' : '🎖️'}</span>
                                                                <span>{catBadgeText}</span>
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* 2. Type: cert or announcement */}
                                                    <td className="py-2.5 px-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            isCertType
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>
                                                            {isCertType ? 'cert' : 'announcement'}
                                                        </span>
                                                    </td>

                                                    {/* 3. Subject */}
                                                    <td className="py-2.5 px-3 max-w-[240px] truncate text-gray-800 font-medium" title={log.subject}>
                                                        {log.subject}
                                                    </td>

                                                    {/* 4. Mail ID */}
                                                    <td className="py-2.5 px-3">
                                                        <span className="font-mono text-gray-700 text-[11px] font-semibold">
                                                            {log.recipientEmail || (log as any).recipient_email}
                                                        </span>
                                                    </td>

                                                    {/* 5. Status */}
                                                    <td className="py-2.5 px-3">
                                                        {isSuccess ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 size={10} className="text-emerald-600" /> Delivered
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200" title={log.errorMessage || (log as any).error_message || 'Delivery failed'}>
                                                                <AlertCircle size={10} className="text-red-600" /> Failed
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* 6. Sent at Date & Time */}
                                                    <td className="py-2.5 px-3 text-right text-gray-600 text-[11px] font-medium">
                                                        {new Date(log.sentAt || (log as any).sent_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* MODAL: PROVIDER CONFIGURATION INFO (BLUE & WHITE) */}
            {/* ================================================================= */}
            {showProviderModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-black">
                        <button
                            onClick={() => setShowProviderModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                                <Server size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-black">Email Delivery Provider Engine</h3>
                                <p className="text-xs text-gray-600">Environment Credentials & API Integration</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-xs text-gray-700">
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="text-gray-500 font-semibold mb-1">Current Active Provider:</div>
                                <div className="text-sm font-black text-blue-600 uppercase tracking-wider">
                                    {providerStatus?.provider}
                                </div>
                                <div className="text-gray-600 mt-1">{providerStatus?.details}</div>
                                <div className="text-gray-600 mt-1">Sender: <span className="text-black font-semibold">{providerStatus?.fromAddress}</span></div>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-blue-600" />
                                    How to configure live external email dispatch:
                                </div>
                                <p className="text-gray-700">To send live emails to participants, set any of the following in your environment (<code className="text-blue-900 font-mono font-bold">.env.local</code>):</p>
                                <ul className="list-disc pl-4 space-y-1 text-gray-700">
                                    <li><strong>Option 1 (Resend):</strong> <code className="text-black font-mono font-bold">RESEND_API_KEY=re_xxxx</code></li>
                                    <li><strong>Option 2 (Brevo):</strong> <code className="text-black font-mono font-bold">BREVO_API_KEY=xkeysib-xxxx</code></li>
                                    <li><strong>Option 3 (Gmail/SMTP):</strong> <code className="text-black font-mono font-bold">SMTP_HOST=smtp.gmail.com</code>, <code className="text-black font-mono font-bold">SMTP_USER=...</code>, <code className="text-black font-mono font-bold">SMTP_PASS=app_password</code></li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowProviderModal(false)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* MODAL: TEST EMAIL (BLUE & WHITE) */}
            {/* ================================================================= */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative text-black">
                        <button
                            onClick={() => setShowTestModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                                <Send size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-black">Send Live Test Email</h3>
                                <p className="text-xs text-gray-600">Dispatches current preview content to your inbox</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-black mb-1">
                                    Recipient Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={testEmailAddress}
                                    onChange={(e) => setTestEmailAddress(e.target.value)}
                                    placeholder="organizer@gmail.com"
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-black placeholder-gray-400 focus:outline-none focus:border-blue-600 font-mono font-semibold"
                                    autoFocus
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Enter only the email address where you want to receive this test.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-500 font-semibold whitespace-nowrap">Subject Line:</span>
                                    <span className="font-bold text-gray-900 truncate" title={subject}>
                                        {subject || '(Empty subject)'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-500 font-semibold whitespace-nowrap">Sample Recipient Data:</span>
                                    <span className="font-bold text-blue-600 truncate">
                                        {sampleRecipient?.name || 'Sample Participant'} {sampleRecipient?.reg_no ? `(${sampleRecipient.reg_no})` : ''}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-600 leading-relaxed">
                                    ✓ The email will arrive with the exact HTML styling, Google colors, and previewed announcement content intact.
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowTestModal(false)}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendTestEmail}
                                disabled={sendingTest || !testEmailAddress}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                {sendingTest ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={13} />
                                        Dispatch Test
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* MODAL: CONFIRM BULK DISPATCH (BLUE & WHITE) */}
            {/* ================================================================= */}
            {showConfirmDispatchModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-black">
                        <button
                            onClick={() => setShowConfirmDispatchModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-black">Confirm Announcement Campaign</h3>
                                <p className="text-xs text-gray-600">Review your campaign parameters before dispatch</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Campaign Type:</span>
                                <span className="font-bold text-black">Event Announcement Broadcast</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Recipient Source:</span>
                                <span className="font-bold text-black capitalize">{recipientSource}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Selected:</span>
                                <span className="font-bold text-black">{recipientMetrics.total} participants</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Valid Email Addresses:</span>
                                <span className="font-bold text-blue-600">{recipientMetrics.validEmailCount} recipients</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="text-gray-600">Active Delivery Mode:</span>
                                <span className="font-bold text-blue-600 uppercase">{providerStatus?.provider}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmDispatchModal(false)}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Back to Composer
                            </button>
                            <button
                                onClick={handleExecuteBulkCampaign}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <Send size={14} />
                                Start Announcement Campaign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* MODAL: EMAIL DISPATCH ACKNOWLEDGEMENT POPUP (GOOGLE COLOURS) */}
            {/* FOR BOTH TEST AND REAL CAMPAIGNS */}
            {/* ================================================================= */}
            {mailAckModal && mailAckModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col text-black">
                        {/* Google 4-Color Stripe Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

                        {/* Modal Header & Close Button */}
                        <div className="p-5 sm:p-6 pb-2 text-center relative">
                            <button
                                type="button"
                                onClick={() => setMailAckModal(null)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                                title="Close Acknowledgement"
                            >
                                <X size={18} />
                            </button>

                            {/* Success Badge Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                <CheckCircle2 size={32} />
                            </div>

                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                                <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                                <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                                    Transmission Confirmed
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">
                                {mailAckModal.mode === 'test'
                                    ? 'Test Email Dispatched Successfully'
                                    : 'Announcement Campaign Dispatched!'}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                                {mailAckModal.mode === 'test'
                                    ? 'A live preview of the announcement was transmitted to your designated inbox with full responsive styling.'
                                    : `Successfully dispatched live announcement emails to ${mailAckModal.totalSent} participants.`}
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 pt-2 space-y-3.5">
                            {mailAckModal.mode === 'test' ? (
                                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-500">Destination Inbox:</span>
                                        <span className="font-mono text-[#1a73e8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold text-[11px]">
                                            {mailAckModal.targetEmail}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-500">Subject:</span>
                                        <span className="font-bold text-gray-900 truncate max-w-[240px]" title={mailAckModal.subject}>
                                            {mailAckModal.subject}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-500">Sample Candidate:</span>
                                        <span className="font-semibold text-gray-800">
                                            {mailAckModal.sampleName} {mailAckModal.sampleRegNo ? `(${mailAckModal.sampleRegNo})` : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-500">Mail Engine / Provider:</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {mailAckModal.provider || 'Active Mailer'}
                                        </span>
                                    </div>
                                    {mailAckModal.messageId && (
                                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                                            <span className="font-medium text-gray-500">Message ID:</span>
                                            <div className="flex items-center gap-1.5">
                                                <code className="font-mono text-gray-700 text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 truncate max-w-[170px]">
                                                    {mailAckModal.messageId}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (mailAckModal.messageId) {
                                                            navigator.clipboard.writeText(mailAckModal.messageId)
                                                            setCopiedAckId(true)
                                                            setTimeout(() => setCopiedAckId(false), 2000)
                                                        }
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded transition cursor-pointer"
                                                    title="Copy Message ID"
                                                >
                                                    {copiedAckId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                                        <span>Transmitted At:</span>
                                        <span className="font-semibold text-gray-700">{mailAckModal.timestamp}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                                            <div className="text-2xl font-black text-emerald-700">{mailAckModal.totalSent}</div>
                                            <div className="text-[11px] font-bold text-emerald-900 mt-0.5">Delivered Successfully</div>
                                        </div>
                                        <div className={`rounded-xl p-3 border ${mailAckModal.totalFailed && mailAckModal.totalFailed > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-2xl font-black ${mailAckModal.totalFailed && mailAckModal.totalFailed > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                                {mailAckModal.totalFailed || 0}
                                            </div>
                                            <div className="text-[11px] font-semibold text-gray-600 mt-0.5">Delivery Failures</div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-500">Campaign Title:</span>
                                            <span className="font-bold text-gray-900 truncate max-w-[240px]">
                                                {mailAckModal.campaignTitle}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-500">Subject:</span>
                                            <span className="font-semibold text-gray-800 truncate max-w-[240px]">
                                                {mailAckModal.subject}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-500">Engine / Provider:</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                {mailAckModal.provider || 'Active Mailer'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                                            <span>Transmitted At:</span>
                                            <span className="font-semibold text-gray-700">{mailAckModal.timestamp}</span>
                                        </div>
                                    </div>

                                    {/* Recipients List Preview */}
                                    {mailAckModal.recipients && mailAckModal.recipients.length > 0 && (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-gray-600 border-b border-gray-200 flex justify-between">
                                                <span>Recipients Transmitted</span>
                                                <span>{mailAckModal.recipients.length} total</span>
                                            </div>
                                            <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 bg-white">
                                                {mailAckModal.recipients.map((r, i) => (
                                                    <div key={i} className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                                            <span className="font-semibold text-gray-900 truncate">{r.name}</span>
                                                            {r.reg_no && <span className="font-mono text-gray-400 text-[10px]">({r.reg_no})</span>}
                                                        </div>
                                                        <span className="font-mono text-[#1a73e8] text-[10px] truncate max-w-[150px]">{r.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Google-Styled Assurance Notice */}
                            <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 flex items-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#34A853] shrink-0 mt-1" />
                                <div className="text-[11px] leading-relaxed">
                                    <strong>Transmission Logged:</strong> All dispatch events and delivery statuses have been permanently written to your Mail History and Delivery Analysis logs.
                                </div>
                            </div>

                            {/* Modal Action Buttons */}
                            <div className="pt-2 flex items-center gap-2">
                                {mailAckModal.mode === 'real' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMailAckModal(null)
                                            setActiveTab('history')
                                        }}
                                        className="flex-1 py-2.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        <Clock size={14} />
                                        <span>View Mail History</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setMailAckModal(null)}
                                    className="flex-1 py-2.5 bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <Check size={14} />
                                    <span>{mailAckModal.mode === 'test' ? 'Got it, Thanks!' : 'Done'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {(isDispatching || dispatchProgress.isComplete) && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-black">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                                {dispatchProgress.isComplete ? (
                                    <CheckCircle2 size={32} className="text-blue-600 animate-in zoom-in" />
                                ) : (
                                    <RefreshCw size={28} className="animate-spin text-blue-600" />
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-black">
                                {dispatchProgress.isComplete ? 'Campaign Completed!' : 'Batch Dispatch in Progress'}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">{dispatchProgress.status}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs text-gray-600 font-semibold">
                                <span>Progress</span>
                                <span>
                                    {dispatchProgress.sent + dispatchProgress.failed} / {dispatchProgress.total}
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300"
                                    style={{
                                        width: `${dispatchProgress.total > 0 ? ((dispatchProgress.sent + dispatchProgress.failed) / dispatchProgress.total) * 100 : 0}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 gap-3 mb-6 text-center text-xs">
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                                <div className="text-gray-600 font-semibold">Delivered</div>
                                <div className="text-xl font-black text-blue-600 mt-0.5">{dispatchProgress.sent}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="text-gray-600 font-semibold">Failed / Skipped</div>
                                <div className="text-xl font-black text-gray-900 mt-0.5">{dispatchProgress.failed}</div>
                            </div>
                        </div>

                        {dispatchProgress.isComplete && (
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        setDispatchProgress({ total: 0, sent: 0, failed: 0, status: '', isComplete: false })
                                        setActiveTab('history')
                                    }}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Clock size={14} /> View in Mail History
                                </button>
                                <button
                                    onClick={() => setDispatchProgress({ total: 0, sent: 0, failed: 0, status: '', isComplete: false })}
                                    className="w-full py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}



        </div>
    )
}
