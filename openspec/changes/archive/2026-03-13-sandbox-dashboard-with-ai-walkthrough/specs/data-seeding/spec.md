## ADDED Requirements

### Requirement: Seed database from scenario configuration
The system SHALL run a Faker.js-based seed script inside the target app container on startup to populate the SQLite database according to the scenario JSON parameters. The seed script SHALL only run if no pre-existing .db file is mounted.

#### Scenario: Seed with scenario parameters
- **WHEN** a container starts with `SCENARIO_CONFIG={"buyer_count": 50, "inventory_status": "low", "product_count": 20}` and no .db file exists at `/app/data/store.db`
- **THEN** the seed script creates the database with 20 products (with low stock quantities), 50 buyer names in recent orders, and appropriate cart and order data

#### Scenario: Skip seeding when database exists
- **WHEN** a container starts and a .db file already exists at `/app/data/store.db`
- **THEN** the seed script does not run and the existing database is used as-is

### Requirement: Support configurable scenario parameters
The seed script SHALL support the following JSON configuration parameters:
- `product_count` (integer, default 25): number of products to generate
- `buyer_count` (integer, default 30): number of unique buyer names in orders
- `inventory_status` ("high" | "low" | "mixed", default "mixed"): controls stock quantity ranges
- `order_count` (integer, default 40): number of fake orders to generate
- `category_list` (string array, optional): product categories to use

#### Scenario: High inventory configuration
- **WHEN** seed runs with `{"inventory_status": "high", "product_count": 10}`
- **THEN** all 10 products have stock_quantity between 50 and 500

#### Scenario: Low inventory configuration
- **WHEN** seed runs with `{"inventory_status": "low", "product_count": 10}`
- **THEN** all 10 products have stock_quantity between 0 and 10

#### Scenario: Mixed inventory configuration
- **WHEN** seed runs with `{"inventory_status": "mixed", "product_count": 10}`
- **THEN** products have varied stock_quantity values spanning both low and high ranges

#### Scenario: Default parameters
- **WHEN** seed runs with an empty config `{}`
- **THEN** the database is populated with 25 products, 30 buyers, 40 orders, mixed inventory, and default categories

### Requirement: Generate realistic fake data
The seed script SHALL use Faker.js to generate realistic product names, descriptions, prices, buyer names, and order data. Products SHALL have plausible e-commerce attributes.

#### Scenario: Realistic product data
- **WHEN** seed generates products
- **THEN** each product has a non-empty name, description (1-3 sentences), price (between $1.00 and $999.99), a placeholder image_url, stock_quantity, and a category

#### Scenario: Realistic order data
- **WHEN** seed generates orders
- **THEN** each order has a buyer_name (full name), total (matching sum of order_items), status (one of "pending", "shipped", "delivered"), and created_at within the last 30 days
