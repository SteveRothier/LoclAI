import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SerwistProvider } from "@/components/pwa/SerwistProvider";
import "./globals.css";
import "highlight.js/styles/github-dark.min.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "LoclAI";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description:
    "Alternative à ChatGPT entièrement hors ligne. Conversations et inférence via Ollama sur votre machine.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const swDisabled = process.env.NODE_ENV === "development";

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;try{var t=localStorage.getItem("loclai-theme");var dark=false;if(t==="dark")dark=true;else if(t!=="light")dark=window.matchMedia("(prefers-color-scheme: dark)").matches;if(dark)d.classList.add("dark");var s=localStorage.getItem("loclai-sidebar-open");d.setAttribute("data-sidebar",s==="0"?"collapsed":"open");}catch(e){d.setAttribute("data-sidebar","open");}requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add("theme-ready");});});})();`,
          }}
        />
      </head>
      <body className="h-full">
        <SerwistProvider swUrl="/serwist/sw.js" disable={swDisabled}>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
