# PDC50 Laboratory 3: Testing Report — ShopSmart Live Catalog Search

**Date of Execution:** October 15, 2026  
**Environment:** Windows 11, Node.js v22.14.0, Vite 7.3.6, Express 5.1.0, Vitest 3.2.7  
**Database Store:** ShopSmart file-backed repository (`backend/src/data/db.json`) / Prisma Client Interface  

---

## 1. Automated Project Verification (`npm run check`)

| Step | Command | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- |
| **Frontend Lint** | `npm run lint --workspace frontend` | Zero ESLint errors | Passed with 0 errors | **PASS** |
| **Backend Lint** | `npm run lint --workspace backend` | Zero ESLint errors | Passed with 0 errors | **PASS** |
| **Frontend Unit Tests** | `npm run test --workspace frontend` | 13/13 Vitest tests pass across cart, catalog, and api service | 13 passed in 3 test files (0 failures) | **PASS** |
| **Backend Tests** | `npm run test --workspace backend` | 12/12 Node.js native tests pass (assistant, validation, and product search) | 12 passed (0 failures) | **PASS** |
| **Frontend Build** | `npm run build --workspace frontend` | Production Vite build compiles to `frontend/dist` without errors | Built in 853ms (dist/assets/index generated) | **PASS** |
| **Overall Verification** | `npm run check` | All checks pass sequentially with exit code 0 | Exit code 0 | **PASS** |

---

## 2. Server-Side REST API Search Verification

| Test Name | Input / HTTP Request | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- |
| **Health Check** | `GET http://localhost:3000/api/health` | HTTP 200 `{"status":"ok"}` | HTTP 200 `{"status":"ok"}` | **PASS** |
| **Test 1 — Name Search** | `GET http://localhost:3000/api/products?search=keyboard` | HTTP 200, array containing active `Compact Mechanical Keyboard` (id: 2) | HTTP 200, 1 product returned (`Compact Mechanical Keyboard`, price: 1850) | **PASS** |
| **Test 2 — Description Search** | `GET http://localhost:3000/api/products?search=privacy` | HTTP 200, array containing `1080p Webcam` (id: 4) whose description contains "privacy cover" | HTTP 200, 1 product returned (`1080p Webcam`, price: 1450, description: "Full HD webcam with privacy cover...") | **PASS** |
| **Test 3 — No Matches** | `GET http://localhost:3000/api/products?search=notfoundword` | HTTP 200, empty products array `{"products":[]}`, no server error | HTTP 200, `{"products":[]}` | **PASS** |
| **Test 4 — Full Catalog** | `GET http://localhost:3000/api/products` | HTTP 200, all 6 active products in deterministic id order | HTTP 200, 6 products returned in ascending ID order (1 through 6) | **PASS** |
| **Case Insensitivity** | `GET http://localhost:3000/api/products?search=PRIVACY` | HTTP 200, matching item regardless of uppercase input | HTTP 200, `1080p Webcam` returned | **PASS** |
| **Whitespace Trimming** | `GET http://localhost:3000/api/products?search=%20%20keyboard%20%20` | HTTP 200, query trimmed before matching, returns keyboard | HTTP 200, `Compact Mechanical Keyboard` returned | **PASS** |
| **Empty Search Parameter** | `GET http://localhost:3000/api/products?search=` | HTTP 200, acts as unfiltered query returning all 6 active products | HTTP 200, all 6 active products returned | **PASS** |

---

## 3. Frontend Interactive Scenarios Verification

| Scenario | Actions Performed | Expected Behavior | Actual Behavior | Status |
| --- | --- | --- | --- | --- |
| **Scenario 1 — Name Search** | Type `keyboard` into search input | Network request `GET /api/products?search=keyboard` is dispatched; only Compact Mechanical Keyboard card renders | Keyboard product displayed; Network panel shows single encoded GET request | **PASS** |
| **Scenario 2 — Description Search** | Type `privacy` into search input | Network request `GET /api/products?search=privacy` is dispatched; 1080p Webcam card renders | 1080p Webcam displayed based on description match; price ₱1,450 shown | **PASS** |
| **Scenario 3 — No Matches** | Type `notfoundword` into search input | Displays status message: "No products found. Try another search term or category."; toolbar controls remain visible | Empty state message rendered clearly; category and sort controls remained fully usable | **PASS** |
| **Scenario 4 — Category + Search** | 1. Select `Study`<br>2. Search `lamp`<br>3. Search `webcam` | 1. USB-C Study Lamp displayed<br>2. `Study` remains selected<br>3. When searching `webcam`, empty state displays because webcam is in `Video`<br>4. Category does not reset to `All` | Category remained `Study`; lamp displayed on search `lamp`; empty message displayed on `webcam` without resetting category | **PASS** |
| **Scenario 5 — Clear Search** | Clear the search input after searching | Dispatches request for full catalog; displays all 6 active products; preserves currently selected category | All 6 active items returned and rendered; previous category selection preserved | **PASS** |
| **Scenario 6 — Sorting** | Select `All` category, clear search, change sort to:<br>1. "Price: Low to High"<br>2. "Price: High to Low" | 1. Products sorted numerically ascending: ₱650 (Mouse) → ₱900 (Lamp) → ₱1,200 (Stand) → ₱1,350 (Headset) → ₱1,450 (Webcam) → ₱1,850 (Keyboard)<br>2. Products sorted descending: ₱1,850 down to ₱650 | Accurate numeric ordering in both directions; tie-breaking deterministic by id; original data not mutated | **PASS** |
| **Scenario 7 — Rapid Input Changes (Stale Race Protection)** | Type `privacy` then immediately clear input; or type `keyboard` followed quickly by `privacy` | In-flight requests are aborted with `AbortController`; older requests cannot overwrite newer state; final UI matches the latest query | Stale responses ignored via `AbortController` and `requestId` ref; final display strictly matched final query | **PASS** |
| **Scenario 8 — Backend Failure & Recovery** | 1. Stop backend API process<br>2. Perform search in frontend<br>3. Verify error message & Retry button<br>4. Restart backend API<br>5. Click Retry | 1. Informative error banner displayed: "Failed to fetch. Make sure the backend is running." with a "Retry" button<br>2. Page does not crash or retain stale products<br>3. Upon restarting backend and clicking "Retry", products reload successfully | Error state cleanly rendered with Retry button; clicking Retry immediately re-fetched and restored active catalog | **PASS** |

---

## 4. Summary & Conclusion

- **Total Test Cases Executed:** 22 (13 frontend unit tests, 12 backend unit/API tests, 8 interactive scenarios)
- **Passed:** 22
- **Failed:** 0
- **Blocked / Not Run:** 0
- **Final Result:** All requirements for PDC50 Laboratory 3 have been successfully fulfilled and verified.
