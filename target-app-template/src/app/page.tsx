"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(productId: number) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    window.location.reload();
  }

  if (loading) return <p>Loading...</p>;

  if (products.length === 0) {
    return (
      <p data-testid="empty-products" className="text-gray-500">
        No products available
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            data-testid={`product-card-${product.id}`}
            className="border rounded-lg p-4 flex flex-col"
          >
            <h2 className="font-semibold text-lg">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
            <p className="text-sm text-gray-600 mt-2 flex-1 line-clamp-2">
              {product.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-bold text-lg">
                ${product.price.toFixed(2)}
              </span>
              <span
                className={`text-sm ${
                  product.stock_quantity > 10
                    ? "text-green-600"
                    : product.stock_quantity > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : "Out of stock"}
              </span>
            </div>
            <button
              data-testid={`add-to-cart-btn-${product.id}`}
              aria-label={`Add ${product.name} to cart`}
              onClick={() => addToCart(product.id)}
              disabled={product.stock_quantity === 0}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
