# REST API

Base path: `/api`. JSON request and response bodies. All vehicle routes require
`Authorization: Bearer <token>`. Tokens expire after 8 hours. Currency is USD;
prices are stored as integer cents and returned as dollar amounts.

| Method | Path | Access | Body / query |
|---|---|---|---|
| POST | `/auth/register` | Public | `{name,email,password}`; returns `{user,token}` (201) |
| POST | `/auth/login` | Public | `{email,password}`; returns `{user,token}` |
| GET | `/auth/me` | Signed in | Returns `{user}` |
| GET | `/health` | Public | Returns `{status:"ok"}` |
| GET | `/vehicles` | Signed in | Returns `{vehicles:[...]}` |
| GET | `/vehicles/search` | Signed in | `q`, `make`, `model`, `category`, `minPrice`, `maxPrice`, `inStock=true` |
| POST | `/vehicles` | Signed in | Required: `make,model,category,price,quantity`; optional: `year,fuel,color` |
| PUT | `/vehicles/:id` | Signed in | One or more vehicle fields; only admins can set `quantity` |
| DELETE | `/vehicles/:id` | Admin | Returns 204 |
| POST | `/vehicles/:id/purchase` | Signed in | Optional `{quantity:1}`; returns updated `{vehicle}` |
| POST | `/vehicles/:id/restock` | Admin | Required `{quantity:positiveInteger}`; returns updated `{vehicle}` |

Create and update return `{vehicle}`. IDs are server-generated UUIDs. Search
matches substrings without case sensitivity (SQLite's ASCII case folding),
combines filters with AND, treats `%` and `_` literally, and includes both price
bounds. Listing includes sold-out vehicles so the interface can disable purchase.
`inStock=true` excludes them. `inStock=false` applies no stock filter.

Categories: Sedan, SUV, Coupe, Hatchback, Truck, Convertible, Wagon.
Fuel types: Petrol, Diesel, Electric, Hybrid. Color is a six-digit hex value.
Quantity is an integer from 0 to 1,000,000. Price is 0–100,000,000 USD with at most
two decimal places. Year is 1886–2100. Defaults: current year, Petrol, sage color.
Passwords are 10–72 UTF-8 bytes for registration (bcrypt input limit).

Errors are `{error:string, details?:[{field,message}]}`:
400 invalid input; 401 missing/expired identity or incorrect login; 403 denied
permission; 404 missing resource; 409 duplicate email/insufficient stock/stock
limit; 413 oversized request; 429 authentication rate limit; 500 unexpected error.
Auth routes allow 100 requests per IP per 15 minutes. Body limit: 16 KB.

The brief labels create/update as protected and delete/restock as admin-only.
Accordingly, the API permits authenticated create and metadata update; the UI
exposes inventory management to admins. Customers cannot bypass the admin stock
restriction through PUT. A stricter commercial policy can also restrict POST/PUT.

A purchase is an inventory decrement, not a payment, order, reservation, or
financial transaction. No card data is collected. A successful request commits
immediately. Clients must not automatically retry purchase requests after an
ambiguous network failure; refresh inventory before deciding to try again.
