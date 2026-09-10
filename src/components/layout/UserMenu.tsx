import { useNavigate } from 'react-router-dom'
import { ChevronDown, Gauge, LogOut, Monitor, Moon, Repeat, Settings, Sun } from 'lucide-react'
import type { User } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown'
import { SegmentedControl } from '@/components/ui/tabs'

export function UserMenu({ user }: { user: User }) {
  const { signOut, signInAs, isDemoMode } = useAuth()
  const { mode, setMode } = useTheme()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-tight rounded-md pl-hair pr-tight transition-colors hover:bg-surface-hover"
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <ChevronDown className="size-3.5 text-fg-tertiary" aria-hidden />
        </button>
      </DropdownTrigger>

      <DropdownContent className="w-[260px] max-w-[calc(100vw-1.5rem)]">
        <div className="flex items-center gap-snug px-tight py-tight">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-fg">{user.name}</p>
            <p className="truncate text-sm text-fg-secondary">{user.email}</p>
            <div className="mt-hair flex items-center gap-tight">
              <Badge tone={user.role === 'admin' ? 'primary' : 'neutral'}>
                {user.role === 'admin' ? 'Admin' : 'Sales'}
              </Badge>
              <span className="truncate text-2xs text-fg-tertiary">{user.team}</span>
            </div>
          </div>
        </div>

        <DropdownSeparator />

        <DropdownItem icon={<Gauge className="size-4" />} onSelect={() => navigate('/progress')}>
          My progress
        </DropdownItem>
        <DropdownItem icon={<Settings className="size-4" />} onSelect={() => navigate('/settings')}>
          Settings
        </DropdownItem>

        <DropdownSeparator />

        <DropdownLabel>Theme</DropdownLabel>
        <div className="px-tight pb-tight pt-hair">
          <SegmentedControl<ThemeMode>
            value={mode}
            onChange={setMode}
            size="sm"
            ariaLabel="Colour theme"
            options={[
              { value: 'light', label: 'Light', icon: <Sun className="size-3.5" /> },
              { value: 'dark', label: 'Dark', icon: <Moon className="size-3.5" /> },
              { value: 'system', label: 'Auto', icon: <Monitor className="size-3.5" /> },
            ]}
          />
        </div>

        <DropdownSeparator />

        {/* Demo mode only. With Supabase connected, role is a server-side fact
            and authService refuses this call - so the control is not merely
            hidden here, it does not work. */}
        {isDemoMode ? (
          <>
            <DropdownLabel>Demo mode</DropdownLabel>
            <DropdownItem
              icon={<Repeat className="size-4" />}
              onSelect={() => void signInAs(user.role === 'admin' ? 'sales' : 'admin')}
            >
              Switch to {user.role === 'admin' ? 'sales' : 'admin'} view
            </DropdownItem>
            <DropdownSeparator />
          </>
        ) : null}

        <DropdownItem icon={<LogOut className="size-4" />} destructive onSelect={() => void signOut()}>
          Sign out
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  )
}
