import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = db
    .prepare("SELECT id, name, stock_quantity, price, category FROM products")
    .all();
  return NextResponse.json(products);
}
