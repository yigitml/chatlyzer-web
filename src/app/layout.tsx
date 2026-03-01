import "./globals.css";
import { Metadata } from "next";
import Providers from "@/frontend/providers/providers";
import { Space_Mono, Syne } from "next/font/google";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Chatlyzer",
  description: "Analyze your conversations and talk to them",
  icons: {
    icon: "/iconsvg.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={`${spaceMono.variable} ${syne.variable} font-mono bg-background min-h-screen antialiased text-foreground selection:bg-black selection:text-[#F2F1EC]`}>
        {/* Fixed Organic Background Layer (Placeholder) */}
        <div
          id="organic-background"
          className="fixed inset-0 -z-10 bg-[url('/images/organic-bg-placeholder.jpg')] bg-cover bg-center bg-no-repeat transition-all duration-1000 opacity-90"
        />
        {/* Main Content Scroll Layer */}
        <div id="main-content" className="relative z-0 min-h-screen flex flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
