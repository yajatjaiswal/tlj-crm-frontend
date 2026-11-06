# Pagination Fix Guide

## Problem Description
The pagination component was experiencing issues where:
1. Clicking on page numbers would jump back to page 1 on the first click
2. Only on the second click would the pagination work correctly
3. This was happening across all components that use pagination

## Root Cause
The issue was caused by a race condition between:
1. Local component state (`currentPage`)
2. API response pagination data (`pagination.currentPage`)
3. React Query cache invalidation and refetching

When a user clicked a page number:
1. Local state would update to the new page
2. API call would be made with the new page
3. API response might come back with a different page (often page 1)
4. This would override the user's intended page selection

## Solution Implemented

### 1. Custom Pagination Hook (`src/hooks/usePaginationState.js`)
Created a hook that:
- Tracks user actions vs API responses
- Prevents API responses from overriding user-initiated page changes
- Handles search query resets properly
- Provides a consistent interface across components

### 2. Enhanced Pagination Component (`src/Components/Pagination/Pagination.jsx`)
Simplified the component to:
- Focus on UI rendering
- Delegate state management to the hook
- Provide proper validation for page changes

### 3. Updated Parent Components
Modified components to:
- Use the new pagination hook
- Prevent unnecessary query invalidations
- Add proper loading state management

## How to Apply the Fix to Other Components

### Step 1: Import the Hook
```javascript
import { usePaginationState } from "../../../hooks/usePaginationState";
```

### Step 2: Replace Manual State Management
**Before:**
```javascript
const [currentPage, setCurrentPage] = useState(1);

useEffect(() => {
  setCurrentPage(1);
}, [searchQuery]);
```

**After:**
```javascript
const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);
```

### Step 3: Add API Response Sync
```javascript
// Add this effect after your useQuery
useEffect(() => {
  if (apiData?.pagination?.currentPage) {
    syncWithApiResponse(apiData.pagination.currentPage);
  }
}, [apiData?.pagination?.currentPage, syncWithApiResponse]);
```

### Step 4: Update Query Configuration
```javascript
const { data: apiData, isLoading } = useQuery({
  queryKey: ["your-query-key", currentPage, itemsPerPage, searchQuery],
  queryFn: () => yourApiFunction(currentPage, itemsPerPage, searchQuery),
  staleTime: Infinity,
  refetchOnWindowFocus: false, // Prevent unwanted refetches
  keepPreviousData: true, // Keep data while loading
  // ... other options
});
```

### Step 5: Update Search Field
**Before:**
```javascript
<SearchField
  onSearch={(value) => {
    setSearchQuery(value);
    setCurrentPage(1); // Remove this line
  }}
  defaultValue={searchQuery}
/>
```

**After:**
```javascript
<SearchField
  onSearch={(value) => {
    setSearchQuery(value);
    // Page reset is handled by the usePaginationState hook
  }}
  defaultValue={searchQuery}
/>
```

### Step 6: Update Pagination Component Usage
```javascript
<Pagination
  currentPage={currentPage}
  setCurrentPage={setCurrentPage} // Use the hook's setCurrentPage
  isLoading={isLoading}
  pagination={apiData?.pagination}
  itemsPerPage={itemsPerPage}
/>
```

## Components That Need Updates

Based on the search results, the following components need the pagination fix:

### Credit Analyst Pages:
- `src/Pages/credit-analyst/AuditLeads.jsx`
- `src/Pages/credit-analyst/ApprovedAuditLeads.jsx`
- `src/Pages/credit-analyst/RejectedAuditLeads.jsx`
- `src/Pages/credit-analyst/AllocatedAuditLeads.jsx`
- `src/Pages/credit-analyst/BreRejectedLeads.jsx`
- `src/Pages/credit-analyst/CArejectedLeads.jsx`
- `src/Pages/credit-analyst/ApprovedLeads.jsx`
- `src/Pages/credit-analyst/AssignedLeads.jsx`
- `src/Pages/credit-analyst/ApprovedCreditHeadAuditLeads.jsx`
- `src/Pages/credit-analyst/AssignedCreditHeadAuditLeads.jsx`
- `src/Pages/credit-analyst/RejectedCreditHeadAuditLeads.jsx`
- `src/Pages/credit-analyst/UnassignedCreditHeadAuditLeads.jsx`

### Admin Pages:
- `src/Pages/admin/components/DashboardTotalLeads.jsx` ✅ (Fixed)
- `src/Pages/admin/components/DashboardDisbursedLeads.jsx`
- `src/Pages/admin/components/DashboardPendingDisbursalAmountLeads.jsx`
- `src/Pages/admin/components/DashboardPendingSanctionAmountLeads.jsx`
- `src/Pages/admin/components/DashboardRejectedLeads.jsx`
- `src/Pages/admin/components/PendingLeads.jsx`

### Screener Pages:
- `src/Pages/screener/AllocatedMarketingLeads.jsx`
- `src/Pages/screener/AllocatedPartialLeads.jsx`
- `src/Pages/screener/MarketingLeads.jsx`
- `src/Pages/screener/PartialLeads.jsx`
- `src/Pages/screener/RejectedLeads.jsx`

### Disbursal Pages:
- `src/Pages/disbursal/Disbursed.jsx`

## Testing the Fix

To test if the pagination fix is working:

1. **Navigate to any page with pagination**
2. **Click on different page numbers**
3. **Verify that:**
   - Page changes immediately on first click
   - No jumping back to page 1
   - Data loads correctly for the selected page
   - Search functionality still resets to page 1

4. **Test edge cases:**
   - Rapid clicking on different pages
   - Using browser back/forward buttons
   - Refreshing the page
   - Switching between different filters

## Benefits of This Fix

1. **Consistent Behavior**: All pagination components will work the same way
2. **Better UX**: No more unexpected page jumps
3. **Maintainable**: Centralized pagination logic in a reusable hook
4. **Performance**: Reduced unnecessary API calls and re-renders
5. **Reliable**: Proper handling of race conditions and state synchronization

## Troubleshooting

If pagination still doesn't work after applying the fix:

1. **Check console for errors**
2. **Verify the hook is imported correctly**
3. **Ensure API response structure matches expected format**
4. **Check that query keys are consistent**
5. **Verify that `refetchOnWindowFocus: false` is set**

## Migration Checklist

- [ ] Import `usePaginationState` hook
- [ ] Replace manual `currentPage` state with hook
- [ ] Add API response sync effect
- [ ] Update query configuration
- [ ] Remove manual `setCurrentPage(1)` from search handlers
- [ ] Update Pagination component usage
- [ ] Test pagination functionality
- [ ] Test search functionality
- [ ] Test edge cases
