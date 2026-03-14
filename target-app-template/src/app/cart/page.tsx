"use client";

import { useEffect, useState } from "react";

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  stock_quantity: number;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function removeItem(id: number) {
    await fetch(`/api/cart/${id}`, { method: "DELETE" });
    setItems(items.filter((item) => item.id !== id));
  }

  async function checkout() {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setMessage(`Order #${data.order_id} placed successfully!`);
      setItems([]);
    } else {
      setMessage(data.error || "Checkout failed");
    }
  }

  if (loading) return <p>Loading...</p>;

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cart</h1>
      {message && (
        <div className="bg-green-100 border border-green-300 text-green-800 p-3 rounded mb-4">
          {message}
        </div>
      )}
      {items.length === 0 && !message ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : items.length > 0 ? (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-left py-2">Price</th>
                <th className="text-left py-2">Quantity</th>
                <th className="text-left py-2">Total</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.name}</td>
                  <td className="py-3">${item.price.toFixed(2)}</td>
                  <td className="py-3">
                    <input
                      data-testid={`quantity-input-${item.product_id}`}
                      type="number"
                      value={item.quantity}
                      readOnly
                      className="w-16 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="py-3 font-semibold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="py-3">
                    <button
                      data-testid={`remove-item-btn-${item.product_id}`}
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xl font-bold">
              Total: ${total.toFixed(2)}
            </span>
            <button
              data-testid="checkout-btn"
              aria-label="Checkout"
              onClick={checkout}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Checkout
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
