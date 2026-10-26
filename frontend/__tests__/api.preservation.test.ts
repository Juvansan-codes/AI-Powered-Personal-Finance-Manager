/**
 * Preservation Property Tests
 * Property 2: Successful Request and HTTP Error Behavior
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * IMPORTANT: These tests follow observation-first methodology.
 * They verify existing behavior on UNFIXED code for non-buggy inputs
 * (server reachable, returns HTTP responses).
 * 
 * GOAL: Capture baseline behavior to preserve during the fix.
 * EXPECTED OUTCOME: All tests PASS on unfixed code.
 */

import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Mock supabase module
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { 
          session: { 
            access_token: 'test-token', 
            expires_at: Math.floor(Date.now() / 1000) + 3600 
          } 
        },
        error: null,
      })),
      refreshSession: jest.fn(() => Promise.resolve({
        data: { 
          session: { 
            access_token: 'refreshed-token', 
            expires_at: Math.floor(Date.now() / 1000) + 3600 
          } 
        },
        error: null,
      })),
      signOut: jest.fn(() => Promise.resolve({})),
    },
  },
}));

// Mock utils module
jest.mock('@/lib/utils', () => ({
  API_BASE: 'http://localhost:8000',
}));

describe('Preservation Property Tests: Successful Request and HTTP Error Behavior', () => {
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Property 2.1: Successful GET request returns parsed JSON data', () => {
    
    test('Successful 200 response with JSON body returns parsed data', async () => {
      const mockTransactions = [
        { id: '1', amount: 50.00, category: 'Food', description: 'Lunch' },
        { id: '2', amount: 100.00, category: 'Transport', description: 'Gas' },
      ];

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTransactions),
        } as Response)
      );

      const result = await api.getTransactions();

      expect(result).toEqual(mockTransactions);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/transactions/',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    test('Successful 200 response for analytics summary', async () => {
      const mockSummary = {
        total_income: 5000,
        total_expenses: 3000,
        net_savings: 2000,
        transaction_count: 25,
      };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSummary),
        } as Response)
      );

      const result = await api.getSummary();

      expect(result).toEqual(mockSummary);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/analytics/summary',
        expect.any(Object)
      );
    });

    test('Successful 200 response for budgets', async () => {
      const mockBudgets = [
        { id: '1', category: 'Food', limit: 500, spent: 250 },
        { id: '2', category: 'Entertainment', limit: 200, spent: 150 },
      ];

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockBudgets),
        } as Response)
      );

      const result = await api.getBudgets();

      expect(result).toEqual(mockBudgets);
    });
  });

  describe('Property 2.2: Successful POST request sends body and headers correctly', () => {
    
    test('Successful 201 response for creating transaction', async () => {
      const newTransaction = {
        amount: 75.50,
        category: 'Shopping',
        type: 'expense' as const,
        description: 'New shirt',
        date: '2025-01-15',
      };

      const createdTransaction = {
        id: '3',
        ...newTransaction,
      };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(createdTransaction),
        } as Response)
      );

      const result = await api.createTransaction(newTransaction);

      expect(result).toEqual(createdTransaction);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/transactions/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newTransaction),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    test('Successful POST for categorize endpoint', async () => {
      const mockCategorizeResult = {
        predicted_category: 'Food',
        confidence: 0.95,
      };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCategorizeResult),
        } as Response)
      );

      const result = await api.categorize('Pizza delivery', 'expense');

      expect(result).toEqual(mockCategorizeResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/categorize/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ 
            description: 'Pizza delivery', 
            transaction_type: 'expense' 
          }),
        })
      );
    });

    test('Successful POST for anomaly check', async () => {
      const mockAnomalyCheck = {
        is_anomaly: false,
        confidence: 0.85,
        message: 'Transaction appears normal',
      };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAnomalyCheck),
        } as Response)
      );

      const result = await api.checkAnomaly(100, 'Food', 'Groceries');

      expect(result).toEqual(mockAnomalyCheck);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/analytics/anomalies/check',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ 
            amount: 100, 
            category: 'Food', 
            type: 'expense',
            description: 'Groceries',
          }),
        })
      );
    });
  });

  describe('Property 2.3: 401 response triggers single-flight token refresh and retry', () => {
    
    test('401 response triggers token refresh and retries successfully', async () => {
      const mockTransactions = [{ id: '1', amount: 50.00 }];
      
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call returns 401
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized'),
          } as Response);
        } else {
          // Second call (after refresh) returns 200
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockTransactions),
          } as Response);
        }
      });

      const mockSupabase = supabase as any;
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { 
          session: { 
            access_token: 'expired-token', 
            expires_at: Math.floor(Date.now() / 1000) - 100 // expired
          } 
        },
        error: null,
      });

      const result = await api.getTransactions();

      expect(result).toEqual(mockTransactions);
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('401 response with failed refresh triggers signOut', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        } as Response)
      );

      const mockSupabase = supabase as any;
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Refresh token expired' },
      });

      await expect(api.getTransactions()).rejects.toMatchObject({
        name: 'AuthSessionError',
      });
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Property 2.4: HTTP errors (400, 404, 500) parse error messages and throw Error', () => {
    
    test('400 Bad Request throws Error with parsed message', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Invalid transaction data'),
        } as Response)
      );

      await expect(api.createTransaction({
        amount: -50,
        category: 'Food',
        type: 'expense',
        description: 'Invalid',
        date: '2025-01-15',
      })).rejects.toThrow('API error 400: Invalid transaction data');
    });

    test('404 Not Found throws Error with parsed message', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Transaction not found'),
        } as Response)
      );

      await expect(api.deleteTransaction('nonexistent-id')).rejects.toThrow(
        'API error 404: Transaction not found'
      );
    });

    test('500 Internal Server Error throws Error with parsed message', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Database connection failed'),
        } as Response)
      );

      await expect(api.getSummary()).rejects.toThrow(
        'API error 500: Database connection failed'
      );
    });

    test('HTTP error with empty response body shows Unknown error', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.reject(new Error('Failed to parse')),
        } as Response)
      );

      await expect(api.getTransactions()).rejects.toThrow('API error 503: Unknown error');
    });
  });

  describe('Property 2.5: 204 No Content returns undefined', () => {
    
    test('DELETE request with 204 response returns undefined', async () => {
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.reject(new Error('No content')),
        } as Response)
      );

      const result = await api.deleteTransaction('123');

      expect(result).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/transactions/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Property 2.6: FormData uploads in transcribeAudio work with custom headers', () => {
    
    test('Successful audio transcription with FormData', async () => {
      const mockTranscription = {
        text: 'Spent fifty dollars on groceries',
        confidence: 0.95,
      };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTranscription),
        } as Response)
      );

      const audioBlob = new Blob(['test audio data'], { type: 'audio/wav' });
      const result = await api.transcribeAudio(audioBlob);

      expect(result).toEqual(mockTranscription);
      
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:8000/api/voice/transcribe');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
      expect(fetchCall[1].headers).not.toHaveProperty('Content-Type'); // FormData sets this
      expect(fetchCall[1].headers).toHaveProperty('Authorization');
    });

    test('transcribeAudio handles different audio formats', async () => {
      const mockTranscription = { text: 'Test', confidence: 0.9 };

      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTranscription),
        } as Response)
      );

      // Test with MP3 format
      const mp3Blob = new Blob(['audio data'], { type: 'audio/mpeg' });
      await api.transcribeAudio(mp3Blob);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      const file = formData.get('file') as File;
      
      expect(file.name).toBe('recording.mp3');
    });

    test('transcribeAudio with 401 triggers retry with refreshed token', async () => {
      const mockTranscription = { text: 'Test', confidence: 0.9 };
      
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
          } as Response);
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockTranscription),
          } as Response);
        }
      });

      const mockSupabase = supabase as any;
      mockSupabase.auth.getSession
        .mockResolvedValueOnce({
          data: { 
            session: { 
              access_token: 'expired-token', 
              expires_at: Math.floor(Date.now() / 1000) - 100 
            } 
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { 
            session: { 
              access_token: 'refreshed-token', 
              expires_at: Math.floor(Date.now() / 1000) + 3600 
            } 
          },
          error: null,
        });

      const audioBlob = new Blob(['test audio'], { type: 'audio/wav' });
      const result = await api.transcribeAudio(audioBlob);

      expect(result).toEqual(mockTranscription);
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Property 2.7: Concurrent API requests execute independently', () => {
    
    test('Multiple concurrent GET requests execute independently', async () => {
      const mockTransactions = [{ id: '1' }];
      const mockSummary = { total_income: 5000 };
      const mockBudgets = [{ id: '1', category: 'Food' }];

      let requestCount = 0;
      global.fetch = jest.fn((input: RequestInfo | URL) => {
        const url = String(input);
        requestCount++;
        
        if (url.includes('/transactions/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockTransactions),
          } as Response);
        } else if (url.includes('/summary')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockSummary),
          } as Response);
        } else if (url.includes('/budgets/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockBudgets),
          } as Response);
        }
        
        return Promise.reject(new Error('Unknown URL'));
      });

      // Fire all requests concurrently
      const [transactions, summary, budgets] = await Promise.all([
        api.getTransactions(),
        api.getSummary(),
        api.getBudgets(),
      ]);

      expect(transactions).toEqual(mockTransactions);
      expect(summary).toEqual(mockSummary);
      expect(budgets).toEqual(mockBudgets);
      expect(requestCount).toBe(3);
    });

    test('Concurrent requests with mixed success and failure', async () => {
      global.fetch = jest.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/transactions/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          } as Response);
        } else if (url.includes('/summary')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error'),
          } as Response);
        } else if (url.includes('/budgets/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          } as Response);
        }
        
        return Promise.reject(new Error('Unknown URL'));
      });

      const results = await Promise.allSettled([
        api.getTransactions(),
        api.getSummary(),
        api.getBudgets(),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toContain('API error 500');
      }
    });
  });

  describe('Preservation Summary: All existing behaviors unchanged', () => {
    
    test('Comprehensive behavior preservation verification', async () => {
      // This test documents all the behaviors that must be preserved:
      // 1. Successful requests parse JSON correctly
      // 2. POST requests send body/headers correctly
      // 3. 401 triggers auth retry
      // 4. HTTP errors parse error messages
      // 5. 204 returns undefined
      // 6. FormData uploads work
      // 7. Concurrent requests execute independently

      const behaviors = {
        successfulGetRequest: false,
        successfulPostRequest: false,
        auth401Retry: false,
        httpErrorParsing: false,
        noContent204: false,
        formDataUpload: false,
        concurrentRequests: false,
      };

      // Test 1: Successful GET
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([{ id: '1' }]),
        } as Response)
      );
      const transactions = await api.getTransactions();
      behaviors.successfulGetRequest = Array.isArray(transactions);

      // Test 2: Successful POST
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: '2' }),
        } as Response)
      );
      const created = await api.createTransaction({
        amount: 50,
        category: 'Food',
        type: 'expense',
        description: 'Test',
        date: '2025-01-15',
      });
      behaviors.successfulPostRequest = created.id === '2';

      // Test 3: HTTP Error
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not found'),
        } as Response)
      );
      try {
        await api.getSummary();
      } catch (error: any) {
        behaviors.httpErrorParsing = error.message.includes('API error 404');
      }

      // Test 4: 204 No Content
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 204,
        } as Response)
      );
      const deleted = await api.deleteTransaction('123');
      behaviors.noContent204 = deleted === undefined;

      // Verify all behaviors are preserved
      expect(behaviors.successfulGetRequest).toBe(true);
      expect(behaviors.successfulPostRequest).toBe(true);
      expect(behaviors.httpErrorParsing).toBe(true);
      expect(behaviors.noContent204).toBe(true);
    });
  });
});
