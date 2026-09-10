import type { Team, User } from '@/types'
import { daysAgo } from './rng'

const t = (team: Team) => team

export const users: User[] = [
  {
    id: 'usr-admin-jason',
    name: 'Jason Tajor',
    email: 'jason@kco.ph',
    role: 'admin',
    status: 'active',
    jobTitle: 'Sales Training Lead',
    team: t('Training'),
    joinedAt: daysAgo(420),
    lastActiveAt: daysAgo(0, 1),
  },
  {
    id: 'usr-admin-mariel',
    name: 'Mariel Santos',
    email: 'mariel@kco.ph',
    role: 'admin',
    status: 'active',
    jobTitle: 'Chat Support Manager',
    team: t('Chat Support'),
    joinedAt: daysAgo(380),
    lastActiveAt: daysAgo(0, 4),
  },
  {
    id: 'usr-admin-rico',
    name: 'Rico Villanueva',
    email: 'rico@kco.ph',
    role: 'admin',
    status: 'active',
    jobTitle: 'Operations Supervisor',
    team: t('Operations'),
    joinedAt: daysAgo(300),
    lastActiveAt: daysAgo(2),
  },

  { id: 'usr-01', name: 'Andrea Lopez', email: 'andrea.lopez@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(210), lastActiveAt: daysAgo(0, 2) },
  { id: 'usr-02', name: 'Bryan Dela Cruz', email: 'bryan.delacruz@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(195), lastActiveAt: daysAgo(0, 6) },
  { id: 'usr-03', name: 'Camille Reyes', email: 'camille.reyes@kco.ph', role: 'sales', status: 'active', jobTitle: 'Senior Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(340), lastActiveAt: daysAgo(1) },
  { id: 'usr-04', name: 'Dennis Aquino', email: 'dennis.aquino@kco.ph', role: 'sales', status: 'active', jobTitle: 'Field Sales Representative', team: t('Field Sales'), joinedAt: daysAgo(150), lastActiveAt: daysAgo(1, 3) },
  { id: 'usr-05', name: 'Erika Mendoza', email: 'erika.mendoza@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(120), lastActiveAt: daysAgo(0, 1) },
  { id: 'usr-06', name: 'Francis Bautista', email: 'francis.bautista@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(95), lastActiveAt: daysAgo(3) },
  { id: 'usr-07', name: 'Grace Navarro', email: 'grace.navarro@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(88), lastActiveAt: daysAgo(0, 5) },
  { id: 'usr-08', name: 'Hector Ramos', email: 'hector.ramos@kco.ph', role: 'sales', status: 'inactive', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(260), lastActiveAt: daysAgo(46) },
  { id: 'usr-09', name: 'Isabel Cruz', email: 'isabel.cruz@kco.ph', role: 'sales', status: 'active', jobTitle: 'Field Sales Representative', team: t('Field Sales'), joinedAt: daysAgo(72), lastActiveAt: daysAgo(2) },
  { id: 'usr-10', name: 'Joel Fernandez', email: 'joel.fernandez@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(64), lastActiveAt: daysAgo(0, 8) },
  { id: 'usr-11', name: 'Katrina Salazar', email: 'katrina.salazar@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(58), lastActiveAt: daysAgo(1, 2) },
  { id: 'usr-12', name: 'Lester Ocampo', email: 'lester.ocampo@kco.ph', role: 'sales', status: 'pending', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(4), lastActiveAt: daysAgo(4) },
  { id: 'usr-13', name: 'Michelle Torres', email: 'michelle.torres@kco.ph', role: 'sales', status: 'active', jobTitle: 'Senior Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(310), lastActiveAt: daysAgo(0, 3) },
  { id: 'usr-14', name: 'Nathan Guzman', email: 'nathan.guzman@kco.ph', role: 'sales', status: 'active', jobTitle: 'Field Sales Representative', team: t('Field Sales'), joinedAt: daysAgo(41), lastActiveAt: daysAgo(5) },
  { id: 'usr-15', name: 'Olivia Pascual', email: 'olivia.pascual@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(37), lastActiveAt: daysAgo(0, 7) },
  { id: 'usr-16', name: 'Paolo Rivera', email: 'paolo.rivera@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(29), lastActiveAt: daysAgo(1) },
  { id: 'usr-17', name: 'Queenie Domingo', email: 'queenie.domingo@kco.ph', role: 'sales', status: 'pending', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(2), lastActiveAt: daysAgo(2) },
  { id: 'usr-18', name: 'Rafael Ignacio', email: 'rafael.ignacio@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(178), lastActiveAt: daysAgo(0, 9) },
  { id: 'usr-19', name: 'Sofia Marquez', email: 'sofia.marquez@kco.ph', role: 'sales', status: 'active', jobTitle: 'Senior Field Sales Rep', team: t('Field Sales'), joinedAt: daysAgo(290), lastActiveAt: daysAgo(3) },
  { id: 'usr-20', name: 'Tomas Bello', email: 'tomas.bello@kco.ph', role: 'sales', status: 'inactive', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(230), lastActiveAt: daysAgo(61) },
  { id: 'usr-21', name: 'Ursula Kim', email: 'ursula.kim@kco.ph', role: 'sales', status: 'active', jobTitle: 'Chat Support Agent', team: t('Chat Support'), joinedAt: daysAgo(140), lastActiveAt: daysAgo(0, 2) },
  { id: 'usr-22', name: 'Victor Alonzo', email: 'victor.alonzo@kco.ph', role: 'sales', status: 'active', jobTitle: 'Phone Sales Agent', team: t('Phone Sales'), joinedAt: daysAgo(110), lastActiveAt: daysAgo(2, 4) },
]

export const userById = (id: string) => users.find((u) => u.id === id)

/**
 * The two accounts demo mode offers. Used only when no Supabase project is
 * configured; with a real backend these ids do not exist and the constants are
 * unreferenced by any live code path.
 */
export const DEMO_ADMIN_ID = 'usr-admin-jason'
export const DEMO_SALES_ID = 'usr-01'

export const DEMO_ADMIN_EMAIL = 'jason@kco.ph'
export const DEMO_SALES_EMAIL = 'andrea.lopez@kco.ph'
