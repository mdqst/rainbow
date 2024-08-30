import { NativeCurrencyKey } from '@/entities';
import { RainbowFetchClient } from '@/rainbow-fetch';
import { QueryConfigWithSelect, QueryFunctionArgs, QueryFunctionResult, createQueryKey } from '@/react-query';
import { SUPPORTED_CHAIN_IDS } from '@/references';
import { useQuery } from '@tanstack/react-query';
import { ADDYS_API_KEY } from 'react-native-dotenv';
import { ConsolidatedClaimablesResponse } from './types';
import { logger, RainbowError } from '@/logger';

const addysHttp = new RainbowFetchClient({
  baseURL: 'https://addys.p.rainbow.me/v3',
  headers: {
    Authorization: `Bearer ${ADDYS_API_KEY}`,
  },
});

// ///////////////////////////////////////////////
// Query Types

export type ClaimablesArgs = {
  address: string;
  currency: NativeCurrencyKey;
  testnetMode?: boolean;
};

// ///////////////////////////////////////////////
// Query Key

export const claimablesQueryKey = ({ address, currency, testnetMode }: ClaimablesArgs) =>
  createQueryKey('claimables', { address, currency, testnetMode }, { persisterVersion: 1 });

type ClaimablesQueryKey = ReturnType<typeof claimablesQueryKey>;

// ///////////////////////////////////////////////
// Query Function

async function claimablesQueryFunction({ queryKey: [{ address, currency, testnetMode }] }: QueryFunctionArgs<typeof claimablesQueryKey>) {
  try {
    const url = `/${SUPPORTED_CHAIN_IDS({ testnetMode }).join(',')}/${address}/claimables`;
    const { data } = await addysHttp.get<ConsolidatedClaimablesResponse>(url, {
      params: {
        currency: currency.toLowerCase(),
      },
      timeout: 20000,
    });

    if (data.metadata.status !== 'ok') {
      logger.error(new RainbowError('[userAssetsQueryFunction]: Failed to fetch user assets (API error)'), {
        message: data.metadata.errors,
      });
    }

    return data.payload.claimables;
  } catch (e) {
    logger.error(new RainbowError('[userAssetsQueryFunction]: Failed to fetch user assets (client error)'), {
      message: (e as Error)?.message,
    });
  }
}

type ClaimablesResult = QueryFunctionResult<typeof claimablesQueryFunction>;

// ///////////////////////////////////////////////
// Query Hook

export function useClaimables(
  { address, currency, testnetMode }: ClaimablesArgs,
  config: QueryConfigWithSelect<ClaimablesResult, Error, ClaimablesResult, ClaimablesQueryKey> = {}
) {
  return useQuery(claimablesQueryKey({ address, currency, testnetMode }), claimablesQueryFunction, {
    ...config,
    // staleTime: 1000 * 60 * 2, // Set data to become stale after 2 minutes
    // cacheTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
    staleTime: 0,
    cacheTime: 60000,
  });
}
