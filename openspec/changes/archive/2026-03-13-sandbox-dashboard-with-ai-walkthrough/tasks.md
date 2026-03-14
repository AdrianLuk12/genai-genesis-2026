## 1. Project Setup

- [x] 1.1 Initialize monorepo structure with `/control-panel-ui`, `/control-panel-api`, and `/target-app-template` directories
- [x] 1.2 Initialize `/target-app-template` as a Next.js 14+ App Router project with Tailwind CSS and better-sqlite3 and @faker-js/faker dependencies
- [x] 1.3 Initialize `/control-panel-ui` as a Next.js 14+ App Router project with Tailwind CSS and shadcn/ui
- [x] 1.4 Initialize `/control-panel-api` as a Python FastAPI project with docker-py, supabase-py, and uvicorn dependencies
- [x] 1.5 Create Supabase project and configure tables (`scenarios`, `active_containers`) and storage bucket (`scenario_files`)
- [x] 1.6 Create `.env.example` files for both API (Supabase keys, Docker config) and UI (API URL) services

## 2. Target App — Database and Seeding

- [x] 2.1 Create SQLite schema initialization script with tables: `products`, `orders`, `order_items`, `cart_items`
- [x] 2.2 Implement Faker.js seed script that reads `SCENARIO_CONFIG` env var and populates the database according to parameters (`product_count`, `buyer_count`, `inventory_status`, `order_count`, `category_list`)
- [x] 2.3 Add entrypoint logic: check if `/app/data/store.db` exists; if not, run schema init + seed script
- [x] 2.4 Verify seed script handles all inventory_status modes (high, low, mixed) and default parameters

## 3. Target App — Product Listing Page

- [x] 3.1 Create API route (`/api/products`) to fetch all products from SQLite
- [x] 3.2 Build product listing page at `/` with responsive grid of product cards (name, price, stock, Add to Cart button)
- [x] 3.3 Add `data-testid` and `aria-label` attributes to all product card elements (`add-to-cart-btn-{id}`)
- [x] 3.4 Handle empty product state with "No products available" message

## 4. Target App — Cart and Checkout

- [x] 4.1 Create API routes for cart operations: `POST /api/cart` (add item), `GET /api/cart` (list items), `DELETE /api/cart/{id}` (remove item)
- [x] 4.2 Create API route for checkout: `POST /api/checkout` (create order from cart, clear cart)
- [x] 4.3 Build cart page at `/cart` showing cart items with quantities, prices, totals, and checkout button
- [x] 4.4 Add cart count indicator to navigation bar
- [x] 4.5 Add `data-testid` attributes to cart elements (`checkout-btn`, `quantity-input-{id}`, `remove-item-btn-{id}`)
- [x] 4.6 Ensure all cart/order writes use synchronous better-sqlite3 operations

## 5. Target App — Admin Dashboard

- [x] 5.1 Create API routes for admin data: `GET /api/admin/inventory`, `GET /api/admin/orders`
- [x] 5.2 Build admin dashboard page at `/admin` with inventory data table (Name, Stock, Price, Category) and recent orders table (Order ID, Buyer, Total, Status, Date)
- [x] 5.3 Add `data-testid` attributes to admin elements (`inventory-table`, `orders-table`)

## 6. Target App — Navigation and Layout

- [x] 6.1 Create persistent navigation bar with links to Products (`/`), Cart (`/cart`), Admin (`/admin`) with `data-testid` attributes (`nav-products`, `nav-cart`, `nav-admin`)
- [x] 6.2 Create root layout with semantic HTML structure (`nav`, `main` elements)

## 7. Target App — Docker Image

- [x] 7.1 Create `Dockerfile` for target-app-template (Node 20 Alpine, build and serve Next.js, expose port 3000)
- [x] 7.2 Create `.dockerignore` to exclude node_modules, .next cache, .git
- [x] 7.3 Build and test Docker image locally, verify seed script runs and app serves correctly

## 8. Control Panel API — Project Setup and Core

