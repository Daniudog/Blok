import { NextRequest, NextResponse } from "next/server";

const TATUM_API_KEY = "t-6a1a30d498b58da41d4fd506-1b89b400edb1484ba29b7596";
const TATUM_RPC_URL = "https://sui-testnet.gateway.tatum.io";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(TATUM_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TATUM_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "RPC failed" },
      { status: 500 }
    );
  }
}