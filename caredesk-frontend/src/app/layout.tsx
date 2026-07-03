import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import LiquidGlassFilter from "@/components/LiquidGlassFilter";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "CareDesk - AI-Powered Chronic Care Companion",
    template: "%s | CareDesk",
  },
  description:
    "Transform chronic illness management with AI-powered medical report analysis, doctor visit coaching, medication tracking, and remote caregiver dashboards.",
  keywords: [
    "health tracking",
    "medical reports",
    "chronic care",
    "caregiver",
    "doctor visits",
    "medication reminders",
    "AI health",
  ],
  authors: [{ name: "CareDesk" }],
  openGraph: {
    title: "CareDesk - AI-Powered Chronic Care Companion",
    description:
      "Transform chronic illness management with AI-powered reports, doctor visit coaching, and remote caregiver dashboards.",
    type: "website",
    siteName: "CareDesk",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareDesk - AI-Powered Chronic Care Companion",
    description:
      "Transform chronic illness management with AI-powered reports, doctor visit coaching, and remote caregiver dashboards.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} h-full`}>
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </head>
        <body className="min-h-full flex flex-col antialiased">
          <LiquidGlassFilter />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
