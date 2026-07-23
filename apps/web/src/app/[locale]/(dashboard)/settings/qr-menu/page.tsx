/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { QrCode, Download, Printer, ExternalLink, Copy, Check, Share2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppToast } from '@/hooks/use-app-toast';

/**
 * QR Menu Settings Page
 * Generates and displays QR code that points to the customer self-ordering page.
 * Allows configuration of social media links shown on customer checkout page.
 */
export default function QrMenuSettingsPage() {
  const toast = useAppToast();
  const [copied, setCopied] = React.useState(false);
  const qrCanvasRef = React.useRef<HTMLDivElement>(null);

  // Social media links state
  const [whatsapp, setWhatsapp] = React.useState('');
  const [instagram, setInstagram] = React.useState('');
  const [tiktok, setTiktok] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('teras_social_links');
      if (saved) {
        const parsed = JSON.parse(saved);
        setWhatsapp(parsed.whatsapp || '');
        setInstagram(parsed.instagram || '');
        setTiktok(parsed.tiktok || '');
      } else {
        setWhatsapp('https://chat.whatsapp.com/your-group-link');
        setInstagram('https://instagram.com/teraslmbur');
        setTiktok('https://tiktok.com/@teraslmbur');
      }
    } catch {
      // Ignore error
    }
  }, []);

  const handleSaveSocials = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { whatsapp, instagram, tiktok };
      localStorage.setItem('teras_social_links', JSON.stringify(data));
      window.dispatchEvent(new Event('teras_social_links_updated'));
      setIsSaved(true);
      toast.rawSuccess('Link media sosial berhasil disimpan!');
      setTimeout(() => setIsSaved(false), 2000);
    } catch {
      toast.rawError('Gagal menyimpan link media sosial');
    }
  };

  // Construct the self-order URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'id' : 'id';
  const orderUrl = `${baseUrl}/${locale}/order`;

  // QR Code image URL using Google Charts API (reliable, no dependencies)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(orderUrl)}&bgcolor=09090b&color=f97316&format=png&margin=20`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      toast.rawSuccess('URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.rawError('Failed to copy URL');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `teras-lmbur-qr-menu.png`;
    link.click();
    toast.rawSuccess('QR Code downloaded!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code Menu — Teras Lmbur</title>
            <style>
              body { 
                margin: 0; 
                padding: 40px; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh;
                font-family: system-ui, sans-serif;
                background: white;
              }
              .brand { 
                font-size: 28px; 
                font-weight: 900; 
                color: #f97316; 
                margin-bottom: 8px; 
                letter-spacing: -0.5px;
              }
              .subtitle { 
                font-size: 14px; 
                color: #666; 
                margin-bottom: 32px; 
              }
              img { 
                width: 300px; 
                height: 300px;
                border: 3px solid #f97316;
                border-radius: 16px;
                padding: 8px;
              }
              .url { 
                margin-top: 24px; 
                font-size: 11px; 
                color: #999; 
                word-break: break-all; 
                text-align: center;
                max-width: 300px;
              }
              .instruction {
                margin-top: 16px;
                font-size: 16px;
                font-weight: 600;
                color: #333;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="brand">Teras Lmbur</div>
            <div class="subtitle">Self-Order Menu</div>
            <img src="${qrImageUrl}" alt="QR Code Menu" />
            <div class="instruction">Scan untuk lihat menu & pesan</div>
            <div class="url">${orderUrl}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border border-[var(--border)] bg-[var(--card)] p-5 rounded-[20px] shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight leading-none">
              QR Menu & Media Sosial
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 font-medium">
              Generate QR code untuk customer self-ordering & kelola link media sosial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--card)] cursor-pointer transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white cursor-pointer transition-all shadow-sm shadow-brand-500/10"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Preview */}
        <div className="border border-[var(--border)] bg-[var(--card)] rounded-[20px] p-8 flex flex-col items-center justify-center" ref={qrCanvasRef}>
          <div className="rounded-2xl border-2 border-brand-500/30 p-4 bg-[var(--background)]">
            <img
              src={qrImageUrl}
              alt="QR Code Menu"
              className="w-64 h-64 rounded-xl"
              loading="lazy"
            />
          </div>

          <h3 className="text-lg font-black text-brand-500 mt-5 tracking-tight">
            Teras Lmbur
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Scan untuk lihat menu & pesan
          </p>
        </div>

        {/* URL, Social Links & Instructions */}
        <div className="space-y-4">
          {/* Order URL */}
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-[20px] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Self-Order URL</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 flex items-center overflow-hidden">
                <span className="text-xs text-[var(--muted-foreground)] font-mono truncate">{orderUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className={cn(
                  "h-10 w-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all shrink-0",
                  copied
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <a
                href={orderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-brand-500 cursor-pointer transition-colors shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Social Media Links Form */}
          <form onSubmit={handleSaveSocials} className="border border-[var(--border)] bg-[var(--card)] rounded-[20px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Link Media Sosial Customer</h3>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Link ini akan muncul di halaman sukses pesanan customer agar mereka bisa follow & bergabung.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] block mb-1">
                  WhatsApp Group Link
                </label>
                <input
                  type="url"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] block mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] block mb-1">
                  TikTok URL
                </label>
                <input
                  type="url"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className={cn(
                "flex items-center justify-center gap-2 w-full h-9 rounded-xl text-xs font-bold transition-all cursor-pointer",
                isSaved
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/10"
              )}
            >
              {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {isSaved ? 'Tersimpan!' : 'Simpan Link Sosmed'}
            </button>
          </form>

          {/* Instructions */}
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-[20px] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Cara Penggunaan</h3>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Download / Print QR Code', desc: 'Unduh atau print QR code lalu pasang di area bar/counter.' },
                { step: '2', title: 'Customer Scan QR', desc: 'Customer yang datang scan QR code menggunakan kamera HP.' },
                { step: '3', title: 'Pilih Menu & Pesan', desc: 'Customer browse menu, pilih item, dan submit pesanan.' },
                { step: '4', title: 'Konfirmasi & Proses', desc: 'Pesanan masuk di POS (status PENDING). Konfirmasi untuk kirim ke dapur.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-brand-500">{item.step}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)]">{item.title}</h4>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
