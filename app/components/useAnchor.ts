import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";

const TATUM_API_KEY = "t-6a1a30d498b58da41d4fd506-1b89b400edb1484ba29b7596";

export function useAnchor() {
  const account = useCurrentAccount();
  const client = useSuiClient();
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

      // Verify using Tatum RPC
      await client.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true },
      });

      console.log("Blok anchored on Sui via Tatum:", result.digest);
      return result.digest;
    } catch (e) {
      console.error("Anchor failed:", e);
      return null;
    }
  }, [account, client, signAndExecute]);

  return { anchorBlob };
}