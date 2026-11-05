# PDC50 Laboratory 3: Screenshot Capture Guide

This guide provides step-by-step instructions for capturing genuine screenshots directly from your running ShopSmart application and terminal.

---

## Prerequisites: Start the Application

Open a PowerShell terminal in the project root directory and run:

```powershell
npm run dev
```

This starts:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000`

---

## Screenshot 1: API Response for Description Search (`privacy`)

### Purpose
Proves that the backend API matches products by description and returns the 1080p Webcam through Express and Prisma.

### How to Capture:
1. Open Google Chrome, Microsoft Edge, or Bruno.
2. Navigate to:
   ```
   http://localhost:3000/api/products?search=privacy
   ```
3. You will see the JSON response:
   ```json
   {
     "products": [
       {
         "id": 4,
         "active": true,
         "name": "1080p Webcam",
         "description": "Full HD webcam with privacy cover and built-in microphone.",
         "category": "Video",
         "emoji": "📷",
         "price": 1450,
         "stock": 6
       }
     ]
   }
   ```
4. **Capture:** Take a screenshot of your browser window showing the URL address bar (`http://localhost:3000/api/products?search=privacy`) and the JSON payload highlighting `1080p Webcam` and its description containing `"privacy cover"`.
5. **Suggested File Name:** `screenshot_1_api_search_privacy.png`

---

## Screenshot 2: Frontend Description Search for `privacy`

### Purpose
Demonstrates that typing `privacy` into the search box requests the backend API and displays the matching product card in the ShopSmart React interface.

### How to Capture:
1. Open Google Chrome or Microsoft Edge and navigate to:
   ```
   http://localhost:5173
   ```
2. Open DevTools by pressing `F12` and switch to the **Network** tab (filter by `Fetch/XHR`).
3. In the ShopSmart toolbar, click the **Search products** input box and type:
   ```
   privacy
   ```
4. Observe:
   - The product grid displays only the **1080p Webcam** card with its emoji 📷, price **₱1,450**, and stock status.
   - In the DevTools Network panel below/beside, you will see the request: `products?search=privacy` with HTTP status `200`.
5. **Capture:** Capture the full browser window showing both the ShopSmart UI with the webcam product card and the DevTools Network panel showing the `search=privacy` request.
6. **Suggested File Name:** `screenshot_2_frontend_search_privacy.png`

---

## Screenshot 3: Category Filtering + Price Sorting in Action

### Purpose
Demonstrates that category selection and sort order work cooperatively on active search/catalog results without erasing dropdown options.

### How to Capture:
1. Open `http://localhost:5173` in your browser.
2. Ensure the **Search products** input is clear (empty).
3. In the **Category** dropdown, select:
   ```
   Study
   ```
4. In the **Sort by** dropdown, select:
   ```
   Price: Low to High
   ```
5. Observe:
   - Only products in the `Study` category are displayed.
   - The products are sorted in ascending numeric price order:
     1. **USB-C Study Lamp** (₱900)
     2. **Laptop Stand** (₱1,200)
   - Notice that the **Category** dropdown still lists all categories (`All`, `Accessories`, `Study`, `Video`, `Audio`) and has not shrunk.
6. **Capture:** Take a screenshot of the browser window showing the `Study` category selected, `Price: Low to High` selected, and the two Study products ordered by price.
7. **Suggested File Name:** `screenshot_3_category_and_sort.png`

---

## Screenshot 4: Successful Automated Verification (`npm run check`)

### Purpose
Proves that code quality, linting, frontend tests, backend tests, and production build all pass without errors.

### How to Capture:
1. Open a new PowerShell terminal at the project root directory.
2. Execute:
   ```powershell
   npm run check
   ```
3. Wait approximately 5–8 seconds for the complete pipeline to run:
   - Frontend ESLint (`eslint .`)
   - Backend ESLint (`eslint .`)
   - Frontend Vitest suite (13 passing tests)
   - Backend Node.js test runner (12 passing tests)
   - Production Vite client build (`vite build`)
4. The terminal will display green checkmarks across all tests and end with `✓ built in ...ms` and return to the command prompt with zero errors.
5. **Capture:** Take a screenshot of the entire terminal window displaying the test output and successful completion.
6. **Suggested File Name:** `screenshot_4_npm_run_check_success.png`
