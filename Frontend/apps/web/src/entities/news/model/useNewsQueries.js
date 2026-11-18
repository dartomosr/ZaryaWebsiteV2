import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getNews } from '../api/news.js';

const PREVIEW_SIZE = 3;
const FEED_PAGE_SIZE = 12;

const newsQueryOptions = /** @type {const} */ ({
  staleTime: 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  networkMode: 'always',
});

/** @param {import('../api/news.contract.js').NewsSummaryDto[]} items */
function uniqueNews(items) {
  const seenIds = new Set();

  return items.filter(({ id }) => {
    if (seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

export function useLatestNews() {
  const query = useQuery({
    ...newsQueryOptions,
    queryKey: ['news', 'latest', PREVIEW_SIZE],
    queryFn: ({ signal }) => getNews({ pageSize: PREVIEW_SIZE, signal }),
    select: uniqueNews,
  });

  return {
    items: query.data ?? [],
    loading: query.isFetching,
    error: query.isError && !query.isFetching,
    retry: () => void query.refetch({ cancelRefetch: false }),
  };
}

export function useNewsFeed() {
  const query = useInfiniteQuery({
    ...newsQueryOptions,
    queryKey: ['news', 'feed', FEED_PAGE_SIZE],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getNews({ page: pageParam, pageSize: FEED_PAGE_SIZE, signal }),
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (lastPage.length === FEED_PAGE_SIZE) {
        return lastPageParam + 1;
      }
      return undefined;
    },
  });

  function loadMore() {
    if (query.isError && !query.isFetchNextPageError) {
      void query.refetch({ cancelRefetch: false });
      return;
    }
    if (query.hasNextPage) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }

  return {
    items: uniqueNews(query.data?.pages.flat() ?? []),
    loading: query.isFetching,
    error: query.isError && !query.isFetching,
    hasMore: query.hasNextPage || query.isPending || query.isError,
    loadMore,
  };
}
