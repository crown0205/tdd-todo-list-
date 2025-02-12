import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { BASE_URL } from '../../api/axios';
import { server } from '../../mocks/server';
import useGetTodos from '../queries/useGetTodos';

const MOCK_TODOS = [
  { id: 1, title: '리액트 공부하기', isCompleted: false },
  { id: 2, title: 'TDD 연습하기', isCompleted: false },
];

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGetTodos', () => {
  test('처음에는 로딩 상태여야 합니다', () => {
    const { result } = renderHook(() => useGetTodos(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  test('데이터 조회 성공', async () => {
    const { result } = renderHook(() => useGetTodos(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MOCK_TODOS);
  });

  test('데이터 조회 실패', async () => {
    server.use(
      http.get(`${BASE_URL}/todos`, () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 },
        );
      }),
    );

    const { result } = renderHook(() => useGetTodos(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toMatch(/500/);
  });

  test('캐시 활용 시 재호출이 발생하지 않아야 한다', async () => {
    let requestCount = 0;
    server.use(
      http.get(`${BASE_URL}/todos`, () => {
        requestCount++;
        return HttpResponse.json(MOCK_TODOS);
      }),
    );

    const { result, rerender } = renderHook(() => useGetTodos(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestCount).toBe(1);

    // 컴포넌트 재렌더링
    rerender();

    expect(requestCount).toBe(1);
    expect(result.current.data).toEqual(MOCK_TODOS);
  });
});
