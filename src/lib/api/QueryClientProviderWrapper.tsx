"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return makeQueryClient();
  } else {
    browserQueryClient ??= makeQueryClient();
    return browserQueryClient;
  }
};

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        refetchInterval: 1000 * 60 * 5,
        retry: false,
      },
    },
  });

export const QueryClientProviderWrapper: FC<PropsWithChildren> = ({
  children,
}) => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
