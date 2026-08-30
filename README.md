# Pet Profit Tracker

Build a complete full-stack web application for managing my Adopt Me pet inventory, purchases, trades, sales, and profit.

TECH STACK:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- Supabase for backend, database, authentication, and persistence

- Recharts for charts if needed

IMPORTANT:

This is NOT a static frontend.

Build the frontend AND backend integration using Supabase.

All important data must be persisted in Supabase.

Do not use fake/local-only data for the actual application.

Use Supabase tables, relationships, queries, inserts, updates, deletes, and database transactions/functions where appropriate.

The app should be designed as a modern dark-mode admin dashboard for managing an Adopt Me pet trading business.

==================================================

CORE BUSINESS FLOW

==================================================

The main business flow is:

BUY → TRADE → STOCK → SELL → PROFIT

Example:

I buy:

Game: ADM

Buy Item: Owl

Buy Price: Rp815.000

Buy Date: 25 Aug 2026

Then I trade the Owl and receive multiple pets:

- Toasty Red Panda

- Golden Mummy Cat

- Munchkin

- Polar Bear

- Cloud

Those received pets become inventory stock.

Important rules:

1. Rarity is NOT needed anywhere.

2. Do NOT create or display a rarity field.

3. Only directly purchased items have a Buy Date / Stock Date.

4. Pets received from trades do NOT have their own stock date.

5. Do NOT assign a fixed price/cost basis to pets received from trades.

6. Selling price must ALWAYS be entered manually when selling.

7. Selling price is in USD.

8. The same pet should be grouped into one inventory row when possible.

9. Use a quantity/stock field instead of creating many duplicate rows for identical pets.

10. When part of a stock quantity is sold, decrease the quantity instead of creating duplicate inventory records.

11. When the quantity reaches 0, mark the inventory record as sold/inactive.

12. Sales history must remain permanently stored.

13. A sold pet should not be physically deleted from historical records.

14. The application must preserve the relationship between purchases, trades, inventory, and sales.

==================================================

1. DATABASE DESIGN - SUPABASE

==================================================

Design a proper relational PostgreSQL database in Supabase.

Create the following tables.

------------------------------------------

TABLE: purchases

------------------------------------------

Fields:

- id UUID primary key

- game TEXT

- buy_item TEXT

- buy_price NUMERIC

- currency TEXT DEFAULT 'IDR'

- purchase_date DATE

- notes TEXT nullable

- created_at TIMESTAMP

Example:

BUY-0001

ADM

Owl

815000

IDR

2026-08-25

A purchase represents the original item/capital I bought.

------------------------------------------

TABLE: trades

------------------------------------------

Fields:

- id UUID primary key

- purchase_id UUID references purchases(id)

- traded_item TEXT

- trade_date DATE

- notes TEXT nullable

- created_at TIMESTAMP

A purchase can be traded into multiple pets.

Example:

Purchase:

BUY-0001

Owl

Trade:

TRADE-0001

Received:

- Toasty Red Panda

- Golden Mummy Cat

- Munchkin

- Polar Bear

- Cloud

------------------------------------------

TABLE: inventory

------------------------------------------

Fields:

- id UUID primary key

- pet_name TEXT

- username TEXT

- quantity INTEGER DEFAULT 1

- source_type TEXT

- purchase_id UUID nullable references purchases(id)

- trade_id UUID nullable references trades(id)

- purchase_date DATE nullable

- status TEXT DEFAULT 'available'

- notes TEXT nullable

- created_at TIMESTAMP

- updated_at TIMESTAMP

IMPORTANT:

There must NOT be:

- rarity

- fixed selling price

- fixed cost basis

- stock_date for trade results

The purchase_date field is ONLY populated when the inventory item represents a directly purchased item.

For pets received from trades:

purchase_date = NULL

source_type can be:

- purchase

- trade

Example:

Inventory:

Toasty Red Panda

Account123

Quantity: 3

Source: Trade

Purchase Date: -

Status: Available

Cloud

Account123

Quantity: 2

Source: Trade

Purchase Date: -

Status: Available

If I own 5 identical Toasty Red Panda, show:

