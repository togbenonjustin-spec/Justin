import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/loyerclair/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LoyerClair — Collecte de loyers par Mobile Money au Bénin",
  description:
    "Encaissez vos loyers par MTN MoMo, Moov Money et Celtiis Cash au Bénin. Chaque paiement génère un reçu officiel vérifiable par QR Code envoyé sur WhatsApp.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B6B4F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
