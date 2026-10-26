# Backend Connectivity Error Bugfix Design

## Overview

The `fetchJSON` function in `frontend/lib/api.ts` currently fails to handle network connectivity errors gracefully. When the backend API server at `http://localhost:8000` is unreachable (not running, network issues, or misconfiguration), the function throws unhandled `TypeError: Failed to fetch` exceptions that propagate to UI components and cause crashes. This design implements comprehensive error handling to catch network failures, provide meaningful error responses, log diagnostic information, and display user-friendly feedback while preserving all existing behavior for successful requests and HTTP error responses.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `fetch()` encounters network connectivity failures (server unreachable, DNS resolution failure, CORS errors, network timeout)
- **Property (P)**: The desired behavior when network errors occur - catch the exception, log diagnostic information, and return a structured error response
- **Preservation**: Existing successful request handling, 401 authentication flow, HTTP error response parsing, and concurrent request handling that must remain unchanged
- **fetchJSON**: The core API utility function in `frontend/lib/api.ts` (line 90) that wraps `fetch()` calls with authentication headers and response parsing
- **NetworkError**: A custom error type that will be introduced to distinguish network connectivity failures from HTTP errors
- **API_BASE**: The environment-configured base URL for backend API (`process.env.NEXT_PUBLIC_API_BASE_URL` or `http://localhost:8000`)

## Bug Details

### Bug Condition

The bug manifests when the `fetch()` call inside `fetchJSON` fails due to network connectivity issues. The function does not have try-catch error handling around the fetch operation, causing network errors to propagate as unhandled exceptions. This happens when the backend server is not running, the URL is misconfigured, DNS resolution fails, or network connectivity is lost.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { url: string, options: RequestInit }
  OUTPUT: boolean
  
  RETURN (backendServerNotRunning(API_BASE)
          OR networkConnectivityLost()
          OR dnsResolutionFailed(API_BASE)
          OR corsBlocked(API_BASE, input.url))
         AND fetchThrowsException(input.url, input.options)
         AND NOT exceptionCaught()
END FUNCTION
```

### Examples

- **Backend server not running**: User opens the dashboard when the FastAPI backend at `http://localhost:8000` is not running. The `fetchJSON("/api/transactions/")` call throws `TypeError: Failed to fetch`, crashing the Dashboard component.

- **Network connectivity lost**: User is viewing analytics when their WiFi connection drops. All subsequent API calls (summary, category spending, monthly trend) throw unhandled network errors, causing the UI to become unresponsive.

- **Misconfigured API_BASE URL**: Environment variable `NEXT_PUBLIC_API_BASE_URL` is set to `http://localhost:9999` (wrong port). Every API request fails immediately with network errors, but the user sees no indication of the configuration issue.

- **CORS preflight failure**: Backend CORS middleware is misconfigured. Browser blocks the fetch request, throwing a network error that is not caught or explained to the user.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful API requests (2xx status codes) must continue to parse JSON responses and return typed data exactly as before
- 401 Unauthorized handling must continue to trigger single-flight token refresh and retry logic without changes
- HTTP error responses (4xx, 5xx) must continue to parse error text from response body and throw Error objects with status codes
- 204 No Content responses must continue to return `undefined` as the typed result
- Concurrent API requests must continue to execute independently without interference
- FormData uploads (transcribeAudio) must continue to work with custom content-type headers
- Authentication header injection must continue to work for all requests

**Scope:**
All inputs where the backend server is reachable and returns HTTP responses (successful or error responses) should be completely unaffected by this fix. This includes:
- All successful data fetching operations (transactions, analytics, budgets, insights, anomalies)
- Authentication token refresh flows on 401 responses
- Error handling for 4xx and 5xx HTTP status codes
- File upload operations with FormData
- Concurrent request execution patterns

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing Try-Catch Block**: The `fetchJSON` function does not wrap the `fetch()` call in a try-catch block. The native `fetch()` API throws TypeErrors when network connectivity fails (server unreachable, DNS failure, network timeout, CORS errors).