- [x] 8.1 Set up FastAPI app with CORS middleware allowing `http://localhost:3000`
- [x] 8.2 Implement Supabase client initialization using environment variables
- [x] 8.3 Implement Docker client initialization with connectivity check
- [x] 8.4 Implement `GET /api/health` endpoint returning API and Docker status

## 9. Control Panel API — Scenario Management Endpoints

- [x] 9.1 Implement `GET /api/scenarios` — list all scenarios from Supabase
- [x] 9.2 Implement `GET /api/scenarios/{id}` — get single scenario
- [x] 9.3 Implement `POST /api/scenarios` — create scenario with name, description, config_json
- [x] 9.4 Implement `DELETE /api/scenarios/{id}` — delete scenario and associated .db file from storage
- [x] 9.5 Implement `POST /api/scenarios/{id}/upload-db` — upload .db file to Supabase Storage and update scenario record

## 10. Control Panel API — Sandbox Provisioning Endpoints

- [x] 10.1 Implement port allocation logic (track used ports 8001–8050, find available port)
- [x] 10.2 Implement `POST /api/sandboxes` — fetch scenario from Supabase, download .db file, run Docker container with mounted .db and SCENARIO_CONFIG env var, expose on available port, record in active_containers, return sandbox_url
- [x] 10.3 Implement `GET /api/sandboxes` — list all active sandbox containers from Supabase
- [x] 10.4 Implement `DELETE /api/sandboxes/{container_id}` — stop/remove container, free port, delete active_containers record
- [x] 10.5 Implement `POST /api/cleanup` — stop/remove all containers with `sandbox-platform=true` label, clear active_containers

## 11. Control Panel API — Walkthrough Capture Endpoint

- [x] 11.1 Implement `POST /api/sandboxes/{container_id}/save` — pause container, extract .db via docker cp, upload to Supabase Storage, create new scenario with parent_scenario_id, destroy container
- [x] 11.2 Handle save failure: unpause container and return error if extraction or upload fails
- [x] 11.3 Support optional name/description in request body, auto-generate name if not provided

## 12. Control Panel UI — Dashboard Page

- [x] 12.1 Build dashboard page at `/` with active sandboxes list (fetched from `GET /api/sandboxes`)
- [x] 12.2 Add sandbox cards showing scenario name, sandbox URL (clickable link), port, and action buttons (Save State, Destroy)
- [x] 12.3 Add quick-launch section showing top 3 recent scenarios with launch buttons
- [x] 12.4 Handle empty state with message and link to `/scenarios`

## 13. Control Panel UI — Scenario Browser Page

- [x] 13.1 Build scenario browser page at `/scenarios` listing all scenarios (fetched from `GET /api/scenarios`)
- [x] 13.2 Add "Launch Sandbox" button on each scenario card that calls `POST /api/sandboxes`
- [x] 13.3 Add scenario creation form (name, description, config JSON textarea) that calls `POST /api/scenarios`
- [x] 13.4 Show loading indicators during sandbox provisioning and redirect to sandbox view on success

## 14. Control Panel UI — Sandbox View Page

- [x] 14.1 Build sandbox view page at `/sandbox/[id]` with iframe embedding the sandbox URL
- [x] 14.2 Add "Save Walkthrough State" button with confirmation dialog, calls `POST /api/sandboxes/{id}/save`
- [x] 14.3 Add "Destroy Sandbox" button with confirmation dialog, calls `DELETE /api/sandboxes/{id}`
- [x] 14.4 Show success/error feedback and redirect to dashboard after actions complete

## 15. Integration Testing and Polish

- [x] 15.1 End-to-end test: create a scenario, launch a sandbox, verify target app loads in browser, add items to cart, save walkthrough state, verify new scenario appears
- [x] 15.2 Verify all API endpoints appear correctly in FastAPI auto-generated Swagger docs at `/docs`
- [x] 15.3 Verify all target app elements have correct `data-testid` and `aria-label` attributes
- [x] 15.4 Add cleanup endpoint test: launch multiple sandboxes, call cleanup, verify all removed
