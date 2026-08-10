import type { Metadata } from "next";
import {
  Heebo,
  Assistant,
  Rubik,
  Varela_Round,
  Noto_Sans_Hebrew,
} from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["hebrew", "latin"],
  weight: "400",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-sans-hebrew",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "OpenForm - יצירת טפסים מעוצבים",
  description:
    "בניית טפסים מרשימים בסגנון TypeForm תוך דקות. חינם ובקוד פתוח.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${heebo.variable} ${assistant.variable} ${rubik.variable} ${varelaRound.variable} ${notoSansHebrew.variable} antialiased`}
      >
        <DirectionProvider dir="rtl">{children}</DirectionProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
