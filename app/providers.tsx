"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

async function suiRpcFetch(
  _url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: options?.body,
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          testnet: {
            url: "https://sui-testnet.gateway.tatum.io",
            network: "testnet" as const,
            fetch: suiRpcFetch,
          },
        }}
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}