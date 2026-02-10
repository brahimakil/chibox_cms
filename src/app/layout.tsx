import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChiHelo Admin",
  description: "ChiHelo CMS Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent Referer header on cross-origin image requests.
            Chinese CDNs (alicdn.com) use hotlink protection that blocks
            requests with unknown Referer values. On Vercel the referer
            would be chibox-cms.vercel.app which gets rejected. */}
        <meta name="referrer" content="same-origin" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
