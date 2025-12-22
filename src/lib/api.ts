// API Client Wrapper - Typed fetch helpers with error handling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const COMMAND_KEY = process.env.NEXT_PUBLIC_COMMAND_KEY || '';

// Get auth headers
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (COMMAND_KEY) {
    headers['x-command-key'] = COMMAND_KEY;
  }
  
  return headers;
}

// Build full URL
function buildUrl(endpoint: string, queryParams?: Record<string, string>): string {
  const base = API_BASE_URL || '';
  const url = base + endpoint;
  
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    return `${url}?${params.toString()}`;
  }
  
  return url;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic GET helper
export async function apiGet<T>(
  endpoint: string,
  queryParams?: Record<string, string>
): Promise<T> {
  const url = buildUrl(endpoint, queryParams);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

// Generic POST helper
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  queryParams?: Record<string, string>
): Promise<T> {
  const url = buildUrl(endpoint, queryParams);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

// Generic PATCH helper
export async function apiPatch<T>(
  endpoint: string,
  body: unknown,
  queryParams?: Record<string, string>
): Promise<T> {
  const url = buildUrl(endpoint, queryParams);
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

// Generic PUT helper
export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  queryParams?: Record<string, string>
): Promise<T> {
  const url = buildUrl(endpoint, queryParams);
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}
