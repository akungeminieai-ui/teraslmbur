import type { Metadata } from 'next';
import { Settings as SettingsIcon, Globe, DollarSign, Printer, Bell, Shield } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Settings' };

const settingsSections = [
  {
    icon: Globe,
    title: 'General',
    description: 'Restaurant name, address, timezone, and locale settings.',
    items: ['Store Name: Teras Lmbur', 'Timezone: Africa/Cairo', 'Language: English'],
  },
  {
    icon: DollarSign,
    title: 'Finance',
    description: 'Currency, tax rate, and payment method configuration.',
    items: ['Currency: EGP', 'Tax Rate: 14%', 'Rounding: Nearest 0.25'],
  },
  {
    icon: Printer,
    title: 'Printers',
    description: 'Configure kitchen, bar, and receipt printers.',
    items: ['Kitchen Printer: Not configured', 'Receipt Printer: Not configured', 'Bar Printer: Not configured'],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure notification channels and alerts.',
    items: ['WebSocket: Enabled', 'Email: Not configured', 'WhatsApp: Not configured'],
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Password policies, session timeout, and 2FA settings.',
    items: ['Session Timeout: 15 min', '2FA: Disabled', 'Password Policy: Strong'],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your restaurant system preferences."
        icon={SettingsIcon}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--muted-foreground)]/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{section.description}</p>
                  <div className="mt-3 space-y-1">
                    {section.items.map((item) => (
                      <p key={item} className="text-xs text-[var(--muted-foreground)]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
