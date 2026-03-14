"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  price: number;
  category: string;
}

interface Order {
  id: number;
  buyer_name: string;
  total: number;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/inventory").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ])
      .then(([prods, ords]) => {
        setProducts(prods);
        setOrders(ords);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Inventory</h2>
        <table data-testid="inventory-table" className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Stock</th>
              <th className="text-left py-2 px-3">Price</th>
              <th className="text-left py-2 px-3">Category</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2 px-3">{p.name}</td>
                <td
                  className={`py-2 px-3 ${
                    p.stock_quantity <= 10 ? "text-red-600 font-semibold" : ""
                  }`}
                >
                  {p.stock_quantity}
                </td>
                <td className="py-2 px-3">${p.price.toFixed(2)}</td>
                <td className="py-2 px-3">{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <table data-testid="orders-table" className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-3">Order ID</th>
              <th className="text-left py-2 px-3">Buyer</th>
              <th className="text-left py-2 px-3">Total</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-left py-2 px-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2 px-3">#{o.id}</td>
                <td className="py-2 px-3">{o.buyer_name}</td>
                <td className="py-2 px-3">${o.total.toFixed(2)}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      o.status === "delivered"
                        ? "bg-green-100 text-green-800"
                        : o.status === "shipped"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-2 px-3">{o.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