2. **No Network Error Differentiation**: The code only handles HTTP response errors (`if (!res.ok)`) but assumes `fetch()` will always return a Response object. Network errors that prevent the Response object from being created are not caught.

3. **Silent Failure Propagation**: When network errors occur, they propagate up the call stack as unhandled exceptions, crashing React components that call API methods without their own error boundaries.

4. **No Diagnostic Logging**: When network failures occur, there is no logging of the attempted URL, API_BASE configuration, or error details that would help troubleshoot the issue.

## Correctness Properties

Property 1: Bug Condition - Network Error Handling

_For any_ API request where the fetch operation encounters a network connectivity failure (server unreachable, DNS resolution failure, CORS error, or network timeout), the fixed fetchJSON function SHALL catch the exception, log diagnostic information (attempted URL, API_BASE, error type), and return a rejected Promise with a structured NetworkError that provides user-friendly error messaging.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Successful Request Behavior

_For any_ API request where the backend server is reachable and returns an HTTP response (2xx success, 401 unauthorized, or 4xx/5xx errors), the fixed fetchJSON function SHALL produce exactly the same behavior as the original function, preserving response parsing, authentication retry logic, error message extraction, and return value typing.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `frontend/lib/api.ts`

**Function**: `fetchJSON` (line 90)

**Specific Changes**:

1. **Add NetworkError Class**: Define a custom error class before the `fetchJSON` function to distinguish network connectivity failures from HTTP errors:
   ```typescript
   export class NetworkError extends Error {
     constructor(
       message: string,
       public readonly url: string,
       public readonly cause?: unknown
     ) {
       super(message);
       this.name = "NetworkError";
     }
   }
   ```

2. **Wrap Fetch in Try-Catch**: Add try-catch block around the `fetch()` call to catch network errors:
   ```typescript
   let res: Response;
   try {
     res = await fetch(`${API_BASE}${url}`, {
       ...options,
       headers: {
         ...authHeaders,
         ...options?.headers,
       },
     });
   } catch (error) {
     // Network error handling logic here
   }
   ```

3. **Log Diagnostic Information**: In the catch block, log detailed diagnostic information:
   - Full attempted URL (`${API_BASE}${url}`)
   - API_BASE configuration value
   - Error type and message
   - Whether this is a retry attempt (isRetry parameter)

4. **Throw Structured NetworkError**: Create a NetworkError with user-friendly message:
   ```typescript
   throw new NetworkError(
     `Unable to connect to server at ${API_BASE}. Please ensure the backend is running and check your network connection.`,
     `${API_BASE}${url}`,
     error
   );
   ```

5. **Update transcribeAudio Function**: Apply the same try-catch pattern to the two fetch calls in `transcribeAudio` method, since it doesn't use `fetchJSON` internally

### Implementation Pseudocode

