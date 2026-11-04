'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
    Award,
    Upload,
    Database,
    FileSpreadsheet,
    QrCode,
    Settings2,
    Download,
    CheckCircle2,
    AlertCircle,
    Search,
    RefreshCw,
    Eye,
    Sliders,
    Layers,
    Copy,
    Check,
    ExternalLink,
    Trash2,
    MousePointer,
    FileText,
    FileImage,
    Archive,
    CheckSquare,
    Square,
    Move,
    GripVertical,
    AlignCenter,
    Users,
    Trophy,
    X,
    Save,
    Plus,
    ChevronLeft,
    ChevronRight,
    Edit3
} from 'lucide-react'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import Link from 'next/link'

interface ParticipantRecord {
    id: string
    name: string
    reg_no: string
    dept: string
    section: string
    year: string
    team_name?: string
    category: 'Group 3' | 'EE Credit' | 'Not Eligible' | string
    selected: boolean
    certificate_code?: string
}

export type CertificateType = string

export interface CertificateTierInfo {
    id: CertificateType
    label: string
    shortName: string
    icon: string
    accentColor: string
    badgeBg: string
    defaultTitle: string
}

export const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const getTierForRank = (rank: number): CertificateTierInfo => {
    if (rank === 1) {
        return {
            id: 'Winner 1 (1st Place)',
            label: '1st Place Winner',
            shortName: 'Winner 1',
            icon: '🥇',
            accentColor: '#f59e0b',
            badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10',
            defaultTitle: '1ST PLACE WINNER'
        }
    }
    if (rank === 2) {
        return {
            id: 'Winner 2 (2nd Place)',
            label: '2nd Place Winner',
            shortName: 'Winner 2',
            icon: '🥈',
            accentColor: '#94a3b8',
            badgeBg: 'bg-slate-300/20 text-slate-200 border-slate-300/40 shadow-slate-300/10',
            defaultTitle: '2ND PLACE WINNER'
        }
    }
    if (rank === 3) {
        return {
            id: 'Winner 3 (3rd Place)',
            label: '3rd Place Winner',
            shortName: 'Winner 3',
            icon: '🥉',
            accentColor: '#d97706',
            badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/10',
            defaultTitle: '3RD PLACE WINNER'
        }
    }
    const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#eab308']
    const color = colors[(rank - 4) % colors.length]
    const ordinal = getOrdinal(rank)
    return {
        id: `Winner ${rank} (${ordinal} Place)`,
        label: `${ordinal} Place Winner`,
        shortName: `Winner ${rank}`,
        icon: rank <= 5 ? '🏆' : '🎖️',
        accentColor: color,
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        defaultTitle: `${ordinal.toUpperCase()} PLACE WINNER`
    }
}

export const PARTICIPATION_TIER: CertificateTierInfo = {
    id: 'Participation',
    label: 'Participation Certificate',
    shortName: 'Participation',
    icon: '🎖️',
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    defaultTitle: 'CERTIFICATE OF PARTICIPATION'
}

export const SPECIAL_MENTION_TIER: CertificateTierInfo = {
    id: 'Special Mention',
    label: 'Special Mention / Finalist',
    shortName: 'Special Mention',
    icon: '⭐',
    accentColor: '#a855f7',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    defaultTitle: 'SPECIAL RECOGNITION'
}

export const getTierInfo = (tierId: string): CertificateTierInfo => {
    if (tierId === 'Participation') return PARTICIPATION_TIER
    if (tierId === 'Special Mention') return SPECIAL_MENTION_TIER
    const match = tierId.match(/Winner\s+(\d+)/i)
    if (match) {
        return getTierForRank(parseInt(match[1], 10))
    }
    return PARTICIPATION_TIER
}

export const CERTIFICATE_TIERS: CertificateTierInfo[] = [
    PARTICIPATION_TIER,
    getTierForRank(1),
    getTierForRank(2),
    getTierForRank(3),
    SPECIAL_MENTION_TIER
]

interface TierTemplateData {
    imageDataUrl?: string
    fileName?: string
    dimensions?: { width: number; height: number }
    layout?: LayoutConfig
}

export interface DownloadCategoryOption {
    id: string
    tierId: string
    label: string
    shortName: string
    icon: string
    teamName?: string
    count: number
    accentColor: string
}

export interface PreviewModalData {
    isOpen: boolean
    category: DownloadCategoryOption
    previewParticipant: ParticipantRecord
    canvasDataUrl: string
    sampleIndex: number
    totalStudents: number
    studentsList: ParticipantRecord[]
    activeTier: string
    certCode?: string
    token?: string
}

interface LayoutConfig {
    name: {
        enabled?: boolean
        x: number
        y: number
        fontSize: number
        fontWeight: string
        color: string
        align: CanvasTextAlign
        fontFamily: string
        maxWidth?: number
    }
    regNo: {
        enabled?: boolean
        x: number
        y: number
        fontSize: number
        fontWeight: string
        color: string
        prefix: string
        fontFamily: string
        maxWidth?: number
    }
    certId: {
        enabled?: boolean
        x: number
        y: number
        fontSize: number
        fontWeight: string
        color: string
        prefix: string
        fontFamily: string
    }
    qrCode: {
        enabled?: boolean
        x: number
        y: number
        size: number
        darkColor: string
        lightColor: string
    }
    credit?: {
        enabled?: boolean
        x: number
        y: number
        fontSize: number
        fontWeight: string
        color: string
        align: CanvasTextAlign
        fontFamily: string
        prefix: string
        text2ndYear: string
        text3rd4thYear: string
        maxWidth?: number
    }
}

export const DEFAULT_CREDIT_LAYOUT = {
    enabled: true,
    x: 960,
    y: 770,
    fontSize: 22,
    fontWeight: '600',
    color: '#475569',
    align: 'center' as CanvasTextAlign,
    fontFamily: 'Inter, sans-serif',
    prefix: '',
    text2ndYear: 'Non CGPA - Group 3',
    text3rd4thYear: '2 EE credit',
    maxWidth: 3800
}

export const getParticipantCreditText = (
    p?: ParticipantRecord | null,
    creditLayout?: {
        text2ndYear?: string
        text3rd4thYear?: string
        prefix?: string
    }
): string => {
    if (!p) return ''
    if (p.category === 'Not Eligible') return ''

    const text2nd = creditLayout?.text2ndYear || 'Non CGPA - Group 3'
    const text3rd4th = creditLayout?.text3rd4thYear || '2 EE credit'
    const prefix = creditLayout?.prefix || ''

    const yearStr = String(p.year || '').toLowerCase().trim()
    const is2ndYear = yearStr.includes('2nd') || yearStr.includes('second') || /^2(\s|$|nd)/.test(yearStr) || p.category === 'Group 3'

    const chosen = is2ndYear ? text2nd : text3rd4th
    return prefix ? `${prefix}${chosen}` : chosen
}

const DEFAULT_LAYOUT: LayoutConfig = {
    name: {
        enabled: true,
        x: 960,
        y: 620,
        fontSize: 54,
        fontWeight: 'bold',
        color: '#1e293b',
        align: 'center',
        fontFamily: 'Inter, sans-serif',
        maxWidth: 3800
    },
    regNo: {
        enabled: true,
        x: 960,
        y: 710,
        fontSize: 26,
        fontWeight: '600',
        color: '#475569',
        prefix: 'Registration No: ',
        fontFamily: 'Inter, sans-serif'
    },
    certId: {
        enabled: true,
        x: 1650,
        y: 1020,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b',
        prefix: 'ID: ',
        fontFamily: 'monospace'
    },
    qrCode: {
        enabled: true,
        x: 1570,
        y: 840,
        size: 150,
        darkColor: '#000000',
        lightColor: '#ffffff'
    },
    credit: DEFAULT_CREDIT_LAYOUT
}

// Native Browser IndexedDB Store (bypasses 5MB localStorage limit so high-res templates persist permanently)
const CERT_DB_NAME = 'hackare_cert_db'
const CERT_DB_VERSION = 1
const CERT_STORE_NAME = 'templates'

const openCertDb = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'))
            return
        }
        const req = indexedDB.open(CERT_DB_NAME, CERT_DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(CERT_STORE_NAME)) {
                db.createObjectStore(CERT_STORE_NAME, { keyPath: 'tier' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

const saveTemplateToIndexedDb = async (tier: string, data: TierTemplateData): Promise<void> => {
    try {
        const db = await openCertDb()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CERT_STORE_NAME, 'readwrite')
            const store = tx.objectStore(CERT_STORE_NAME)
            store.put({ tier, ...data })
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    } catch (err) {
        console.warn('IndexedDB save failed:', err)
    }
}

const loadAllTemplatesFromIndexedDb = async (): Promise<Record<string, TierTemplateData>> => {
    try {
        const db = await openCertDb()
        return new Promise((resolve) => {
            const tx = db.transaction(CERT_STORE_NAME, 'readonly')
            const store = tx.objectStore(CERT_STORE_NAME)
            const req = store.getAll()
            req.onsuccess = () => {
                const map: Record<string, TierTemplateData> = {}
                if (Array.isArray(req.result)) {
                    req.result.forEach((item: any) => {
                        if (item.tier) {
                            map[item.tier] = {
                                imageDataUrl: item.imageDataUrl,
                                fileName: item.fileName,
                                dimensions: item.dimensions,
                                layout: item.layout
                            }
                        }
                    })
                }
                resolve(map)
            }
            req.onerror = () => resolve({})
        })
    } catch (err) {
        return {}
    }
}

// Helper to yield main thread to browser event loop (prevents lag and unresponsiveness)
const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

// Fast native canvas to Blob conversion (bypasses slow base64 atob overhead)
const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.88): Promise<Blob> => {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob || new Blob([], { type }))
        }, type, quality)
    })
}

// Convert dataURL to Blob for safe downloads and zipping
const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
        const parts = dataUrl.split(',')
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], { type: mime })
    } catch (e) {
        return new Blob([], { type: 'image/png' })
    }
}

// Direct browser link download (bypasses file-saver dataURL limitations)
const triggerFileDownload = (blobOrUrl: Blob | string, fileName: string) => {
    const url = typeof blobOrUrl === 'string' && blobOrUrl.startsWith('data:')
        ? URL.createObjectURL(dataUrlToBlob(blobOrUrl))
        : typeof blobOrUrl === 'string'
            ? blobOrUrl
            : URL.createObjectURL(blobOrUrl)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        try {
            document.body.removeChild(a)
            if (typeof blobOrUrl !== 'string' || blobOrUrl.startsWith('data:')) {
                URL.revokeObjectURL(url)
            }
        } catch { }
    }, 1500)
}

