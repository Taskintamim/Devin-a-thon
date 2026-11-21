import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "CampusFlow OS", template: "%s · CampusFlow OS" },
  description: "Your university life. One intelligent system.",
};

const themeBoot = `try{var t=localStorage.getItem("campusflow-theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Script id="campusflow-theme" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