```typescript
async function fetchJSON<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
  const authHeaders = await getAuthHeaders(true, false);
  const fullUrl = `${API_BASE}${url}`;
  
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });
  } catch (error) {
    // Log diagnostic information
    console.error('[API Network Error]', {
      url: fullUrl,
      apiBase: API_BASE,
      isRetry,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Throw structured network error
    throw new NetworkError(
      `Unable to connect to server. Please ensure the backend is running at ${API_BASE} and check your network connection.`,
      fullUrl,
      error
    );
  }

  // Existing HTTP response handling continues unchanged...
  if (res.status === 401) { /* ... existing logic ... */ }
  if (!res.ok) { /* ... existing logic ... */ }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by simulating network failures, then verify the fix correctly catches and handles these errors while preserving all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that network errors propagate as unhandled exceptions on unfixed code.

**Test Plan**: Write tests that simulate network connectivity failures using mock fetch implementations. Run these tests on the UNFIXED code to observe unhandled exceptions and confirm the root cause.

**Test Cases**:
1. **Backend Server Not Running**: Mock `fetch()` to throw `TypeError: Failed to fetch`. Call `api.getTransactions()`. (will throw unhandled exception on unfixed code)
2. **Network Timeout**: Mock `fetch()` to throw timeout error. Call `api.getSummary()`. (will throw unhandled exception on unfixed code)
3. **DNS Resolution Failure**: Mock `fetch()` to throw network error. Call `api.getBudgets()`. (will throw unhandled exception on unfixed code)
4. **CORS Blocked Request**: Mock `fetch()` to throw CORS error. Call `api.categorize()`. (will throw unhandled exception on unfixed code)

**Expected Counterexamples**:
- All network errors propagate as unhandled `TypeError` exceptions
- No diagnostic logging occurs
- No user-friendly error messages are provided
- UI components crash when calling any API method during network failures

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (network connectivity failures), the fixed function catches the error, logs diagnostics, and returns a structured NetworkError.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  TRY
    result := fetchJSON_fixed(input.url, input.options)
    FAIL "Expected NetworkError to be thrown"
  CATCH error
    ASSERT error instanceof NetworkError
    ASSERT error.message contains "Unable to connect to server"
    ASSERT error.url == expectedFullUrl
    ASSERT consoleErrorWasLogged()
END FOR
```

**Test Implementation Approach**: Use Jest to mock `global.fetch` and simulate various network failure scenarios:
```typescript
global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (server is reachable), the fixed function produces exactly the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT fetchJSON_original(input) == fetchJSON_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various URLs, request methods, headers, bodies)
- It catches edge cases that manual unit tests might miss (concurrent requests, 204 responses, retry logic)
- It provides strong guarantees that behavior is unchanged for all reachable-server scenarios

**Test Plan**: Write unit tests that mock successful HTTP responses (2xx), 401 responses (to test auth retry), and HTTP error responses (4xx/5xx). Verify behavior matches expectations for the ORIGINAL code.

**Test Cases**:
1. **Successful GET Request Preservation**: Mock successful 200 response with JSON. Verify `fetchJSON` returns parsed data exactly as before.
2. **Successful POST Request Preservation**: Mock successful 201 response. Verify request body and headers are sent correctly.
3. **401 Token Refresh Preservation**: Mock 401 response, then successful retry after token refresh. Verify single-flight refresh logic works.
4. **HTTP Error Response Preservation**: Mock 400, 404, 500 responses. Verify error messages are parsed from response body and thrown as Error objects.
5. **204 No Content Preservation**: Mock 204 response. Verify `undefined` is returned.
6. **FormData Upload Preservation**: Test `transcribeAudio` with mocked successful upload. Verify FormData and custom headers work.
7. **Concurrent Request Preservation**: Fire multiple API calls simultaneously. Verify they execute independently and don't interfere.

### Unit Tests

- Test network error handling for various failure types (connection refused, timeout, DNS failure, CORS)
- Test diagnostic logging includes correct URL, API_BASE, and error details
- Test NetworkError contains user-friendly message and structured data
- Test edge case: network failure during retry (isRetry = true)
- Test successful request flow remains unchanged (2xx responses)
- Test 401 authentication retry flow remains unchanged
- Test HTTP error response parsing remains unchanged (4xx/5xx)
- Test 204 No Content handling remains unchanged
- Test FormData upload in transcribeAudio with network failures and successes

### Property-Based Tests

- Generate random API endpoint paths and verify network error handling works for all paths
- Generate random request configurations (methods, headers, bodies) and verify preservation of successful request behavior
- Generate random HTTP status codes (200-599) and verify correct handling for reachable server scenarios
- Test that network errors during any operation type (GET, POST, DELETE) are caught consistently

### Integration Tests

- Test full Dashboard component flow with backend server stopped (should show error UI, not crash)
- Test analytics page load with network connectivity loss (should display graceful error)
- Test transaction creation when backend is unreachable (should show user-friendly error)
- Test voice transcription upload with network failure (should catch and report error)
- Test assistant chat interaction with server down (should handle gracefully)
- Test that reconnecting after network failure allows successful API calls to resume
