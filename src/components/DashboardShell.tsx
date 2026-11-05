'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Lightbulb,
    FileText,
    Flag,
    UserCheck,
    Users,
    HeartHandshake,
    Trophy,
    Award,
    Mail,
    Settings,
    CheckSquare,
    Target,
    UserCircle,
    ArrowLeft,
    Menu,
    X,
    LucideIcon
} from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import UserDropdown from '@/components/UserDropdown'
import DashboardRealtimeListener from '@/components/DashboardRealtimeListener'

export type DashboardRole = 'organizer' | 'judge' | 'participant' | 'volunteer'

export interface NavItemConfig {
    label: string
    href: string
    icon: LucideIcon
    badge?: string
    dividerAbove?: boolean
}

// Navigation definitions for each panel role
const ROLE_NAV_ITEMS: Record<DashboardRole, (userRole?: string) => NavItemConfig[]> = {
    organizer: () => [
        { label: 'Dashboard', href: '/dashboard/organizer', icon: LayoutDashboard },
        { label: 'Problem Statements', href: '/dashboard/organizer/problem-statements', icon: Lightbulb },
        { label: 'View Submissions', href: '/dashboard/organizer/submissions', icon: FileText },
        { label: 'Manage Rounds', href: '/dashboard/organizer/rounds', icon: Flag },
        { label: 'Manage Teams', href: '/dashboard/organizer/teams', icon: UserCheck },
        { label: 'Participants', href: '/dashboard/organizer/participants', icon: Users },
        { label: 'Volunteer Attendance', href: '/dashboard/volunteer', icon: HeartHandshake },
        { label: 'Leaderboard Control', href: '/dashboard/organizer/leaderboard', icon: Trophy },
        { label: 'Certificate Studio', href: '/dashboard/organizer/certificates', icon: Award },
        { label: 'Mail Management', href: '/dashboard/organizer/mail', icon: Mail },
        { label: 'Access Settings', href: '/dashboard/organizer/settings', icon: Settings, dividerAbove: true },
    ],
    judge: () => [
        { label: 'Dashboard', href: '/dashboard/judge', icon: LayoutDashboard },
        { label: 'Review Submissions', href: '/dashboard/judge/submissions', icon: CheckSquare },
        { label: 'Marks Criteria & Rubrics', href: '/dashboard/judge/rubrics', icon: Trophy },
        { label: 'Problem Statements', href: '/dashboard/judge/problem-statements', icon: Lightbulb },
    ],
    participant: () => [
        { label: 'Dashboard', href: '/dashboard/participant', icon: LayoutDashboard },
        { label: 'My Team', href: '/dashboard/participant/team', icon: Users },
        { label: 'Problem Statement', href: '/dashboard/participant/problem-statement', icon: Lightbulb },
        { label: 'Rounds', href: '/dashboard/participant/rounds', icon: Target },
        { label: 'Profile', href: '/dashboard/participant/profile', icon: UserCircle },
    ],
    volunteer: (userRole) => {
        const items: NavItemConfig[] = [
            { label: 'Attendance Tracker', href: '/dashboard/volunteer', icon: CheckSquare },
            { label: 'Participants Roster', href: '/dashboard/volunteer/participants', icon: Users },
        ]
        // If an organizer is viewing the volunteer panel, give them a quick link back
        if (userRole === 'organizer') {
            items.push({
                label: 'Back to Organizer',
                href: '/dashboard/organizer',
                icon: ArrowLeft,
                dividerAbove: true
            })
        }
        return items
    }
}

const ROLE_BADGES: Record<DashboardRole, { label: string; icon: LucideIcon }> = {
    organizer: { label: 'Organizer', icon: LayoutDashboard },
    judge: { label: 'Judge Panel', icon: Trophy },
    participant: { label: 'Participant', icon: Users },
    volunteer: { label: 'Volunteer', icon: HeartHandshake },
}

interface DashboardShellProps {
    role: DashboardRole
    title: string
    subtitle?: string
    user: {
        name?: string | null
        email?: string | null
        role?: string | null
    }
    children: React.ReactNode
    showRealtimeListener?: boolean
}

// Determines if a navigation item is active based on exact or specific sub-path match
function isNavItemActive(pathname: string, href: string, allItems: NavItemConfig[]): boolean {
    if (pathname === href) return true

    if (pathname.startsWith(href + '/')) {
        // Prevent parent routes (like /dashboard/organizer) from staying active
        // if a more specific item (like /dashboard/organizer/rounds) matches
        const hasMoreSpecificMatch = allItems.some(
            item =>
                item.href !== href &&
                item.href.startsWith(href) &&
                (pathname === item.href || pathname.startsWith(item.href + '/'))
        )
        return !hasMoreSpecificMatch
    }

    return false
}

