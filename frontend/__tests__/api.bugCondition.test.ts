/**
 * Bug Condition Exploration Test
 * Property 1: Network Connectivity Failure Handling
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or code when it fails.
 * 
 * This test encodes the EXPECTED behavior:
 * - Network errors should be caught and handled gracefully
 * - Diagnostic information should be logged
 * - User-friendly error messages should be provided
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists in unfixed code.
 */

import { api } from '@/lib/api';

// Mock supabase module
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token', expires_at: Date.now() / 1000 + 3600 } },
        error: null,
      })),
      refreshSession: jest.fn(),
      signOut: jest.fn(() => Promise.resolve({})),
    },
  },
}));

// Mock utils module
jest.mock('@/lib/utils', () => ({
  API_BASE: 'http://localhost:8000',
}));

describe('Bug Condition Exploration: Network Connectivity Failure Handling', () => {
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.error to verify diagnostic logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Property 1: Network errors should be caught and handled gracefully', () => {
    
    test('Backend server not running: should catch TypeError and throw NetworkError', async () => {
      // Mock fetch to throw TypeError (simulates backend not running)
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch'))
      );

      // EXPECTED BEHAVIOR (will fail on unfixed code):
      // - Should catch the TypeError
      // - Should log diagnostic information
      // - Should throw a NetworkError with user-friendly message
      
      await expect(api.getTransactions()).rejects.toMatchObject({
        name: 'NetworkError',
        message: expect.stringContaining('Unable to connect to server'),
        url: expect.stringContaining('http://localhost:8000/api/transactions/'),
      });

      // Verify diagnostic logging occurred
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[API Network Error]',
        expect.objectContaining({
          url: expect.stringContaining('/api/transactions/'),
          apiBase: 'http://localhost:8000',
          error: 'Failed to fetch',
        })
      );
    });

    test('Network timeout: should catch timeout error and throw NetworkError', async () => {
      // Mock fetch to throw network timeout error
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Network request failed: timeout'))
      );

      // EXPECTED BEHAVIOR (will fail on unfixed code):
      await expect(api.getSummary()).rejects.toMatchObject({
        name: 'NetworkError',
        message: expect.stringContaining('Unable to connect to server'),
        url: expect.stringContaining('http://localhost:8000/api/analytics/summary'),
      });

      // Verify diagnostic logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[API Network Error]',
        expect.objectContaining({
          url: expect.stringContaining('/api/analytics/summary'),
          apiBase: 'http://localhost:8000',
        })
      );
    });

    test('DNS resolution failure: should catch network error and throw NetworkError', async () => {
      // Mock fetch to throw DNS resolution error
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('NetworkError when attempting to fetch resource'))
      );

      // EXPECTED BEHAVIOR (will fail on unfixed code):
      await expect(api.getBudgets()).rejects.toMatchObject({
        name: 'NetworkError',
        message: expect.stringContaining('Unable to connect to server'),
        url: expect.stringContaining('http://localhost:8000/api/budgets/'),
      });

      // Verify diagnostic logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[API Network Error]',
        expect.objectContaining({
          url: expect.stringContaining('/api/budgets/'),
          apiBase: 'http://localhost:8000',
        })
      );
    });

    test('CORS blocked request: should catch CORS error and throw NetworkError', async () => {
      // Mock fetch to throw CORS error
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch (CORS blocked)'))
      );

      // EXPECTED BEHAVIOR (will fail on unfixed code):
      await expect(
        api.categorize('test transaction', 'expense')
      ).rejects.toMatchObject({
        name: 'NetworkError',
        message: expect.stringContaining('Unable to connect to server'),
        url: expect.stringContaining('http://localhost:8000/api/categorize/'),
      });

      // Verify diagnostic logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[API Network Error]',
        expect.objectContaining({
          url: expect.stringContaining('/api/categorize/'),
          apiBase: 'http://localhost:8000',
        })
      );
    });

    test('transcribeAudio: should catch network error during audio upload', async () => {
      // Mock fetch to throw network error
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch'))
      );

      const audioBlob = new Blob(['test audio data'], { type: 'audio/wav' });

      // EXPECTED BEHAVIOR (will fail on unfixed code):
      await expect(api.transcribeAudio(audioBlob)).rejects.toMatchObject({
        name: 'NetworkError',
        message: expect.stringContaining('Unable to connect to server'),
        url: expect.stringContaining('http://localhost:8000/api/voice/transcribe'),
      });

      // Verify diagnostic logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[API Network Error]',
        expect.objectContaining({
          url: expect.stringContaining('/api/voice/transcribe'),
          apiBase: 'http://localhost:8000',
        })
      );
    });
  });

  describe('Counterexample Documentation', () => {
    test('Demonstrates: All network errors propagate as unhandled TypeError exceptions', async () => {
      // This test documents the CURRENT BUGGY BEHAVIOR
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch'))
      );

      // On UNFIXED code: this will throw unhandled TypeError
      // On FIXED code: this will throw NetworkError
      try {
        await api.getTransactions();
        fail('Expected an error to be thrown');
      } catch (error: any) {
        // On unfixed code: error will be TypeError (bug)
        // On fixed code: error will be NetworkError (correct)
        
        // Document what we observe:
        if (error.name === 'TypeError') {
          // BUG CONFIRMED: Network errors propagate unhandled
          console.log('COUNTEREXAMPLE FOUND: Unhandled TypeError propagated');
        } else if (error.name === 'NetworkError') {
          // Fix is working correctly
          console.log('FIXED: NetworkError thrown with user-friendly message');
        }
      }
    });

    test('Demonstrates: No diagnostic logging occurs on network failures', async () => {
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch'))
      );

      consoleErrorSpy.mockClear();

      try {
        await api.getTransactions();
      } catch {
        // Ignore the error, we're checking logging
      }

      // On UNFIXED code: no diagnostic logging (bug)
      // On FIXED code: console.error called with diagnostics (correct)
      const diagnosticLogFound = consoleErrorSpy.mock.calls.some(
        call => call[0] === '[API Network Error]'
      );

      if (!diagnosticLogFound) {
        console.log('COUNTEREXAMPLE FOUND: No diagnostic logging for network failure');
      } else {
        console.log('FIXED: Diagnostic information logged');
      }
    });

    test('Demonstrates: No user-friendly error messages are provided', async () => {
      global.fetch = jest.fn(() => 
        Promise.reject(new TypeError('Failed to fetch'))
      );

      try {
        await api.getTransactions();
        fail('Expected an error to be thrown');
      } catch (error: any) {
        // On UNFIXED code: error message is raw TypeError message
        // On FIXED code: error message is user-friendly
        
        const isUserFriendly = error.message.includes('Unable to connect to server') ||
                               error.message.includes('check your connection');

        if (!isUserFriendly) {
          console.log('COUNTEREXAMPLE FOUND: Error message is not user-friendly:', error.message);
        } else {
          console.log('FIXED: User-friendly error message provided');
        }
      }
    });
  });
});
