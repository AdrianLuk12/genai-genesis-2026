import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = db.prepare("SELECT * FROM products").all();
  return NextResponse.json(products);
}
