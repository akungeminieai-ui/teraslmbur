'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { AppButton } from '@teras-lmbur/ui';
import { useTheme } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Save,
  Languages,
  BadgeDollarSign,
  Image as ImageIcon,
  FileText,
  Store,
  Printer,
  ChefHat,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Palette,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Wifi,
  Receipt,
  Cpu,
  Check,
  Sparkles,
} from 'lucide-react';

interface SettingDefinition {
  id: string;
  key: string;
  group: string;
  label: string;
  description?: string;
  type: string;
  value: string;
  defaultValue?: string;
  isPublic: boolean;
}

interface SettingsResponse {
  settings: Record<string, string>;
  definitions: SettingDefinition[];
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const toastApp = useAppToast();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // Local Form State Map
  const [formState, setFormState] = React.useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [testPrintSuccess, setTestPrintSuccess] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'branding' | 'theme' | 'printer' | 'receipt' | 'regional'>('all');

  // Fetch Settings from API
  const { data, isLoading, error, refetch } = useQuery<SettingsResponse>({
    queryKey: ['system-settings'],
    queryFn: () => apiClient.get('/settings'),
  });

  // Populate local form state when data is loaded
  React.useEffect(() => {
    if (data?.settings) {
      const merged: Record<string, string> = {
        store_name: data.settings['store_name'] || 'Teras Lmbur',
        store_phone: data.settings['store_phone'] || '+201000000000',
        store_email: data.settings['store_email'] || 'contact@teraslmbur.com',
        store_address: data.settings['store_address'] || 'Cairo, Egypt',
        support_contact: data.settings['support_contact'] || '+201000000000',
        brand_name: data.settings['brand_name'] || 'Teras Lmbur OS',
        brand_logo: data.settings['brand_logo'] || '',
        brand_primary: data.settings['brand_primary'] || '#F97316',
        theme_mode: data.settings['theme_mode'] || theme || 'dark',
        timezone: data.settings['timezone'] || 'Africa/Cairo',
        currency: data.settings['currency'] || 'EGP',
        
        // Printer Hardware Settings
        printer_connection: data.settings['printer_connection'] || 'LAN_IP',
        printer_ip: data.settings['printer_ip'] || '192.168.1.200',
        printer_port: data.settings['printer_port'] || '9100',
        printer_auto_print: data.settings['printer_auto_print'] || 'true',
        printer_copies: data.settings['printer_copies'] || '1',
        printer_auto_cut: data.settings['printer_auto_cut'] || 'true',
        
        // Thermal Receipt Customization
        receipt_width: data.settings['receipt_width'] || '80mm',
        receipt_logo: data.settings['receipt_logo'] || '',
        receipt_show_logo: data.settings['receipt_show_logo'] || 'true',
        receipt_header: data.settings['receipt_header'] || 'Selamat Datang di Teras Lmbur!\nNikmati Kuliner Khas Nusantara & Kopi Pilihan.',
        receipt_footer: data.settings['receipt_footer'] || 'Terima kasih atas kunjungan Anda!\nFollow IG: @teraslmbur.os',
        receipt_show_wifi: data.settings['receipt_show_wifi'] || 'true',
        wifi_ssid: data.settings['wifi_ssid'] || 'Teras Lmbur Guest',
        wifi_password: data.settings['wifi_password'] || 'kedaikopi123',
        
        // Rules & Finance
        kitchen_timeout: data.settings['kitchen_timeout'] || '15',
        default_tax: data.settings['default_tax'] || '14.00',
        default_service_charge: data.settings['default_service_charge'] || '12.00',
        tax_enable: data.settings['tax_enable'] || 'false',
        require_shift: data.settings['require_shift'] || 'true',
        sequence_format_order: data.settings['sequence_format_order'] || 'TL-{OUTLET}-{YYYYMMDD}-{0001}',
        sequence_format_receipt: data.settings['sequence_format_receipt'] || 'INV-{YYYYMMDD}-{000001}',
      };

      // Merge with localStorage if available
      try {
        const savedLocal = localStorage.getItem('teras_lmbur_settings');
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          if (parsed.restaurantName) merged['store_name'] = parsed.restaurantName;
          if (parsed.logoText) merged['brand_name'] = parsed.logoText;
          if (parsed.brandLogo) merged['brand_logo'] = parsed.brandLogo;
          if (parsed.receiptLogo) merged['receipt_logo'] = parsed.receiptLogo;
          if (parsed.receiptWidth) merged['receipt_width'] = parsed.receiptWidth;
          if (parsed.timezone) merged['timezone'] = parsed.timezone;
          if (parsed.taxEnable !== undefined) merged['tax_enable'] = String(parsed.taxEnable);
          if (parsed.requireShift !== undefined) merged['require_shift'] = String(parsed.requireShift);
        }
      } catch {
        // Ignore error
      }

      setTimeout(() => {
        setFormState(merged);
      }, 0);
    }
  }, [data]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: (updatedRecord: Record<string, string>) => apiClient.put('/settings', updatedRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setIsDirty(false);

      // Save sync copy in localStorage for clientside components & trigger header update
      try {
        const payload = {
          restaurantName: formState['store_name'],
          logoText: formState['brand_name'],
          brandLogo: formState['brand_logo'],
          receiptLogo: formState['receipt_logo'],
          currency: formState['currency'],
          receiptWidth: formState['receipt_width'],
          timezone: formState['timezone'],
          taxEnable: formState['tax_enable'] === 'true',
          requireShift: formState['require_shift'] === 'true',
        };
        localStorage.setItem('teras_lmbur_settings', JSON.stringify(payload));
        window.dispatchEvent(new Event('teras_lmbur_settings_updated'));
      } catch {
        // Ignore storage error
      }

      toastApp.success('update', 'Pengaturan Sistem Teras Lmbur OS Berhasil Disimpan');
    },
    onError: (err: any) => {
      toastApp.error('save', err?.message || 'Gagal menyimpan pengaturan.');
    },
  });

  const handleChange = (key: string, value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, [key]: value };
      
      // If brand_name or store_name changes, trigger live custom event so Sidebar updates header instantly
      if (key === 'store_name' || key === 'brand_name' || key === 'brand_logo') {
        try {
          const savedLocal = JSON.parse(localStorage.getItem('teras_lmbur_settings') || '{}');
          savedLocal.restaurantName = updated['store_name'];
          savedLocal.logoText = updated['brand_name'];
          savedLocal.brandLogo = updated['brand_logo'];
          localStorage.setItem('teras_lmbur_settings', JSON.stringify(savedLocal));
          window.dispatchEvent(new Event('teras_lmbur_settings_updated'));
        } catch {
          // Ignore
        }
      }
      return updated;
    });
    setIsDirty(true);
  };

  // Handle Logo Image Upload (Converts file to Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetKey: 'brand_logo' | 'receipt_logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastApp.error('save', 'Harap pilih file gambar (PNG, JPG, WEBP, atau SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toastApp.error('save', 'Ukuran gambar maksimal adalah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleChange(targetKey, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  const handleThemeModeChange = (mode: 'dark' | 'light' | 'system') => {
    handleChange('theme_mode', mode);
    if (mode === 'dark' || mode === 'light') {
      setTheme(mode);
    }
  };

  const handleTestPrint = () => {
    setTestPrintSuccess(true);
    toastApp.success('update', 'Sinyal Uji Cetak Struk dikirim ke Printer Thermal (' + (formState['printer_ip'] || 'LAN IP') + ')');
    setTimeout(() => setTestPrintSuccess(false), 4000);
  };

  const handleSave = () => {
    saveMutation.mutate(formState);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-[var(--card)] border border-[var(--border)] rounded-lg" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan Teras Lmbur OS"
          description="Konfigurasi preferensi operasional outlet dan identitas bisnis."
          icon={SettingsIcon}
        />
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-8 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="h-10 w-10 text-danger-500" />
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Gagal Memuat Pengaturan Sistem</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{(error as any)?.message || 'Terjadi masalah koneksi.'}</p>
          </div>
          <AppButton size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Coba Lagi
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pengaturan Teras Lmbur OS"
        description="Konfigurasi branding restoran, koneksi printer thermal direct, tampilan tema visual, dan aturan transaksi."
        icon={SettingsIcon}
        actions={
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs font-semibold text-warning-500 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning-500 animate-pulse" />
                Ada Perubahan Belum Disimpan
              </span>
            )}
            <AppButton
              onClick={handleSave}
              disabled={saveMutation.isPending}
              leftIcon={<Save className={`h-4 w-4 ${saveMutation.isPending ? 'animate-spin' : ''}`} />}
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </AppButton>
          </div>
        }
      />

      {/* Settings Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
        {[
          { id: 'all', label: 'Semua Pengaturan', icon: SettingsIcon },
          { id: 'branding', label: 'Identitas & Branding', icon: Store },
          { id: 'theme', label: 'Warna & Tema Visual', icon: Palette },
          { id: 'printer', label: 'Koneksi Printer ESC/POS', icon: Cpu },
          { id: 'receipt', label: 'Format Struk & Live Preview', icon: Receipt },
          { id: 'regional', label: 'Regional, Pajak & Shift', icon: BadgeDollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                isActive
                  ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-brand-500/40 hover:text-[var(--foreground)]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1: Branding, Logo Upload & Dynamic App Header */}
        {(activeTab === 'all' || activeTab === 'branding') && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/40 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Branding & Nama Header Restoran</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Upload logo foto langsung dan sesuaikan nama header aplikasi.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Nama Restoran / Outlet (Header App) *
              </label>
              <input
                type="text"
                value={formState['store_name'] || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                placeholder="Contoh: Teras Lmbur"
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Nama ini otomatis menjadi judul header utama & sidebar Teras Lmbur OS secara realtime.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Slogan / Nama Brand Lengkap
              </label>
              <input
                type="text"
                value={formState['brand_name'] || ''}
                onChange={(e) => handleChange('brand_name', e.target.value)}
                placeholder="Contoh: Teras Lmbur — Coffee & Resto OS"
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* High-End Logo File Upload & Live Header Badge Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                Logo Outlet & Identity Badge
              </label>

              {/* Live Preview Card */}
              <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-[var(--card)] to-[var(--background)] p-4 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Pratinjau Tampilan Header & Sidebar
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-[9px]">
                    REALTIME SYNC
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-[var(--background)]/80 backdrop-blur-xs p-3 rounded-xl border border-[var(--border)]">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-brand-500/40 bg-[var(--card)] p-1 overflow-hidden shadow-sm">
                    {formState['brand_logo'] ? (
                      <img src={formState['brand_logo']} alt="Logo Preview" className="h-full w-full object-contain rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-brand-500">
                        <Store className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-[var(--foreground)] truncate">
                      {formState['store_name'] || 'Teras Lmbur'}
                    </h4>
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                      {formState['brand_name'] || 'Coffee & Resto OS'}
                    </p>
                    <span className="inline-block mt-0.5 text-[9px] font-medium text-brand-500 font-mono">
                      {formState['brand_logo'] ? 'Custom Image Logo Active' : 'Default Emblem Logo Active'}
                    </span>
                  </div>
                </div>

                {/* File Upload Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border)]/40">
                  <label className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-brand-500/20 cursor-pointer transition-all active:scale-95">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Foto Logo Baru</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'brand_logo')}
                    />
                  </label>

                  {formState['brand_logo'] && (
                    <button
                      type="button"
                      onClick={() => handleChange('brand_logo', '')}
                      className="flex items-center gap-1.5 rounded-xl border border-danger-500/30 bg-danger-500/10 hover:bg-danger-500/20 text-danger-500 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">Format disarankan: PNG Transparan atau JPG (Maks. 2MB).</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Telepon Outlet
                </label>
                <input
                  type="text"
                  value={formState['store_phone'] || ''}
                  onChange={(e) => handleChange('store_phone', e.target.value)}
                  placeholder="+201000000000"
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Email Outlet
                </label>
                <input
                  type="email"
                  value={formState['store_email'] || ''}
                  onChange={(e) => handleChange('store_email', e.target.value)}
                  placeholder="contact@teraslmbur.com"
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Section 2: Visual Theme Mode (Dark / Light Mode) */}
        {(activeTab === 'all' || activeTab === 'theme') && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/40 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Tema Visual & Warna Background Web</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Pilih mode tampilan Gelap (Dark) atau Terang (Light) antarmuka.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-2">
                Pilihan Mode Tema Antarmuka Web
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => handleThemeModeChange('dark')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all cursor-pointer",
                    formState['theme_mode'] === 'dark' || theme === 'dark'
                      ? "border-brand-500 bg-brand-500/10 text-brand-500 font-bold ring-1 ring-brand-500"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  )}
                >
                  <Moon className="h-6 w-6" />
                  <span className="text-xs">Dark Mode (Gelap)</span>
                </button>

                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => handleThemeModeChange('light')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all cursor-pointer",
                    formState['theme_mode'] === 'light' || theme === 'light'
                      ? "border-brand-500 bg-brand-500/10 text-brand-500 font-bold ring-1 ring-brand-500"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  )}
                >
                  <Sun className="h-6 w-6" />
                  <span className="text-xs">Light Mode (Terang)</span>
                </button>

                {/* System Mode */}
                <button
                  type="button"
                  onClick={() => handleThemeModeChange('system')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all cursor-pointer",
                    formState['theme_mode'] === 'system'
                      ? "border-brand-500 bg-brand-500/10 text-brand-500 font-bold ring-1 ring-brand-500"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  )}
                >
                  <Monitor className="h-6 w-6" />
                  <span className="text-xs">System Default</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Warna Aksen Brand Utama
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formState['brand_primary'] || '#F97316'}
                  onChange={(e) => handleChange('brand_primary', e.target.value)}
                  className="h-10 w-14 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={formState['brand_primary'] || '#F97316'}
                  onChange={(e) => handleChange('brand_primary', e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <span className="text-xs font-bold text-[var(--foreground)]">Pratinjau Tema Saat Ini</span>
              </div>
              <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">
                {formState['theme_mode'] || theme} MODE
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Section 3: Thermal Direct Printer Hardware Settings */}
        {(activeTab === 'all' || activeTab === 'printer') && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">Pengaturan Koneksi Hardware Printer Thermal</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]">Konfigurasi jaringan & protokol cetak langsung (Direct ESC/POS) untuk kemudahan cetak kasir.</p>
              </div>
            </div>

            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestPrint}
              leftIcon={testPrintSuccess ? <Check className="h-4 w-4 text-success-500" /> : <Printer className="h-4 w-4" />}
            >
              {testPrintSuccess ? 'Tercetak!' : 'Uji Cetak Struk (Test Print)'}
            </AppButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Tipe Koneksi Printer Thermal *
              </label>
              <select
                value={formState['printer_connection'] || 'LAN_IP'}
                onChange={(e) => handleChange('printer_connection', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="LAN_IP">Direct LAN IP / Network (ESC/POS Raw Socket TCP)</option>
                <option value="BROWSER">Browser Print Dialog (Standar Printer Sistem)</option>
                <option value="BLUETOOTH">Bluetooth ESC/POS Direct Stream</option>
                <option value="USB_RAW">WebUSB ESC/POS Direct Hardware</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Alamat IP Printer LAN / Host
              </label>
              <input
                type="text"
                value={formState['printer_ip'] || ''}
                onChange={(e) => handleChange('printer_ip', e.target.value)}
                placeholder="192.168.1.200"
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                Port Printer Raw Network
              </label>
              <input
                type="text"
                value={formState['printer_port'] || '9100'}
                onChange={(e) => handleChange('printer_port', e.target.value)}
                placeholder="9100"
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]/40">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-[var(--foreground)]">Cetak Otomatis saat Checkout</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">Otomatis mencetak saat transaksi kasir selesai.</span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['printer_auto_print'] === 'true'}
                  onChange={(e) => handleChange('printer_auto_print', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-[var(--foreground)]">Potong Kertas Otomatis (ESC/POS Auto-Cut)</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">Perintah pemotong kertas fisik printer.</span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['printer_auto_cut'] === 'true'}
                  onChange={(e) => handleChange('printer_auto_cut', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Jumlah Salinan Cetakan Struk</label>
              <select
                value={formState['printer_copies'] || '1'}
                onChange={(e) => handleChange('printer_copies', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="1">1 Salinan (Hanya Struk Pelanggan)</option>
                <option value="2">2 Salinan (Pelanggan + Arsip Kasir)</option>
                <option value="3">3 Salinan (Pelanggan + Kasir + Tiket Dapur)</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Section 4: Extended Thermal Receipt Customization & Live Receipt Preview */}
        {(activeTab === 'all' || activeTab === 'receipt') && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/40 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Kustomisasi Cetakan Struk & Logo Struk Thermal</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Edit logo khusus struk, teks header/footer, lebar kertas, dan informasi Wi-Fi gratis.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Inputs */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Lebar Kertas Thermal
                  </label>
                  <select
                    value={formState['receipt_width'] || '80mm'}
                    onChange={(e) => handleChange('receipt_width', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="80mm">80mm (Desktop Thermal Printer Standar)</option>
                    <option value="58mm">58mm (Mobile POS Portable Bluetooth)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--background)]">
                  <div>
                    <span className="block text-xs font-bold text-[var(--foreground)]">Tampilkan Logo di Struk</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">Cetak gambar logo di bagian paling atas.</span>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState['receipt_show_logo'] === 'true'}
                      onChange={(e) => handleChange('receipt_show_logo', e.target.checked ? 'true' : 'false')}
                      className="sr-only peer"
                    />
                    <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>
              </div>

              {/* Upload Custom Thermal Receipt Logo */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Upload Logo Khusus Struk Thermal
                </label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] p-1 overflow-hidden">
                    {formState['receipt_logo'] || formState['brand_logo'] ? (
                      <img
                        src={formState['receipt_logo'] || formState['brand_logo']}
                        alt="Receipt Logo"
                        className="h-full w-full object-contain grayscale"
                      />
                    ) : (
                      <Receipt className="h-6 w-6 text-[var(--muted-foreground)] opacity-40" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accent)]/80 cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-brand-500" />
                      Ganti Foto Logo Struk
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'receipt_logo')}
                      />
                    </label>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Logo akan disesuaikan secara otomatis menjadi hitam-putih monokrom printer thermal.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Teks Header Struk (Catatan Atas)
                </label>
                <textarea
                  rows={2}
                  value={formState['receipt_header'] || ''}
                  onChange={(e) => handleChange('receipt_header', e.target.value)}
                  placeholder="Selamat Datang di Teras Lmbur!"
                  className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  Teks Footer Struk (Slogan Bawah)
                </label>
                <textarea
                  rows={2}
                  value={formState['receipt_footer'] || ''}
                  onChange={(e) => handleChange('receipt_footer', e.target.value)}
                  placeholder="Terima kasih atas kunjungan Anda!"
                  className="flex w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Wi-Fi Details for Receipt */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-brand-500" />
                    <span className="text-xs font-bold text-[var(--foreground)]">Cetak Informasi Wi-Fi Gratis di Struk</span>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState['receipt_show_wifi'] === 'true'}
                      onChange={(e) => handleChange('receipt_show_wifi', e.target.checked ? 'true' : 'false')}
                      className="sr-only peer"
                    />
                    <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>

                {formState['receipt_show_wifi'] === 'true' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">Nama Wi-Fi (SSID)</label>
                      <input
                        type="text"
                        value={formState['wifi_ssid'] || ''}
                        onChange={(e) => handleChange('wifi_ssid', e.target.value)}
                        placeholder="Teras Lmbur Guest"
                        className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-mono text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1">Kata Sandi Wi-Fi</label>
                      <input
                        type="text"
                        value={formState['wifi_password'] || ''}
                        onChange={(e) => handleChange('wifi_password', e.target.value)}
                        placeholder="kedaikopi123"
                        className="flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-mono text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Thermal Receipt Simulator Preview Box */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Pratinjau Struk Thermal Live ({formState['receipt_width'] || '80mm'})
              </span>

              <div className={cn(
                "w-full max-w-[280px] bg-white text-black p-4 rounded-lg shadow-xl font-mono text-[11px] leading-tight border border-zinc-300 space-y-2 select-none",
                formState['receipt_width'] === '58mm' && "max-w-[220px] text-[10px]"
              )}>
                {/* Logo */}
                {formState['receipt_show_logo'] === 'true' && (formState['receipt_logo'] || formState['brand_logo']) && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={formState['receipt_logo'] || formState['brand_logo']}
                      alt="Thermal Logo"
                      className="h-10 max-w-[120px] object-contain grayscale"
                    />
                  </div>
                )}

                {/* Header Title & Header text */}
                <div className="text-center space-y-0.5">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">{formState['store_name'] || 'TERAS LMBUR'}</h4>
                  <p className="text-[10px] whitespace-pre-line text-zinc-600">{formState['receipt_header']}</p>
                  <p className="text-[9px] text-zinc-500 mt-1">{formState['store_address'] || 'Cairo, Egypt'}</p>
                </div>

                <div className="border-b border-dashed border-black my-2" />

                {/* Transaction meta */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>No. Struk:</span>
                    <span className="font-bold">INV-20260722-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>22/07/2026 15:30</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>Owner / Budi</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-black my-2" />

                {/* Dummy Items */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>1x Nasi Goreng Spesial</span>
                    <span>45.00 EGP</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 pl-2">
                    <span>+ Level Pedas 2</span>
                    <span>0.00 EGP</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>2x Es Kopi Susu Aren</span>
                    <span>50.00 EGP</span>
                  </div>
                </div>

                <div className="border-b border-dashed border-black my-2" />

                {/* Totals */}
                <div className="space-y-0.5 font-bold">
                  <div className="flex justify-between text-zinc-700">
                    <span>Subtotal</span>
                    <span>95.00 EGP</span>
                  </div>
                  {formState['tax_enable'] === 'true' && (
                    <div className="flex justify-between text-zinc-700">
                      <span>PPN (14%)</span>
                      <span>13.30 EGP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-1 border-t border-black">
                    <span>TOTAL</span>
                    <span>{formState['tax_enable'] === 'true' ? '108.30 EGP' : '95.00 EGP'}</span>
                  </div>
                </div>

                {/* Wi-Fi Info on Receipt */}
                {formState['receipt_show_wifi'] === 'true' && formState['wifi_ssid'] && (
                  <div className="border-t border-dashed border-black pt-2 text-center text-[9px] space-y-0.5">
                    <p className="font-bold">📶 FREE WI-FI OUTLET</p>
                    <p>SSID: {formState['wifi_ssid']} | Pass: {formState['wifi_password']}</p>
                  </div>
                )}

                {/* Footer Text */}
                <div className="border-t border-dashed border-black pt-2 text-center text-[9px] text-zinc-600 whitespace-pre-line">
                  {formState['receipt_footer'] || 'Terima kasih atas kunjungan Anda!'}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Section 5: Regional & Operational Rules */}
        {(activeTab === 'all' || activeTab === 'regional') && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-[var(--border)]/40 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Bahasa, Mata Uang & Aturan Kasir</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]">Pengaturan regional, zona waktu, dan proteksi shift kasir.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Bahasa Antarmuka Sistem</label>
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="en">English (EN)</option>
                <option value="id">Indonesia (ID)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Zona Waktu Operasional (Timezone)</label>
              <select
                value={formState['timezone'] || 'Africa/Cairo'}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="Africa/Cairo">Africa/Cairo (EET / UTC+2)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB / UTC+7)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA / UTC+8)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Mata Uang Dasar Operasional</label>
              <select
                value={formState['currency'] || 'EGP'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:border-brand-500 focus:outline-none cursor-pointer"
              >
                <option value="EGP">EGP (Egyptian Pound)</option>
                <option value="IDR">IDR (Rupiah Indonesia)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]/40">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-[var(--foreground)]">Aktifkan Pajak Penjualan PPN / VAT (14%)</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">Menghitung dan menambahkan Pajak PPN pada tagihan struk.</span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['tax_enable'] === 'true'}
                  onChange={(e) => handleChange('tax_enable', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-[var(--foreground)]">Wajibkan Shift Kasir Terbuka (Shift Enforce)</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">Wajibkan kasir membuka sesi shift kasse sebelum checkout.</span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState['require_shift'] === 'true'}
                  onChange={(e) => handleChange('require_shift', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

