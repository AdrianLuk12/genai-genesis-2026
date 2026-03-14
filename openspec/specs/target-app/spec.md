## ADDED Requirements

### Requirement: Product listing page
The target app SHALL display a product listing page at the root route (`/`) showing all products from the SQLite database in a responsive grid layout. Each product card SHALL show the product name, price, stock status, and an "Add to Cart" button.

#### Scenario: Display products
- **WHEN** a user navigates to `/`
- **THEN** all products from the database are displayed in a grid with name, price, stock quantity, and an "Add to Cart" button on each card

#### Scenario: Empty product list
- **WHEN** a user navigates to `/` and the database has no products
- **THEN** a message "No products available" is displayed

### Requirement: Shopping cart functionality
The target app SHALL provide a cart page at `/cart` where users can view items added to their cart, see quantities and totals, and proceed to a fake checkout. Cart state SHALL be stored in the SQLite database using a session identifier.

#### Scenario: Add item to cart
- **WHEN** a user clicks "Add to Cart" on a product
- **THEN** the item is added to the cart in the database, and the cart count indicator updates

#### Scenario: View cart
- **WHEN** a user navigates to `/cart`
- **THEN** all cart items are displayed with product name, quantity, unit price, and line total, plus an overall cart total

#### Scenario: Fake checkout
- **WHEN** a user clicks "Checkout" on the cart page
- **THEN** an order record is created in the database from the cart items, the cart is cleared, and a confirmation message is shown

### Requirement: Admin dashboard
The target app SHALL provide an admin dashboard at `/admin` showing a data table of current inventory (product name, stock, price) and a table of recent orders (order id, buyer, total, status, date).

#### Scenario: View inventory table
- **WHEN** a user navigates to `/admin`
- **THEN** a table displays all products with columns: Name, Stock, Price, Category

#### Scenario: View recent orders table
- **WHEN** a user navigates to `/admin`
- **THEN** a table displays the most recent 20 orders with columns: Order ID, Buyer, Total, Status, Date

### Requirement: Agent-friendly DOM elements
Every interactive element in the target app MUST have explicit `data-testid` attributes and appropriate `aria-label` attributes for AI agent navigation. The app MUST use semantic HTML elements (button, a, input, nav, main, form).

#### Scenario: Product card accessibility
- **WHEN** the product listing page renders a product card
- **THEN** the "Add to Cart" button has `data-testid="add-to-cart-btn-{productId}"` and `aria-label="Add {productName} to cart"`

#### Scenario: Cart page accessibility
- **WHEN** the cart page renders
- **THEN** the checkout button has `data-testid="checkout-btn"`, quantity inputs have `data-testid="quantity-input-{productId}"`, and remove buttons have `data-testid="remove-item-btn-{productId}"`

#### Scenario: Navigation accessibility
- **WHEN** the app renders its navigation
- **THEN** navigation links have `data-testid="nav-products"`, `data-testid="nav-cart"`, and `data-testid="nav-admin"`

#### Scenario: Admin page accessibility
- **WHEN** the admin dashboard renders
- **THEN** the inventory table has `data-testid="inventory-table"` and the orders table has `data-testid="orders-table"`

### Requirement: Synchronous SQLite writes
The target app MUST write all state changes (cart additions, order creation) synchronously to the SQLite database to ensure state consistency for walkthrough capture. The app SHALL use better-sqlite3 for synchronous database operations.

#### Scenario: Immediate cart persistence
- **WHEN** a user adds an item to cart
- **THEN** the cart_items row is written to SQLite synchronously before the response is sent

#### Scenario: Immediate order persistence
- **WHEN** a user completes checkout
- **THEN** the order and order_items rows are written to SQLite synchronously before the confirmation is shown

### Requirement: SQLite database location
The target app SHALL read and write its SQLite database at the path `/app/data/store.db`. If the file does not exist on startup, the seed script SHALL create it.

#### Scenario: Database file path
- **WHEN** the target app starts
- **THEN** it connects to SQLite at `/app/data/store.db`

### Requirement: Target app navigation
The target app SHALL have a persistent navigation bar with links to Products (`/`), Cart (`/cart`), and Admin (`/admin`).

#### Scenario: Navigation between views
- **WHEN** a user clicks the "Admin" link in the navigation bar
- **THEN** the app navigates to `/admin` and displays the admin dashboard
