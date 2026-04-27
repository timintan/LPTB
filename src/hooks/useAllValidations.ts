import { useQueries } from "@tanstack/react-query";
import type { QuarterKey } from "@/lib/csv";
import { fetchSheetRows } from "@/lib/fetchSheet";

const QUARTERS: QuarterKey[] = ["tw-1", "tw-2", "tw-3", "tw-4"];

export function useQuarter(key: QuarterKey) {
  return useQueries({
    queries: [
      {
        queryKey: ["validation", key],
        queryFn: () => fetchSheetRows(key),
        staleTime: 5 * 60 * 1000,
        retry: false,
      },
    ],
  })[0];
}

export function useAllQuarters() {
  return useQueries({
    queries: QUARTERS.map((key) => ({
      queryKey: ["validation", key],
      queryFn: () => fetchSheetRows(key),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });
}
