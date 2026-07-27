const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type CustomFetchOptions = RequestInit;

export const customFetch = async <T>(
  path: string,
  options: CustomFetchOptions = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};
