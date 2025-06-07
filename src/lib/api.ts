const getBaseUrl = () => {
  const env = process.env.NODE_ENV;
  if (env === 'production') {
    return 'https://chatlyzerai.com/api';
  } else if (env === 'development') {
    return 'http://localhost:3000/api';
  } else {
    return 'http://chatlyzerai.com/api';
  }
};

const BASE_URL = getBaseUrl();

export const createApiClient = (getToken: () => string | null) => {
  const getDefaultHeaders = (isFileUpload = false) => {
    const headers: Record<string, string> = {};

    if (!isFileUpload) {
      headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  };

  const handleResponse = async (response: Response) => {
    const contentType = response.headers.get("Content-Type") || "";

    if (response.ok) {
      if (contentType.includes("application/json")) {
        return await response.json();
      } else if (contentType.includes("text/")) {
        return await response.text();
      } else {
        return await response.blob();
      }
    }

    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      console.warn("Could not parse error response as JSON:", parseError);
      errorData = { message: response.statusText || "Unknown error" };
    }

    const errorMessage = errorData.message || 
                         errorData.error || 
                         errorData.details || 
                         response.statusText || 
                         `HTTP Error ${response.status}`;

    const error = new Error(errorMessage) as Error & {
      status?: number;
      data?: any;
    };
    error.status = response.status;
    error.data = errorData;

    throw error;
  };

  const buildUrl = (endpoint: string, params?: Record<string, any>) => {
    const url = new URL(`${BASE_URL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) =>
              url.searchParams.append(`${key}[]`, String(item)),
            );
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    return url.toString();
  };

  return {
    get: async (endpoint: string, params?: Record<string, any>) => {
      const url = buildUrl(endpoint, params);
      const response = await fetch(url, {
        method: "GET",
        headers: getDefaultHeaders(),
      });
      return handleResponse(response);
    },

    post: async (endpoint: string, data?: any) => {
      const isFileUpload = data instanceof FormData;
      const url = buildUrl(endpoint);
      const response = await fetch(url, {
        method: "POST",
        headers: getDefaultHeaders(isFileUpload),
        body: isFileUpload ? data : data ? JSON.stringify(data) : undefined,
      });
      return handleResponse(response);
    },

    put: async (endpoint: string, data?: any) => {
      const url = buildUrl(endpoint);
      const response = await fetch(url, {
        method: "PUT",
        headers: getDefaultHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
      return handleResponse(response);
    },

    delete: async (endpoint: string, params?: Record<string, any>) => {
      const url = buildUrl(endpoint, params);
      const response = await fetch(url, {
        method: "DELETE",
        headers: getDefaultHeaders(),
      });
      return handleResponse(response);
    },
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
