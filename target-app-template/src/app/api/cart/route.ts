import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.session_id,
              p.name, p.price, p.stock_quantity
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id`
    )
    .all();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const { product_id, quantity = 1 } = await request.json();

  // Check if item already in cart
  const existing = db
    .prepare(
      "SELECT id, quantity FROM cart_items WHERE product_id = ? AND session_id = 'default'"
    )
    .get(product_id) as { id: number; quantity: number } | undefined;

  if (existing) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(
      existing.quantity + quantity,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO cart_items (session_id, product_id, quantity) VALUES ('default', ?, ?)"
    ).run(product_id, quantity);
  }

  return NextResponse.json({ success: true });
}