Toasty Red Panda | Account123 | Stock: 5

Do NOT create five separate rows.

------------------------------------------

TABLE: accounts

------------------------------------------

Fields:

- id UUID primary key

- username TEXT unique

- notes TEXT nullable

- created_at TIMESTAMP

This represents the Adopt Me account/username where the pets are currently located.

One account can have many inventory items.

------------------------------------------

TABLE: sales

------------------------------------------

Fields:

- id UUID primary key

- inventory_id UUID references inventory(id)

- pet_name TEXT

- username TEXT

- quantity_sold INTEGER

- sell_price_usd NUMERIC

- exchange_rate NUMERIC

- fee_percentage NUMERIC DEFAULT 15

- fee_usd NUMERIC

- net_sell_usd NUMERIC

- net_sell_idr NUMERIC

- profit_idr NUMERIC nullable

- sale_date DATE

- notes TEXT nullable

- created_at TIMESTAMP

IMPORTANT:

Selling price must be manually entered every time a sale is made.

Do NOT store a permanent selling price in inventory.

Example:

Toasty Red Panda

Quantity available: 5

I sell 2 for:

$20 each

Then:

quantity_sold = 2

sell_price_usd = 20

The inventory quantity becomes:

3

Do not create another inventory row.

------------------------------------------

TABLE: settings

------------------------------------------

Store application settings such as:

- id

- usd_exchange_rate

- default_fee_percentage

- updated_at

Default:

USD exchange rate:

16000

Default fee:

15%

Make these editable from Settings.

==================================================

2. INVENTORY LOGIC

==================================================

Inventory must intelligently group identical pets.

IMPORTANT QUESTION:

When should two pets be grouped?

Group inventory by:

- pet_name

- username

- source_type

If these values are the same, increase quantity instead of creating another row.

Example:

Trade gives:

Toasty Red Panda → Account123

Toasty Red Panda → Account123

Toasty Red Panda → Account123

The inventory should show:

Toasty Red Panda

Account123

Stock: 3

NOT:

Toasty Red Panda

Toasty Red Panda

Toasty Red Panda

If the username is different:

Toasty Red Panda → Account123

Toasty Red Panda → Account456

Then show two rows because they are stored in different accounts.

==================================================

3. PURCHASE PAGE

==================================================

Create a Purchases page.

Header:

Purchases

Button:

+ New Purchase

Summary cards:

- Total Purchases

- Total Capital

- Purchases This Month

Table columns:

ID

Game

Buy Item

Buy Price

Currency

Buy Date

Trade Status

Actions

Example:

BUY-0001

ADM

Owl

Rp815.000

IDR

25 Aug 2026

Traded

Clicking a purchase opens a detail page/modal.

Purchase detail should show:

Purchase information

Game

ADM

Buy Item

Owl

Buy Price

Rp815.000

Buy Date

25 Aug 2026

Then show:

Trade History

TRADE-0001

26 Aug 2026

Received Pets:

Toasty Red Panda × 3

Golden Mummy Cat × 2

Munchkin × 1

Polar Bear × 1

Cloud × 2

==================================================

4. TRADE PAGE

==================================================

Create a Trades page.

Button:

+ New Trade

When creating a trade:

Step 1:

Select Purchase

Step 2:

Enter traded item

Step 3:

Enter Trade Date

Step 4:

Add received pets

Allow adding multiple pets dynamically.

Example:

Trade Source:

Owl

Received:

[ Toasty Red Panda ] [ 3 ]

[ Golden Mummy Cat ] [ 2 ]

[ Munchkin ] [ 1 ]

[ Polar Bear ] [ 1 ]

[ Cloud ] [ 2 ]

Do NOT ask for price for received pets.

Do NOT ask for cost basis.

Do NOT ask for rarity.

Do NOT ask for stock date.

Only:

- Pet name

- Quantity

- Username/location

When the trade is saved:

Automatically add those pets into inventory.

If an identical pet already exists in the same username/account, increment quantity.

==================================================

5. INVENTORY PAGE

==================================================

Create the main Inventory page.

Top section:

Inventory

