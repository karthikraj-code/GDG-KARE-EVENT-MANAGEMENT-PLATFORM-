import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDG-KARE Event Management Platform",
  description: "Official event and competition management platform for Google Developer Groups On Campus at Kalasalingam Academy of Research and Education.",
  icons: {
    icon: "/gdg-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/product-sans" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/google-sans" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mortezaom/google-sans-cdn@master/fonts.css" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