export default function DashboardShell({
    role,
    title,
    subtitle,
    user,
    children,
    showRealtimeListener = true
}: DashboardShellProps) {
    const pathname = usePathname()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isDesktopOpen, setIsDesktopOpen] = useState(true)

    // Load desktop sidebar preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('gdg_kare_sidebar_desktop_open')
        if (saved !== null) {
            setIsDesktopOpen(saved === 'true')
        }
    }, [])

    // Close mobile drawer on route change
    useEffect(() => {
        setIsMobileOpen(false)
    }, [pathname])

    // Close mobile drawer on Escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && isMobileOpen) {
                setIsMobileOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMobileOpen])

    const toggleDesktopSidebar = () => {
        setIsDesktopOpen(prev => {
            const next = !prev
            localStorage.setItem('gdg_kare_sidebar_desktop_open', String(next))
            return next
        })
    }

    const toggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsMobileOpen(prev => !prev)
        } else {
            toggleDesktopSidebar()
        }
    }

    const closeSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsMobileOpen(false)
        } else {
            setIsDesktopOpen(false)
            localStorage.setItem('gdg_kare_sidebar_desktop_open', 'false')
        }
    }

    const navItems = ROLE_NAV_ITEMS[role](user?.role || undefined)
    const roleBadge = ROLE_BADGES[role]

    // Shared sidebar content renderer
    const renderSidebarContent = (onLinkClick?: () => void) => (
        <div className="flex flex-col h-full bg-white">
            {/* Sidebar Header with Brand & Close Button */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 min-w-0 group">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <Image
                            src="/gdg-logo.png"
                            alt="GDG Logo"
                            width={24}
                            height={24}
                            className="h-5 w-auto object-contain"
                            priority
                        />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-black tracking-tight text-gray-900 leading-none truncate">
                            GDG-KARE
                        </h2>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            {roleBadge.label}
                        </span>
                    </div>
                </Link>

                {/* Close Menu Button */}
                <button
                    type="button"
                    onClick={closeSidebar}
                    title="Close menu bar"
                    aria-label="Close menu bar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isNavItemActive(pathname, item.href, navItems)

                    return (
                        <div key={item.href}>
                            {item.dividerAbove && (
                                <div className="my-2 border-t border-gray-100" />
                            )}
                            <Link
                                href={item.href}
                                onClick={onLinkClick}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 group cursor-pointer ${
                                    isActive
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-black font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon
                                        size={18}
                                        className={`flex-shrink-0 transition-colors ${
                                            isActive
                                                ? 'text-white'
                                                : 'text-gray-400 group-hover:text-blue-600'
                                        }`}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </div>

                                {isActive ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                                ) : item.badge ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ml-2 flex-shrink-0">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        </div>
                    )
                })}
            </nav>

            {/* Bottom Sign Out Area */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <SignOutButton />
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {showRealtimeListener && <DashboardRealtimeListener />}

            {/* Mobile Drawer Backdrop */}
            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in transition-opacity"
                    aria-hidden="true"
                />
            )}

            {/* Mobile Drawer (Slide-in) */}
            <aside
                className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                }`}
                aria-label="Mobile Navigation"
            >
                {renderSidebarContent(() => setIsMobileOpen(false))}
            </aside>

            {/* Desktop Collapsible Sidebar */}
            <aside
                className={`hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-20 ${
                    isDesktopOpen ? 'w-64' : 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
                }`}
                aria-label="Desktop Navigation"
            >
                <div className="w-64 h-full flex flex-col overflow-hidden">
                    {renderSidebarContent()}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Sticky Top Header */}
                <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* 3 Horizontal Lines (Hamburger Menu) button to toggle/open menu bar */}
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            title={
                                (typeof window !== 'undefined' && window.innerWidth < 768
                                    ? isMobileOpen
                                    : isDesktopOpen)
                                    ? 'Close menu bar'
                                    : 'Open menu bar'
                            }
                            aria-label="Toggle menu bar"
                            className="p-2 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2 flex-shrink-0"
                        >
                            <Menu size={20} />
                            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
                                Menu
                            </span>
                        </button>

                        <div className="flex items-center gap-2.5 min-w-0">
                            <Image
                                src="/gdg-logo.png"
                                alt="GDG Logo"
                                width={28}
                                height={28}
                                className="h-6 w-auto object-contain hidden sm:block flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight truncate">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="text-[11px] text-gray-500 hidden sm:block truncate mt-0.5">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side user info & dropdown */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <UserDropdown
                            user={{
                                name: user?.name,
                                email: user?.email,
                                role: user?.role || role
                            }}
                        />
                    </div>
                </header>

                {/* Dashboard Page Body */}
                <div className="p-4 sm:p-6 md:p-8 flex-1 w-full">
                    {children}
                </div>

                {/* Dashboard Footer */}
                <footer className="border-t border-gray-200 bg-white px-4 md:px-8 py-4 mt-auto">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/group-2b.png"
                                alt="Google Developer Groups On Campus Kalasalingam Academy Of Research & Education"
                                width={170}
                                height={30}
                                className="h-5 w-auto object-contain"
                            />
                            <span className="hidden md:inline-block border-l border-gray-200 pl-3 font-semibold text-[11px] text-gray-700">
                                GDG-KARE Event Management Platform
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Image
                                src="/gdg-logo.png"
                                alt="GDG Logo"
                                width={18}
                                height={18}
                                className="h-3.5 w-auto object-contain"
                            />
                            <p>© {new Date().getFullYear()} GDG-KARE Event Management Platform. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    )
}
