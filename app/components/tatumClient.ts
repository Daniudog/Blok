export const TATUM_API_KEY = "t-6a1a30d498b58da41d4fd506-1b89b400edb1484ba29b7596";
export const TATUM_RPC_URL = "https://sui-testnet.gateway.tatum.io";

export async function tatumRpc(method: string, params: unknown[] = []) {
  const response = await fetch(TATUM_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TATUM_API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  if (!response.ok) throw new Error("Tatum RPC request failed");
  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}