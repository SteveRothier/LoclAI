import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
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

export const metadata: Metadata = {
  title: "LoclAI",
  description:
    "Alternative à ChatGPT entièrement hors ligne. Conversations et inférence via Ollama sur votre machine.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
