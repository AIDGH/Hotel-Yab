import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/components/auth-provider";
import { UserLibraryProvider } from "@/components/user-library-provider";
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
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <UserLibraryProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </UserLibraryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