export default function OrganizerCertificatesPage() {
    // Tabs: studio (generator) vs history (issued list)
    const [activeTab, setActiveTab] = useState<'studio' | 'history'>('studio')

    // Data Source: 'db' | 'excel'
    const [dataSource, setDataSource] = useState<'db' | 'excel'>('db')
    const [dbParticipantsList, setDbParticipantsList] = useState<ParticipantRecord[]>([])
    const [excelParticipantsList, setExcelParticipantsList] = useState<ParticipantRecord[]>([])
    const [excelFileName, setExcelFileName] = useState<string>('')
    const [loadingParticipants, setLoadingParticipants] = useState(false)

    // Event Names for DB mode and Excel mode
    const [dbEventName, setDbEventName] = useState<string>('GDG-KARE Event Management Platform')
    const [excelEventName, setExcelEventName] = useState<string>('GDG-KARE Event')
    const [isEditingDbEvent, setIsEditingDbEvent] = useState<boolean>(false)
    const [tempDbEventName, setTempDbEventName] = useState<string>('GDG-KARE Event Management Platform')

    const activeEventName = useMemo(() => {
        return dataSource === 'db' ? (dbEventName.trim() || 'GDG-KARE Event Management Platform') : (excelEventName.trim() || 'GDG-KARE Event')
    }, [dataSource, dbEventName, excelEventName])

    // Active participants dynamically bound to the selected data source (DB vs Excel)
    // Ensures moving between Excel and DB immediately and strictly switches the participant dataset
    const participants = useMemo(() => {
        return dataSource === 'db' ? dbParticipantsList : excelParticipantsList
    }, [dataSource, dbParticipantsList, excelParticipantsList])

    // Unified setter that automatically routes updates to the active data source
    const setParticipants = useCallback((updater: ParticipantRecord[] | ((prev: ParticipantRecord[]) => ParticipantRecord[])) => {
        if (dataSource === 'db') {
            setDbParticipantsList(updater)
        } else {
            setExcelParticipantsList(updater)
        }
    }, [dataSource])
    // Certificate Tier / Batch Mode
    const [selectedCertType, setSelectedCertType] = useState<CertificateType>('Participation')
    const [templateStore, setTemplateStore] = useState<Record<string, TierTemplateData>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Group 3' | 'EE Credit' | 'Not Eligible'>('All')
    const [teamFilter, setTeamFilter] = useState<string>('All')
    const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('All')

    // Winning Teams Configuration & Dynamic Tiers (Separated for DB vs Excel)
    const [dbWinnerCount, setDbWinnerCount] = useState<number>(3)
    const [dbWinningTeams, setDbWinningTeams] = useState<string[]>(['', '', ''])
    const [excelWinnerCount, setExcelWinnerCount] = useState<number>(3)
    const [excelWinningTeams, setExcelWinningTeams] = useState<string[]>(['', '', ''])

    // Dynamically derive active winning teams and count based on dataSource
    const winningTeams = useMemo(() => {
        return dataSource === 'db' ? dbWinningTeams : excelWinningTeams
    }, [dataSource, dbWinningTeams, excelWinningTeams])

    const winnerCount = useMemo(() => {
        return dataSource === 'db' ? dbWinnerCount : excelWinnerCount
    }, [dataSource, dbWinnerCount, excelWinnerCount])

    const availableTiers = useMemo(() => {
        const list: CertificateTierInfo[] = [PARTICIPATION_TIER]
        for (let r = 1; r <= winnerCount; r++) {
            list.push(getTierForRank(r))
        }
        list.push(SPECIAL_MENTION_TIER)
        return list
    }, [winnerCount])

    // Helper: determine a participant's assigned award tier based on winningTeams
    const getParticipantAwardTier = (p: ParticipantRecord): string => {
        if (!p.team_name || p.team_name === '—' || p.team_name === 'Unassigned') {
            return 'Participation'
        }
        const idx = winningTeams.findIndex(t => t && t.trim().toLowerCase() === p.team_name?.trim().toLowerCase())
        if (idx !== -1) {
            return getTierForRank(idx + 1).id
        }
        return 'Participation'
    }

    const group3Count = useMemo(() => participants.filter(p => p.category === 'Group 3').length, [participants])
    const eeCreditCount = useMemo(() => participants.filter(p => p.category === 'EE Credit').length, [participants])
    const notEligibleCount = useMemo(() => participants.filter(p => p.category === 'Not Eligible').length, [participants])

    const uniqueTeams = useMemo(() => {
        const set = new Set<string>()
        participants.forEach(p => {
            if (p.team_name && p.team_name !== '—' && p.team_name !== 'Unassigned') {
                set.add(p.team_name)
            }
        })
        return Array.from(set).sort()
    }, [participants])

    // Map each team name to its members
    const teamMembersMap = useMemo(() => {
        const map = new Map<string, ParticipantRecord[]>()
        participants.forEach(p => {
            if (p.team_name && p.team_name !== '—' && p.team_name !== 'Unassigned') {
                const list = map.get(p.team_name) || []
                list.push(p)
                map.set(p.team_name, list)
            }
        })
        return map
    }, [participants])

    // Download Categories list (Participants, Winner 1, 2, 3..., All)
    const downloadCategories = useMemo<DownloadCategoryOption[]>(() => {
        const allParticipants = participants
        const list: DownloadCategoryOption[] = []

        // 1. Participants Category (Includes general participants and Not Eligible participants who are not winners)
        const participantCount = allParticipants.filter(p => getParticipantAwardTier(p) === 'Participation').length
        list.push({
            id: 'participation',
            tierId: 'Participation',
            label: 'Participants',
            shortName: 'Participation',
            icon: '🎖️',
            count: participantCount,
            accentColor: '#10b981'
        })

        // 2. Winning Teams (Rank 1, 2, 3... up to winnerCount)
        for (let i = 0; i < winnerCount; i++) {
            const rank = i + 1
            const tierInfo = getTierForRank(rank)
            const team = (winningTeams[i] || '').trim()
            const members = team ? teamMembersMap.get(team) || [] : []
            list.push({
                id: `winner_${rank}`,
                tierId: tierInfo.id,
                label: `Winning Team - ${getOrdinal(rank)} Place`,
                shortName: `Winner ${rank}`,
                icon: rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆',
                teamName: team || 'Unassigned',
                count: members.length,
                accentColor: tierInfo.accentColor
            })
        }

        // 3. All Categories option (Full batch including all registered participants)
        list.push({
            id: 'all',
            tierId: 'All',
            label: 'All Categories (Combined)',
            shortName: 'All',
            icon: '🌐',
            count: allParticipants.length,
            accentColor: '#3b82f6'
        })

        return list
    }, [participants, winnerCount, winningTeams, teamMembersMap])

    const handleWinnerCountChange = (count: number) => {
        const clamped = Math.max(1, Math.min(25, count))
        if (dataSource === 'db') {
            setDbWinnerCount(clamped)
            setDbWinningTeams(prev => {
                const next = [...prev]
                while (next.length < clamped) next.push('')
                const trimmed = next.slice(0, clamped)
                try {
                    localStorage.setItem('hackare_db_winner_count', String(clamped))
                    localStorage.setItem('hackare_db_winning_teams', JSON.stringify(trimmed))
                } catch { }
                return trimmed
            })
        } else {
            setExcelWinnerCount(clamped)
            setExcelWinningTeams(prev => {
                const next = [...prev]
                while (next.length < clamped) next.push('')
                const trimmed = next.slice(0, clamped)
                try {
                    localStorage.setItem('hackare_excel_winner_count', String(clamped))
                    localStorage.setItem('hackare_excel_winning_teams', JSON.stringify(trimmed))
                } catch { }
                return trimmed
            })
        }
        showToast('info', `Configured for ${clamped} winning teams.`)
    }

    const updateWinningTeam = (rankIndex: number, teamName: string) => {
        if (dataSource === 'db') {
            setDbWinningTeams(prev => {
                const next = [...prev]
                next[rankIndex] = teamName
                try {
                    localStorage.setItem('hackare_db_winning_teams', JSON.stringify(next))
                } catch { }
                return next
            })
        } else {
            setExcelWinningTeams(prev => {
                const next = [...prev]
                next[rankIndex] = teamName
                try {
                    localStorage.setItem('hackare_excel_winning_teams', JSON.stringify(next))
                } catch { }
                return next
            })
        }
        if (teamName) {
            showToast('success', `Assigned ${teamName} as ${getOrdinal(rankIndex + 1)} Place Winner!`)
        }
    }

    // Template Image
    const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null)
    const [templateDimensions, setTemplateDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 })
    const [templateFileName, setTemplateFileName] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const excelInputRef = useRef<HTMLInputElement>(null)

    // Layout calibration
    const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT)
    const [activeElementToPosition, setActiveElementToPosition] = useState<'name' | 'regNo' | 'certId' | 'qrCode' | 'credit' | null>(null)
    const [calibrationTab, setCalibrationTab] = useState<'name' | 'regNo' | 'certId' | 'qrCode' | 'credit'>('name')

    // Generation state
    const [generating, setGenerating] = useState(false)
    const [progress, setProgress] = useState<{ current: number; total: number; message: string }>({ current: 0, total: 0, message: '' })
    const [generatedResults, setGeneratedResults] = useState<{
        participant: ParticipantRecord
        certCode: string
        canvasDataUrl: string
        tier?: string
    }[]>([])

    // Preview canvas
    const previewCanvasRef = useRef<HTMLCanvasElement>(null)
    const [previewIndex, setPreviewIndex] = useState<number>(0)

    // Draggable Overlay & Real-time scaling
    const previewContainerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 960, height: 540 })
    const [draggingElement, setDraggingElement] = useState<'name' | 'regNo' | 'certId' | 'qrCode' | 'credit' | null>(null)
    const [dragStartPos, setDragStartPos] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null)
    const [sampleQrDataUrl, setSampleQrDataUrl] = useState<string>('')

    const previewScale = useMemo(() => {
        const nativeW = templateDimensions.width || 1920
        return containerSize.width > 0 ? containerSize.width / nativeW : 0.5
    }, [containerSize.width, templateDimensions.width])

    // Track container dimensions on resize
    useEffect(() => {
        if (!previewContainerRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerSize({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    })
                }
            }
        })
        observer.observe(previewContainerRef.current)
        return () => observer.disconnect()
    }, [])

    // Generate sample QR code data URL for preview
    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const sampleUrl = `${origin}/verify-certificate?id=GDG-KARE-PREV-99A1`
        QRCode.toDataURL(sampleUrl, {
            width: layout.qrCode.size || 150,
            margin: 1,
            color: {
                dark: layout.qrCode.darkColor || '#000000',
                light: layout.qrCode.lightColor || '#ffffff'
            }
        }).then(url => setSampleQrDataUrl(url)).catch(err => console.error(err))
    }, [layout.qrCode.darkColor, layout.qrCode.lightColor, layout.qrCode.size])

    // Global pointer move & up listeners for smooth dragging
    useEffect(() => {
        if (!draggingElement || !dragStartPos || !previewContainerRef.current) return

        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

            const containerRect = previewContainerRef.current?.getBoundingClientRect()
            if (!containerRect || containerRect.width === 0 || containerRect.height === 0) return

            const nativeW = templateDimensions.width || 1920
            const nativeH = templateDimensions.height || 1080

            const dxPx = clientX - dragStartPos.mouseX
            const dyPx = clientY - dragStartPos.mouseY

            const dxNative = (dxPx / containerRect.width) * nativeW
            const dyNative = (dyPx / containerRect.height) * nativeH

            const newX = Math.round(Math.max(0, Math.min(nativeW, dragStartPos.initialX + dxNative)))
            const newY = Math.round(Math.max(0, Math.min(nativeH, dragStartPos.initialY + dyNative)))

            setLayout(prev => {
                const cur = prev[draggingElement] || (draggingElement === 'credit' ? DEFAULT_CREDIT_LAYOUT : {})
                return {
                    ...prev,
                    [draggingElement]: {
                        ...cur,
                        x: newX,
                        y: newY
                    }
                }
            })
        }

        const handlePointerUp = () => {
            setDraggingElement(null)
            setDragStartPos(null)
        }

        window.addEventListener('mousemove', handlePointerMove)
        window.addEventListener('mouseup', handlePointerUp)
        window.addEventListener('touchmove', handlePointerMove, { passive: false })
        window.addEventListener('touchend', handlePointerUp)

        return () => {
            window.removeEventListener('mousemove', handlePointerMove)
            window.removeEventListener('mouseup', handlePointerUp)
            window.removeEventListener('touchmove', handlePointerMove)
            window.removeEventListener('touchend', handlePointerUp)
        }
    }, [draggingElement, dragStartPos, templateDimensions])

    const startDrag = (element: 'name' | 'regNo' | 'certId' | 'qrCode' | 'credit', e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setCalibrationTab(element)
        setDraggingElement(element)

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        const elemLayout = layout[element] || (element === 'credit' ? DEFAULT_CREDIT_LAYOUT : { x: 0, y: 0 })

        setDragStartPos({
            mouseX: clientX,
            mouseY: clientY,
            initialX: elemLayout.x,
            initialY: elemLayout.y
        })
    }

    // History of issued certs
    const [issuedCertificates, setIssuedCertificates] = useState<any[]>([])
    const [loadingIssued, setLoadingIssued] = useState(false)
    const [historySearch, setHistorySearch] = useState('')
    const certCodeCacheRef = useRef<Map<string, string>>(new Map())

    /**
     * Deterministic hash generation for offline / Excel participants vs DB participants.
     * Uses different prime seeds and salts for DB vs Excel so that even if a student
     * has the exact same reg_no/details in both DB and an Excel sheet, their unique IDs
     * are strictly distinct and never collide!
     */
    const generateDeterministicCertCode = (identifier: string, tier: string = '', source: 'db' | 'excel' = 'db'): string => {
        const salt = source === 'excel' ? 'GDG_KARE_EXCEL_SPREADSHEET_2026' : 'GDG_KARE_DATABASE_STUDENT_2026'
        const input = `${identifier.trim().toUpperCase()}::${tier.trim().toUpperCase()}::${salt}`
        let h1 = source === 'excel' ? 0xcafebabe : 0xdeadbeef
        let h2 = source === 'excel' ? 0x8badf00d : 0x41c6ce57
        for (let i = 0; i < input.length; i++) {
            const ch = input.charCodeAt(i)
            h1 = Math.imul(h1 ^ ch, 2654435761)
            h2 = Math.imul(h2 ^ ch, 1597334677)
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

        const partA = Math.abs(h1).toString(36).padStart(4, '0').slice(-4).toUpperCase()
        const partB = Math.abs(h2).toString(36).padStart(4, '0').slice(-4).toUpperCase()
        return `GDG-KARE-${partA}-${partB}`
    }

    /**
     * Resolves the permanent unique certificate code for a participant with complete DB vs Excel isolation:
     * - DB participants: Check Supabase DB (issuedCertificates), DB session cache, DB localStorage.
     * - Excel participants: Check Excel column, Excel session cache, Excel localStorage.
     *   NEVER checks DB, and never shares keys with DB participants!
     */
    const getExistingOrNewCertCode = (p?: ParticipantRecord | null, tier?: string): string => {
        const isExcel = p?.id?.startsWith('excel_') || dataSource === 'excel'
        const source: 'db' | 'excel' = isExcel ? 'excel' : 'db'

        if (!p) {
            return generateDeterministicCertCode('PREVIEW_SAMPLE', tier || 'sample', source)
        }

        const cleanReg = (p.reg_no || '').trim().toLowerCase()
        const cleanId = (p.id || '').trim().toLowerCase()
        const cleanName = (p.name || '').trim().toLowerCase()
        const targetTier = (tier || '').trim().toLowerCase()

        // Namespaced keys guarantee 100% isolation between DB and Excel participants
        const specificKey = `${source}:${cleanReg || cleanId || cleanName}_${targetTier}`
        const generalKey = `${source}:${cleanReg || cleanId || cleanName}`

        if (!isExcel) {
            // 1. Check existing DB certificates (STRICTLY FOR DB PARTICIPANTS ONLY!)
            if (issuedCertificates && issuedCertificates.length > 0) {
                // First try matching both student AND exact tier
                const exactDbMatch = issuedCertificates.find(c => {
                    const cReg = (c.reg_no || '').trim().toLowerCase()
                    const cId = (c.user_id || c.id || '').trim().toLowerCase()
                    const cTier = (c.award_tier || c.template_name || '').trim().toLowerCase()
                    const isStudent = (cleanReg && cReg === cleanReg) || (cleanId && cId === cleanId)
                    return isStudent && (!targetTier || cTier === targetTier)
                })

                if (exactDbMatch?.certificate_code) {
                    certCodeCacheRef.current.set(specificKey, exactDbMatch.certificate_code)
                    return exactDbMatch.certificate_code
                }

                // Fallback: Match student by reg_no or user_id regardless of tier
                const studentDbMatch = issuedCertificates.find(c => {
                    const cReg = (c.reg_no || '').trim().toLowerCase()
                    const cId = (c.user_id || c.id || '').trim().toLowerCase()
                    return (cleanReg && cReg === cleanReg) || (cleanId && cId === cleanId)
                })

                if (studentDbMatch?.certificate_code) {
                    certCodeCacheRef.current.set(specificKey, studentDbMatch.certificate_code)
                    return studentDbMatch.certificate_code
                }
            }
        }

        // 2. Check in-memory session cache (namespaced by source)
        if (certCodeCacheRef.current.has(specificKey)) {
            return certCodeCacheRef.current.get(specificKey)!
        }
        if (certCodeCacheRef.current.has(generalKey)) {
            return certCodeCacheRef.current.get(generalKey)!
        }

        // 3. Check persistent browser localStorage (survives tab closure, browser restart)
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const storageKey = isExcel ? 'hackare_excel_cert_codes' : 'hackare_cert_codes'
                const stored = localStorage.getItem(storageKey)
                if (stored) {
                    const map = JSON.parse(stored)
                    if (map[specificKey]) {
                        certCodeCacheRef.current.set(specificKey, map[specificKey])
                        return map[specificKey]
                    }
                    if (map[generalKey]) {
                        certCodeCacheRef.current.set(generalKey, map[generalKey])
                        return map[generalKey]
                    }
                }
            }
        } catch { }

        // 4. Check if participant object carries an existing certificate_code (e.g. from Excel column)
        if (p.certificate_code) {
            const code = String(p.certificate_code)
            certCodeCacheRef.current.set(specificKey, code)
            return code
        }

        // 5. Deterministic Algorithmic Fallback:
        // Uses separate cryptographic seeds for DB vs Excel so duplicate student records
        // will NEVER produce the same certificate ID across DB and Excel modes.
        const identifier = cleanReg || cleanId || cleanName || 'STUDENT'
        const newCode = generateDeterministicCertCode(identifier, targetTier, source)

        // Cache in memory and localStorage for instant lookup
        certCodeCacheRef.current.set(specificKey, newCode)
        certCodeCacheRef.current.set(generalKey, newCode)
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const storageKey = isExcel ? 'hackare_excel_cert_codes' : 'hackare_cert_codes'
                const stored = localStorage.getItem(storageKey)
                const map = stored ? JSON.parse(stored) : {}
                map[specificKey] = newCode
                map[generalKey] = newCode
                localStorage.setItem(storageKey, JSON.stringify(map))
            }
        } catch { }

        return newCode
    }

    // Toast notification
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    // Modal pop-up state
    interface PopupModalData {
        isOpen: boolean
        type: 'success' | 'error' | 'info'
        category?: 'winners' | 'template' | 'general'
        title: string
        message: string
        details?: string[]
        extraNote?: string
    }

    const [popupModal, setPopupModal] = useState<PopupModalData | null>(null)
    const [savingWinningTeams, setSavingWinningTeams] = useState(false)
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Category Download & Preview state
    const [selectedDownloadCategoryId, setSelectedDownloadCategoryId] = useState<string>('participation')
    const [downloadingCategory, setDownloadingCategory] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState<{
        isOpen: boolean
        current: number
        total: number
        percent: number
        stage: string
        categoryLabel: string
    }>({
        isOpen: false,
        current: 0,
        total: 0,
        percent: 0,
        stage: '',
        categoryLabel: ''
    })
    const [previewModal, setPreviewModal] = useState<PreviewModalData | null>(null)
    const [generatingPreview, setGeneratingPreview] = useState(false)
    const [showPreviewTuner, setShowPreviewTuner] = useState<boolean>(false)
    const [previewTunerTab, setPreviewTunerTab] = useState<'name' | 'regNo' | 'credit' | 'certId' | 'qrCode'>('name')
    const [previewLayout, setPreviewLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT)
    const [savingPreviewTuner, setSavingPreviewTuner] = useState<boolean>(false)
    const [previewTunerSavedSuccess, setPreviewTunerSavedSuccess] = useState<boolean>(false)

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPopupModal(null)
                setPreviewModal(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Fetch and synchronize DB winning teams from Supabase database
    const syncWinningTeamsFromDb = useCallback(async () => {
        try {
            const res = await fetch('/api/organizer/winning-teams', { cache: 'no-store' })
            if (res.ok) {
                const data = await res.json()
                if (data.winningTeams && Array.isArray(data.winningTeams)) {
                    setDbWinningTeams(data.winningTeams)
                    if (typeof data.winnerCount === 'number') {
                        setDbWinnerCount(data.winnerCount)
                    }
                    try {
                        localStorage.setItem('hackare_db_winner_count', String(data.winnerCount || 3))
                        localStorage.setItem('hackare_db_winning_teams', JSON.stringify(data.winningTeams))
                    } catch { }
                    return
                }
            }
        } catch (err) {
            console.warn('Could not load winning teams from DB:', err)
        }

        // Fallback: Load saved DB winning teams and count from localStorage
        try {
            const savedCount = localStorage.getItem('hackare_db_winner_count') || localStorage.getItem('hackare_winner_count')
            if (savedCount) {
                const c = parseInt(savedCount, 10)
                if (!isNaN(c) && c >= 1 && c <= 25) setDbWinnerCount(c)
            }
            const savedTeams = localStorage.getItem('hackare_db_winning_teams') || localStorage.getItem('hackare_winning_teams')
            if (savedTeams) {
                const parsed = JSON.parse(savedTeams)
                if (Array.isArray(parsed)) setDbWinningTeams(parsed)
            }
        } catch { }
    }, [])

    // Save Winning Teams to Database with Pop-up Message
    const saveWinningTeamsToDb = async () => {
        if (dataSource === 'excel') {
            showToast('info', 'Excel winning teams are kept in your local spreadsheet session.')
            return
        }
        setSavingWinningTeams(true)
        try {
            // 1. Immediately cache in localStorage
            try {
                localStorage.setItem('hackare_db_winner_count', String(dbWinnerCount))
                localStorage.setItem('hackare_db_winning_teams', JSON.stringify(dbWinningTeams))
            } catch { }

            // 2. Persist to Supabase DB via PUT /api/organizer/winning-teams
            const res = await fetch('/api/organizer/winning-teams', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    winnerCount: dbWinnerCount,
                    winningTeams: dbWinningTeams
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update winning teams in database')
            }

            // 3. Compile summary of winning teams for the pop-up modal
            const details: string[] = []
            let assignedCount = 0
            for (let i = 0; i < dbWinnerCount; i++) {
                const team = (dbWinningTeams[i] || '').trim()
                const rank = i + 1
                const ordinal = getOrdinal(rank)
                const icon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆'
                if (team) {
                    assignedCount++
                    const membersCount = teamMembersMap.get(team)?.length || 0
                    details.push(`${icon} Rank ${rank} (${ordinal} Place): ${team} — ${membersCount} student${membersCount === 1 ? '' : 's'}`)
                } else {
                    details.push(`⚪ Rank ${rank} (${ordinal} Place): [Not Assigned Yet]`)
                }
            }

            // 4. Refresh DB participant records
            fetchDbParticipants()

            // 5. Open Pop-up confirmation message modal
            setPopupModal({
                isOpen: true,
                type: 'success',
                category: 'winners',
                title: '🎉 Winning Teams Successfully Saved to Database!',
                message: `Top ${dbWinnerCount} winning teams configuration has been permanently synced to Supabase database ("teams" & "winning_teams" tables). ${assignedCount} of ${dbWinnerCount} ranks configured.`,
                details: details,
                extraNote: 'Certificates generated with "Smart Multi-Tier Batch" will automatically grant every student in these winning teams their official Winner certificate!'
            })

            showToast('success', `Saved ${assignedCount} winning teams to database!`)
        } catch (err: any) {
            console.error('Error saving winning teams to DB:', err)
            setPopupModal({
                isOpen: true,
                type: 'error',
                category: 'winners',
                title: '❌ Failed to Save Winning Teams to Database',
                message: err.message || 'An unexpected error occurred while communicating with the database.',
                details: [
                    'Please verify your connection and permissions.',
                    'Your local configuration has been preserved in browser memory.'
                ]
            })
            showToast('error', 'Error: ' + (err.message || 'Failed to save winning teams'))
        } finally {
            setSavingWinningTeams(false)
        }
    }

    // Load saved layout and template from localStorage if exists
    useEffect(() => {
        const saved = localStorage.getItem('hackare_cert_layout')
        if (saved) {
            try {
                setLayout(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse saved layout', e)
            }
        }

        // Try instant local cache for DB participants so there is 0ms delay on initial load
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                const cachedDb = sessionStorage.getItem('hackare_db_participants')
                if (cachedDb) {
                    const parsed = JSON.parse(cachedDb)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setDbParticipantsList(parsed)
                    }
                }
            }
        } catch { }

        // Load saved Excel winning teams & event name from localStorage if available
        try {
            const savedExcelCount = localStorage.getItem('hackare_excel_winner_count')
            if (savedExcelCount) {
                const c = parseInt(savedExcelCount, 10)
                if (!isNaN(c) && c >= 1 && c <= 25) setExcelWinnerCount(c)
            }
            const savedExcelTeams = localStorage.getItem('hackare_excel_winning_teams')
            if (savedExcelTeams) {
                const parsed = JSON.parse(savedExcelTeams)
                if (Array.isArray(parsed)) setExcelWinningTeams(parsed)
            }
            const savedExcelEvent = localStorage.getItem('hackare_excel_event_name')
            if (savedExcelEvent) setExcelEventName(savedExcelEvent)

            const savedDbEvent = localStorage.getItem('hackare_db_event_name')
            if (savedDbEvent) {
                setDbEventName(savedDbEvent)
                setTempDbEventName(savedDbEvent)
            }
        } catch { }

        fetchDbParticipants()
        fetchIssuedCertificates()
        syncWinningTeamsFromDb()

        // Load all saved templates from IndexedDB + Supabase Cloud
        const initTemplates = async () => {
            let loadedStore: Record<string, TierTemplateData> = {}
            try {
                // 1. Instant local IndexedDB load (no 5MB limit, works offline & on refresh)
                loadedStore = await loadAllTemplatesFromIndexedDb()
            } catch (e) {
                console.warn('Error loading from IndexedDB:', e)
            }

            // 2. Fetch from Supabase Cloud API in background
            try {
                const res = await fetch('/api/organizer/certificate-templates')
                const data = await res.json()
                if (data.templates && Array.isArray(data.templates)) {
                    data.templates.forEach((t: any) => {
                        if (t.tier && t.image_data_url) {
                            loadedStore[t.tier] = {
                                imageDataUrl: t.image_data_url,
                                fileName: t.file_name,
                                dimensions: t.dimensions,
                                layout: t.layout
                            }
                            // Save to IndexedDB cache
                            saveTemplateToIndexedDb(t.tier, loadedStore[t.tier])
                        }
                    })
                }
            } catch (cloudErr) {
                console.warn('Could not sync templates from cloud:', cloudErr)
            }

            // 3. Auto-sync any local base64 templates to Supabase Cloud in background
            for (const key of Object.keys(loadedStore)) {
                const item = loadedStore[key]
                if (item && item.imageDataUrl && item.imageDataUrl.startsWith('data:image')) {
                    fetch('/api/organizer/certificate-templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tier: key,
                            fileName: item.fileName,
                            imageDataUrl: item.imageDataUrl,
                            dimensions: item.dimensions,
                            layout: item.layout
                        })
                    }).then(r => r.json()).then(resJson => {
                        if (resJson.template?.image_data_url) {
                            item.imageDataUrl = resJson.template.image_data_url
                            saveTemplateToIndexedDb(key, item)
                        }
                    }).catch(() => { })
                }
            }

            if (Object.keys(loadedStore).length > 0) {
                setTemplateStore(loadedStore)
            }

            // Check if Participation template exists in loaded store
            const participationData = loadedStore['Participation']
            if (participationData && participationData.imageDataUrl) {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    setTemplateImage(img)
                    setTemplateDimensions(participationData.dimensions || { width: img.naturalWidth, height: img.naturalHeight })
                    setTemplateFileName(participationData.fileName || 'Participation Template')
                    if (participationData.layout) setLayout(participationData.layout)
                }
                img.src = participationData.imageDataUrl
                return
            }

            // Fallback sample template if no custom template has been uploaded yet
            generateFallbackTemplate('Participation')
        }

        initTemplates()
    }, [])

    // Redraw preview whenever layout, template or sample participant changes
    useEffect(() => {
        drawPreview()
    }, [templateImage, layout, participants, previewIndex])

    // =========================================================================
    // 1. DATA SOURCE HANDLERS
    // =========================================================================

    // Helper: 2nd year participants are Group 3, all remaining years are EE Credit
    const determineCategoryByYear = (yearStr?: string): 'Group 3' | 'EE Credit' => {
        if (!yearStr) return 'EE Credit'
        const clean = String(yearStr).toLowerCase().trim()
        if (clean.includes('2nd') || clean.includes('second') || /^2(\s|$|nd)/.test(clean)) {
            return 'Group 3'
        }
        return 'EE Credit'
    }

    const fetchDbParticipants = async () => {
        setLoadingParticipants(true)
        try {
            const res = await fetch('/api/organizer/students', { cache: 'no-store' })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `HTTP ${res.status}`)
            }
            const data = await res.json()
            if (data.students && Array.isArray(data.students)) {
                const formatted: ParticipantRecord[] = data.students.map((s: any) => ({
                    id: s.id,
                    name: s.name || 'Participant',
                    reg_no: s.reg_no || '',
                    dept: s.dept || 'Engineering',
                    section: s.section || 'A',
                    year: s.year || '2026',
                    team_name: s.team?.team_name || (typeof s.team === 'string' ? s.team : '') || 'Unassigned',
                    category: s.category || determineCategoryByYear(s.year),
                    selected: true
                }))
                setDbParticipantsList(formatted)
                try {
                    if (typeof window !== 'undefined' && window.sessionStorage) {
                        sessionStorage.setItem('hackare_db_participants', JSON.stringify(formatted))
                    }
                } catch { }
            }
        } catch (e: any) {
            console.error('Error fetching participants from DB:', e)
            showToast('error', `Failed to load participants from database: ${e.message || 'Network error'}`)
        } finally {
            setLoadingParticipants(false)
        }
    }

    const switchToDbMode = async () => {
        setActiveTab('studio')
        setDataSource('db')
        setSearchQuery('')
        setCategoryFilter('All')
        setTeamFilter('All')
        setPreviewIndex(0)

        // Instant local cache restore if in-memory DB list was empty
        if (dbParticipantsList.length === 0) {
            try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                    const cachedDb = sessionStorage.getItem('hackare_db_participants')
                    if (cachedDb) {
                        const parsed = JSON.parse(cachedDb)
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setDbParticipantsList(parsed)
                        }
                    }
                }
            } catch { }
        }

        // Fetch fresh participants and winning teams from Supabase database in parallel
        await Promise.all([
            fetchDbParticipants(),
            syncWinningTeamsFromDb()
        ])
    }

    const switchToExcelMode = () => {
        setActiveTab('studio')
        setDataSource('excel')
        setSearchQuery('')
        setCategoryFilter('All')
        setTeamFilter('All')
        setPreviewIndex(0)

        if (excelParticipantsList.length === 0) {
            excelInputRef.current?.click()
        }
    }

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Clear previous Excel cert codes cache so the newly uploaded spreadsheet always gets fresh, clean IDs
        for (const key of Array.from(certCodeCacheRef.current.keys())) {
            if (key.startsWith('excel:')) {
                certCodeCacheRef.current.delete(key)
            }
        }
        try {
            localStorage.removeItem('hackare_excel_cert_codes')
        } catch { }

        setExcelFileName(file.name)
        setSearchQuery('')
        setCategoryFilter('All')
        setTeamFilter('All')
        setPreviewIndex(0)
        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const binaryStr = evt.target?.result
                const workbook = XLSX.read(binaryStr, { type: 'binary' })
                const firstSheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[firstSheetName]
                const rawRows: any[] = XLSX.utils.sheet_to_json(sheet)

                if (rawRows.length === 0) {
                    showToast('error', 'Uploaded sheet appears to be empty.')
                    return
                }

                // Smart column detection
                const parsed: ParticipantRecord[] = rawRows.map((row, index) => {
                    // Detect keys case-insensitively
                    const keys = Object.keys(row)
                    const findKey = (candidates: string[]) => {
                        const found = keys.find(k => candidates.includes(k.toLowerCase().trim()))
                        return found ? row[found] : ''
                    }

                    const name = findKey(['name', 'full name', 'student name', 'participant name', 'candidate name']) || `Participant ${index + 1}`
                    const reg_no = String(findKey(['reg_no', 'regno', 'reg no', 'registration no', 'register number', 'roll no']) || '').trim()
                    const dept = String(findKey(['dept', 'department', 'branch', 'stream']) || 'General Track').trim()
                    const section = String(findKey(['section', 'sec']) || 'A').trim()
                    const year = String(findKey(['year', 'academic year']) || '2nd Year').trim()
                    const team_name = String(findKey(['team', 'team name', 'team_name', 'group']) || 'General Cohort').trim()
                    const rowCategory = String(findKey(['category', 'credit', 'type']) || '').trim()
                    const rowEvent = String(findKey(['event', 'event name', 'event_name', 'event title', 'competition']) || '').trim()
                    const excelCertCode = String(findKey(['certificate_code', 'certificate_id', 'cert_code', 'cert_id', 'cert id', 'certificate id']) || '').trim()

                    if (rowEvent && index === 0) {
                        setExcelEventName(rowEvent)
                        try {
                            localStorage.setItem('hackare_excel_event_name', rowEvent)
                        } catch { }
                    }

                    // For Excel, NEVER query DB / issuedCertificates for unique IDs
                    const finalExcelCertCode = excelCertCode || undefined

                    let assignedCategory: 'Group 3' | 'EE Credit' | 'Not Eligible' = determineCategoryByYear(year)
                    if (rowCategory) {
                        const rcLower = rowCategory.toLowerCase()
                        if (rcLower.includes('not eligible') || rcLower.includes('ineligible') || rcLower.includes('not')) {
                            assignedCategory = 'Not Eligible'
                        } else if (rcLower.includes('ee')) {
                            assignedCategory = 'EE Credit'
                        } else if (rcLower.includes('group 3') || rcLower.includes('grp 3') || rcLower.includes('group3')) {
                            assignedCategory = 'Group 3'
                        }
                    }

                    return {
                        id: `excel_${index}_${Math.random().toString(36).substr(2, 5)}`,
                        name: String(name).trim(),
                        reg_no: reg_no,
                        dept: dept,
                        section: section,
                        year: year,
                        team_name: team_name,
                        category: assignedCategory,
                        selected: true,
                        certificate_code: finalExcelCertCode
                    }
                })

                setExcelParticipantsList(parsed)
                setDataSource('excel')
                showToast('success', `Parsed ${parsed.length} participants from spreadsheet "${file.name}"!`)
            } catch (err: any) {
                console.error('Error parsing spreadsheet:', err)
                showToast('error', 'Failed to parse file. Please upload a valid .xlsx, .xls, or .csv')
            }
        }
        reader.readAsBinaryString(file)
    }

    // =========================================================================
    // 2. TEMPLATE IMAGE HANDLING
    // =========================================================================

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setTemplateFileName(file.name)
        const reader = new FileReader()
        reader.onload = async (evt) => {
            const dataUrl = evt.target?.result as string
            const img = new Image()
            img.onload = async () => {
                setTemplateImage(img)
                setTemplateDimensions({ width: img.naturalWidth, height: img.naturalHeight })

                const tierData: TierTemplateData = {
                    imageDataUrl: dataUrl,
                    fileName: file.name,
                    dimensions: { width: img.naturalWidth, height: img.naturalHeight },
                    layout: layout
                }

                setTemplateStore(prev => ({
                    ...prev,
                    [selectedCertType]: tierData
                }))

                // 1. Permanent Browser IndexedDB storage (instant local access)
                await saveTemplateToIndexedDb(selectedCertType, tierData)

                // 2. Cloud Supabase Storage sync (makes templates available to ALL organizers in production)
                let cloudSynced = false
                try {
                    const cloudRes = await fetch('/api/organizer/certificate-templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tier: selectedCertType,
                            fileName: file.name,
                            imageDataUrl: dataUrl,
                            dimensions: { width: img.naturalWidth, height: img.naturalHeight },
                            layout: layout
                        })
                    })
                    const cloudJson = await cloudRes.json()
                    if (cloudJson.success) {
                        cloudSynced = true
                        if (cloudJson.template?.image_data_url) {
                            tierData.imageDataUrl = cloudJson.template.image_data_url
                            await saveTemplateToIndexedDb(selectedCertType, tierData)
                            setTemplateStore(prev => ({
                                ...prev,
                                [selectedCertType]: tierData
                            }))
                        }
                    }
                } catch (cloudErr) {
                    console.warn('Cloud storage sync failed, kept in IndexedDB:', cloudErr)
                }

                // Show confirmation Pop-up Modal
                setPopupModal({
                    isOpen: true,
                    type: 'success',
                    category: 'template',
                    title: `🖼️ "${selectedCertType}" Template Uploaded & Synced!`,
                    message: `Template image "${file.name}" has been stored in Supabase Cloud Storage and cached locally.`,
                    details: [
                        `📁 File Name: ${file.name}`,
                        `📐 Dimensions: ${img.naturalWidth} × ${img.naturalHeight} px`,
                        `🏆 Certificate Tier: ${selectedCertType}`,
                        `☁️ Production Cloud Storage: ${cloudSynced ? 'Hosted on Supabase CDN storage. All organizers across all devices can see this template.' : 'Cached locally in IndexedDB & queued for cloud sync.'}`,
                        `💾 Local Cache: Instant load across browser refreshes.`
                    ],
                    extraNote: 'You can now drag-and-drop text placeholders directly on the preview and click "Save Coordinates & Template" when ready.'
                })

                showToast('success', `Template uploaded for "${selectedCertType}": Synced to Cloud & cached!`)
            }
            img.src = dataUrl
        }
        reader.readAsDataURL(file)
    }

    // Switch between certificate types (Participation, Winner 1, Winner 2, Winner 3, etc.)
    const handleSwitchCertType = async (newType: CertificateType) => {
        if (newType === selectedCertType) return

        // Cache current tier's template & layout
        const currentData: TierTemplateData = {
            imageDataUrl: templateImage ? templateImage.src : undefined,
            fileName: templateFileName,
            dimensions: templateDimensions,
            layout: layout
        }

        const updatedStore = {
            ...templateStore,
            [selectedCertType]: currentData
        }
        setTemplateStore(updatedStore)

        // Save current tier to IndexedDB if it has a custom image
        if (currentData.imageDataUrl) {
            saveTemplateToIndexedDb(selectedCertType, currentData)
        }

        // Switch active type
        setSelectedCertType(newType)

        // Restore target tier's data from store or IndexedDB
        let targetData = updatedStore[newType]
        if (!targetData || !targetData.imageDataUrl) {
            try {
                const idbStore = await loadAllTemplatesFromIndexedDb()
                if (idbStore[newType]) {
                    targetData = idbStore[newType]
                }
            } catch { }
        }

        if (targetData && targetData.imageDataUrl) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                setTemplateImage(img)
                setTemplateDimensions(targetData.dimensions || { width: img.naturalWidth, height: img.naturalHeight })
                setTemplateFileName(targetData.fileName || `${newType} Template`)
                if (targetData.layout) setLayout(targetData.layout)
                showToast('success', `Switched to ${newType}. Loaded custom template.`)
            }
            img.src = targetData.imageDataUrl
        } else {
            // Generate themed sample fallback template
            generateFallbackTemplate(newType)
            showToast('info', `Switched to ${newType}. You can upload your custom ${newType} template image anytime.`)
        }
    }

    // Create a fallback certificate template customized for the active tier
    const generateFallbackTemplate = (tier: CertificateType = selectedCertType) => {
        const canvas = document.createElement('canvas')
        canvas.width = 1920
        canvas.height = 1080
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const tierInfo = getTierInfo(tier)
        const accent = tierInfo.accentColor

        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080)
        bgGrad.addColorStop(0, '#0f172a')
        bgGrad.addColorStop(1, '#020617')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, 1920, 1080)

        // Borders
        ctx.strokeStyle = accent
        ctx.lineWidth = 14
        ctx.strokeRect(40, 40, 1840, 1000)

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.strokeRect(60, 60, 1800, 960)

        // Subtitle / Banner
        ctx.fillStyle = accent
        ctx.font = 'bold 28px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('GDG-KARE EVENT MANAGEMENT PLATFORM 2026', 960, 220)

        // Main Title
        ctx.fillStyle = '#f8fafc'
        ctx.font = 'bold 56px Inter, sans-serif'
        const matchWinner = tier.match(/Winner\s+(\d+)/i)
        if (matchWinner) {
            const rankNum = parseInt(matchWinner[1], 10)
            const ordinal = getOrdinal(rankNum)
            const icon = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '🏆'
            ctx.fillText(`${icon} CERTIFICATE OF EXCELLENCE - ${ordinal.toUpperCase()} PLACE`, 960, 300)
        } else if (tier.includes('Special')) {
            ctx.fillText('⭐ CERTIFICATE OF SPECIAL RECOGNITION', 960, 300)
        } else {
            ctx.fillText('CERTIFICATE OF PARTICIPATION', 960, 300)
        }

        ctx.fillStyle = '#94a3b8'
        ctx.font = 'italic 24px Inter, sans-serif'
        ctx.fillText('This certificate is proudly awarded to', 960, 480)

        // Placeholder line for name
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(560, 650)
        ctx.lineTo(1360, 650)
        ctx.stroke()

        // Placeholder QR box
        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2
        ctx.setLineDash([8, 8])
        ctx.strokeRect(1570, 840, 150, 150)
        ctx.setLineDash([])
        ctx.fillStyle = '#64748b'
        ctx.font = '14px sans-serif'
        ctx.fillText('QR Code Area', 1645, 920)

        const fallbackImg = new Image()
        fallbackImg.onload = () => {
            setTemplateImage(fallbackImg)
            setTemplateDimensions({ width: 1920, height: 1080 })
            setTemplateFileName(`Built-in ${tierInfo.shortName} Template`)
            showToast('info', `Loaded sample template for ${tierInfo.label}`)
        }
        fallbackImg.src = canvas.toDataURL('image/png')
    }

    // =========================================================================
    // 3. CANVAS PREVIEW & CLICK-TO-POSITION
    // =========================================================================

    const drawPreview = async () => {
        const canvas = previewCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = templateDimensions.width || 1920
        const height = templateDimensions.height || 1080

        canvas.width = width
        canvas.height = height

        // Draw Template Image
        if (templateImage) {
            ctx.drawImage(templateImage, 0, 0, width, height)
        } else {
            // Placeholder canvas background
            ctx.fillStyle = '#0f172a'
            ctx.fillRect(0, 0, width, height)
            ctx.strokeStyle = '#334155'
            ctx.lineWidth = 6
            ctx.strokeRect(30, 30, width - 60, height - 60)

            ctx.fillStyle = '#f8fafc'
            ctx.font = 'bold 50px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('UPLOAD CERTIFICATE TEMPLATE TO BEGIN', width / 2, height / 2 - 30)

            ctx.fillStyle = '#94a3b8'
            ctx.font = '24px Inter, sans-serif'
            ctx.fillText('Or click "Use Sample Template" to test layout', width / 2, height / 2 + 30)
        }
    }

    // Click on canvas to place active element
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!activeElementToPosition) return
        const canvas = previewCanvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        const clickX = Math.round((e.clientX - rect.left) * scaleX)
        const clickY = Math.round((e.clientY - rect.top) * scaleY)

        setLayout(prev => {
            const updated = { ...prev }
            if (activeElementToPosition === 'name') {
                updated.name = { ...updated.name, x: clickX, y: clickY }
            } else if (activeElementToPosition === 'regNo') {
                updated.regNo = { ...updated.regNo, x: clickX, y: clickY }
            } else if (activeElementToPosition === 'credit') {
                updated.credit = { ...DEFAULT_CREDIT_LAYOUT, ...(updated.credit || {}), x: clickX, y: clickY }
            } else if (activeElementToPosition === 'certId') {
                updated.certId = { ...updated.certId, x: clickX, y: clickY }
            } else if (activeElementToPosition === 'qrCode') {
                // center QR box on click point
                const half = Math.round(updated.qrCode.size / 2)
                updated.qrCode = { ...updated.qrCode, x: clickX - half, y: clickY - half }
            }
            return updated
        })

        showToast('info', `Placed ${activeElementToPosition} at X: ${clickX}, Y: ${clickY}`)
        setActiveElementToPosition(null)
    }

    const saveLayoutConfig = async () => {
        setSavingTemplate(true)
        try {
            localStorage.setItem('hackare_cert_layout', JSON.stringify(layout))

            // Update the active tier template in IndexedDB and Cloud
            const currentTierData = templateStore[selectedCertType] || {
                fileName: `${selectedCertType} Template`,
                dimensions: templateDimensions,
                layout: layout,
                imageDataUrl: templateImage?.src
            }
            const updatedTierData: TierTemplateData = {
                ...currentTierData,
                layout: layout
            }
            setTemplateStore(prev => ({ ...prev, [selectedCertType]: updatedTierData }))
            await saveTemplateToIndexedDb(selectedCertType, updatedTierData)

            // Save coordinates to Supabase Cloud database so ALL organizers in production see them
            let cloudSynced = false
            try {
                const cloudRes = await fetch('/api/organizer/certificate-templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tier: selectedCertType,
                        fileName: updatedTierData.fileName,
                        imageDataUrl: updatedTierData.imageDataUrl || '',
                        dimensions: updatedTierData.dimensions,
                        layout: layout
                    })
                })
                const cloudJson = await cloudRes.json()
                if (cloudJson.success) {
                    cloudSynced = true
                    if (cloudJson.template?.image_data_url) {
                        updatedTierData.imageDataUrl = cloudJson.template.image_data_url
                        await saveTemplateToIndexedDb(selectedCertType, updatedTierData)
                    }
                }
            } catch (cloudErr) {
                console.warn('Cloud sync error for layout coordinates:', cloudErr)
            }

            // Pop-up confirmation message for template saving
            setPopupModal({
                isOpen: true,
                type: 'success',
                category: 'template',
                title: `🎨 Coordinates Saved & Synced to Cloud!`,
                message: `Layout coordinates, typography, and template configuration for "${selectedCertType}" have been saved to Supabase Cloud.`,
                details: [
                    `👤 Participant Name: X: ${layout.name.x}, Y: ${layout.name.y} (${layout.name.fontSize}px, align: ${layout.name.align}, color: ${layout.name.color})`,
                    `🆔 Registration No: X: ${layout.regNo.x}, Y: ${layout.regNo.y} (${layout.regNo.fontSize}px, prefix: "${layout.regNo.prefix}")`,
                    `🔖 Certificate ID: X: ${layout.certId.x}, Y: ${layout.certId.y} (${layout.certId.fontSize}px, prefix: "${layout.certId.prefix}")`,
                    `📱 Scannable QR Code: X: ${layout.qrCode.x}, Y: ${layout.qrCode.y} (Size: ${layout.qrCode.size}px)`,
                    `🎓 Academic Credit / Track: ${(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? `X: ${layout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x}, Y: ${layout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y} ("${layout.credit?.text2ndYear || 'Non CGPA - Group 3'}" / "${layout.credit?.text3rd4thYear || '2 EE credit'}")` : 'Removed / Hidden'}`,
                    `☁️ Production Cloud Sync: ${cloudSynced ? 'Saved in Supabase Cloud database. All organizers on production/other devices will see these coordinates!' : 'Cached locally & queued for cloud sync.'}`,
                    `👥 Multi-Organizer Support: Other organizers opening this event will automatically inherit these calibrated coordinates.`
                ],
                extraNote: 'Any certificates generated will now precisely align with these calibrated coordinates across all devices.'
            })

            showToast('success', 'Layout coordinates saved & synced with Supabase cloud!')
        } catch (err: any) {
            console.error('Error saving template layout:', err)
            setPopupModal({
                isOpen: true,
                type: 'error',
                category: 'template',
                title: '❌ Failed to Save Template Coordinates',
                message: err.message || 'An error occurred while saving the template layout.',
                details: ['Please try again or check browser storage settings.']
            })
            showToast('error', 'Failed to save layout')
        } finally {
            setSavingTemplate(false)
        }
    }



    // Cryptographically sign certificate payloads for tamper-proof QR codes
    const requestCertificateTokens = async (items: Array<{
        id: string
        name: string
        reg_no: string
        dept?: string
        section?: string
        year?: string
        category?: string
        team_name?: string
        type: string
        event_name?: string
        issue_date?: string
    }>): Promise<string[]> => {
        if (!items || items.length === 0) return []
        try {
            const batchSize = 500
            const allTokens: string[] = []
            for (let i = 0; i < items.length; i += batchSize) {
                const chunk = items.slice(i, i + batchSize)
                const res = await fetch('/api/organizer/sign-certificates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ certificates: chunk })
                })
                if (!res.ok) {
                    console.error('Sign certificates failed:', await res.text())
                    return []
                }
                const data = await res.json()
                if (Array.isArray(data.tokens)) {
                    allTokens.push(...data.tokens)
                }
            }
            return allTokens
        } catch (err) {
            console.error('Error requesting certificate tokens:', err)
            return []
        }
    }

    // =========================================================================
    // 4. BATCH GENERATION & EXPORT
    // =========================================================================

    const generateAllCertificates = async () => {
        const selected = participants.filter(p => p.selected)
        if (selected.length === 0) {
            showToast('error', 'Please select at least one participant to generate certificates.')
            return
        }

        if (!templateImage) {
            showToast('error', 'Please upload a certificate template image first (or use sample template).')
            return
        }

        setGenerating(true)
        setProgress({ current: 0, total: selected.length, message: 'Cryptographically signing certificates...' })

        const width = templateDimensions.width || 1920
        const height = templateDimensions.height || 1080
        const offscreenCanvas = document.createElement('canvas')
        offscreenCanvas.width = width
        offscreenCanvas.height = height
        const ctx = offscreenCanvas.getContext('2d')

        if (!ctx) {
            showToast('error', 'HTML5 Canvas is not supported on this browser.')
            setGenerating(false)
            return
        }

        const results: { participant: ParticipantRecord; certCode: string; canvasDataUrl: string; tier: string }[] = []
        const certificatesToPersist: any[] = []

        try {
            const signingItems = selected.map(p => {
                const certCode = getExistingOrNewCertCode(p, selectedCertType)
                return {
                    certCode,
                    item: {
                        id: certCode,
                        name: p.name,
                        reg_no: p.reg_no,
                        dept: p.dept,
                        section: p.section,
                        year: p.year,
                        category: p.category,
                        team_name: p.team_name,
                        type: selectedCertType,
                        event_name: activeEventName,
                        issue_date: new Date().toISOString()
                    }
                }
            })

            const tokens = await requestCertificateTokens(signingItems.map(s => s.item))

            for (let i = 0; i < selected.length; i++) {
                const p = selected[i]
                const certCode = signingItems[i].certCode
                const token = tokens[i]

                setProgress({
                    current: i + 1,
                    total: selected.length,
                    message: `Generating certificate for ${p.name} (${p.reg_no})...`
                })

                // Tamper-proof Verification URL
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                const verifyUrl = token
                    ? `${origin}/verify-certificate?token=${encodeURIComponent(token)}`
                    : `${origin}/verify-certificate?id=${certCode}`

                // 1. Draw Template
                ctx.clearRect(0, 0, width, height)
                ctx.drawImage(templateImage, 0, 0, width, height)

                // 2. Draw Name
                if (layout.name.enabled !== false) {
                    ctx.font = `${layout.name.fontWeight} ${layout.name.fontSize}px ${layout.name.fontFamily}`
                    ctx.fillStyle = layout.name.color
                    ctx.textAlign = layout.name.align
                    ctx.fillText(p.name, layout.name.x, layout.name.y)
                }

                // 3. Draw Reg No
                if (layout.regNo.enabled !== false) {
                    ctx.font = `${layout.regNo.fontWeight} ${layout.regNo.fontSize}px ${layout.regNo.fontFamily}`
                    ctx.fillStyle = layout.regNo.color
                    ctx.textAlign = 'center'
                    ctx.fillText(`${layout.regNo.prefix}${p.reg_no}`, layout.regNo.x, layout.regNo.y)
                }

                // 3.5 Draw Academic Credit / Category Text
                const creditLayout = { ...DEFAULT_CREDIT_LAYOUT, ...(layout.credit || {}) }
                if (creditLayout.enabled !== false) {
                    const creditText = getParticipantCreditText(p, creditLayout)
                    if (creditText) {
                        ctx.font = `${creditLayout.fontWeight} ${creditLayout.fontSize}px ${creditLayout.fontFamily}`
                        ctx.fillStyle = creditLayout.color
                        ctx.textAlign = creditLayout.align
                        ctx.fillText(creditText, creditLayout.x, creditLayout.y)
                    }
                }

                // 4. Draw Unique Cert ID
                if (layout.certId.enabled !== false) {
                    ctx.font = `${layout.certId.fontWeight} ${layout.certId.fontSize}px ${layout.certId.fontFamily}`
                    ctx.fillStyle = layout.certId.color
                    ctx.textAlign = 'center'
                    ctx.fillText(`${layout.certId.prefix}${certCode}`, layout.certId.x, layout.certId.y)
                }

                // 5. Draw QR Code
                if (layout.qrCode.enabled !== false) {
                    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                        width: layout.qrCode.size,
                        margin: 1,
                        color: {
                            dark: layout.qrCode.darkColor || '#000000',
                            light: layout.qrCode.lightColor || '#ffffff'
                        }
                    })

                    await new Promise<void>((resolve) => {
                        const qrImg = new Image()
                        qrImg.onload = () => {
                            ctx.drawImage(qrImg, layout.qrCode.x, layout.qrCode.y, layout.qrCode.size, layout.qrCode.size)
                            resolve()
                        }
                        qrImg.onerror = () => resolve()
                        qrImg.src = qrDataUrl
                    })
                }

                const dataUrl = offscreenCanvas.toDataURL('image/png', 0.95)
                results.push({
                    participant: p,
                    certCode: certCode,
                    canvasDataUrl: dataUrl,
                    tier: selectedCertType
                })

                const matchWinner = selectedCertType.match(/Winner\s+(\d+)/i)
                certificatesToPersist.push({
                    certificate_code: certCode,
                    user_id: p.id.startsWith('excel_') ? null : p.id,
                    name: p.name,
                    reg_no: p.reg_no,
                    dept: p.dept,
                    section: p.section,
                    year: p.year,
                    team_name: p.team_name,
                    category: p.category,
                    template_name: selectedCertType,
                    award_tier: selectedCertType,
                    event_name: activeEventName,
                    winner_rank: matchWinner ? parseInt(matchWinner[1], 10) : null
                })
            }

            setGeneratedResults(results)

            // Save to DB via API (ONLY for DB participants, NEVER for Excel!)
            if (dataSource === 'db') {
                try {
                    setProgress(prev => ({ ...prev, message: 'Syncing records to registry database...' }))
                    await fetch('/api/organizer/certificates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ certificates: certificatesToPersist })
                    })
                    fetchIssuedCertificates()
                } catch (saveErr) {
                    console.warn('Could not auto-save to DB:', saveErr)
                }
            }

            showToast('success', `Generated ${results.length} certificates with Unique IDs and scannable QR codes!`)
        } catch (err: any) {
            console.error('Batch generation failed:', err)
            showToast('error', 'Batch generation error: ' + (err.message || 'Unknown error'))
        } finally {
            setGenerating(false)
        }
    }

    // Helper to get or generate an HTMLImageElement and layout for a specific tier
    const getOrLoadTierTemplateImage = async (tier: string): Promise<{ img: HTMLImageElement; width: number; height: number; layout: LayoutConfig }> => {
        const stored = templateStore[tier]
        if (stored && stored.imageDataUrl) {
            const storedUrl = stored.imageDataUrl
            return new Promise((resolve) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    resolve({
                        img,
                        width: stored.dimensions?.width || img.naturalWidth || 1920,
                        height: stored.dimensions?.height || img.naturalHeight || 1080,
                        layout: stored.layout || layout
                    })
                }
                img.src = storedUrl
            })
        }

        // If active canvas image matches the requested tier, use it
        if (selectedCertType === tier && templateImage) {
            return {
                img: templateImage,
                width: templateDimensions.width || 1920,
                height: templateDimensions.height || 1080,
                layout: layout
            }
        }

        // Otherwise generate synthetic canvas for this tier
        const canvas = document.createElement('canvas')
        canvas.width = 1920
        canvas.height = 1080
        const ctx = canvas.getContext('2d')!
        const tierInfo = getTierInfo(tier)
        const accent = tierInfo.accentColor

        const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080)
        bgGrad.addColorStop(0, '#0f172a')
        bgGrad.addColorStop(1, '#020617')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, 1920, 1080)

        ctx.strokeStyle = accent
        ctx.lineWidth = 14
        ctx.strokeRect(40, 40, 1840, 1000)

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.strokeRect(60, 60, 1800, 960)

        ctx.fillStyle = accent
        ctx.font = 'bold 28px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('GDG-KARE EVENT MANAGEMENT PLATFORM 2026', 960, 220)

        ctx.fillStyle = '#f8fafc'
        ctx.font = 'bold 56px Inter, sans-serif'
        const matchWinner = tier.match(/Winner\s+(\d+)/i)
        if (matchWinner) {
            const rankNum = parseInt(matchWinner[1], 10)
            const ordinal = getOrdinal(rankNum)
            const icon = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : '🏆'
            ctx.fillText(`${icon} CERTIFICATE OF EXCELLENCE - ${ordinal.toUpperCase()} PLACE`, 960, 300)
        } else if (tier.includes('Special')) {
            ctx.fillText('⭐ CERTIFICATE OF SPECIAL RECOGNITION', 960, 300)
        } else {
            ctx.fillText('CERTIFICATE OF PARTICIPATION', 960, 300)
        }

        ctx.fillStyle = '#94a3b8'
        ctx.font = 'italic 24px Inter, sans-serif'
        ctx.fillText('This certificate is proudly awarded to', 960, 480)

        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(560, 650)
        ctx.lineTo(1360, 650)
        ctx.stroke()

        const dataUrl = canvas.toDataURL('image/png')
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                resolve({
                    img,
                    width: 1920,
                    height: 1080,
                    layout: layout
                })
            }
            img.src = dataUrl
        })
    }

    // Smart Multi-Tier Batch Generation (Generates all selected participants including Not Eligible with their assigned winner/participation template)
    const generateSmartAllCertificates = async () => {
        const targets = participants.filter(p => p.selected)
        if (targets.length === 0) {
            showToast('error', 'No selected participants for full-event generation.')
            return
        }

        setGenerating(true)
        setProgress({ current: 0, total: targets.length, message: 'Preparing multi-tier certificate templates...' })

        try {
            // Find unique tiers needed among targets
            const neededTiers = new Set<string>()
            targets.forEach(p => neededTiers.add(getParticipantAwardTier(p)))

            // Preload tier assets
            const tierAssets = new Map<string, { img: HTMLImageElement; width: number; height: number; layout: LayoutConfig }>()
            for (const t of Array.from(neededTiers)) {
                tierAssets.set(t, await getOrLoadTierTemplateImage(t))
            }

            // Cryptographically sign tokens for all participants
            setProgress({ current: 0, total: targets.length, message: 'Signing cryptographic verification tokens...' })
            const signingItems = targets.map(p => {
                const tierId = getParticipantAwardTier(p)
                const certCode = getExistingOrNewCertCode(p, tierId)
                return {
                    certCode,
                    tierId,
                    item: {
                        id: certCode,
                        name: p.name,
                        reg_no: p.reg_no,
                        dept: p.dept,
                        section: p.section,
                        year: p.year,
                        category: p.category,
                        team_name: p.team_name,
                        type: tierId,
                        event_name: activeEventName,
                        issue_date: new Date().toISOString()
                    }
                }
            })

            const tokens = await requestCertificateTokens(signingItems.map(s => s.item))

            const results: { participant: ParticipantRecord; certCode: string; canvasDataUrl: string; tier: string }[] = []
            const certificatesToPersist: any[] = []

            const offscreenCanvas = document.createElement('canvas')
            const ctx = offscreenCanvas.getContext('2d')
            if (!ctx) throw new Error('Could not create canvas context.')

            for (let i = 0; i < targets.length; i++) {
                const p = targets[i]
                const tierId = signingItems[i].tierId
                const certCode = signingItems[i].certCode
                const token = tokens[i]
                const asset = tierAssets.get(tierId)!
                const tLayout = asset.layout

                offscreenCanvas.width = asset.width
                offscreenCanvas.height = asset.height

                // Yield to browser event loop every certificate to prevent freezing
                await sleep(3)

                setProgress({
                    current: i + 1,
                    total: targets.length,
                    message: `Generating ${tierId} for ${p.name} (${i + 1}/${targets.length})...`
                })

                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                const verifyUrl = token
                    ? `${origin}/verify-certificate?token=${encodeURIComponent(token)}`
                    : `${origin}/verify-certificate?id=${certCode}`

                // 1. Template
                ctx.clearRect(0, 0, asset.width, asset.height)
                ctx.drawImage(asset.img, 0, 0, asset.width, asset.height)

                // 2. Name with smart dynamic auto-fitting
                if (tLayout.name.enabled !== false) {
                    let actualNameFontSize = tLayout.name.fontSize
                    ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
                    const maxAllowedNameWidth = tLayout.name.maxWidth || (asset.width > 3000 ? 3800 : Math.round(asset.width * 0.55))
                    const measuredNameWidth = ctx.measureText(p.name).width
                    if (measuredNameWidth > maxAllowedNameWidth && maxAllowedNameWidth > 0) {
                        const scaleFactor = maxAllowedNameWidth / measuredNameWidth
                        actualNameFontSize = Math.max(30, Math.floor(actualNameFontSize * scaleFactor))
                        ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
                    }
                    ctx.fillStyle = tLayout.name.color
                    ctx.textAlign = tLayout.name.align
                    ctx.fillText(p.name, tLayout.name.x, tLayout.name.y)
                }

                // 3. Reg No
                if (tLayout.regNo.enabled !== false) {
                    ctx.font = `${tLayout.regNo.fontWeight} ${tLayout.regNo.fontSize}px ${tLayout.regNo.fontFamily}`
                    ctx.fillStyle = tLayout.regNo.color
                    ctx.textAlign = 'center'
                    ctx.fillText(`${tLayout.regNo.prefix}${p.reg_no}`, tLayout.regNo.x, tLayout.regNo.y)
                }

                // 3.5 Academic Credit / Category Text
                const creditLayout = { ...DEFAULT_CREDIT_LAYOUT, ...(tLayout.credit || {}) }
                if (creditLayout.enabled !== false) {
                    const creditText = getParticipantCreditText(p, creditLayout)
                    if (creditText) {
                        ctx.font = `${creditLayout.fontWeight} ${creditLayout.fontSize}px ${creditLayout.fontFamily}`
                        ctx.fillStyle = creditLayout.color
                        ctx.textAlign = creditLayout.align
                        ctx.fillText(creditText, creditLayout.x, creditLayout.y)
                    }
                }

                // 4. Cert ID
                if (tLayout.certId.enabled !== false) {
                    ctx.font = `${tLayout.certId.fontWeight} ${tLayout.certId.fontSize}px ${tLayout.certId.fontFamily}`
                    ctx.fillStyle = tLayout.certId.color
                    ctx.textAlign = 'center'
                    ctx.fillText(`${tLayout.certId.prefix}${certCode}`, tLayout.certId.x, tLayout.certId.y)
                }

                // 5. QR Code - DIRECT TO CANVAS (Super-fast, no base64 string, no image onload!)
                if (tLayout.qrCode.enabled !== false) {
                    const qrCanvas = document.createElement('canvas')
                    await QRCode.toCanvas(qrCanvas, verifyUrl, {
                        width: tLayout.qrCode.size,
                        margin: 1,
                        color: {
                            dark: tLayout.qrCode.darkColor || '#000000',
                            light: tLayout.qrCode.lightColor || '#ffffff'
                        }
                    })
                    ctx.drawImage(qrCanvas, tLayout.qrCode.x, tLayout.qrCode.y, tLayout.qrCode.size, tLayout.qrCode.size)
                }

                // Lightweight JPEG dataURL for instant state storage without RAM bloat
                const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.88)
                results.push({
                    participant: p,
                    certCode: certCode,
                    canvasDataUrl: dataUrl,
                    tier: tierId
                })

                const matchWinner = tierId.match(/Winner\s+(\d+)/i)
                certificatesToPersist.push({
                    certificate_code: certCode,
                    user_id: p.id.startsWith('excel_') ? null : p.id,
                    name: p.name,
                    reg_no: p.reg_no,
                    dept: p.dept,
                    section: p.section,
                    year: p.year,
                    team_name: p.team_name,
                    category: p.category,
                    template_name: tierId,
                    award_tier: tierId,
                    event_name: activeEventName,
                    winner_rank: matchWinner ? parseInt(matchWinner[1], 10) : null
                })
            }

            setGeneratedResults(results)

            // Save to DB via API (ONLY for DB participants, NEVER for Excel!)
            if (dataSource === 'db') {
                try {
                    setProgress(prev => ({ ...prev, message: 'Syncing all records to registry database...' }))
                    await fetch('/api/organizer/certificates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ certificates: certificatesToPersist })
                    })
                    fetchIssuedCertificates()
                } catch (saveErr) {
                    console.warn('Could not auto-save to DB:', saveErr)
                }
            }

            showToast('success', `Generated ${results.length} multi-tier certificates!`)
        } catch (err: any) {
            console.error('Smart batch generation failed:', err)
            showToast('error', 'Generation error: ' + (err.message || 'Unknown error'))
        } finally {
            setGenerating(false)
        }
    }

    // Download Single Certificate as PNG
    const downloadSingle = async (res: { participant: ParticipantRecord; certCode: string; canvasDataUrl: string; tier?: string }) => {
        try {
            const cleanName = (res.participant.name || 'Participant').replace(/[^a-zA-Z0-9]/g, '_')
            const cleanReg = (res.participant.reg_no || 'CERT').replace(/[^a-zA-Z0-9]/g, '_')
            const certTier = res.tier || selectedCertType
            const cleanTier = certTier.replace(/[^a-zA-Z0-9]/g, '_')

            if (!res.canvasDataUrl || !res.canvasDataUrl.startsWith('data:image')) {
                showToast('error', 'Certificate image is missing or invalid. Please re-generate.')
                return
            }

            const blob = dataUrlToBlob(res.canvasDataUrl)
            triggerFileDownload(blob, `Certificate_${cleanTier}_${cleanReg}_${cleanName}.png`)
            showToast('success', `Downloaded PNG certificate for ${res.participant.name}`)
        } catch (err: any) {
            console.error('Download single PNG failed:', err)
            showToast('error', `Download error: ${err.message || 'Unknown error'}`)
        }
    }

    // Download All as ZIP (PNG)
    const downloadAllZipPng = async () => {
        if (generatedResults.length === 0) {
            showToast('error', 'Please generate certificates first.')
            return
        }

        try {
            const zip = new JSZip()
            showToast('info', `Packaging ${generatedResults.length} PNG certificates into ZIP archive...`)

            for (let i = 0; i < generatedResults.length; i++) {
                const item = generatedResults[i]
                const cleanName = (item.participant.name || 'Participant').replace(/[^a-zA-Z0-9]/g, '_')
                const cleanReg = (item.participant.reg_no || `P${i + 1}`).replace(/[^a-zA-Z0-9]/g, '_')
                const itemTier = item.tier || selectedCertType
                const cleanTier = itemTier.replace(/[^a-zA-Z0-9]/g, '_')

                const blob = dataUrlToBlob(item.canvasDataUrl)
                zip.file(`Certificate_${cleanTier}_${cleanReg}_${cleanName}.png`, blob)
            }

            const content = await zip.generateAsync({ type: 'blob' })
            triggerFileDownload(content, `GDG_KARE_Certificates_PNG_${new Date().toISOString().slice(0, 10)}.zip`)
            showToast('success', `Exported ${generatedResults.length} PNG certificates in ZIP archive!`)
        } catch (err: any) {
            console.error('PNG ZIP export failed:', err)
            showToast('error', `PNG ZIP export error: ${err.message || 'Unknown error'}`)
        }
    }

    // Helper to generate a rendered certificate canvas DataURL on-the-fly (super-fast direct QR painting)
    const renderSingleCertificateDataUrl = async (
        participant: ParticipantRecord,
        tierId: string,
        format: 'png' | 'jpeg' = 'jpeg',
        quality = 0.88,
        customLayout?: LayoutConfig,
        customCertCode?: string,
        token?: string
    ): Promise<string> => {
        const asset = await getOrLoadTierTemplateImage(tierId)
        const tLayout = customLayout || asset.layout

        const canvas = document.createElement('canvas')
        canvas.width = asset.width
        canvas.height = asset.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not create canvas context')

        const certCode = customCertCode || getExistingOrNewCertCode(participant, tierId)

        let certToken = token
        if (!certToken) {
            const tokens = await requestCertificateTokens([{
                id: certCode,
                name: participant.name,
                reg_no: participant.reg_no,
                dept: participant.dept,
                section: participant.section,
                year: participant.year,
                category: participant.category,
                team_name: participant.team_name,
                type: tierId,
                issue_date: new Date().toISOString()
            }])
            if (tokens.length > 0) certToken = tokens[0]
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const verifyUrl = certToken
            ? `${origin}/verify-certificate?token=${encodeURIComponent(certToken)}`
            : `${origin}/verify-certificate?id=${certCode}`

        // 1. Template Image
        ctx.clearRect(0, 0, asset.width, asset.height)
        ctx.drawImage(asset.img, 0, 0, asset.width, asset.height)

        // 2. Name with smart dynamic auto-fitting to prevent overflowing placeholder lines
        if (tLayout.name.enabled !== false) {
            let actualNameFontSize = tLayout.name.fontSize
            ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
            const maxAllowedNameWidth = tLayout.name.maxWidth || (asset.width > 3000 ? 3800 : Math.round(asset.width * 0.55))
            const measuredNameWidth = ctx.measureText(participant.name).width
            if (measuredNameWidth > maxAllowedNameWidth && maxAllowedNameWidth > 0) {
                const scaleFactor = maxAllowedNameWidth / measuredNameWidth
                actualNameFontSize = Math.max(30, Math.floor(actualNameFontSize * scaleFactor))
                ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
            }
            ctx.fillStyle = tLayout.name.color
            ctx.textAlign = tLayout.name.align
            ctx.fillText(participant.name, tLayout.name.x, tLayout.name.y)
        }

        // 3. Reg No
        if (tLayout.regNo.enabled !== false) {
            ctx.font = `${tLayout.regNo.fontWeight} ${tLayout.regNo.fontSize}px ${tLayout.regNo.fontFamily}`
            ctx.fillStyle = tLayout.regNo.color
            ctx.textAlign = 'center'
            ctx.fillText(`${tLayout.regNo.prefix}${participant.reg_no}`, tLayout.regNo.x, tLayout.regNo.y)
        }

        // 3.5 Academic Credit / Category Text
        const creditLayoutDataUrl = { ...DEFAULT_CREDIT_LAYOUT, ...(tLayout.credit || {}) }
        if (creditLayoutDataUrl.enabled !== false) {
            const creditTextDataUrl = getParticipantCreditText(participant, creditLayoutDataUrl)
            if (creditTextDataUrl) {
                ctx.font = `${creditLayoutDataUrl.fontWeight} ${creditLayoutDataUrl.fontSize}px ${creditLayoutDataUrl.fontFamily}`
                ctx.fillStyle = creditLayoutDataUrl.color
                ctx.textAlign = creditLayoutDataUrl.align
                ctx.fillText(creditTextDataUrl, creditLayoutDataUrl.x, creditLayoutDataUrl.y)
            }
        }

        // 4. Cert ID
        if (tLayout.certId.enabled !== false) {
            ctx.font = `${tLayout.certId.fontWeight} ${tLayout.certId.fontSize}px ${tLayout.certId.fontFamily}`
            ctx.fillStyle = tLayout.certId.color
            ctx.textAlign = 'center'
            ctx.fillText(`${tLayout.certId.prefix}${certCode}`, tLayout.certId.x, tLayout.certId.y)
        }

        // 5. QR Code directly via QRCode.toCanvas (No slow base64 Image onload delays!)
        if (tLayout.qrCode.enabled !== false) {
            const qrCanvas = document.createElement('canvas')
            await QRCode.toCanvas(qrCanvas, verifyUrl, {
                width: tLayout.qrCode.size,
                margin: 1,
                color: {
                    dark: tLayout.qrCode.darkColor || '#000000',
                    light: tLayout.qrCode.lightColor || '#ffffff'
                }
            })
            ctx.drawImage(qrCanvas, tLayout.qrCode.x, tLayout.qrCode.y, tLayout.qrCode.size, tLayout.qrCode.size)
        }

        const mime = format === 'png' ? 'image/png' : 'image/jpeg'
        return canvas.toDataURL(mime, quality)
    }

    // Helper to generate a rendered certificate canvas directly to native Blob
    const renderSingleCertificateBlob = async (
        participant: ParticipantRecord,
        tierId: string,
        format: 'png' | 'jpeg' = 'png',
        quality = 0.95,
        customLayout?: LayoutConfig,
        customCertCode?: string,
        token?: string
    ): Promise<{ blob: Blob; width: number; height: number; certCode: string }> => {
        const asset = await getOrLoadTierTemplateImage(tierId)
        const tLayout = customLayout || asset.layout

        const canvas = document.createElement('canvas')
        canvas.width = asset.width
        canvas.height = asset.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not create canvas context')

        const certCode = customCertCode || getExistingOrNewCertCode(participant, tierId)

        let certToken = token
        if (!certToken) {
            const tokens = await requestCertificateTokens([{
                id: certCode,
                name: participant.name,
                reg_no: participant.reg_no,
                dept: participant.dept,
                section: participant.section,
                year: participant.year,
                category: participant.category,
                team_name: participant.team_name,
                type: tierId,
                issue_date: new Date().toISOString()
            }])
            if (tokens.length > 0) certToken = tokens[0]
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const verifyUrl = certToken
            ? `${origin}/verify-certificate?token=${encodeURIComponent(certToken)}`
            : `${origin}/verify-certificate?id=${certCode}`

        // Draw Template
        ctx.drawImage(asset.img, 0, 0, asset.width, asset.height)

        // Name with smart dynamic auto-fitting
        if (tLayout.name.enabled !== false) {
            let actualNameFontSize = tLayout.name.fontSize
            ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
            const maxAllowedNameWidth = tLayout.name.maxWidth || (asset.width > 3000 ? 3800 : Math.round(asset.width * 0.55))
            const measuredNameWidth = ctx.measureText(participant.name).width
            if (measuredNameWidth > maxAllowedNameWidth && maxAllowedNameWidth > 0) {
                const scaleFactor = maxAllowedNameWidth / measuredNameWidth
                actualNameFontSize = Math.max(30, Math.floor(actualNameFontSize * scaleFactor))
                ctx.font = `${tLayout.name.fontWeight} ${actualNameFontSize}px ${tLayout.name.fontFamily}`
            }
            ctx.fillStyle = tLayout.name.color
            ctx.textAlign = tLayout.name.align
            ctx.fillText(participant.name, tLayout.name.x, tLayout.name.y)
        }

        // Reg No
        if (tLayout.regNo.enabled !== false) {
            ctx.font = `${tLayout.regNo.fontWeight} ${tLayout.regNo.fontSize}px ${tLayout.regNo.fontFamily}`
            ctx.fillStyle = tLayout.regNo.color
            ctx.textAlign = 'center'
            ctx.fillText(`${tLayout.regNo.prefix}${participant.reg_no}`, tLayout.regNo.x, tLayout.regNo.y)
        }

        // Academic Credit / Category Text
        const creditLayoutBlob = { ...DEFAULT_CREDIT_LAYOUT, ...(tLayout.credit || {}) }
        if (creditLayoutBlob.enabled !== false) {
            const creditTextBlob = getParticipantCreditText(participant, creditLayoutBlob)
            if (creditTextBlob) {
                ctx.font = `${creditLayoutBlob.fontWeight} ${creditLayoutBlob.fontSize}px ${creditLayoutBlob.fontFamily}`
                ctx.fillStyle = creditLayoutBlob.color
                ctx.textAlign = creditLayoutBlob.align
                ctx.fillText(creditTextBlob, creditLayoutBlob.x, creditLayoutBlob.y)
            }
        }

        // Cert ID
        if (tLayout.certId.enabled !== false) {
            ctx.font = `${tLayout.certId.fontWeight} ${tLayout.certId.fontSize}px ${tLayout.certId.fontFamily}`
            ctx.fillStyle = tLayout.certId.color
            ctx.textAlign = 'center'
            ctx.fillText(`${tLayout.certId.prefix}${certCode}`, tLayout.certId.x, tLayout.certId.y)
        }

        // QR Code
        if (tLayout.qrCode.enabled !== false) {
            const qrCanvas = document.createElement('canvas')
            await QRCode.toCanvas(qrCanvas, verifyUrl, {
                width: tLayout.qrCode.size,
                margin: 1,
                color: {
                    dark: tLayout.qrCode.darkColor || '#000000',
                    light: tLayout.qrCode.lightColor || '#ffffff'
                }
            })
            ctx.drawImage(qrCanvas, tLayout.qrCode.x, tLayout.qrCode.y, tLayout.qrCode.size, tLayout.qrCode.size)
        }

        const mime = format === 'png' ? 'image/png' : 'image/jpeg'
        const blob = await canvasToBlob(canvas, mime, quality)
        return { blob, width: asset.width, height: asset.height, certCode }
    }

    // Open Interactive Category Certificate Preview Modal
    const openCategoryPreview = async (categoryId: string, studentIdx = 0) => {
        const cat = downloadCategories.find(c => c.id === categoryId) || downloadCategories[0]
        if (!cat) return

        setSelectedDownloadCategoryId(cat.id)

        const allParticipants = participants
        let targets: ParticipantRecord[] = []

        if (cat.id === 'all') {
            targets = allParticipants
        } else if (cat.id === 'participation') {
            targets = allParticipants.filter(p => getParticipantAwardTier(p) === 'Participation')
        } else if (cat.id.startsWith('winner_')) {
            const rank = parseInt(cat.id.replace('winner_', ''), 10)
            const team = (winningTeams[rank - 1] || '').trim().toLowerCase()
            targets = allParticipants.filter(p => p.team_name && p.team_name.trim().toLowerCase() === team)
        }

        const validIndex = targets.length > 0 ? Math.max(0, Math.min(targets.length - 1, studentIdx)) : 0
        const currentStudent: ParticipantRecord = targets[validIndex] || {
            id: 'sample_prev',
            name: cat.id.startsWith('winner_') ? 'Alex Johnson (Sample Winner)' : 'Alex Johnson',
            reg_no: '21BCE1092',
            dept: 'Computer Science',
            section: 'A',
            year: '2nd Year',
            team_name: cat.teamName && cat.teamName !== 'Unassigned' ? cat.teamName : 'Team Alpha',
            category: 'Group 3',
            selected: true
        }

        // Dynamic tier resolution: in "All Categories (Combined)", each student receives their assigned award tier
        const studentTier = getParticipantAwardTier(currentStudent)
        const tierId = cat.id === 'all' ? studentTier : cat.tierId

        // Retrieve calibrated layout for this tier to initialize live tuner
        const tierLayout = templateStore[tierId]?.layout || layout || DEFAULT_LAYOUT
        setPreviewLayout(tierLayout)
        setPreviewTunerSavedSuccess(false)
        setGeneratingPreview(true)

        try {
            const certCode = getExistingOrNewCertCode(currentStudent, tierId)

            const tokens = await requestCertificateTokens([{
                id: certCode,
                name: currentStudent.name,
                reg_no: currentStudent.reg_no,
                dept: currentStudent.dept,
                section: currentStudent.section,
                year: currentStudent.year,
                category: currentStudent.category,
                team_name: currentStudent.team_name,
                type: tierId,
                event_name: activeEventName,
                issue_date: new Date().toISOString()
            }])
            const token = tokens[0] || ''

            const dataUrl = await renderSingleCertificateDataUrl(currentStudent, tierId, 'png', 0.95, tierLayout, certCode, token)

            setPreviewModal({
                isOpen: true,
                category: cat,
                previewParticipant: currentStudent,
                canvasDataUrl: dataUrl,
                sampleIndex: validIndex,
                totalStudents: targets.length,
                studentsList: targets,
                activeTier: tierId,
                certCode,
                token
            })
        } catch (err: any) {
            console.error('Failed to generate category preview:', err)
            showToast('error', `Preview generation error: ${err.message || 'Unknown error'}`)
        } finally {
            setGeneratingPreview(false)
        }
    }

    // Real-time live coordinate & font tuner update from Preview Modal
    const handleUpdatePreviewLayout = async (updater: (prev: LayoutConfig) => LayoutConfig) => {
        if (!previewModal) return
        const activeTier = previewModal.activeTier || getParticipantAwardTier(previewModal.previewParticipant)
        const newLayout = updater(previewLayout)
        setPreviewLayout(newLayout)
        setPreviewTunerSavedSuccess(false)

        try {
            const newUrl = await renderSingleCertificateDataUrl(
                previewModal.previewParticipant,
                activeTier,
                'png',
                0.95,
                newLayout,
                previewModal.certCode,
                previewModal.token
            )
            setPreviewModal(prev => prev ? ({ ...prev, canvasDataUrl: newUrl }) : null)
        } catch (err) {
            console.warn('Live preview re-render failed:', err)
        }
    }

    // Save tuned coordinates and font size directly from Preview Modal to Supabase Cloud DB
    const handleSavePreviewLayout = async () => {
        if (!previewModal) return
        const activeTier = previewModal.activeTier || getParticipantAwardTier(previewModal.previewParticipant)
        setSavingPreviewTuner(true)

        try {
            const currentTierData = templateStore[activeTier] || {
                fileName: `${activeTier} Template`,
                dimensions: templateDimensions,
                layout: previewLayout,
                imageDataUrl: templateImage?.src
            }
            const updatedTierData: TierTemplateData = {
                ...currentTierData,
                layout: previewLayout
            }

            // 1. Update React state store
            setTemplateStore(prev => ({ ...prev, [activeTier]: updatedTierData }))
            if (selectedCertType === activeTier) {
                setLayout(previewLayout)
            }

            // 2. Persist to IndexedDB
            await saveTemplateToIndexedDb(activeTier, updatedTierData)

            // 3. Persist to Supabase Cloud Database table & storage
            const res = await fetch('/api/organizer/certificate-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier: activeTier,
                    fileName: updatedTierData.fileName,
                    imageDataUrl: updatedTierData.imageDataUrl || '',
                    dimensions: updatedTierData.dimensions,
                    layout: previewLayout
                })
            })
            const resJson = await res.json()
            if (resJson.success) {
                setPreviewTunerSavedSuccess(true)
                showToast('success', `Saved updated coordinates for "${activeTier}" to Supabase Cloud DB!`)
                setTimeout(() => setPreviewTunerSavedSuccess(false), 4000)
            } else {
                showToast('error', `Cloud sync error: ${resJson.error || 'Failed to save'}`)
            }
        } catch (err: any) {
            console.error('Save preview layout error:', err)
            showToast('error', `Error saving: ${err.message || 'Unknown error'}`)
        } finally {
            setSavingPreviewTuner(false)
        }
    }

    // High-performance asynchronous Category Certificate Downloader (PNG Only)
    const downloadCategoryCertificates = async (categoryId: string) => {
        const cat = downloadCategories.find(c => c.id === categoryId)
        if (!cat) return

        const allParticipants = participants
        let targets: ParticipantRecord[] = []

        if (cat.id === 'all') {
            targets = allParticipants
        } else if (cat.id === 'participation') {
            targets = allParticipants.filter(p => getParticipantAwardTier(p) === 'Participation')
        } else if (cat.id.startsWith('winner_')) {
            const rank = parseInt(cat.id.replace('winner_', ''), 10)
            const team = (winningTeams[rank - 1] || '').trim().toLowerCase()
            targets = allParticipants.filter(p => p.team_name && p.team_name.trim().toLowerCase() === team)
        }

        if (targets.length === 0) {
            showToast('error', `No participants found for category "${cat.label}".`)
            return
        }

        setDownloadingCategory(true)
        setDownloadProgress({
            isOpen: true,
            current: 0,
            total: targets.length,
            percent: 0,
            stage: `Preparing PNG templates for ${targets.length} certificate(s)...`,
            categoryLabel: cat.label
        })

        try {
            // Preload tier template images
            const neededTiers = new Set<string>()
            targets.forEach(p => neededTiers.add(getParticipantAwardTier(p)))
            for (const t of Array.from(neededTiers)) {
                await getOrLoadTierTemplateImage(t)
            }

            // Cryptographically sign tokens for all targets up front
            setDownloadProgress({
                isOpen: true,
                current: 0,
                total: targets.length,
                percent: 5,
                stage: `Signing cryptographic tokens for ${targets.length} certificate(s)...`,
                categoryLabel: cat.label
            })

            const signingItems = targets.map(p => {
                const tierId = getParticipantAwardTier(p)
                const certCode = getExistingOrNewCertCode(p, tierId)
                return {
                    certCode,
                    tierId,
                    item: {
                        id: certCode,
                        name: p.name,
                        reg_no: p.reg_no,
                        dept: p.dept,
                        section: p.section,
                        year: p.year,
                        category: p.category,
                        team_name: p.team_name,
                        type: tierId,
                        event_name: activeEventName,
                        issue_date: new Date().toISOString()
                    }
                }
            })

            const tokens = await requestCertificateTokens(signingItems.map(s => s.item))

            const cleanCatName = cat.label.replace(/[^a-zA-Z0-9]/g, '_')

            // Single student download directly without zipping
            if (targets.length === 1) {
                const p = targets[0]
                const tierId = signingItems[0].tierId
                const certCode = signingItems[0].certCode
                const token = tokens[0]
                const cleanName = (p.name || 'Participant').replace(/[^a-zA-Z0-9]/g, '_')
                const cleanReg = (p.reg_no || 'P1').replace(/[^a-zA-Z0-9]/g, '_')
                const cleanTier = tierId.replace(/[^a-zA-Z0-9]/g, '_')

                const { blob } = await renderSingleCertificateBlob(p, tierId, 'png', 0.95, undefined, certCode, token)
                triggerFileDownload(blob, `Certificate_${cleanTier}_${cleanReg}_${cleanName}.png`)
                showToast('success', `Downloaded PNG certificate for ${p.name}!`)

                // Auto-persist single certificate to Supabase in background (ONLY for DB participants)
                if (dataSource === 'db' && !p.id?.startsWith('excel_')) {
                    fetch('/api/organizer/certificates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            certificates: [{
                                certificate_code: certCode,
                                user_id: p.id,
                                name: p.name,
                                reg_no: p.reg_no,
                                dept: p.dept,
                                section: p.section,
                                year: p.year,
                                team_name: p.team_name,
                                category: p.category,
                                award_tier: tierId,
                                template_name: tierId
                            }]
                        })
                    }).then(() => fetchIssuedCertificates()).catch(() => { })
                }
                return
            }

            // Batch download: Package into lightweight PNG ZIP archive
            const zip = new JSZip()

            for (let i = 0; i < targets.length; i++) {
                const p = targets[i]
                const tierId = signingItems[i].tierId
                const certCode = signingItems[i].certCode
                const token = tokens[i]

                // Critical: Yield to event loop every single certificate so UI never freezes!
                await sleep(4)

                setDownloadProgress({
                    isOpen: true,
                    current: i + 1,
                    total: targets.length,
                    percent: Math.min(85, Math.round(((i + 1) / targets.length) * 85)),
                    stage: `Rendering PNG ${i + 1}/${targets.length}: ${p.name}...`,
                    categoryLabel: cat.label
                })

                const cleanName = (p.name || 'Participant').replace(/[^a-zA-Z0-9]/g, '_')
                const cleanReg = (p.reg_no || `P${i + 1}`).replace(/[^a-zA-Z0-9]/g, '_')
                const cleanTier = tierId.replace(/[^a-zA-Z0-9]/g, '_')

                const { blob } = await renderSingleCertificateBlob(p, tierId, 'png', 0.95, undefined, certCode, token)
                zip.file(`Certificate_${cleanTier}_${cleanReg}_${cleanName}.png`, blob)
            }

            setDownloadProgress(prev => ({
                ...prev,
                percent: 88,
                stage: 'Packaging PNG archive for instant download...'
            }))
            await sleep(10)

            // Ultra-fast Level 2 compression prevents thread-blocking
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 2 }
            }, (meta) => {
                setDownloadProgress(prev => ({
                    ...prev,
                    percent: Math.min(99, Math.round(85 + (meta.percent * 0.14))),
                    stage: `Compressing PNG archive (${Math.round(meta.percent)}%)...`
                }))
            })

            triggerFileDownload(zipBlob, `GDG_KARE_${cleanCatName}_PNG_${new Date().toISOString().slice(0, 10)}.zip`)
            showToast('success', `Successfully exported ${targets.length} PNG certificates for "${cat.label}"!`)

            // Auto-persist issued certificates to Supabase DB in background (ONLY for DB participants)
            if (dataSource === 'db') {
                try {
                    const certificatesToPersist = signingItems.map(s => {
                        const p = targets.find(t => t.reg_no === s.item.reg_no) || s.item
                        return {
                            certificate_code: s.certCode,
                            user_id: p.id?.startsWith('excel_') ? null : p.id,
                            name: p.name,
                            reg_no: p.reg_no,
                            dept: p.dept,
                            section: p.section,
                            year: p.year,
                            team_name: p.team_name,
                            category: p.category,
                            award_tier: s.tierId,
                            template_name: s.tierId
                        }
                    })
                    fetch('/api/organizer/certificates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ certificates: certificatesToPersist })
                    }).then(() => fetchIssuedCertificates()).catch(() => { })
                } catch (persistErr) {
                    console.warn('Background cert persist failed:', persistErr)
                }
            }
        } catch (err: any) {
            console.error('Download PNG category failed:', err)
            showToast('error', `Download error: ${err.message || 'Unknown error'}`)
        } finally {
            setDownloadingCategory(false)
            setDownloadProgress(prev => ({ ...prev, isOpen: false }))
        }
    }

    // =========================================================================
    // 5. HISTORY OF ISSUED CERTIFICATES
    // =========================================================================

    const fetchIssuedCertificates = async () => {
        setLoadingIssued(true)
        try {
            const res = await fetch('/api/organizer/certificates')
            const data = await res.json()
            if (data.certificates && Array.isArray(data.certificates)) {
                setIssuedCertificates(data.certificates)
                for (const c of data.certificates) {
                    if (c.certificate_code) {
                        const cleanReg = (c.reg_no || '').trim().toLowerCase()
                        const cleanId = (c.user_id || c.id || '').trim().toLowerCase()
                        const cleanName = (c.name || '').trim().toLowerCase()
                        const tier = (c.award_tier || c.template_name || '').trim().toLowerCase()
                        if (cleanReg) {
                            certCodeCacheRef.current.set(`db:${cleanReg}_${tier}`, c.certificate_code)
                            certCodeCacheRef.current.set(`db:${cleanReg}`, c.certificate_code)
                        }
                        if (cleanId) {
                            certCodeCacheRef.current.set(`db:${cleanId}_${tier}`, c.certificate_code)
                            certCodeCacheRef.current.set(`db:${cleanId}`, c.certificate_code)
                        }
                        if (cleanName) {
                            certCodeCacheRef.current.set(`db:${cleanName}_${tier}`, c.certificate_code)
                            certCodeCacheRef.current.set(`db:${cleanName}`, c.certificate_code)
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching issued certificates:', e)
        } finally {
            setLoadingIssued(false)
        }
    }

    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const matchesSearch = !searchQuery.trim() ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                p.reg_no.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                p.dept.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                p.section.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                (p.team_name && p.team_name.toLowerCase().includes(searchQuery.toLowerCase().trim()))

            const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter
            const matchesTeam = teamFilter === 'All' || !uniqueTeams.includes(teamFilter) || p.team_name === teamFilter

            return matchesSearch && matchesCategory && matchesTeam
        })
    }, [participants, searchQuery, categoryFilter, teamFilter, uniqueTeams])

    const toggleSelectAll = (select: boolean) => {
        const targetIds = new Set(filteredParticipants.map(p => p.id))
        setParticipants(prev => prev.map(p => targetIds.has(p.id) ? { ...p, selected: select } : p))
    }

    const [savingCategories, setSavingCategories] = useState(false)

    // Save single student category to database immediately
    const updateParticipantCategory = async (participantId: string, newCategory: string) => {
        // Optimistic UI update
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, category: newCategory } : p))

        // If from database, auto-save to backend
        if (!participantId.startsWith('excel_')) {
            try {
                const res = await fetch('/api/organizer/students', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: participantId, category: newCategory })
                })
                const resData = await res.json()
                if (res.ok) {
                    showToast('success', `Saved "${newCategory}" to database!`)
                } else {
                    showToast('error', `DB Save failed: ${resData.error || 'Server error'}`)
                }
            } catch (err: any) {
                console.error('Error auto-saving category to DB:', err)
                showToast('error', 'Network error saving category to database.')
            }
        }
    }

    // Save all current participant categories to database
    const saveAllCategoriesToDb = async () => {
        setSavingCategories(true)
        try {
            const dbParticipants = participants.filter(p => !p.id.startsWith('excel_'))
            setDbParticipantsList(prev => {
                const catMap = new Map(dbParticipants.map(p => [p.id, p.category]))
                return prev.map(p => catMap.has(p.id) ? { ...p, category: catMap.get(p.id)! } : p)
            })
            const res = await fetch('/api/organizer/students', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    students: dbParticipants.map(p => ({ id: p.id, category: p.category }))
                })
            })
            const data = await res.json()
            if (res.ok) {
                showToast('success', `Successfully saved categories for all ${dbParticipants.length} participants to database!`)
            } else {
                showToast('error', `Failed to sync: ${data.error || 'Server error'}`)
            }
        } catch (err: any) {
            console.error('Error syncing all categories:', err)
            showToast('error', 'Network error syncing categories to database.')
        } finally {
            setSavingCategories(false)
        }
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                            <Award size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Certificate Studio</h1>
                            <p className="text-xs text-gray-500">Generate verified certificates with Unique ID and scannable QR verification codes.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/80">
                        <button
                            type="button"
                            onClick={switchToDbMode}
                            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'studio' && dataSource === 'db'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Database size={14} />
                            <span>Generate Certificates from DB</span>
                        </button>
                        <button
                            type="button"
                            onClick={switchToExcelMode}
                            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'studio' && dataSource === 'excel'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <FileSpreadsheet size={14} />
                            <span>Generate Certificates from Excel Sheet</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'history') {
                                setActiveTab('studio')
                            } else {
                                setActiveTab('history')
                                fetchIssuedCertificates()
                            }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${activeTab === 'history'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                        title="View previously issued certificates"
                    >

                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {toast && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    toast.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                        'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {activeTab === 'studio' ? (
                <div className="space-y-8">
                    {/* AWARD TIER & BATCH MODE SELECTOR */}
                    <div className="bg-black p-6 rounded-2xl border border-gray-800 shadow-xl text-white space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                        <Trophy size={12} className="text-amber-400" /> Certificate Studio Tier Selector
                                    </span>
                                    <span className="text-xs text-slate-400">Step 0 of 3</span>
                                </div>
                                <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                                    Active Tier: <span className="text-amber-400 underline decoration-amber-400/40 underline-offset-4">{selectedCertType}</span>
                                </h2>
                                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                                    Select the award tier you are issuing. Each tier maintains its own template image, layout coordinates, and recipient batch. Switching tiers automatically preserves custom graphics in this session.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-700/80">
                                <span className="text-[11px] text-slate-400 font-semibold">Tiers in memory:</span>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                                    {Object.keys(templateStore).length > 0 ? `${Object.keys(templateStore).length} Custom Saved` : 'Live Samples'}
                                </span>
                            </div>
                        </div>

                        {/* Tier Selection Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1">
                            {availableTiers.map(tier => {
                                const isSelected = selectedCertType === tier.id
                                const hasCustom = !!templateStore[tier.id]?.imageDataUrl
                                return (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        onClick={() => handleSwitchCertType(tier.id)}
                                        className={`relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 group cursor-pointer ${isSelected
                                            ? 'bg-white/10 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/40'
                                            : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xl">{tier.icon}</span>
                                            {hasCustom ? (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    Custom
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                                                    Sample
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <div className={`text-xs font-bold leading-tight line-clamp-1 ${isSelected ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'}`}>
                                                {tier.label}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {isSelected ? '● Active' : 'Switch Tier'}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* WINNING TEAMS PODIUM & DYNAMIC RANK ALLOCATOR */}
                    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                        <Trophy size={11} className="text-amber-600" /> TOP TEAMS ALLOCATOR
                                    </span>
                                    <span className="text-xs text-gray-400">Multi-Winner Configuration</span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                                    Select Winning Teams (Rank 1, 2, 3...)
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                    Assign winning teams to each rank. Every member of an assigned winning team will receive their specific rank certificate (1st, 2nd, 3rd, etc.). All other participants automatically receive Participation certificates!
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Preset Buttons & Custom Count */}
                                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-gray-200">
                                    <span className="text-[11px] font-bold text-gray-600 pl-1 mr-1">Winners:</span>
                                    {[3, 5, 10, 25].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => handleWinnerCountChange(cnt)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${winnerCount === cnt
                                                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            Top {cnt}
                                        </button>
                                    ))}
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                                        <label htmlFor="customWinnerCount" className="text-[11px] font-semibold text-gray-500">Custom:</label>
                                        <input
                                            id="customWinnerCount"
                                            type="number"
                                            min={1}
                                            max={25}
                                            value={winnerCount}
                                            onChange={(e) => handleWinnerCountChange(parseInt(e.target.value) || 1)}
                                            className="w-14 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Save Winning Teams to DB Button */}
                                {dataSource === 'db' ? (
                                    <button
                                        type="button"
                                        id="save-winning-teams-btn"
                                        onClick={saveWinningTeamsToDb}
                                        disabled={savingWinningTeams}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                                        title="Save winning teams configuration permanently to Supabase database"
                                    >
                                        <CheckCircle2 size={16} className={savingWinningTeams ? 'animate-spin' : ''} />
                                        <span>{savingWinningTeams ? 'Saving to Database...' : '💾 Save Winning Teams to DB'}</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                                        <FileSpreadsheet size={14} className="text-emerald-600" />
                                        <span>Excel Sheet Winners (Session)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grid of Winning Team Slots */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: winnerCount }).map((_, rankIdx) => {
                                const rank = rankIdx + 1
                                const tierInfo = getTierForRank(rank)
                                const assignedTeam = winningTeams[rankIdx] || ''
                                const members = assignedTeam ? teamMembersMap.get(assignedTeam) || [] : []
                                const isCurrentlyActiveTier = selectedCertType === tierInfo.id

                                return (
                                    <div
                                        key={rank}
                                        className={`rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 ${assignedTeam
                                            ? 'bg-slate-900 text-white border-slate-700 shadow-md'
                                            : 'bg-slate-50/70 border-dashed border-gray-300 text-gray-800'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{tierInfo.icon}</span>
                                                    <div>
                                                        <h4 className={`text-xs font-bold ${assignedTeam ? 'text-amber-300' : 'text-gray-900'}`}>
                                                            {getOrdinal(rank)} Place
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400">
                                                            {tierInfo.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                {assignedTeam && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        {members.length} Members
                                                    </span>
                                                )}
                                            </div>

                                            {/* Team Selector Dropdown */}
                                            <div className="mt-2">
                                                <select
                                                    value={assignedTeam}
                                                    onChange={(e) => updateWinningTeam(rankIdx, e.target.value)}
                                                    className={`w-full text-xs font-semibold rounded-lg px-3 py-2 border transition-all cursor-pointer ${assignedTeam
                                                        ? 'bg-slate-800 text-white border-slate-600 focus:ring-2 focus:ring-amber-400'
                                                        : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-emerald-500'
                                                        }`}
                                                >
                                                    <option value="">-- Choose Winning Team --</option>
                                                    {uniqueTeams.map(t => {
                                                        const otherIndex = winningTeams.findIndex((wt, i) => i !== rankIdx && wt === t)
                                                        const isAlreadyTaken = otherIndex !== -1
                                                        return (
                                                            <option
                                                                key={t}
                                                                value={t}
                                                                disabled={isAlreadyTaken}
                                                            >
                                                                {t} {isAlreadyTaken ? `(Rank ${otherIndex + 1})` : `(${teamMembersMap.get(t)?.length || 0} students)`}
                                                            </option>
                                                        )
                                                    })}
                                                </select>
                                            </div>

                                            {/* Assigned Team Members Preview */}
                                            {assignedTeam ? (
                                                <div className="mt-2.5 pt-2 border-t border-slate-800">
                                                    <div className="text-[10px] text-slate-400 mb-1 font-semibold flex items-center justify-between">
                                                        <span>Team Members:</span>
                                                        <span className="text-emerald-400">{members.length} students</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                                        {members.map(m => (
                                                            <span
                                                                key={m.id}
                                                                className="inline-block bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded text-[10px]"
                                                                title={`${m.name} (${m.reg_no})`}
                                                            >
                                                                {m.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-gray-400 italic mt-2">
                                                    Select a team above to award {getOrdinal(rank)} Place.
                                                </p>
                                            )}
                                        </div>

                                        {/* Card Actions */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/20 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchCertType(tierInfo.id)}
                                                className={`text-[11px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${isCurrentlyActiveTier
                                                    ? 'bg-amber-400 text-slate-950 font-black'
                                                    : assignedTeam
                                                        ? 'text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700'
                                                        : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                                                    }`}
                                            >
                                                <span>🎨</span>
                                                <span>{isCurrentlyActiveTier ? 'Active Template' : 'Edit Template'}</span>
                                            </button>

                                            {assignedTeam && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTeamFilter(assignedTeam)}
                                                    className="text-[11px] text-slate-300 hover:text-white underline decoration-slate-500 font-medium cursor-pointer"
                                                >
                                                    View Members
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Winning Teams Footer Summary Status */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-600 font-medium">
                                    Winning Ranks Assigned: <strong className="text-gray-900 font-bold">{winningTeams.filter(t => t && t.trim()).length} of {winnerCount}</strong>
                                </span>
                                {winningTeams.filter(t => t && t.trim()).length > 0 ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                        ● Configured & Ready
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-[11px]">
                                        Select winning teams above, then click the top &quot;Save Winning Teams to DB&quot; button.
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
                                Members of assigned teams will receive official rank certificates automatically.
                            </span>
                        </div>
                    </div>

                    {/* STEP 1: PARTICIPANT DATA SOURCE */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Step 1
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {dataSource === 'db' ? 'Platform Database' : 'Excel / CSV Spreadsheet'}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-gray-900 mt-1">
                                    {dataSource === 'db' ? 'Participants from GDG-KARE Database' : 'Participants from Uploaded Excel / CSV Sheet'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {dataSource === 'db'
                                        ? 'Loaded directly from official platform registrations & teams.'
                                        : excelFileName
                                            ? `File loaded: ${excelFileName} (${participants.length} students)`
                                            : 'Upload an Excel (.xlsx, .xls, .csv) spreadsheet to issue custom certificates.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {dataSource === 'db' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            fetchDbParticipants()
                                            syncWinningTeamsFromDb()
                                        }}
                                        disabled={loadingParticipants}
                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <RefreshCw size={13} className={loadingParticipants ? 'animate-spin' : ''} />
                                        <span>Reload Database</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => excelInputRef.current?.click()}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                    >
                                        <Upload size={13} />
                                        <span>{excelFileName ? 'Replace or add new Excel File' : 'Upload Excel / CSV'}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Excel File Input */}
                        <input
                            ref={excelInputRef}
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelUpload}
                            className="hidden"
                        />

                        {/* Event Name Display & Edit for DB Mode */}
                        {dataSource === 'db' && (
                            <div className="bg-blue-50/50 border border-blue-200/90 rounded-xl p-4 transition-all">
                                {!isEditingDbEvent ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                <Trophy size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Event Name</span>
                                                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                                                        ● Embeds in QR Code & Displayed on Scanner
                                                    </span>
                                                </div>
                                                <span className="text-sm sm:text-base font-black text-gray-900 block mt-0.5">{dbEventName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTempDbEventName(dbEventName)
                                                    setIsEditingDbEvent(true)
                                                }}
                                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                                title="Edit Event Name"
                                            >
                                                <Edit3 size={13} />
                                                <span>Edit Event Name</span>
                                            </button>
                                            {dbEventName !== 'GDG-KARE Event Management Platform' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDbEventName('GDG-KARE Event Management Platform')
                                                        setTempDbEventName('GDG-KARE Event Management Platform')
                                                        try {
                                                            localStorage.removeItem('hackare_db_event_name')
                                                        } catch { }
                                                        setToast({ type: 'info', message: 'Event name reset to default' })
                                                    }}
                                                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    title="Reset to default event name"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <label htmlFor="db-event-name-input" className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                                                    <Edit3 size={13} />
                                                </span>
                                                <span>Edit Event Name for Database Certificates:</span>
                                            </label>
                                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                                                ● Embeds in QR Code & Displayed on Scanner
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <input
                                                id="db-event-name-input"
                                                type="text"
                                                value={tempDbEventName}
                                                onChange={(e) => setTempDbEventName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const finalName = tempDbEventName.trim() || 'GDG-KARE Event Management Platform'
                                                        setDbEventName(finalName)
                                                        try {
                                                            localStorage.setItem('hackare_db_event_name', finalName)
                                                        } catch { }
                                                        setIsEditingDbEvent(false)
                                                        setToast({ type: 'success', message: 'Event name updated!' })
                                                    } else if (e.key === 'Escape') {
                                                        setIsEditingDbEvent(false)
                                                    }
                                                }}
                                                autoFocus
                                                placeholder="Enter Event Name (e.g., HackKare 2026, AI & ML Bootcamp, Web3 Summit...)"
                                                className="flex-1 px-3.5 py-2.5 bg-white border border-blue-400 rounded-xl text-xs sm:text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const finalName = tempDbEventName.trim() || 'GDG-KARE Event Management Platform'
                                                        setDbEventName(finalName)
                                                        try {
                                                            localStorage.setItem('hackare_db_event_name', finalName)
                                                        } catch { }
                                                        setIsEditingDbEvent(false)
                                                        setToast({ type: 'success', message: 'Event name updated!' })
                                                    }}
                                                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                                >
                                                    <Check size={13} />
                                                    <span>Save</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTempDbEventName('GDG-KARE Event Management Platform')
                                                        setDbEventName('GDG-KARE Event Management Platform')
                                                        try {
                                                            localStorage.removeItem('hackare_db_event_name')
                                                        } catch { }
                                                        setIsEditingDbEvent(false)
                                                        setToast({ type: 'info', message: 'Reset to default event name' })
                                                    }}
                                                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingDbEvent(false)}
                                                    className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                                >
                                                    <X size={13} />
                                                    <span>Cancel</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500">
                                            Press <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[10px]">Enter</kbd> to save. This name will be cryptographically signed into each certificate&apos;s QR code and displayed to anyone who verifies or scans the certificate.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Event Name Text Input for Excel Mode */}
                        {dataSource === 'excel' && (
                            <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-4 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <label htmlFor="excel-event-name-input" className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                            <Trophy size={13} />
                                        </span>
                                        <span>Event Name for this Spreadsheet:</span>
                                    </label>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                                        ● Embeds in QR Code & Displayed on Scanner
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        id="excel-event-name-input"
                                        type="text"
                                        value={excelEventName}
                                        onChange={(e) => {
                                            setExcelEventName(e.target.value)
                                            try {
                                                localStorage.setItem('hackare_excel_event_name', e.target.value)
                                            } catch { }
                                        }}
                                        placeholder="Enter Event Name (e.g., HackKare 2026, AI & ML Bootcamp, Web3 Summit...)"
                                        className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500">
                                    This event name will be cryptographically signed into every certificate&apos;s QR code and displayed to anyone who verifies or scans the certificate.
                                </p>
                            </div>
                        )}

                        {/* If Excel mode and no participants loaded yet, display prominent upload dropzone */}
                        {dataSource === 'excel' && participants.length === 0 && (
                            <div
                                onClick={() => excelInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Choose your Excel or CSV Spreadsheet</h3>
                                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                        Columns supported: <strong>Name, Reg No, Department, Section, Year, Team Name, Category</strong>.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm pointer-events-none"
                                >
                                    Browse Spreadsheet File (.xlsx, .xls, .csv)
                                </button>
                            </div>
                        )}

                        {/* Category & Team Filter & Selection Tools */}
                        <div className="flex flex-wrap items-center justify-between gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                                    <Sliders size={13} className="text-gray-500" />
                                    Filter:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter('All')}
                                    className={`px-3 py-1 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${categoryFilter === 'All'
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>All</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryFilter === 'All' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {participants.length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter('Group 3')}
                                    className={`px-3 py-1 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${categoryFilter === 'Group 3'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>Group 3</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryFilter === 'Group 3' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                                        }`}>
                                        {group3Count}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter('EE Credit')}
                                    className={`px-3 py-1 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${categoryFilter === 'EE Credit'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>EE Credit</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryFilter === 'EE Credit' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                        {eeCreditCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCategoryFilter('Not Eligible')}
                                    className={`px-3 py-1 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${categoryFilter === 'Not Eligible'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>Not Eligible</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryFilter === 'Not Eligible' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                        {notEligibleCount}
                                    </span>
                                </button>

                                {/* Team Dropdown Filter */}
                                {uniqueTeams.length > 0 && (
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                                        <Users size={13} className="text-gray-500" />
                                        <span className="font-semibold text-gray-700">Team:</span>
                                        <select
                                            value={uniqueTeams.includes(teamFilter) ? teamFilter : 'All'}
                                            onChange={(e) => setTeamFilter(e.target.value)}
                                            className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1 font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 max-w-[170px]"
                                        >
                                            <option value="All">All Teams ({uniqueTeams.length})</option>
                                            {uniqueTeams.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        {teamFilter !== 'All' && (
                                            <button
                                                type="button"
                                                onClick={() => setTeamFilter('All')}
                                                className="text-[11px] text-rose-600 hover:underline font-semibold"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {dataSource === 'db' && (
                                    <button
                                        type="button"
                                        onClick={saveAllCategoriesToDb}
                                        disabled={savingCategories}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all text-xs cursor-pointer"
                                        title="Save all assigned categories to database"
                                    >
                                        <CheckCircle2 size={13} className={savingCategories ? 'animate-spin' : ''} />
                                        <span>{savingCategories ? 'Saving...' : 'Save to DB'}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleSelectAll(true)}
                                    className="text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1"
                                >
                                    <CheckSquare size={14} /> Select {categoryFilter !== 'All' || teamFilter !== 'All' ? 'Filtered' : 'All'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleSelectAll(false)}
                                    className="text-gray-600 hover:text-gray-900 font-semibold flex items-center gap-1"
                                >
                                    <Square size={14} /> Deselect {categoryFilter !== 'All' || teamFilter !== 'All' ? 'Filtered' : 'All'}
                                </button>
                                <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 font-bold text-gray-800">
                                    {filteredParticipants.filter(p => p.selected).length} / {filteredParticipants.length} Selected
                                </span>
                            </div>
                        </div>

                        {/* Search & Participant Table */}
                        <div className="space-y-3">
                            <div className="relative max-w-sm">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter participants by name, reg no, team..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100/80 sticky top-0 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="py-2.5 px-3 w-10">Include</th>
                                            <th className="py-2.5 px-3">Student Name</th>
                                            <th className="py-2.5 px-3">Reg No</th>
                                            <th className="py-2.5 px-3">Team</th>
                                            <th className="py-2.5 px-3">Dept & Cohort</th>
                                            <th className="py-2.5 px-3">Category</th>
                                            <th className="py-2.5 px-3">Assigned Award Tier</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingParticipants && participants.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <RefreshCw size={18} className="animate-spin text-emerald-600" />
                                                        <span className="text-xs font-semibold">Loading participants from database...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredParticipants.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-gray-500">
                                                    {participants.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Database size={22} className="text-gray-400" />
                                                            <span className="text-xs font-semibold">
                                                                {dataSource === 'db' ? 'No participants found in database.' : 'No participants loaded from spreadsheet.'}
                                                            </span>
                                                            {dataSource === 'db' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        fetchDbParticipants()
                                                                        syncWinningTeamsFromDb()
                                                                    }}
                                                                    className="mt-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                                                                >
                                                                    Refresh Database
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => excelInputRef.current?.click()}
                                                                    className="mt-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                                                                >
                                                                    Upload Spreadsheet
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                            <Search size={18} className="text-gray-400" />
                                                            <span className="text-xs font-semibold text-gray-700">No participants match your filter</span>
                                                            <p className="text-[11px] text-gray-400">
                                                                {searchQuery && `Search: "${searchQuery}"`}
                                                                {categoryFilter !== 'All' && ` • Category: "${categoryFilter}"`}
                                                                {teamFilter !== 'All' && ` • Team: "${teamFilter}"`}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchQuery('')
                                                                    setCategoryFilter('All')
                                                                    setTeamFilter('All')
                                                                }}
                                                                className="mt-1 text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                                                            >
                                                                Clear All Filters
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredParticipants.map((p, idx) => {
                                                const awardTier = getParticipantAwardTier(p)
                                                const isWinner = awardTier.startsWith('Winner')
                                                return (
                                                    <tr key={p.id} className={`hover:bg-slate-50 ${p.selected ? 'bg-emerald-50/20' : 'opacity-60'}`}>
                                                        <td className="py-2 px-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={p.selected}
                                                                onChange={(e) => {
                                                                    const check = e.target.checked
                                                                    setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, selected: check } : item))
                                                                }}
                                                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3 font-semibold text-gray-900">{p.name}</td>
                                                        <td className="py-2 px-3 font-mono font-bold text-gray-700">{p.reg_no || <span className="text-amber-500 italic">Missing</span>}</td>
                                                        <td className="py-2 px-3">
                                                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                                {p.team_name || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-gray-600">{p.dept} • {p.year} (Sec {p.section})</td>
                                                        <td className="py-2 px-3">
                                                            <select
                                                                value={p.category}
                                                                onChange={(e) => updateParticipantCategory(p.id, e.target.value)}
                                                                className={`text-xs border rounded px-2 py-0.5 font-bold transition-colors ${p.category === 'EE Credit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    p.category === 'Not Eligible' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    }`}
                                                            >
                                                                <option value="Group 3">Group 3</option>
                                                                <option value="EE Credit">EE Credit</option>
                                                                <option value="Not Eligible">Not Eligible</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isWinner
                                                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-sm'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}>
                                                                <span>{isWinner ? '🏆' : '🎖️'}</span>
                                                                <span>{awardTier}</span>
                                                            </span>
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

                    {/* STEP 2: TEMPLATE UPLOAD & COORDINATE CALIBRATOR */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Step 2</span>
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                                        Tier: {selectedCertType}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-gray-900">Certificate Template & Dynamic Overlay Layout</h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                >
                                    <Upload size={14} />
                                    <span>Upload {selectedCertType.split(' ')[0]} Template Image</span>
                                </button>
                                <button
                                    onClick={() => generateFallbackTemplate(selectedCertType)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                                >
                                    Use Sample {selectedCertType.split(' ')[0]}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleTemplateUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Interactive Drag & Drop Banner */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-emerald-900 font-medium">
                                <Move size={16} className="text-emerald-600 animate-pulse" />
                                <span><strong>Direct Drag & Drop Active:</strong> Click and drag any placeholder directly across your certificate! You can also fine-tune size, colors, and styling in the panel.</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-gray-500 font-medium mr-1 text-[11px]">Select:</span>
                                {[
                                    { id: 'name', label: 'Name', enabled: layout.name?.enabled !== false },
                                    { id: 'regNo', label: 'Reg No', enabled: layout.regNo?.enabled !== false },
                                    { id: 'credit', label: 'Credit / Track', enabled: (layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false },
                                    { id: 'qrCode', label: 'QR Code', enabled: layout.qrCode?.enabled !== false },
                                    { id: 'certId', label: 'Cert ID', enabled: layout.certId?.enabled !== false }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setCalibrationTab(item.id as any)}
                                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center gap-1.5 cursor-pointer ${calibrationTab === item.id
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                            : item.enabled
                                                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                                : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                            }`}
                                    >
                                        <span>{item.label}</span>
                                        {!item.enabled && (
                                            <span className="text-[9px] px-1 py-0.2 bg-rose-200/80 text-rose-800 rounded font-bold">Off</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Two Columns: Canvas Preview on left, Controls on right */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Canvas Preview Container */}
                            <div className="lg:col-span-8 bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-inner flex flex-col items-center">
                                <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-200">Interactive Canvas:</span>
                                        <span>{templateDimensions.width} x {templateDimensions.height} px</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                        <Move size={13} />
                                        <span>Click & drag placeholders directly</span>
                                    </div>
                                </div>

                                <div className="w-full border border-slate-700/80 rounded-xl bg-slate-950 flex items-center justify-center p-2">
                                    <div
                                        ref={previewContainerRef}
                                        className="relative w-full max-w-full select-none overflow-hidden rounded shadow-2xl"
                                        style={{
                                            aspectRatio: `${templateDimensions.width} / ${templateDimensions.height}`
                                        }}
                                    >
                                        {/* Background Template Canvas */}
                                        <canvas
                                            ref={previewCanvasRef}
                                            className="w-full h-full block pointer-events-none"
                                        />

                                        {/* DRAGGABLE PLACEHOLDER: NAME */}
                                        {layout.name?.enabled !== false && (
                                            <div
                                                onMouseDown={(e) => startDrag('name', e)}
                                                onTouchStart={(e) => startDrag('name', e)}
                                                onClick={() => setCalibrationTab('name')}
                                                style={{
                                                    left: `${(layout.name.x / templateDimensions.width) * 100}%`,
                                                    top: `${(layout.name.y / templateDimensions.height) * 100}%`,
                                                    transform: layout.name.align === 'center' ? 'translate(-50%, -50%)' : layout.name.align === 'right' ? 'translate(-100%, -50%)' : 'translate(0%, -50%)',
                                                    color: layout.name.color,
                                                    fontSize: `${Math.max(12, layout.name.fontSize * previewScale)}px`,
                                                    fontWeight: layout.name.fontWeight,
                                                    fontFamily: layout.name.fontFamily
                                                }}
                                                className={`absolute cursor-grab active:cursor-grabbing group transition-all select-none whitespace-nowrap ${calibrationTab === 'name'
                                                    ? 'ring-2 ring-emerald-400 bg-emerald-500/20 rounded-lg px-2.5 py-1 shadow-xl'
                                                    : 'hover:ring-1 hover:ring-white/60 rounded-lg px-2.5 py-1'
                                                    }`}
                                            >
                                                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow border flex items-center gap-1 transition-all z-20 ${calibrationTab === 'name' || draggingElement === 'name'
                                                    ? 'opacity-100 bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40'
                                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 text-slate-200 border-slate-700'
                                                    }`}>
                                                    <Move size={10} />
                                                    <span>Participant Name</span>
                                                    {(draggingElement === 'name' || calibrationTab === 'name') && (
                                                        <span className="font-mono text-[9px] bg-emerald-800/80 px-1 rounded ml-1">
                                                            {layout.name.x}, {layout.name.y}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Remove Name from certificate"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setLayout(prev => ({ ...prev, name: { ...prev.name, enabled: false } }))
                                                        }}
                                                        className="hover:bg-rose-600 rounded p-0.5 ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                                <span>{participants[previewIndex]?.name || 'Alex Johnson'}</span>
                                            </div>
                                        )}

                                        {/* DRAGGABLE PLACEHOLDER: REG NO */}
                                        {layout.regNo?.enabled !== false && (
                                            <div
                                                onMouseDown={(e) => startDrag('regNo', e)}
                                                onTouchStart={(e) => startDrag('regNo', e)}
                                                onClick={() => setCalibrationTab('regNo')}
                                                style={{
                                                    left: `${(layout.regNo.x / templateDimensions.width) * 100}%`,
                                                    top: `${(layout.regNo.y / templateDimensions.height) * 100}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    color: layout.regNo.color,
                                                    fontSize: `${Math.max(10, layout.regNo.fontSize * previewScale)}px`,
                                                    fontWeight: layout.regNo.fontWeight,
                                                    fontFamily: layout.regNo.fontFamily
                                                }}
                                                className={`absolute cursor-grab active:cursor-grabbing group transition-all select-none whitespace-nowrap ${calibrationTab === 'regNo'
                                                    ? 'ring-2 ring-emerald-400 bg-emerald-500/20 rounded-lg px-2 py-0.5 shadow-xl'
                                                    : 'hover:ring-1 hover:ring-white/60 rounded-lg px-2 py-0.5'
                                                    }`}
                                            >
                                                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow border flex items-center gap-1 transition-all z-20 ${calibrationTab === 'regNo' || draggingElement === 'regNo'
                                                    ? 'opacity-100 bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40'
                                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 text-slate-200 border-slate-700'
                                                    }`}>
                                                    <Move size={10} />
                                                    <span>Reg No</span>
                                                    {(draggingElement === 'regNo' || calibrationTab === 'regNo') && (
                                                        <span className="font-mono text-[9px] bg-emerald-800/80 px-1 rounded ml-1">
                                                            {layout.regNo.x}, {layout.regNo.y}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Remove Reg No from certificate"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setLayout(prev => ({ ...prev, regNo: { ...prev.regNo, enabled: false } }))
                                                        }}
                                                        className="hover:bg-rose-600 rounded p-0.5 ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                                <span>{layout.regNo.prefix}{participants[previewIndex]?.reg_no || '21BCE1092'}</span>
                                            </div>
                                        )}

                                        {/* DRAGGABLE PLACEHOLDER: UNIQUE ID */}
                                        {layout.certId?.enabled !== false && (
                                            <div
                                                onMouseDown={(e) => startDrag('certId', e)}
                                                onTouchStart={(e) => startDrag('certId', e)}
                                                onClick={() => setCalibrationTab('certId')}
                                                style={{
                                                    left: `${(layout.certId.x / templateDimensions.width) * 100}%`,
                                                    top: `${(layout.certId.y / templateDimensions.height) * 100}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    color: layout.certId.color,
                                                    fontSize: `${Math.max(9, layout.certId.fontSize * previewScale)}px`,
                                                    fontWeight: layout.certId.fontWeight,
                                                    fontFamily: layout.certId.fontFamily
                                                }}
                                                className={`absolute cursor-grab active:cursor-grabbing group transition-all select-none whitespace-nowrap ${calibrationTab === 'certId'
                                                    ? 'ring-2 ring-emerald-400 bg-emerald-500/20 rounded-lg px-2 py-0.5 shadow-xl'
                                                    : 'hover:ring-1 hover:ring-white/60 rounded-lg px-2 py-0.5'
                                                    }`}
                                            >
                                                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow border flex items-center gap-1 transition-all z-20 ${calibrationTab === 'certId' || draggingElement === 'certId'
                                                    ? 'opacity-100 bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40'
                                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 text-slate-200 border-slate-700'
                                                    }`}>
                                                    <Move size={10} />
                                                    <span>Cert ID</span>
                                                    {(draggingElement === 'certId' || calibrationTab === 'certId') && (
                                                        <span className="font-mono text-[9px] bg-emerald-800/80 px-1 rounded ml-1">
                                                            {layout.certId.x}, {layout.certId.y}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Remove Cert ID from certificate"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setLayout(prev => ({ ...prev, certId: { ...prev.certId, enabled: false } }))
                                                        }}
                                                        className="hover:bg-rose-600 rounded p-0.5 ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                                <span>{layout.certId.prefix}GDG-KARE-PREV-99A1</span>
                                            </div>
                                        )}

                                        {/* DRAGGABLE PLACEHOLDER: QR CODE */}
                                        {layout.qrCode?.enabled !== false && (
                                            <div
                                                onMouseDown={(e) => startDrag('qrCode', e)}
                                                onTouchStart={(e) => startDrag('qrCode', e)}
                                                onClick={() => setCalibrationTab('qrCode')}
                                                style={{
                                                    left: `${(layout.qrCode.x / templateDimensions.width) * 100}%`,
                                                    top: `${(layout.qrCode.y / templateDimensions.height) * 100}%`,
                                                    width: `${layout.qrCode.size * previewScale}px`,
                                                    height: `${layout.qrCode.size * previewScale}px`
                                                }}
                                                className={`absolute cursor-grab active:cursor-grabbing group transition-all select-none p-0.5 rounded ${calibrationTab === 'qrCode'
                                                    ? 'ring-2 ring-emerald-400 bg-emerald-500/30 shadow-2xl'
                                                    : 'hover:ring-1 hover:ring-white/70'
                                                    }`}
                                            >
                                                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow border flex items-center gap-1 transition-all z-20 ${calibrationTab === 'qrCode' || draggingElement === 'qrCode'
                                                    ? 'opacity-100 bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40'
                                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 text-slate-200 border-slate-700'
                                                    }`}>
                                                    <Move size={10} />
                                                    <span>QR Code</span>
                                                    {(draggingElement === 'qrCode' || calibrationTab === 'qrCode') && (
                                                        <span className="font-mono text-[9px] bg-emerald-800/80 px-1 rounded ml-1">
                                                            {layout.qrCode.x}, {layout.qrCode.y}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Remove QR Code from certificate"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setLayout(prev => ({ ...prev, qrCode: { ...prev.qrCode, enabled: false } }))
                                                        }}
                                                        className="hover:bg-rose-600 rounded p-0.5 ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                                {sampleQrDataUrl ? (
                                                    <img
                                                        src={sampleQrDataUrl}
                                                        alt="QR Preview"
                                                        className="w-full h-full object-contain pointer-events-none rounded bg-white"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-white flex items-center justify-center text-[10px] text-gray-500 font-mono rounded">
                                                        QR Code
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* DRAGGABLE PLACEHOLDER: ACADEMIC CREDIT / TRACK */}
                                        {(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false && (
                                            <div
                                                onMouseDown={(e) => startDrag('credit', e)}
                                                onTouchStart={(e) => startDrag('credit', e)}
                                                onClick={() => setCalibrationTab('credit')}
                                                style={{
                                                    left: `${((layout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x) / templateDimensions.width) * 100}%`,
                                                    top: `${((layout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y) / templateDimensions.height) * 100}%`,
                                                    transform: (layout.credit?.align || DEFAULT_CREDIT_LAYOUT.align) === 'center' ? 'translate(-50%, -50%)' : (layout.credit?.align || DEFAULT_CREDIT_LAYOUT.align) === 'right' ? 'translate(-100%, -50%)' : 'translate(0%, -50%)',
                                                    color: layout.credit?.color ?? DEFAULT_CREDIT_LAYOUT.color,
                                                    fontSize: `${Math.max(10, (layout.credit?.fontSize ?? DEFAULT_CREDIT_LAYOUT.fontSize) * previewScale)}px`,
                                                    fontWeight: layout.credit?.fontWeight ?? DEFAULT_CREDIT_LAYOUT.fontWeight,
                                                    fontFamily: layout.credit?.fontFamily ?? DEFAULT_CREDIT_LAYOUT.fontFamily
                                                }}
                                                className={`absolute cursor-grab active:cursor-grabbing group transition-all select-none whitespace-nowrap ${calibrationTab === 'credit'
                                                    ? 'ring-2 ring-emerald-400 bg-emerald-500/20 rounded-lg px-2 py-0.5 shadow-xl'
                                                    : 'hover:ring-1 hover:ring-white/60 rounded-lg px-2 py-0.5'
                                                    }`}
                                            >
                                                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full shadow border flex items-center gap-1 transition-all z-20 ${calibrationTab === 'credit' || draggingElement === 'credit'
                                                    ? 'opacity-100 bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40'
                                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 text-slate-200 border-slate-700'
                                                    }`}>
                                                    <Move size={10} />
                                                    <span>Academic Credit / Track</span>
                                                    {(draggingElement === 'credit' || calibrationTab === 'credit') && (
                                                        <span className="font-mono text-[9px] bg-emerald-800/80 px-1 rounded ml-1">
                                                            {layout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x}, {layout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Remove Credit text from certificate"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    enabled: false
                                                                }
                                                            }))
                                                        }}
                                                        className="hover:bg-rose-600 rounded p-0.5 ml-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                                <span>
                                                    {getParticipantCreditText(
                                                        participants[previewIndex] || {
                                                            id: 'sample',
                                                            name: 'Alex Johnson',
                                                            reg_no: '21BCE1092',
                                                            dept: 'CSE',
                                                            section: 'A',
                                                            year: '2nd Year',
                                                            category: 'Group 3',
                                                            selected: true
                                                        },
                                                        layout.credit || DEFAULT_CREDIT_LAYOUT
                                                    ) || (layout.credit?.text2ndYear || 'Non CGPA - Group 3')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Calibration Controls */}
                            <div className="lg:col-span-4 bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                                <div className="flex border-b border-gray-200 pb-2 gap-1 text-xs font-bold overflow-x-auto">
                                    {[
                                        { id: 'name', label: 'Name', enabled: layout.name?.enabled !== false },
                                        { id: 'regNo', label: 'Reg No', enabled: layout.regNo?.enabled !== false },
                                        { id: 'credit', label: 'Credit', enabled: (layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false },
                                        { id: 'qrCode', label: 'QR Code', enabled: layout.qrCode?.enabled !== false },
                                        { id: 'certId', label: 'Cert ID', enabled: layout.certId?.enabled !== false }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setCalibrationTab(item.id as any)}
                                            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${calibrationTab === item.id
                                                ? 'bg-slate-900 text-white'
                                                : item.enabled
                                                    ? 'text-gray-600 hover:bg-gray-200'
                                                    : 'text-rose-600 hover:bg-rose-50'
                                                }`}
                                        >
                                            <span>{item.label}</span>
                                            {!item.enabled && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Dynamic Sub-panels */}
                                {calibrationTab === 'name' && (
                                    <div className="space-y-3 text-xs">
                                        {/* Status & Remove/Restore Box Control */}
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${layout.name?.enabled !== false
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${layout.name?.enabled !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-bold text-[11px]">
                                                    {layout.name?.enabled !== false ? 'Printing Name on Certificate' : 'Name Box Removed'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    name: { ...prev.name, enabled: prev.name?.enabled === false ? true : false }
                                                }))}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${layout.name?.enabled !== false
                                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-2xs'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                                    }`}
                                            >
                                                {layout.name?.enabled !== false ? (
                                                    <>
                                                        <Trash2 size={12} />
                                                        <span>Remove Box</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} />
                                                        <span>Restore Box</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.name.x}
                                                    onChange={(e) => setLayout({ ...layout, name: { ...layout.name, x: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.name.y}
                                                    onChange={(e) => setLayout({ ...layout, name: { ...layout.name, y: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    value={layout.name.fontSize}
                                                    onChange={(e) => setLayout({ ...layout, name: { ...layout.name, fontSize: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={layout.name.color}
                                                        onChange={(e) => setLayout({ ...layout, name: { ...layout.name, color: e.target.value } })}
                                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <span className="font-mono">{layout.name.color}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-gray-600 font-semibold block mb-1">Font Weight</label>
                                            <select
                                                value={layout.name.fontWeight}
                                                onChange={(e) => setLayout({ ...layout, name: { ...layout.name, fontWeight: e.target.value } })}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            >
                                                <option value="normal">Normal (400)</option>
                                                <option value="600">Semi Bold (600)</option>
                                                <option value="bold">Bold (700)</option>
                                                <option value="800">Extra Bold (800)</option>
                                            </select>
                                        </div>

                                        <div className="pt-2 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({ ...prev, name: { ...prev.name, x: Math.round(templateDimensions.width / 2) } }))}
                                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5"
                                            >
                                                <AlignCenter size={13} />
                                                <span>Center Horizontally (X: {Math.round(templateDimensions.width / 2)})</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {calibrationTab === 'regNo' && (
                                    <div className="space-y-3 text-xs">
                                        {/* Status & Remove/Restore Box Control */}
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${layout.regNo?.enabled !== false
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${layout.regNo?.enabled !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-bold text-[11px]">
                                                    {layout.regNo?.enabled !== false ? 'Printing Reg No on Certificate' : 'Reg No Box Removed'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    regNo: { ...prev.regNo, enabled: prev.regNo?.enabled === false ? true : false }
                                                }))}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${layout.regNo?.enabled !== false
                                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-2xs'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                                    }`}
                                            >
                                                {layout.regNo?.enabled !== false ? (
                                                    <>
                                                        <Trash2 size={12} />
                                                        <span>Remove Box</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} />
                                                        <span>Restore Box</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.regNo.x}
                                                    onChange={(e) => setLayout({ ...layout, regNo: { ...layout.regNo, x: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.regNo.y}
                                                    onChange={(e) => setLayout({ ...layout, regNo: { ...layout.regNo, y: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    value={layout.regNo.fontSize}
                                                    onChange={(e) => setLayout({ ...layout, regNo: { ...layout.regNo, fontSize: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={layout.regNo.color}
                                                        onChange={(e) => setLayout({ ...layout, regNo: { ...layout.regNo, color: e.target.value } })}
                                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <span className="font-mono">{layout.regNo.color}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-gray-600 font-semibold block mb-1">Prefix Text</label>
                                            <input
                                                type="text"
                                                value={layout.regNo.prefix}
                                                onChange={(e) => setLayout({ ...layout, regNo: { ...layout.regNo, prefix: e.target.value } })}
                                                placeholder="e.g. Registration No: "
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({ ...prev, regNo: { ...prev.regNo, x: Math.round(templateDimensions.width / 2) } }))}
                                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5"
                                            >
                                                <AlignCenter size={13} />
                                                <span>Center Horizontally (X: {Math.round(templateDimensions.width / 2)})</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {calibrationTab === 'credit' && (
                                    <div className="space-y-3 text-xs">
                                        {/* Status & Remove/Restore Box Control */}
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-bold text-[11px]">
                                                    {(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? 'Printing Credit on Certificate' : 'Credit Box Removed'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    credit: {
                                                        ...DEFAULT_CREDIT_LAYOUT,
                                                        ...(prev.credit || {}),
                                                        enabled: (prev.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) === false ? true : false
                                                    }
                                                }))}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false
                                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-2xs'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                                    }`}
                                            >
                                                {(layout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? (
                                                    <>
                                                        <Trash2 size={12} />
                                                        <span>Remove Box</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} />
                                                        <span>Restore Box</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Dynamic Content Inputs */}
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2.5">
                                            <span className="text-[11px] font-bold text-gray-800 block">Dynamic Text Content</span>
                                            <div>
                                                <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                                                    2nd Year Text:
                                                </label>
                                                <input
                                                    type="text"
                                                    value={layout.credit?.text2ndYear ?? DEFAULT_CREDIT_LAYOUT.text2ndYear}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                text2ndYear: val
                                                            }
                                                        }))
                                                    }}
                                                    placeholder="Non CGPA - Group 3"
                                                    className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                                                    3rd & 4th Year Text:
                                                </label>
                                                <input
                                                    type="text"
                                                    value={layout.credit?.text3rd4thYear ?? DEFAULT_CREDIT_LAYOUT.text3rd4thYear}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                text3rd4thYear: val
                                                            }
                                                        }))
                                                    }}
                                                    placeholder="2 EE credit"
                                                    className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs font-semibold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                                                    Prefix (Optional):
                                                </label>
                                                <input
                                                    type="text"
                                                    value={layout.credit?.prefix ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                prefix: val
                                                            }
                                                        }))
                                                    }}
                                                    placeholder="e.g. Category: "
                                                    className="w-full bg-slate-50 border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Coordinates */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value)
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                x: val
                                                            }
                                                        }))
                                                    }}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value)
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                y: val
                                                            }
                                                        }))
                                                    }}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Font Size & Color */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    value={layout.credit?.fontSize ?? DEFAULT_CREDIT_LAYOUT.fontSize}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value)
                                                        setLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                fontSize: val
                                                            }
                                                        }))
                                                    }}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={layout.credit?.color ?? DEFAULT_CREDIT_LAYOUT.color}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            setLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    color: val
                                                                }
                                                            }))
                                                        }}
                                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                    />
                                                    <span className="font-mono text-xs">{layout.credit?.color ?? DEFAULT_CREDIT_LAYOUT.color}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Font Weight */}
                                        <div>
                                            <label className="text-gray-600 font-semibold block mb-1">Font Weight</label>
                                            <select
                                                value={layout.credit?.fontWeight ?? DEFAULT_CREDIT_LAYOUT.fontWeight}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setLayout(prev => ({
                                                        ...prev,
                                                        credit: {
                                                            ...DEFAULT_CREDIT_LAYOUT,
                                                            ...(prev.credit || {}),
                                                            fontWeight: val
                                                        }
                                                    }))
                                                }}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            >
                                                <option value="normal">Normal (400)</option>
                                                <option value="600">Semi Bold (600)</option>
                                                <option value="bold">Bold (700)</option>
                                                <option value="800">Extra Bold (800)</option>
                                            </select>
                                        </div>

                                        {/* Center Horizontally */}
                                        <div className="pt-2 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    credit: {
                                                        ...DEFAULT_CREDIT_LAYOUT,
                                                        ...(prev.credit || {}),
                                                        x: Math.round(templateDimensions.width / 2)
                                                    }
                                                }))}
                                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5"
                                            >
                                                <AlignCenter size={13} />
                                                <span>Center Horizontally (X: {Math.round(templateDimensions.width / 2)})</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {calibrationTab === 'qrCode' && (
                                    <div className="space-y-3 text-xs">
                                        {/* Status & Remove/Restore Box Control */}
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${layout.qrCode?.enabled !== false
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${layout.qrCode?.enabled !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-bold text-[11px]">
                                                    {layout.qrCode?.enabled !== false ? 'Printing QR Code on Certificate' : 'QR Code Removed'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    qrCode: { ...prev.qrCode, enabled: prev.qrCode?.enabled === false ? true : false }
                                                }))}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${layout.qrCode?.enabled !== false
                                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-2xs'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                                    }`}
                                            >
                                                {layout.qrCode?.enabled !== false ? (
                                                    <>
                                                        <Trash2 size={12} />
                                                        <span>Remove Box</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} />
                                                        <span>Restore Box</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.qrCode.x}
                                                    onChange={(e) => setLayout({ ...layout, qrCode: { ...layout.qrCode, x: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.qrCode.y}
                                                    onChange={(e) => setLayout({ ...layout, qrCode: { ...layout.qrCode, y: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-gray-600 font-semibold block mb-1">QR Box Size (px)</label>
                                            <input
                                                type="number"
                                                value={layout.qrCode.size}
                                                onChange={(e) => setLayout({ ...layout, qrCode: { ...layout.qrCode, size: Number(e.target.value) } })}
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Dark Color</label>
                                                <input
                                                    type="color"
                                                    value={layout.qrCode.darkColor}
                                                    onChange={(e) => setLayout({ ...layout, qrCode: { ...layout.qrCode, darkColor: e.target.value } })}
                                                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Light Color</label>
                                                <input
                                                    type="color"
                                                    value={layout.qrCode.lightColor}
                                                    onChange={(e) => setLayout({ ...layout, qrCode: { ...layout.qrCode, lightColor: e.target.value } })}
                                                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {calibrationTab === 'certId' && (
                                    <div className="space-y-3 text-xs">
                                        {/* Status & Remove/Restore Box Control */}
                                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${layout.certId?.enabled !== false
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${layout.certId?.enabled !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="font-bold text-[11px]">
                                                    {layout.certId?.enabled !== false ? 'Printing Cert ID on Certificate' : 'Cert ID Box Removed'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({
                                                    ...prev,
                                                    certId: { ...prev.certId, enabled: prev.certId?.enabled === false ? true : false }
                                                }))}
                                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${layout.certId?.enabled !== false
                                                    ? 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-2xs'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                                    }`}
                                            >
                                                {layout.certId?.enabled !== false ? (
                                                    <>
                                                        <Trash2 size={12} />
                                                        <span>Remove Box</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} />
                                                        <span>Restore Box</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.certId.x}
                                                    onChange={(e) => setLayout({ ...layout, certId: { ...layout.certId, x: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={layout.certId.y}
                                                    onChange={(e) => setLayout({ ...layout, certId: { ...layout.certId, y: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Font Size (px)</label>
                                                <input
                                                    type="number"
                                                    value={layout.certId.fontSize}
                                                    onChange={(e) => setLayout({ ...layout, certId: { ...layout.certId, fontSize: Number(e.target.value) } })}
                                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-gray-600 font-semibold block mb-1">Color</label>
                                                <input
                                                    type="color"
                                                    value={layout.certId.color}
                                                    onChange={(e) => setLayout({ ...layout, certId: { ...layout.certId, color: e.target.value } })}
                                                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-gray-600 font-semibold block mb-1">Prefix</label>
                                            <input
                                                type="text"
                                                value={layout.certId.prefix}
                                                onChange={(e) => setLayout({ ...layout, certId: { ...layout.certId, prefix: e.target.value } })}
                                                placeholder="e.g. ID: "
                                                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs"
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setLayout(prev => ({ ...prev, certId: { ...prev.certId, x: Math.round(templateDimensions.width / 2) } }))}
                                                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5"
                                            >
                                                <AlignCenter size={13} />
                                                <span>Center Horizontally (X: {Math.round(templateDimensions.width / 2)})</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Calibration Save Buttons */}
                                <div className="pt-3 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={saveLayoutConfig}
                                        disabled={savingTemplate}
                                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                                        title={`Save ${selectedCertType} coordinates and template to Supabase Cloud DB`}
                                    >
                                        <CheckCircle2 size={15} className={savingTemplate ? 'animate-spin' : ''} />
                                        <span>{savingTemplate ? 'Saving Coordinates...' : `Save ${selectedCertType.split(' ')[0]} to Cloud DB`}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: CATEGORY DOWNLOAD & PREVIEW HUB */}
                    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <div className="border-b border-gray-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Step 3
                                    </span>
                                    <span className="text-xs text-gray-400">Download &amp; Preview Hub</span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 mt-1">
                                    Download &amp; Preview Certificates by Category
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                                    Select any certificate category below (Participants, Winning Team 1, 2, 3...) to preview the rendered certificate or download the complete batch archive.
                                </p>
                            </div>
                        </div>

                        {/* Category Selector Grid */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-2.5">
                                Select Certificate Category to Download or Preview:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {downloadCategories.map(cat => {
                                    const isSelected = selectedDownloadCategoryId === cat.id
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => setSelectedDownloadCategoryId(cat.id)}
                                            className={`rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-3 ${isSelected
                                                ? 'bg-slate-900 text-white border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                                                : 'bg-slate-50 hover:bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                                                }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xl">{cat.icon}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected
                                                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                        {cat.count} Student{cat.count === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                                <h4 className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-gray-900'}`}>
                                                    {cat.label}
                                                </h4>
                                                {cat.teamName && (
                                                    <p className={`text-[11px] mt-0.5 font-medium ${isSelected ? 'text-slate-300' : 'text-gray-500'}`}>
                                                        Team: <strong className={isSelected ? 'text-white' : 'text-gray-800'}>{cat.teamName}</strong>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
                                                <span className={`text-[10px] font-semibold ${isSelected ? 'text-amber-400' : 'text-gray-400'}`}>
                                                    {isSelected ? '● Selected Category' : 'Click to select'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openCategoryPreview(cat.id, 0)
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${isSelected
                                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                                                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                                                        }`}
                                                >
                                                    <Eye size={12} />
                                                    <span>Preview</span>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Selected Category Primary Action Box */}
                        {(() => {
                            const activeCat = downloadCategories.find(c => c.id === selectedDownloadCategoryId) || downloadCategories[0]
                            return (
                                <div className="bg-black p-6 rounded-2xl border border-gray-800 shadow-xl text-white space-y-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{activeCat.icon}</span>
                                                <span className="text-xs font-bold bg-blue-600/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                                                    Active Category Selection
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black text-white">
                                                {activeCat.label}
                                            </h3>
                                            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                                                {activeCat.teamName && activeCat.teamName !== 'Unassigned'
                                                    ? `Assigned Winning Team: ${activeCat.teamName} (${activeCat.count} members). Every student in this team receives their official rank certificate.`
                                                    : `Includes ${activeCat.count} student(s) receiving official certificates in this category.`}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            {/* PNG Format Indicator */}
                                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/90 text-xs font-semibold text-slate-300">
                                                <FileImage size={14} className="text-blue-400" />
                                                <span>PNG Format</span>
                                            </div>

                                            {/* PREVIEW BUTTON */}
                                            <button
                                                type="button"
                                                id="preview-category-cert-btn"
                                                onClick={() => openCategoryPreview(activeCat.id, 0)}
                                                disabled={generatingPreview}
                                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                                                title="Preview how certificates will look for this category"
                                            >
                                                <Eye size={15} className="text-blue-400" />
                                                <span>{generatingPreview ? 'Rendering...' : 'Preview Certificate'}</span>
                                            </button>

                                            {/* DOWNLOAD PNG BUTTON */}
                                            <button
                                                type="button"
                                                id="download-category-cert-btn"
                                                onClick={() => downloadCategoryCertificates(activeCat.id)}
                                                disabled={downloadingCategory || activeCat.count === 0}
                                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                                                title={`Download all ${activeCat.count} certificates for ${activeCat.label} as PNGs`}
                                            >
                                                <Download size={15} className={downloadingCategory ? 'animate-bounce' : ''} />
                                                <span>
                                                    {downloadingCategory
                                                        ? 'Packaging Download...'
                                                        : `Download ${activeCat.shortName} PNGs (${activeCat.count})`}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Filtered Participant Inspection Table for active category */}
                        {(() => {
                            const activeCat = downloadCategories.find(c => c.id === selectedDownloadCategoryId) || downloadCategories[0]
                            const allParticipants = participants
                            const categoryParticipants = activeCat.id === 'all'
                                ? allParticipants
                                : activeCat.id === 'participation'
                                    ? allParticipants.filter(p => getParticipantAwardTier(p) === 'Participation')
                                    : allParticipants.filter(p => {
                                        const rank = parseInt(activeCat.id.replace('winner_', ''), 10)
                                        const team = (winningTeams[rank - 1] || '').trim().toLowerCase()
                                        return p.team_name && p.team_name.trim().toLowerCase() === team
                                    })

                            return (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-100 p-3 text-xs font-bold text-gray-700 border-b border-gray-200 flex items-center justify-between">
                                        <span>Students in &quot;{activeCat.label}&quot; ({categoryParticipants.length})</span>
                                        <span className="text-[11px] text-gray-500 font-normal">
                                            Click Preview or Download for individual certificates
                                        </span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 sticky top-0 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="py-2.5 px-3">Participant</th>
                                                    <th className="py-2.5 px-3">Reg No</th>
                                                    <th className="py-2.5 px-3">Team</th>
                                                    <th className="py-2.5 px-3">Category</th>
                                                    <th className="py-2.5 px-3">Award Tier</th>
                                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {categoryParticipants.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                                                            No participants assigned to this category yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    categoryParticipants.map((p, idx) => {
                                                        const pTier = getParticipantAwardTier(p)
                                                        const existing = generatedResults.find(g => g.participant.id === p.id)
                                                        return (
                                                            <tr key={p.id || idx} className="hover:bg-slate-50">
                                                                <td className="py-2 px-3 font-semibold text-gray-900">{p.name}</td>
                                                                <td className="py-2 px-3 font-mono font-bold text-gray-700">{p.reg_no}</td>
                                                                <td className="py-2 px-3 text-gray-600">{p.team_name || '—'}</td>
                                                                <td className="py-2 px-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.category === 'EE Credit' ? 'bg-amber-100 text-amber-800' :
                                                                        p.category === 'Not Eligible' ? 'bg-rose-100 text-rose-800' :
                                                                            'bg-indigo-100 text-indigo-800'
                                                                        }`}>
                                                                        {p.category}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 px-3">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${pTier.includes('Winner 1') ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold' :
                                                                        pTier.includes('Winner 2') ? 'bg-slate-200 text-slate-900 border-slate-300' :
                                                                            pTier.includes('Winner 3') ? 'bg-orange-100 text-orange-900 border-orange-300' :
                                                                                pTier.startsWith('Winner') ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                                                                                    'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                        }`}>
                                                                        <span>{pTier.startsWith('Winner') ? '🏆' : '🎖️'}</span>
                                                                        <span>{pTier}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 px-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openCategoryPreview(activeCat.id, idx)}
                                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                                                            title="Preview Certificate"
                                                                        >
                                                                            <Eye size={12} />
                                                                            <span>Preview</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const dataUrl = existing ? existing.canvasDataUrl : await renderSingleCertificateDataUrl(p, pTier, 'png')
                                                                                downloadSingle({ participant: p, certCode: existing?.certCode || 'CERT', canvasDataUrl: dataUrl, tier: pTier })
                                                                            }}
                                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                                                            title="Download PNG Certificate"
                                                                        >
                                                                            <Download size={11} />
                                                                            <span>PNG</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            ) : (
                /* HISTORY TAB */
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Official Issued Certificates Registry</h2>
                            <p className="text-xs text-gray-500">Every certificate issued through the organizer studio is queryable by its unique verification code.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={historyTypeFilter}
                                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                                className="bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 px-3 py-1.5 font-semibold focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="All">All Award Tiers</option>
                                {CERTIFICATE_TIERS.map(t => (
                                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                                ))}
                            </select>

                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by code or student..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <button
                                onClick={fetchIssuedCertificates}
                                className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
                                title="Refresh Registry"
                            >
                                <RefreshCw size={15} />
                            </button>
                        </div>
                    </div>

                    {loadingIssued ? (
                        <div className="py-16 text-center text-xs text-gray-500 font-medium">
                            <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
                            <span>Loading certificate registry...</span>
                        </div>
                    ) : issuedCertificates.length === 0 ? (
                        <div className="py-16 text-center text-xs text-gray-500">
                            <Award size={32} className="text-gray-300 mx-auto mb-2" />
                            <p className="font-semibold text-gray-700">No certificates issued yet</p>
                            <p className="text-gray-400 mt-1">Switch to Generator Studio to generate your first batch of certificates.</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Unique Certificate ID</th>
                                        <th className="py-3 px-4">Student Name</th>
                                        <th className="py-3 px-4">Registration No</th>
                                        <th className="py-3 px-4">Cohort & Dept</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4">Award Tier</th>
                                        <th className="py-3 px-4">Issue Date</th>
                                        <th className="py-3 px-4 text-right">Verification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {issuedCertificates
                                        .filter(c => {
                                            const matchesSearch = !historySearch ||
                                                c.certificate_code?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                                c.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                                c.reg_no?.toLowerCase().includes(historySearch.toLowerCase())
                                            const matchesTier = historyTypeFilter === 'All' || c.template_name === historyTypeFilter
                                            return matchesSearch && matchesTier
                                        })
                                        .map((c) => (
                                            <tr key={c.id || c.certificate_code} className="hover:bg-slate-50">
                                                <td className="py-3 px-4 font-mono font-bold text-emerald-700">{c.certificate_code}</td>
                                                <td className="py-3 px-4 font-semibold text-gray-900">{c.name}</td>
                                                <td className="py-3 px-4 font-mono text-gray-700">{c.reg_no}</td>
                                                <td className="py-3 px-4 text-gray-600">{c.dept || 'Engineering'} • {c.year}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.category === 'EE Credit' ? 'bg-amber-100 text-amber-800' :
                                                        c.category === 'Not Eligible' ? 'bg-rose-100 text-rose-800' :
                                                            'bg-indigo-100 text-indigo-800'
                                                        }`}>
                                                        {c.category || 'Group 3'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.template_name?.includes('Winner 1') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                                        c.template_name?.includes('Winner 2') ? 'bg-slate-200 text-slate-800 border-slate-300' :
                                                            c.template_name?.includes('Winner 3') ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                                c.template_name?.includes('Special') ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                                    'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        }`}>
                                                        {c.template_name?.includes('Winner 1') ? '🥇 1st Place' :
                                                            c.template_name?.includes('Winner 2') ? '🥈 2nd Place' :
                                                                c.template_name?.includes('Winner 3') ? '🥉 3rd Place' :
                                                                    c.template_name?.includes('Special') ? '⭐ Special' :
                                                                        '🎖️ Participation'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-500 text-[11px]">
                                                    {c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Link
                                                        href={`/verify-certificate?id=${c.certificate_code}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                                                    >
                                                        <span>Verify</span>
                                                        <ExternalLink size={12} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Certificate Preview Modal by Category with Live Coordinate & Font Size Tuner */}
            {previewModal?.isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setPreviewModal(null)}
                >
                    <div
                        className={`relative w-full ${showPreviewTuner ? 'max-w-6xl' : 'max-w-5xl'} max-h-[96vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white transition-all duration-300 animate-in zoom-in-95`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Top Header: Title, Category Tabs, Tuner Toggle & Close */}
                        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">{previewModal.category.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                                                Category Certificate Preview
                                            </span>
                                            {previewModal.totalStudents > 0 && (
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    Recipient {previewModal.sampleIndex + 1} of {previewModal.totalStudents}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                                            {previewModal.category.label}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Toggle Live Tuner Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPreviewTuner(!showPreviewTuner)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${showPreviewTuner
                                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 ring-2 ring-amber-400/40'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
                                            }`}
                                        title="Adjust font size and coordinates live on certificate"
                                    >
                                        <Sliders size={14} className={showPreviewTuner ? 'text-slate-950' : 'text-amber-400'} />
                                        <span>{showPreviewTuner ? 'Hide Tuner' : '🎛️ Adjust Font & Coordinates'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewModal(null)}
                                        className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-all cursor-pointer"
                                        title="Close preview"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Category Switcher Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar border-t border-slate-800/80">
                                <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Switch Category:</span>
                                {downloadCategories.map(cat => {
                                    const isCurrent = previewModal.category.id === cat.id
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => openCategoryPreview(cat.id, 0)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${isCurrent
                                                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
                                                }`}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.shortName}</span>
                                            <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${isCurrent ? 'bg-black/20 text-slate-900' : 'bg-slate-900/60 text-slate-400'
                                                }`}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Recipient Details & Student Pagination Toolbar */}
                        <div className="bg-slate-950/70 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 font-medium">Recipient:</span>
                                    <strong className="text-white font-bold">{previewModal.previewParticipant.name}</strong>
                                    <span className="text-slate-400 font-mono">({previewModal.previewParticipant.reg_no})</span>
                                </div>
                                {previewModal.previewParticipant.team_name && (
                                    <div className="hidden sm:flex items-center gap-1 text-slate-400">
                                        <span>• Team:</span>
                                        <span className="text-slate-200 font-semibold">{previewModal.previewParticipant.team_name}</span>
                                    </div>
                                )}
                                {/* Dynamic Award Tier Badge: Shows Winner 1, Winner 2, Winner 3, or Participation */}
                                {(() => {
                                    const studentTier = previewModal.activeTier || getParticipantAwardTier(previewModal.previewParticipant)
                                    const isWinner = studentTier.includes('Winner') || studentTier.includes('1st') || studentTier.includes('2nd') || studentTier.includes('3rd')
                                    return (
                                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${isWinner
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            }`}>
                                            <span>{isWinner ? '🏆' : '🎖️'}</span>
                                            <span>{studentTier}</span>
                                        </span>
                                    )
                                })()}
                            </div>

                            {/* Pagination Controls between students in this category */}
                            {previewModal.totalStudents > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={previewModal.sampleIndex <= 0 || generatingPreview}
                                        onClick={() => openCategoryPreview(previewModal.category.id, previewModal.sampleIndex - 1)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                        title="Previous Student"
                                    >
                                        <ChevronLeft size={14} />
                                        <span className="text-[11px] font-semibold pr-1">Prev</span>
                                    </button>

                                    {/* Student Quick Selector */}
                                    <select
                                        value={previewModal.sampleIndex}
                                        onChange={(e) => openCategoryPreview(previewModal.category.id, parseInt(e.target.value, 10))}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[170px] truncate"
                                    >
                                        {previewModal.studentsList.map((st, idx) => (
                                            <option key={st.id || idx} value={idx}>
                                                {idx + 1}. {st.name} {st.team_name ? `(${st.team_name})` : ''}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        disabled={previewModal.sampleIndex >= previewModal.totalStudents - 1 || generatingPreview}
                                        onClick={() => openCategoryPreview(previewModal.category.id, previewModal.sampleIndex + 1)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                        title="Next Student"
                                    >
                                        <span className="text-[11px] font-semibold pl-1">Next</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Certificate Canvas Render & Live Tuner Workspace */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-[380px] max-h-[64vh]">
                            {/* Certificate Canvas Render Preview Area */}
                            <div className="flex-1 overflow-auto p-4 sm:p-5 bg-slate-950/90 flex items-center justify-center relative">
                                {generatingPreview ? (
                                    <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-16">
                                        <RefreshCw size={36} className="animate-spin text-amber-400" />
                                        <span className="text-sm font-bold">Rendering high-resolution certificate...</span>
                                    </div>
                                ) : previewModal.canvasDataUrl ? (
                                    <div className="relative max-w-full max-h-[56vh] flex items-center justify-center">
                                        <img
                                            src={previewModal.canvasDataUrl}
                                            alt={`${previewModal.previewParticipant.name} Certificate Preview`}
                                            className="max-h-[54vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-slate-700/80 ring-1 ring-white/10"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-slate-400 text-sm">No preview available</div>
                                )}
                            </div>

                            {/* Live Coordinate & Font Size Tuner Sidebar */}
                            {showPreviewTuner && (
                                <div className="w-full lg:w-[410px] bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 shrink-0">
                                    {/* Tuner Header */}
                                    <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <Sliders size={14} className="text-amber-400" />
                                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                                    Live Layout Tuner
                                                </h4>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[260px]">
                                                Editing: <span className="text-amber-300 font-semibold">{previewModal.activeTier}</span>
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Live Canvas Sync
                                        </span>
                                    </div>

                                    {/* Tuner Navigation Tabs */}
                                    <div className="grid grid-cols-5 bg-slate-950/50 p-1 border-b border-slate-800 text-xs">
                                        {(['name', 'regNo', 'credit', 'certId', 'qrCode'] as const).map(tab => {
                                            const isEnabled = tab === 'name' ? previewLayout.name?.enabled !== false
                                                : tab === 'regNo' ? previewLayout.regNo?.enabled !== false
                                                    : tab === 'credit' ? (previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false
                                                        : tab === 'certId' ? previewLayout.certId?.enabled !== false
                                                            : previewLayout.qrCode?.enabled !== false

                                            const labels = {
                                                name: `👤 Name${!isEnabled ? ' (Off)' : ''}`,
                                                regNo: `🆔 RegNo${!isEnabled ? ' (Off)' : ''}`,
                                                credit: `🎓 Credit${!isEnabled ? ' (Off)' : ''}`,
                                                certId: `🔖 ID${!isEnabled ? ' (Off)' : ''}`,
                                                qrCode: `📱 QR${!isEnabled ? ' (Off)' : ''}`
                                            }
                                            const isActive = previewTunerTab === tab
                                            return (
                                                <button
                                                    key={tab}
                                                    type="button"
                                                    onClick={() => setPreviewTunerTab(tab)}
                                                    className={`py-1.5 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer ${isActive
                                                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                                                        : isEnabled
                                                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                            : 'text-rose-400/80 hover:text-rose-300 hover:bg-slate-800/80'
                                                        }`}
                                                >
                                                    {labels[tab]}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Tuner Control Fields */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                                        {/* TAB 1: NAME CONTROLS */}
                                        {previewTunerTab === 'name' && (
                                            <div className="space-y-4">
                                                {/* Status & Remove/Restore Box Control */}
                                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${previewLayout.name?.enabled !== false
                                                    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${previewLayout.name?.enabled !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                        <span className="font-bold text-[11px]">
                                                            {previewLayout.name?.enabled !== false ? 'Active on Certificate' : 'Name Box Removed'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePreviewLayout(prev => ({
                                                            ...prev,
                                                            name: { ...prev.name, enabled: prev.name?.enabled === false ? true : false }
                                                        }))}
                                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${previewLayout.name?.enabled !== false
                                                            ? 'bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                                            }`}
                                                    >
                                                        {previewLayout.name?.enabled !== false ? (
                                                            <>
                                                                <Trash2 size={12} />
                                                                <span>Remove Box</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} />
                                                                <span>Restore Box</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Font Size */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Name Font Size</label>
                                                        <span className="text-xs font-mono font-bold text-amber-400">
                                                            {previewLayout.name.fontSize}px
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, fontSize: Math.max(20, prev.name.fontSize - 20) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-20</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, fontSize: Math.max(20, prev.name.fontSize - 5) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-5</button>
                                                        <input
                                                            type="range"
                                                            min={30}
                                                            max={600}
                                                            step={5}
                                                            value={previewLayout.name.fontSize}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10)
                                                                handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, fontSize: val } }))
                                                            }}
                                                            className="flex-1 accent-amber-400 cursor-pointer"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, fontSize: Math.min(800, prev.name.fontSize + 5) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+5</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, fontSize: Math.min(800, prev.name.fontSize + 20) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+20</button>
                                                    </div>
                                                </div>

                                                {/* Auto-Fit / Placeholder Max Width */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-300 block">
                                                                Placeholder Max Width (Auto-Fit)
                                                            </label>
                                                            <span className="text-[10px] text-slate-500">
                                                                Long names auto-scale so they never overflow
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-sky-400">
                                                            {previewLayout.name.maxWidth || 3800}px
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={1000}
                                                        max={6500}
                                                        step={50}
                                                        value={previewLayout.name.maxWidth || 3800}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, maxWidth: val } }))
                                                        }}
                                                        className="w-full accent-sky-400 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Vertical Position (Y) */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Vertical Position (Y)</label>
                                                        <span className="text-xs font-mono font-bold text-emerald-400">
                                                            Y: {previewLayout.name.y}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, y: Math.max(0, prev.name.y - 50) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-50</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, y: Math.max(0, prev.name.y - 10) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-10</button>
                                                        <input
                                                            type="range"
                                                            min={100}
                                                            max={templateDimensions.height || 5000}
                                                            step={10}
                                                            value={previewLayout.name.y}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10)
                                                                handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, y: val } }))
                                                            }}
                                                            className="flex-1 accent-emerald-400 cursor-pointer"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, y: prev.name.y + 10 } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+10</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, y: prev.name.y + 50 } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+50</button>
                                                    </div>
                                                </div>

                                                {/* Horizontal Position (X) */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Horizontal Position (X)</label>
                                                        <span className="text-xs font-mono font-bold text-purple-400">
                                                            X: {previewLayout.name.x}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, x: Math.max(0, prev.name.x - 50) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-50</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, x: Math.max(0, prev.name.x - 10) } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >-10</button>
                                                        <input
                                                            type="range"
                                                            min={100}
                                                            max={templateDimensions.width || 7500}
                                                            step={10}
                                                            value={previewLayout.name.x}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10)
                                                                handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, x: val } }))
                                                            }}
                                                            className="flex-1 accent-purple-400 cursor-pointer"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, x: prev.name.x + 10 } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+10</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, x: prev.name.x + 50 } }))}
                                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-bold cursor-pointer"
                                                        >+50</button>
                                                    </div>
                                                </div>

                                                {/* Text Color & Align */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Color</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={previewLayout.name.color}
                                                                onChange={(e) => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, color: e.target.value } }))}
                                                                className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                                                            />
                                                            <span className="font-mono text-[11px] text-slate-300 font-bold">{previewLayout.name.color}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                                                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Align</label>
                                                        <div className="flex items-center gap-1">
                                                            {(['left', 'center', 'right'] as CanvasTextAlign[]).map(al => (
                                                                <button
                                                                    key={al}
                                                                    type="button"
                                                                    onClick={() => handleUpdatePreviewLayout(prev => ({ ...prev, name: { ...prev.name, align: al } }))}
                                                                    className={`flex-1 py-1 rounded text-[10px] font-bold capitalize cursor-pointer ${previewLayout.name.align === al ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                                                                        }`}
                                                                >
                                                                    {al}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 2: REG NO CONTROLS */}
                                        {previewTunerTab === 'regNo' && (
                                            <div className="space-y-4">
                                                {/* Status & Remove/Restore Box Control */}
                                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${previewLayout.regNo?.enabled !== false
                                                    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${previewLayout.regNo?.enabled !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                        <span className="font-bold text-[11px]">
                                                            {previewLayout.regNo?.enabled !== false ? 'Active on Certificate' : 'Reg No Box Removed'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePreviewLayout(prev => ({
                                                            ...prev,
                                                            regNo: { ...prev.regNo, enabled: prev.regNo?.enabled === false ? true : false }
                                                        }))}
                                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${previewLayout.regNo?.enabled !== false
                                                            ? 'bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                                            }`}
                                                    >
                                                        {previewLayout.regNo?.enabled !== false ? (
                                                            <>
                                                                <Trash2 size={12} />
                                                                <span>Remove Box</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} />
                                                                <span>Restore Box</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Reg No Font Size</label>
                                                        <span className="text-xs font-mono font-bold text-amber-400">{previewLayout.regNo.fontSize}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={10}
                                                        max={250}
                                                        step={5}
                                                        value={previewLayout.regNo.fontSize}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, regNo: { ...prev.regNo, fontSize: val } }))
                                                        }}
                                                        className="w-full accent-amber-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position Y</label>
                                                        <span className="text-xs font-mono font-bold text-emerald-400">Y: {previewLayout.regNo.y}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.height || 5000}
                                                        step={10}
                                                        value={previewLayout.regNo.y}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, regNo: { ...prev.regNo, y: val } }))
                                                        }}
                                                        className="w-full accent-emerald-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position X</label>
                                                        <span className="text-xs font-mono font-bold text-purple-400">X: {previewLayout.regNo.x}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.width || 7500}
                                                        step={10}
                                                        value={previewLayout.regNo.x}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, regNo: { ...prev.regNo, x: val } }))
                                                        }}
                                                        className="w-full accent-purple-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400">Prefix</label>
                                                    <input
                                                        type="text"
                                                        value={previewLayout.regNo.prefix}
                                                        placeholder="e.g. Reg No: "
                                                        onChange={(e) => handleUpdatePreviewLayout(prev => ({ ...prev, regNo: { ...prev.regNo, prefix: e.target.value } }))}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: ACADEMIC CREDIT / TRACK CONTROLS */}
                                        {previewTunerTab === 'credit' && (
                                            <div className="space-y-4">
                                                {/* Status & Remove/Restore Box Control */}
                                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${(previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false
                                                    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${(previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                        <span className="font-bold text-[11px]">
                                                            {(previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? 'Active on Certificate' : 'Credit Box Removed'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePreviewLayout(prev => ({
                                                            ...prev,
                                                            credit: {
                                                                ...DEFAULT_CREDIT_LAYOUT,
                                                                ...(prev.credit || {}),
                                                                enabled: (prev.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) === false ? true : false
                                                            }
                                                        }))}
                                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${(previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false
                                                            ? 'bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                                            }`}
                                                    >
                                                        {(previewLayout.credit?.enabled ?? DEFAULT_CREDIT_LAYOUT.enabled) !== false ? (
                                                            <>
                                                                <Trash2 size={12} />
                                                                <span>Remove Box</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} />
                                                                <span>Restore Box</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Text for 2nd Year */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-amber-400">2nd Year Text</label>
                                                        <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={previewLayout.credit?.text2ndYear ?? DEFAULT_CREDIT_LAYOUT.text2ndYear}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            handleUpdatePreviewLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    text2ndYear: val
                                                                }
                                                            }))
                                                        }}
                                                        placeholder="Non CGPA - Group 3"
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                                                    />
                                                </div>

                                                {/* Text for 3rd & 4th Year */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-emerald-400">3rd & 4th Year Text</label>
                                                        <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={previewLayout.credit?.text3rd4thYear ?? DEFAULT_CREDIT_LAYOUT.text3rd4thYear}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            handleUpdatePreviewLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    text3rd4thYear: val
                                                                }
                                                            }))
                                                        }}
                                                        placeholder="2 EE credit"
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                                                    />
                                                </div>

                                                {/* Font Size */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Credit Font Size</label>
                                                        <span className="text-xs font-mono font-bold text-amber-400">
                                                            {previewLayout.credit?.fontSize ?? DEFAULT_CREDIT_LAYOUT.fontSize}px
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={10}
                                                        max={300}
                                                        step={2}
                                                        value={previewLayout.credit?.fontSize ?? DEFAULT_CREDIT_LAYOUT.fontSize}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    fontSize: val
                                                                }
                                                            }))
                                                        }}
                                                        className="w-full accent-amber-400 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Position Y */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position Y</label>
                                                        <span className="text-xs font-mono font-bold text-emerald-400">
                                                            Y: {previewLayout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.height || 5000}
                                                        step={10}
                                                        value={previewLayout.credit?.y ?? DEFAULT_CREDIT_LAYOUT.y}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    y: val
                                                                }
                                                            }))
                                                        }}
                                                        className="w-full accent-emerald-400 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Position X */}
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position X</label>
                                                        <span className="text-xs font-mono font-bold text-purple-400">
                                                            X: {previewLayout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.width || 7500}
                                                        step={10}
                                                        value={previewLayout.credit?.x ?? DEFAULT_CREDIT_LAYOUT.x}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({
                                                                ...prev,
                                                                credit: {
                                                                    ...DEFAULT_CREDIT_LAYOUT,
                                                                    ...(prev.credit || {}),
                                                                    x: val
                                                                }
                                                            }))
                                                        }}
                                                        className="w-full accent-purple-400 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 3: CERT ID CONTROLS */}
                                        {previewTunerTab === 'certId' && (
                                            <div className="space-y-4">
                                                {/* Status & Remove/Restore Box Control */}
                                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${previewLayout.certId?.enabled !== false
                                                    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${previewLayout.certId?.enabled !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                        <span className="font-bold text-[11px]">
                                                            {previewLayout.certId?.enabled !== false ? 'Active on Certificate' : 'Cert ID Box Removed'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePreviewLayout(prev => ({
                                                            ...prev,
                                                            certId: { ...prev.certId, enabled: prev.certId?.enabled === false ? true : false }
                                                        }))}
                                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${previewLayout.certId?.enabled !== false
                                                            ? 'bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                                            }`}
                                                    >
                                                        {previewLayout.certId?.enabled !== false ? (
                                                            <>
                                                                <Trash2 size={12} />
                                                                <span>Remove Box</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} />
                                                                <span>Restore Box</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Cert ID Font Size</label>
                                                        <span className="text-xs font-mono font-bold text-amber-400">{previewLayout.certId.fontSize}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={10}
                                                        max={250}
                                                        step={5}
                                                        value={previewLayout.certId.fontSize}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, certId: { ...prev.certId, fontSize: val } }))
                                                        }}
                                                        className="w-full accent-amber-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position Y</label>
                                                        <span className="text-xs font-mono font-bold text-emerald-400">Y: {previewLayout.certId.y}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.height || 5000}
                                                        step={10}
                                                        value={previewLayout.certId.y}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, certId: { ...prev.certId, y: val } }))
                                                        }}
                                                        className="w-full accent-emerald-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position X</label>
                                                        <span className="text-xs font-mono font-bold text-purple-400">X: {previewLayout.certId.x}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={templateDimensions.width || 7500}
                                                        step={10}
                                                        value={previewLayout.certId.x}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, certId: { ...prev.certId, x: val } }))
                                                        }}
                                                        className="w-full accent-purple-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400">Prefix</label>
                                                    <input
                                                        type="text"
                                                        value={previewLayout.certId.prefix}
                                                        placeholder="e.g. ID: "
                                                        onChange={(e) => handleUpdatePreviewLayout(prev => ({ ...prev, certId: { ...prev.certId, prefix: e.target.value } }))}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 4: QR CODE CONTROLS */}
                                        {previewTunerTab === 'qrCode' && (
                                            <div className="space-y-4">
                                                {/* Status & Remove/Restore Box Control */}
                                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${previewLayout.qrCode?.enabled !== false
                                                    ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${previewLayout.qrCode?.enabled !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                        <span className="font-bold text-[11px]">
                                                            {previewLayout.qrCode?.enabled !== false ? 'Active on Certificate' : 'QR Code Box Removed'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdatePreviewLayout(prev => ({
                                                            ...prev,
                                                            qrCode: { ...prev.qrCode, enabled: prev.qrCode?.enabled === false ? true : false }
                                                        }))}
                                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${previewLayout.qrCode?.enabled !== false
                                                            ? 'bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/60'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                                            }`}
                                                    >
                                                        {previewLayout.qrCode?.enabled !== false ? (
                                                            <>
                                                                <Trash2 size={12} />
                                                                <span>Remove Box</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} />
                                                                <span>Restore Box</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">QR Code Size</label>
                                                        <span className="text-xs font-mono font-bold text-amber-400">{previewLayout.qrCode.size}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={100}
                                                        max={1800}
                                                        step={20}
                                                        value={previewLayout.qrCode.size}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, qrCode: { ...prev.qrCode, size: val } }))
                                                        }}
                                                        className="w-full accent-amber-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position Y</label>
                                                        <span className="text-xs font-mono font-bold text-emerald-400">Y: {previewLayout.qrCode.y}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={50}
                                                        max={templateDimensions.height || 5000}
                                                        step={10}
                                                        value={previewLayout.qrCode.y}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, qrCode: { ...prev.qrCode, y: val } }))
                                                        }}
                                                        className="w-full accent-emerald-400 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-slate-300">Position X</label>
                                                        <span className="text-xs font-mono font-bold text-purple-400">X: {previewLayout.qrCode.x}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={50}
                                                        max={templateDimensions.width || 7500}
                                                        step={10}
                                                        value={previewLayout.qrCode.x}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10)
                                                            handleUpdatePreviewLayout(prev => ({ ...prev, qrCode: { ...prev.qrCode, x: val } }))
                                                        }}
                                                        className="w-full accent-purple-400 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tuner Bottom Save Bar */}
                                    <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSavePreviewLayout}
                                            disabled={savingPreviewTuner}
                                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${previewTunerSavedSuccess
                                                ? 'bg-blue-700 text-white'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                        >
                                            {savingPreviewTuner ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>Saving to Supabase Cloud DB...</span>
                                                </>
                                            ) : previewTunerSavedSuccess ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    <span>Coordinates Saved to Cloud DB!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={15} />
                                                    <span>Save Coordinates to Cloud DB</span>
                                                </>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-slate-400 text-center">
                                            Saves layout for <strong className="text-slate-200">{previewModal.activeTier}</strong> to Supabase DB.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Toolbar */}
                        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                                <span>Dynamic scannable QR code & tamper-proof verification ID included.</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                                {/* Shortcut Save Button in Footer if Tuner is open */}
                                {showPreviewTuner && (
                                    <button
                                        type="button"
                                        onClick={handleSavePreviewLayout}
                                        disabled={savingPreviewTuner}
                                        className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Save coordinates to Supabase Cloud Database"
                                    >
                                        <Save size={14} />
                                        <span>{savingPreviewTuner ? 'Saving...' : previewTunerSavedSuccess ? 'Saved!' : 'Save Coordinates'}</span>
                                    </button>
                                )}

                                {/* Download Current Student PNG */}
                                <button
                                    type="button"
                                    onClick={() => downloadSingle({
                                        participant: previewModal.previewParticipant,
                                        certCode: previewModal.certCode || 'CERT-PREV',
                                        canvasDataUrl: previewModal.canvasDataUrl,
                                        tier: previewModal.activeTier || getParticipantAwardTier(previewModal.previewParticipant)
                                    })}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                                    title="Download this student's certificate as PNG"
                                >
                                    <FileImage size={14} className="text-sky-400" />
                                    <span>Download Student PNG</span>
                                </button>

                                {/* Download Whole Category Archive */}
                                <button
                                    type="button"
                                    onClick={() => downloadCategoryCertificates(previewModal.category.id)}
                                    disabled={downloadingCategory || previewModal.category.count === 0}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                                    title={`Download all ${previewModal.category.count} certificates in this category as PNGs`}
                                >
                                    <Download size={14} className={downloadingCategory ? 'animate-bounce' : ''} />
                                    <span>
                                        {downloadingCategory ? 'Packaging...' : `Download All ${previewModal.category.shortName} PNGs (${previewModal.category.count})`}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation & Status Pop-up Modal */}
            {popupModal?.isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setPopupModal(null)}
                >
                    <div
                        className="relative w-full max-w-lg bg-black border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-white space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setPopupModal(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 p-1.5 rounded-xl transition-all cursor-pointer"
                            title="Close modal"
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Header */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl shrink-0 shadow-sm bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                {popupModal.type === 'error' ? (
                                    <AlertCircle size={28} />
                                ) : popupModal.category === 'winners' ? (
                                    <Trophy size={28} />
                                ) : (
                                    <CheckCircle2 size={28} />
                                )}
                            </div>
                            <div className="space-y-1 pr-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-blue-600/20 text-blue-300 border-blue-500/30">
                                        {popupModal.category === 'winners' ? 'Database Updated' : popupModal.category === 'template' ? 'Template Saved' : 'Notification'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white leading-snug">
                                    {popupModal.title}
                                </h3>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    {popupModal.message}
                                </p>
                            </div>
                        </div>

                        {/* Details List */}
                        {popupModal.details && popupModal.details.length > 0 && (
                            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                    Saved Configuration Details:
                                </div>
                                <div className="space-y-1.5">
                                    {popupModal.details.map((detail, idx) => (
                                        <div key={idx} className="text-xs text-gray-200 flex items-start gap-2">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            <span className="leading-relaxed">{detail}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extra Note */}
                        {popupModal.extraNote && (
                            <div className="bg-blue-950/40 border border-blue-800/40 text-blue-200 text-xs p-3 rounded-xl flex items-start gap-2.5">
                                <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{popupModal.extraNote}</span>
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className="pt-2 flex items-center justify-end">
                            <button
                                type="button"
                                id="modal-confirm-btn"
                                onClick={() => setPopupModal(null)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Got it, thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Real-time Non-blocking Download Progress Modal */}
            {downloadProgress.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-black border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                <Download size={28} className="animate-bounce" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                                        Fast Packaging
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {downloadProgress.current} / {downloadProgress.total} Complete
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white leading-tight">
                                    Exporting {downloadProgress.categoryLabel}
                                </h3>
                            </div>
                        </div>

                        {/* Progress Bar & Percentage */}
                        <div className="space-y-2.5 bg-gray-950 border border-gray-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-gray-300 truncate max-w-[280px]">
                                    {downloadProgress.stage || 'Rendering certificates...'}
                                </span>
                                <span className="text-blue-400 font-black text-sm">
                                    {downloadProgress.percent}%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${Math.max(4, downloadProgress.percent)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                                <span>High-Speed Native PNG Engine</span>
                                <span className="text-blue-400 font-medium">Responsive</span>
                            </div>
                        </div>

                        {/* Informational tip */}
                        <div className="bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs p-3 rounded-xl flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="text-blue-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed text-[11px]">
                                Main-thread yielding is active on each certificate. Your browser stays completely responsive without freezing or lagging.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
