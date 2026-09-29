import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b-4 border-primary bg-background px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/iconsvg.svg"
            alt="Chatlyzer"
            width={32}
            height={32}
            className="h-8 w-8 border-2 border-primary bg-card p-0.5 shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
          />
          <span className="font-display text-xl font-black uppercase tracking-widest sm:text-2xl">
            Chatlyzer
          </span>
        </Link>
        <Link
          href="/"
          className="border-2 border-primary bg-card px-3 py-2 font-mono text-xs font-black uppercase tracking-widest transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
        >
          Back Home
        </Link>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <div className="mb-10 border-4 border-primary bg-card p-6 shadow-[10px_10px_0px_0px_hsl(var(--primary))] md:p-10">
          <p className="mb-4 font-mono text-sm font-black uppercase tracking-widest text-muted-foreground">
            // {eyebrow}
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl font-mono leading-relaxed text-muted-foreground">
            {summary}
          </p>
          <p className="mt-4 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Effective September 29, 2026
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <section key={section.title} className="border-2 border-primary bg-card p-6 md:p-8">
              <h2 className="mb-4 font-display text-2xl font-black uppercase tracking-wide">
                {String(index + 1).padStart(2, "0")}. {section.title}
              </h2>
              <div className="space-y-4 font-mono leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-4 border-t-4 border-primary pt-8 font-mono text-sm font-black uppercase tracking-widest">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
          <Link href="/contact" className="underline">Contact</Link>
        </nav>
      </main>
    </div>
  );
}
