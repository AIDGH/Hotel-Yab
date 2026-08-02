import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "هتل‌یاب | کشف هتل از مسیر آدم‌های شناخته‌شده",
    template: "%s | هتل‌یاب",
  },
  description:
    "هتل‌ها را از مسیر اقامت‌ها و حضورهای مستند چهره‌ها، ورزشکاران، هنرمندان و اینفلوئنسرها کشف کنید.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
