import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Blok — Encrypted by Default. Permanent by Design.",
  description: "Create, encrypt, and store any file permanently on Walrus. Owned by your wallet forever.",
  keywords: "decentralized storage, Walrus, Sui, encrypted files, Web3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}