Total Stock:

42 Pets

Available Types:

18

Search bar:

Search pet...

Filters:

- Account / Username

- Status

- Source

- Purchase Date

Do not include rarity filters.

Inventory table:

Pet

Stock

Username

Source

Buy Date

Status

Actions

Example:

Toasty Red Panda

5

Account123

Trade

-

Available

Golden Mummy Cat

2

Account123

Trade

-

Available

Owl

1

Account456

Purchase

25 Aug 2026

Available

Important:

For trade-origin pets, Buy Date should display "-".

For directly purchased pets, Buy Date should show the purchase date.

==================================================

6. INVENTORY ACTIONS

==================================================

Each inventory row has:

- View

- Sell

- Edit

- Move Account

- Delete

Do NOT allow selling more than current stock.

Example:

Stock:

5

Sell quantity:

[ 2 ]

Allowed.

If user enters:

6

Show validation error:

"You only have 5 of this pet available."

==================================================

7. SELL MODAL

==================================================

When clicking Sell, open a modern modal.

Show:

Pet:

Toasty Red Panda

Username:

Account123

Available:

5

Then:

Quantity to Sell

[ 2 ]

Sell Price per Pet (USD)

[ $20.00 ]

Sell Date

[ 29 Aug 2026 ]

Exchange Rate

[ 16,000 ]

Fee

15%

Notes

[ optional ]

IMPORTANT:

The selling price is entered manually for EVERY sale.

There is NO fixed sell price in inventory.

==================================================

8. REAL-TIME SALE CALCULATION

==================================================

As the user enters selling price and quantity, calculate everything automatically.

Formula:

Gross Sale USD =

sell_price_usd × quantity_sold

Fee USD =

Gross Sale USD × 15%

Net Sale USD =

Gross Sale USD - Fee USD

Net Sale IDR =

Net Sale USD × exchange_rate

Display:

Quantity:

2

Price:

$20.00

Gross Sale:

$40.00

Fee 15%:

-$6.00

Net Sale:

$34.00

Exchange Rate:

Rp16.000

Net Sale IDR:

Rp544.000

IMPORTANT:

Do not calculate profit using a fixed price per traded pet.

Since traded pets do not have individual prices/cost basis, profit should be handled using the purchase-level accounting/reporting logic.

If profit cannot be accurately attributed to an individual traded pet, clearly label it as:

"Profit attribution unavailable"

instead of inventing a number.

The UI must NEVER fabricate cost basis for traded pets.

==================================================

9. SALES HISTORY

==================================================

Create a Sales page.

Summary cards:

Total Sales

Total Fees

Total Net Sales

Table:

Pet

Username

Quantity

Sell Price

Gross

Fee

Net

Exchange Rate

Sale Date

Actions

Example:

Toasty Red Panda

Account123

2

$20

$40

$6

$34

Rp16.000

29 Aug 2026

Clicking a sale shows full details.

Sales records must never disappear even after inventory is sold.

==================================================

10. INVENTORY STATUS

==================================================

Inventory status should work like this:

Available:

quantity > 0

Sold / Empty:

quantity = 0

When selling part of stock:

Before:

Toasty Red Panda × 5

Sell 2

After:

Toasty Red Panda × 3

When selling the remaining 3:

After:

Toasty Red Panda × 0

Mark inventory as:

Sold

Keep the inventory record for historical purposes.

==================================================

11. SELL DATE

==================================================

Every sale must have:

sale_date

If stock quantity reaches zero after multiple sales, the final sold date should be the date of the transaction that reduced quantity to zero.

Example:

Stock:

5

29 Aug:

Sell 2

30 Aug:

Sell 1

31 Aug:

Sell 2

Final sold date:

31 Aug 2026

This should be displayed as the date the whole stock row became sold.

==================================================

12. ACCOUNTS PAGE

==================================================

Create an Accounts page.

Example cards:

Account123

24 Pets

Account456

12 Pets

Each card shows:

- Username

- Total stock

- Available stock

- Sold/empty stock

- Recent activity

Button:

+ Add Account

Form:

Username

Notes

==================================================

13. DASHBOARD

