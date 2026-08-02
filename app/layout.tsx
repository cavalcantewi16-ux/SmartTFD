import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTFD",
  description: "Sistema de Gestão do Transporte de Pacientes",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="h-full antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
