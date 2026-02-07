"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { honoClient } from "../../lib/api/client";
import type { Config } from "../../server/config/config";

export const configQueryConfig = {
  queryKey: ["config"],
  queryFn: async () => {
    const response = await honoClient.api.config.$get();
    return await response.json();
  },
} as const;

export const useConfig = () => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    ...configQueryConfig,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Config) => {
      const response = await honoClient.api.config.$put({
        json: config,
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: configQueryConfig.queryKey,
      });
    },
  });

  return {
    config: data?.config,
    updateConfig: useCallback(
      (config: Config) => {
        updateConfigMutation.mutate(config);
      },
      [updateConfigMutation],
    ),
  } as const;
};