==================================================

Create a professional dashboard.

Statistics:

Total Capital

Total Sales

Total Fees

Total Net Sales

Available Stock

Sold Items

Number of Purchases

Number of Trades

Charts:

Profit / Net Sales Overview

Sales Over Time

Inventory Distribution by Account

Recent activity:

Recent Purchases

Recent Trades

Recent Sales

==================================================

14. REPORTS

==================================================

Create Reports page.

Filters:

- Today

- 7 Days

- 30 Days

- This Month

- Custom Date Range

Show:

Purchase summary

Trade summary

Sales summary

Fee summary

Net sales

Inventory count

Also show:

Best selling pets

Most active accounts

Sales volume by pet

Sales volume by account

==================================================

15. MAIN TABLE / SPREADSHEET VIEW

==================================================

I want the application to have a compact table view inspired by the spreadsheet/reference image I provided.

Create a "Compact Table View".

Columns:

Game

Buy Item

Buy Price

Sell

15%

Net Sell

Profit / Status

Keterangan

Tgl Buy

Tgl Sold

IMPORTANT:

This spreadsheet-style table is only a summary view.

The underlying data must still use the relational Supabase database.

For inventory rows generated through trades:

Tgl Buy:

-

For directly purchased items:

Tgl Buy:

actual purchase date

For selling:

Sell:

actual manually entered USD price

Tgl Sold:

actual sale date if the inventory is fully sold

==================================================

16. SEARCH

==================================================

Global search should be able to find:

- Pet name

- Username

- Purchase item

- Purchase ID

- Trade ID

- Sale ID

- Notes

Inventory search should update instantly.

==================================================

17. FILTERS

==================================================

Inventory filters:

- Username

- Available / Sold

- Purchase / Trade

- Buy Date

Sales filters:

- Sale Date

- Username

- Pet

Purchases filters:

- Buy Date

- Game

- Item

Do NOT create rarity filters.

==================================================

18. UI / UX

==================================================

Create a polished SaaS dashboard.

Theme:

Dark

Style:

- Modern

- Clean

- Minimal

- Professional

- Rounded cards

- Subtle borders

- Nice hover animations

- Good spacing

- Good typography

- Responsive

- Desktop-first

- Mobile friendly

Use shadcn/ui components.

Use:

- Dialog

- Dropdown

- Select

- Input

- Button

- Badge

- Table

- Card

- Tabs

- Tooltip

- Toast

- Sheet / Drawer

Use icons from Lucide React.

Avoid excessive gradients.

Avoid overly colorful UI.

Use clear visual states for:

Available

Sold

Profit

Loss

Pending

Completed

==================================================

19. SIDEBAR

==================================================

Sidebar:

Adopt Me Manager

Dashboard

Inventory

- All Pets

- Available

- Sold

Transactions

- Purchases

- Trades

- Sales

Accounts

Reports

Settings

Sidebar should be collapsible.

==================================================

20. SETTINGS

==================================================

Create Settings page.

Settings:

USD Exchange Rate

[ 16000 ]

Default Fee

[ 15% ]

Currency:

IDR

Allow editing the exchange rate.

The exchange rate used when a sale is created should be saved into that sale record, so historical sales do not change when the global exchange rate changes later.

==================================================

21. SUPABASE SECURITY

==================================================

Use Supabase properly.

Create:

- SQL schema

- Foreign keys

- Indexes

- Row Level Security policies where appropriate

- Secure queries

- Proper error handling

Do not expose service-role keys in frontend code.

Use environment variables:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

==================================================

22. SUPABASE FUNCTIONS / TRANSACTIONS

==================================================

For critical operations, maintain data consistency.

When creating a trade:

1. Create trade record.

2. Create or update inventory items.

3. Group identical pets.

4. Increase quantity if the pet already exists in the same account/source.

When selling:

1. Validate available quantity.

2. Create sales record.

3. Reduce inventory quantity.

4. If quantity reaches zero, mark inventory as sold.

5. Set sold date where appropriate.

These operations should be atomic where possible using Supabase/PostgreSQL functions or RPC.

