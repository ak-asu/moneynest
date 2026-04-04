'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageCircle, BarChart2, User, FileText, CheckSquare, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/budget', label: 'Budget', icon: BarChart2 },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/plans', label: 'Plans', icon: CheckSquare },
  { href: '/library', label: 'Library', icon: BookOpen },
] as const

export function AppNav() {
  const pathname = usePathname()
  return (
    <aside className="w-56 border-r border-divider flex flex-col h-full bg-background/80 backdrop-blur-sm shrink-0">
      <div className="p-4 border-b border-divider">
        <p className="font-extrabold text-lg tracking-tight text-primary">Vela</p>
        <p className="text-xs text-default-400">Financial Companion</p>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
              pathname === href
                ? 'bg-primary-100 text-primary font-medium'
                : 'text-default-600 hover:bg-default-100',
            )}
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
