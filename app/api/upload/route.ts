import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(
      "https://publisher.walrus-testnet.walrus.space/v1/blobs",
      {
        method: "PUT",
        body,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      }
    );
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Walrus upload failed", details: text },
        { status: response.status }
      );
    }
    const result = await response.json();
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}