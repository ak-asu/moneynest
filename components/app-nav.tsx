'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  BarChart2,
  User,
  FileText,
  CheckSquare,
  BookOpen,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/i18n-provider'
import { LocaleSwitcher } from '@/components/locale-switcher'

const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '/budget', labelKey: 'nav.budget', icon: BarChart2 },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
  { href: '/documents', labelKey: 'nav.documents', icon: FileText },
  { href: '/plans', labelKey: 'nav.plans', icon: CheckSquare },
  { href: '/library', labelKey: 'nav.library', icon: BookOpen },
  { href: '/leaderboard', labelKey: 'nav.leaderboard', icon: Trophy },
] as const

const NAV_COLLAPSED_KEY = 'vela_app_nav_collapsed'

export function AppNav() {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NAV_COLLAPSED_KEY)
      if (stored === '1') setCollapsed(true)
    } catch {
      // Ignore storage errors; nav still works with default state.
    } finally {
      setIsPreferenceLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isPreferenceLoaded) return
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // Ignore storage errors; this only affects preference persistence.
    }
  }, [collapsed, isPreferenceLoaded])

  return (
    <aside
      className={cn(
        'clay-rail-left border-r border-divider flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="p-3 border-b border-divider">
        <div
          className={cn(
            'flex gap-2',
            collapsed
              ? 'w-full flex-col items-center justify-center'
              : 'items-start justify-between'
          )}
        >
          <div className={cn('min-w-0', collapsed && 'w-full text-center')}>
            <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
              <Image
                src="/logo.png"
                alt={t('app.brand')}
                width={26}
                height={26}
                className="shrink-0"
                priority
              />
              {!collapsed && (
                <p className="font-extrabold text-lg tracking-tight text-primary-600">
                  {t('app.brand')}
                </p>
              )}
            </div>
            {!collapsed && <p className="text-xs text-default-500">{t('app.tagline')}</p>}
          </div>
          <button
            type="button"
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            onClick={() => setCollapsed((prev) => !prev)}
            className="clay-btn h-8 w-8 text-default-700 transition-colors grid place-items-center"
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      </div>
      <nav aria-label="Main" className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const label = t(labelKey)

          return (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm transition-colors',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                pathname === href
                  ? 'clay-btn bg-primary/10 text-primary-700 font-semibold border-primary/25'
                  : 'text-default-600 hover:bg-default-100/80'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>
      {!collapsed && (
        <div className="p-2 border-t border-divider">
          <LocaleSwitcher />
        </div>
      )}
      <div className="p-2 border-t border-divider">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? t('nav.signOut') : undefined}
          className={cn(
            'w-full flex items-center rounded-xl text-sm transition-colors text-default-500 hover:bg-danger-50/80 hover:text-danger-600',
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && t('nav.signOut')}
        </button>
      </div>
    </aside>
  )
}
