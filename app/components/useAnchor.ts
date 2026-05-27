import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";

export function useAnchor() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const anchorBlob = useCallback(async (blobId: string, fileName: string, isPublic: boolean): Promise<string | null> => {
    if (!account) return null;

    try {
      const tx = new Transaction();
      tx.setGasBudget(10000000);

      // Store blob metadata as a Move event on Sui
      // We use a simple transfer of 0 SUI to ourselves with memo
      // This creates a permanent on-chain record of the blob ID
      const memo = JSON.stringify({
        app: "blok",
        blobId,
        fileName,
        isPublic,
        timestamp: Date.now(),
      });

      // Split a zero-value coin and transfer to self as an on-chain record
      const [coin] = tx.splitCoins(tx.gas, [0]);
      tx.transferObjects([coin], account.address);

      // Add memo as pure bytes so it appears in transaction data
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(memo)));

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (e) {
      console.error("Anchor failed:", e);
      return null;
    }
  }, [account, signAndExecute]);

  return { anchorBlob };
}