"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  price: number;
  category: string;
  image_url: string;
}

function stockBadge(qty: number) {
  if (qty === 0) return "bg-[#fef3f1] text-[#d72c0d] border-[#e8a89a]";
  if (qty <= 10) return "bg-[#fdf8e8] text-[#b98900] border-[#e8d48a]";
  return "bg-[#f1f8f5] text-[#008060] border-[#b5dead]";
}

function stockLabel(qty: number) {
  if (qty === 0) return "Out of stock";
  if (qty <= 10) return "Low stock";
  return "In stock";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="h-8 w-32 bg-[#e1e3e5] rounded animate-pulse mb-6" />
        <div className="bg-white rounded-xl border border-[#e1e3e5] h-96 animate-pulse" />
      </div>
    );
  }

  const lowStockCount = products.filter((p) => p.stock_quantity <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Products</h1>
          <p className="text-sm text-[#6d7175] mt-1">
            {products.length} products &middot;{" "}
            {lowStockCount > 0 && (
              <span className="text-[#b98900]">{lowStockCount} low stock</span>
            )}
            {outOfStockCount > 0 && (
              <span className="text-[#d72c0d]"> &middot; {outOfStockCount} out of stock</span>
            )}
          </p>
        </div>
        <button className="bg-[#008060] text-white px-4 py-2 rounded-lg hover:bg-[#006e52] font-medium text-sm transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]">
          Add product
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-sm relative">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#8c9196" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2">
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#e1e3e5] rounded-lg text-sm text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-[#e1e3e5] rounded-lg px-3 py-2 text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <table data-testid="inventory-table" className="w-full">
          <thead>
            <tr className="bg-[#fafbfb] border-b border-[#e1e3e5]">
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Product</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Category</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Price</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Stock</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#6d7175] text-sm">
                  No products found
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors cursor-pointer">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f6f6f7] rounded-lg border border-[#e1e3e5] shrink-0 overflow-hidden relative">
                        {p.image_url ? (
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="#8c9196">
                              <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[#202223]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-[#6d7175]">{p.category}</td>
                  <td className="py-3 px-5 text-sm text-[#202223]">${p.price.toFixed(2)}</td>
                  <td className="py-3 px-5 text-sm text-[#202223] font-medium">{p.stock_quantity}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${stockBadge(p.stock_quantity)}`}>
                      {stockLabel(p.stock_quantity)}
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
