import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import AuthWrapper from "@/components/AuthWrapper";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alimama CMS",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>

      <body className={`antialiased`}>
        <ThemeProvider>
          <AuthWrapper>{children}</AuthWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
      
    </html>
  );
}