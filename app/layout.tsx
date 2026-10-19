import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto, Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { dirFor, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const robotoHeading = Roboto({ subsets: ["latin"], variable: "--font-heading" });

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist/Roboto carry no Hebrew or Arabic glyphs; globals.css swaps the sans
// and heading stacks to Rubik for those locales.
const rubik = Rubik({
  subsets: ["latin", "hebrew", "arabic"],
  variable: "--font-rubik",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout");
  return {
    title: {
      default: "AnswerAI",
      template: "%s · AnswerAI",
    },
    description: t("metaDescription"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Cookie-selected UI language (i18n/request.ts); drives text direction too.
  const locale = (await getLocale()) as Locale;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        geistSans.variable,
        robotoHeading.variable,
        geistMono.variable,
        rubik.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
