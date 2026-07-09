import { Contact, CreditCard, Settings, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { publicConfig } from '@/lib/publicConfig'

export type SettingsSection = {
  segment: string
  label: string
  icon: LucideIcon
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { segment: 'general', label: 'General', icon: Settings },
  { segment: 'operators', label: 'Operators', icon: Contact },
  { segment: 'labels', label: 'Labels', icon: Tag },
  ...(publicConfig.billing
    ? [{ segment: 'subscription', label: 'Subscription', icon: CreditCard }]
    : []),
]
