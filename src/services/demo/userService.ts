import type { Paginated, QueryOptions, Role, Team, User, UserStatus } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persistUsers } from '../store'

export interface UserFilters extends QueryOptions {
  role?: Role | 'all'
  status?: UserStatus | 'all'
  team?: Team | 'all'
}

export const userService = {
  async list(opts: UserFilters = {}): Promise<Paginated<User>> {
    const { search = '', role = 'all', status = 'all', team = 'all', page = 1, pageSize = 10, sortBy = 'name', sortDir = 'asc' } = opts

    const q = search.trim().toLowerCase()
    let rows = db.users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false
      if (status !== 'all' && u.status !== status) return false
      if (team !== 'all' && u.team !== team) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.jobTitle.toLowerCase().includes(q)
      )
    })

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const key = sortBy as keyof User
      const av = String(a[key] ?? '')
      const bv = String(b[key] ?? '')
      return av.localeCompare(bv) * dir
    })

    const total = rows.length
    const start = (page - 1) * pageSize
    return delay({ rows: rows.slice(start, start + pageSize), total, page, pageSize })
  },

  async all(): Promise<User[]> {
    return delay(db.users, 120)
  },

  async get(id: string): Promise<User | null> {
    return delay(db.users.find((u) => u.id === id) ?? null, 140)
  },

  async update(id: string, patch: Partial<User>, actorId: string): Promise<User> {
    const user = db.users.find((u) => u.id === id)
    if (!user) throw new Error('User not found')
    Object.assign(user, patch)
    persistUsers()
    if (patch.status === 'inactive') {
      logActivity({ actorId, action: 'user.deactivated', targetLabel: user.name, targetId: user.id })
    }
    return delay(user, 200)
  },

  async invite(input: { name: string; email: string; role: Role; team: Team; jobTitle: string }, actorId: string): Promise<User> {
    const now = new Date().toISOString()
    const user: User = {
      id: uid('usr'),
      ...input,
      status: 'pending',
      joinedAt: now,
      lastActiveAt: now,
    }
    db.users.unshift(user)
    persistUsers()
    logActivity({ actorId, action: 'user.invited', targetLabel: user.name, targetId: user.id })
    return delay(user, 260)
  },
}
