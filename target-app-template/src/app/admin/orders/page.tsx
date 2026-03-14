"use client";

import { useEffect, useState } from "react";

interface Order {
  id: number;
  buyer_name: string;
  total: number;
  status: string;
  created_at: string;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    delivered: "bg-[#f1f8f5] text-[#008060] border-[#b5dead]",
    shipped: "bg-[#eef9fb] text-[#00788c] border-[#a4e8f2]",
    pending: "bg-[#fdf8e8] text-[#b98900] border-[#e8d48a]",
  };
  return styles[status] || styles.pending;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="h-8 w-32 bg-[#e1e3e5] rounded animate-pulse mb-6" />
        <div className="bg-white rounded-xl border border-[#e1e3e5] h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#202223]">Orders</h1>
        <p className="text-sm text-[#6d7175] mt-1">{orders.length} total orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-[#e1e3e5] rounded-lg p-1 w-fit">
        {(["all", "pending", "shipped", "delivered"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab
                ? "bg-white text-[#202223] shadow-sm"
                : "text-[#6d7175] hover:text-[#202223]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs text-[#8c9196]">{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <table data-testid="orders-table" className="w-full">
          <thead>
            <tr className="bg-[#fafbfb] border-b border-[#e1e3e5]">
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Order</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Date</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Customer</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Total</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#6d7175] text-sm">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors cursor-pointer">
                  <td className="py-3 px-5">
                    <span className="text-sm font-medium text-[#008060]">#{o.id}</span>
                  </td>
                  <td className="py-3 px-5 text-sm text-[#6d7175]">{o.created_at}</td>
                  <td className="py-3 px-5 text-sm text-[#202223]">{o.buyer_name}</td>
                  <td className="py-3 px-5 text-sm font-medium text-[#202223]">${o.total.toFixed(2)}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(o.status)}`}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
