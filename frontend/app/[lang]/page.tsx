import { getDictionary, hasLocale, type Locale } from "./dictionaries";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang as Locale);

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-32 px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pz-border bg-pz-lime/5 mb-8">
            <span className="font-mono text-xs uppercase tracking-wider text-pz-lime">
              {lang}
            </span>
          </div>
          
          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
            prompt<span className="text-pz-lime">zero</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {dict.meta.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${lang}/auth/register`}
              className="px-7 py-3 bg-pz-lime text-pz-black font-semibold rounded-lg hover:bg-pz-lime/90 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pz-lime-glow cursor-pointer active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={dict.prompts.create}
            >
              {dict.prompts.create}
            </Link>
            <Link
              href={`/${lang}/auth/login`}
              className="px-7 py-3 border border-border bg-transparent text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={dict.nav.docs}
            >
              {dict.auth.login}
            </Link>
          </div>
        </div>

        <div className="mt-16 w-full max-w-2xl">
          <div className="bg-surface border border-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold">{dict.prompts.title}</h3>
              <span className="font-mono text-xs text-pz-lime bg-pz-lime/10 px-3 py-1 rounded-full">
                v1.0
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {dict.prompts.empty}
            </p>
            <div className="flex gap-2">
              <span className="font-mono text-xs px-3 py-1 rounded-full border border-pz-lime/30 bg-pz-lime/10 text-pz-lime">
                {lang}
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full border border-pz-cyan/30 bg-pz-cyan/10 text-pz-cyan">
                i18n
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full border border-pz-violet/30 bg-pz-violet/10 text-pz-violet">
                ready
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
