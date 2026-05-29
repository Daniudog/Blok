import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Blok — Encrypted by Default. Permanent by Design.",
  description: "Create, encrypt, and store any file permanently on Walrus. Owned by your wallet forever.",
  keywords: "decentralized storage, Walrus, Sui, encrypted files, Web3",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237c6aff'/><rect x='4' y='4' width='11' height='11' rx='3' fill='white'/><rect x='17' y='4' width='11' height='11' rx='3' fill='white' opacity='0.6'/><rect x='4' y='17' width='11' height='11' rx='3' fill='white' opacity='0.6'/><rect x='17' y='17' width='11' height='11' rx='3' fill='white'/></svg>",
  },
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