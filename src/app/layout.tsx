import type { Metadata, Viewport } from "next";
import { anton, inter } from "./fonts";
import { publicEnv } from "@/lib/env";
import { COMPANY } from "@/lib/config";
import "./globals.css";

const siteUrl = publicEnv().siteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${COMPANY.name} (${COMPANY.fullName}) — Eventos e bilhetes em Matola`,
    template: `%s · ${COMPANY.name}`,
  },
  description: `Site oficial da ${COMPANY.name} (${COMPANY.fullName}): produção, promoção e organização de eventos e festas em Matola, Moçambique. Good Vibes e outras festas — compre bilhetes com M-Pesa ou e-Mola. ${COMPANY.slogan}`,
  keywords: ["HC Entertainment", "Hot Crazy Entertainment", "HC Entertainment Matola", "festas Matola", "eventos Matola", "Good Vibes", "bilhetes Moçambique", "M-Pesa", "e-Mola"],
  alternates: { canonical: "/" },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  applicationName: COMPANY.name,
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    siteName: COMPANY.name,
    title: `${COMPANY.name} — ${COMPANY.slogan}`,
    description: COMPANY.tagline,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: COMPANY.name }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-MZ" className={`${anton.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-ink text-white">{children}</body>
    </html>
  );
}
