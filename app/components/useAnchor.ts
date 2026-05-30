import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";

export function useAnchor() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const anchorBlob = useCallback(async (
    blobId: string,
    fileName: string,
    isPublic: boolean
  ): Promise<string | null> => {
    if (!account) return null;

    try {
      const tx = new Transaction();
      tx.setGasBudget(10000000);

      const memo = JSON.stringify({
        app: "blok",
        blobId,
        fileName,
        isPublic,
        timestamp: Date.now(),
      });

      const [coin] = tx.splitCoins(tx.gas, [0]);
      tx.transferObjects([coin], account.address);
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(memo)));

      const result = await signAndExecute({ transaction: tx });
      console.log("Blok anchored on Sui via Tatum RPC:", result.digest);
      return result.digest;
    } catch (e) {
      console.error("Anchor failed:", e);
      return null;
    }
  }, [account, signAndExecute]);

  return { anchorBlob };
}