import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Decod3X — Detect AI. Verify Authenticity. Protect Trust.",
    template: "%s · Decod3X",
  },
  description:
    "AI-powered content detection platform. Detect deepfakes, AI-generated images, and synthetic media with 99.4% accuracy.",
  applicationName: "Decod3X",
  keywords: ["AI detection", "deepfake detection", "synthetic media", "content authenticity"],
  // Icons and social images come from the app/ file conventions:
  //   app/icon.svg            → favicon (vector, crisp at every size)
  //   app/apple-icon.png      → iOS home-screen icon (180×180)
  //   app/opengraph-image.png → link preview card (1200×630)
  //   app/twitter-image.png   → X/Twitter card
  // Next generates the <link>/<meta> tags and cache-busting hashes itself.
  openGraph: {
    title: "Decod3X — Detect AI. Verify Authenticity. Protect Trust.",
    description:
      "Detect deepfakes, AI-generated images, and synthetic media with 99.4% accuracy.",
    siteName: "Decod3X",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decod3X — Detect AI. Verify Authenticity.",
    description: "Detect deepfakes and AI-generated media with 99.4% accuracy.",
  },
  appleWebApp: {
    capable: true,
    title: "Decod3X",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately NOT setting maximumScale — pinch-zoom stays available.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080810" },
    { media: "(prefers-color-scheme: light)", color: "#080810" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
