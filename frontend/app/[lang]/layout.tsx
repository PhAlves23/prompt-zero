import type { Metadata } from "next";
import { Space_Mono, DM_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { getDictionary, hasLocale, type Locale } from "./dictionaries";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-heading'
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans'
});

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono'
});

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  
  if (!hasLocale(lang)) {
    return {
      title: "PromptZero",
      description: "AI prompt management platform",
    };
  }

  const dict = await getDictionary(lang as Locale);
  
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export async function generateStaticParams() {
  return [
    { lang: 'pt-BR' },
    { lang: 'en-US' },
    { lang: 'es-ES' },
  ]
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn("h-full", "antialiased", spaceMono.variable, jetBrainsMono.variable, dmSans.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
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
