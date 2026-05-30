import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const blobId = url.searchParams.get("blobId");
    if (!blobId) return NextResponse.json({ error: "No blob ID" }, { status: 400 });

    const response = await fetch(
      "https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + blobId
    );
    if (!response.ok) throw new Error("Walrus fetch failed");

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
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