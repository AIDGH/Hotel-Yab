import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/components/auth-provider";
import { UserLibraryProvider } from "@/components/user-library-provider";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "هتل‌یاب",
  icons: {
    icon: [
      { url: "/brand/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/brand/hotelyab.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "هتل‌یاب",
    statusBarStyle: "default",
  },
  title: {
    default: "هتل‌یاب | کشف هتل از مسیر آدم‌های شناخته‌شده",
    template: "%s | هتل‌یاب",
  },
  description:
    "هتل‌ها را از مسیر اقامت‌ها و حضورهای مستند چهره‌ها، ورزشکاران، هنرمندان و اینفلوئنسرها کشف کنید.",
};

export const viewport: Viewport = {
  themeColor: "#5046d8",
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