Do not leave inventory and sales in an inconsistent state if something fails.

==================================================

23. DATA VALIDATION

==================================================

Examples:

Pet name cannot be empty.

Username cannot be empty.

Quantity must be greater than 0.

Sell quantity cannot exceed available stock.

Sell price must be greater than 0.

Exchange rate must be greater than 0.

Fee percentage must be between 0 and 100.

Show user-friendly validation messages.

==================================================

24. IMPORTANT ACCOUNTING RULE

==================================================

Do NOT invent a cost basis for pets received from trades.

A traded pet has:

- Name

- Quantity

- Username

- Source

- Trade reference

It does NOT have:

- Rarity

- Fixed price

- Fixed sell price

- Stock date

- Individual purchase price

Selling price is manually entered at the time of sale.

This is extremely important.

==================================================

25. SAMPLE DATA

==================================================

Use realistic seed/demo data for the UI preview.

Purchase:

BUY-0001

Game: ADM

Item: Owl

Price: Rp815.000

Date: 25 Aug 2026

Trade:

TRADE-0001

Source: Owl

Date: 26 Aug 2026

Received:

Toasty Red Panda × 3

Golden Mummy Cat × 2

Munchkin × 1

Polar Bear × 1

Cloud × 2

Account:

Account123

Inventory:

Toasty Red Panda × 3

Golden Mummy Cat × 2

Munchkin × 1

Polar Bear × 1

Cloud × 2

Example sale:

Toasty Red Panda

Quantity: 2

Price: $20 each

Fee: 15%

Date: 29 Aug 2026

After sale:

Toasty Red Panda × 1

==================================================

26. RESPONSIVE DESIGN

==================================================

Desktop:

Sidebar + Topbar + Main Content

Tablet:

Collapsible Sidebar

Mobile:

Hamburger menu

Cards stack vertically

Tables become horizontally scrollable

Dialogs become mobile-friendly

==================================================

27. COMPONENT STRUCTURE

==================================================

Use reusable React components.

Suggested structure:

src/

├── components/

├── pages/

│   ├── Dashboard.tsx

│   ├── Inventory.tsx

│   ├── Purchases.tsx

│   ├── Trades.tsx

│   ├── Sales.tsx

│   ├── Accounts.tsx

│   ├── Reports.tsx

│   └── Settings.tsx

├── components/

│   ├── Sidebar.tsx

│   ├── Topbar.tsx

│   ├── StatCard.tsx

│   ├── InventoryTable.tsx

│   ├── PurchaseModal.tsx

│   ├── TradeModal.tsx

│   ├── SellModal.tsx

│   └── PetDetailDrawer.tsx

├── hooks/

├── lib/

│   └── supabase.ts

├── types/

└── App.tsx

Use TypeScript types/interfaces properly.

==================================================

28. FINAL REQUIREMENT

==================================================

Build this as a real full-stack application, not just a mockup.

The app must:

- Use React + TypeScript

- Use Supabase

- Store real data in Supabase

- Have functional CRUD

- Have functional inventory

- Have functional purchases

- Have functional trades

- Have functional sales

- Have functional quantity grouping

- Have functional search/filter

- Have functional calculations

- Have functional dashboard statistics

- Have persistent settings

- Have responsive UI

- Have proper loading states

- Have empty states

- Have error states

- Have confirmation dialogs

- Have toast notifications

- Have proper validation

Most importantly, follow this exact business logic:

BUY

↓

TRADE

↓

PET RESULT ENTERS INVENTORY

↓

IDENTICAL PETS ARE GROUPED BY ACCOUNT

↓

SELL WITH MANUALLY ENTERED USD PRICE

↓

CALCULATE 15% FEE

↓

CALCULATE NET SELL

↓

REDUCE INVENTORY QUANTITY

↓

WHEN QUANTITY = 0, MARK AS SOLD

↓

STORE PERMANENT SALES HISTORY

Do not add unnecessary features such as pet rarity or fixed pet prices.

Keep the UI clean and focused on inventory management, trading, sales, and profit tracking.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/556182c9-a68b-42c0-bf6d-dffd6d73dfa6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
