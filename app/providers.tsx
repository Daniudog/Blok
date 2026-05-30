"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

const TATUM_API_KEY = "t-6a1a30d498b58da41d4fd506-1b89b400edb1484ba29b7596";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          testnet: {
            url: `https://sui-testnet.tatum.io`,
            network: "testnet" as const,
            fetch: (url: string, options?: RequestInit) =>
              fetch(url, {
                ...options,
                headers: {
                  ...((options?.headers as Record<string, string>) || {}),
                  "x-api-key": TATUM_API_KEY,
                },
              }),
          },
        }}
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}