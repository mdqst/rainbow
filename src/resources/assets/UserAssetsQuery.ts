import isEmpty from 'lodash/isEmpty';
import { ADDYS_API_KEY } from 'react-native-dotenv';
import { NativeCurrencyKey } from '@/entities';
import { saveAccountEmptyState } from '@/handlers/localstorage/accountLocal';
import { greaterThan } from '@/helpers/utilities';
import { rainbowFetch } from '@/rainbow-fetch';
import { createQueryKey, queryClient, QueryConfigWithSelect, QueryFunctionArgs, QueryFunctionResult } from '@/react-query';
import { useQuery } from '@tanstack/react-query';
import { filterPositionsData, parseAddressAsset } from './assets';
import { fetchHardhatBalances } from './hardhatAssets';
import { AddysAccountAssetsMeta, AddysAccountAssetsResponse, RainbowAddressAssets } from './types';
import { Network } from '@/chains/types';
import { staleBalancesStore } from '@/state/staleBalances';
import { SUPPORTED_MAINNET_CHAIN_IDS } from '@/chains';

// ///////////////////////////////////////////////
// Query Types

export type UserAssetsArgs = {
  address: string; // Address;
  currency: NativeCurrencyKey;
  connectedToHardhat: boolean;
};

// ///////////////////////////////////////////////
// Query Key

export const userAssetsQueryKey = ({ address, currency, connectedToHardhat }: UserAssetsArgs) =>
  createQueryKey('userAssets', { address, currency, connectedToHardhat }, { persisterVersion: 1 });

type UserAssetsQueryKey = ReturnType<typeof userAssetsQueryKey>;

// ///////////////////////////////////////////////
// Query Function

const fetchUserAssetsForChainIds = async ({
  address,
  currency,
  chainIds,
  staleBalanceParam,
}: {
  address: string;
  currency: NativeCurrencyKey;
  chainIds: number[];
  staleBalanceParam?: string;
}) => {
  const chainIdsString = chainIds.join(',');
  let url = `https://addys.p.rainbow.me/v3/${chainIdsString}/${address}/assets?currency=${currency.toLowerCase()}`;

  if (staleBalanceParam) {
    url = url + staleBalanceParam;
  }

  const response = await rainbowFetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${ADDYS_API_KEY}`,
    },
  });

  return response.data;
};

async function userAssetsQueryFunction({
  queryKey: [{ address, currency, connectedToHardhat }],
}: QueryFunctionArgs<typeof userAssetsQueryKey>) {
  const cache = queryClient.getQueryCache();
  const cachedAddressAssets = (cache.find(userAssetsQueryKey({ address, currency, connectedToHardhat }))?.state?.data ||
    {}) as RainbowAddressAssets;

  if (connectedToHardhat) {
    const parsedHardhatResults = await fetchHardhatBalances(address);
    return parsedHardhatResults;
  }

  try {
    staleBalancesStore.getState().clearExpiredData(address);
    const staleBalanceParam = staleBalancesStore.getState().getStaleBalancesQueryParam(address);

    const { erroredChainIds, results } = await fetchAndParseUserAssetsForChainIds({
      address,
      currency,
      chainIds: SUPPORTED_MAINNET_CHAIN_IDS,
      staleBalanceParam,
    });
    let parsedSuccessResults = results;

    // grab cached data for chain IDs with errors
    if (!isEmpty(erroredChainIds)) {
      const cachedDataForErroredChainIds = Object.keys(cachedAddressAssets)
        .filter(uniqueId => {
          const cachedAsset = cachedAddressAssets[uniqueId];
          return erroredChainIds?.find((chainId: number) => chainId === cachedAsset.chainId);
        })
        .reduce((cur, uniqueId) => {
          return Object.assign(cur, {
            [uniqueId]: cachedAddressAssets[uniqueId],
          });
        }, {});

      parsedSuccessResults = {
        ...parsedSuccessResults,
        ...cachedDataForErroredChainIds,
      };

      retryErroredChainIds(address, currency, connectedToHardhat, erroredChainIds);
    }

    return parsedSuccessResults;
  } catch (e) {
    return cachedAddressAssets;
  }
}

const retryErroredChainIds = async (
  address: string,
  currency: NativeCurrencyKey,
  connectedToHardhat: boolean,
  erroredChainIds: number[]
) => {
  const { meta, results } = await fetchAndParseUserAssetsForChainIds({ address, currency, chainIds: erroredChainIds });
  let parsedSuccessResults = results;
  const successChainIds = meta?.chain_ids;

  if (isEmpty(successChainIds)) {
    return;
  }

  // grab cached data without data that will be replaced
  const cache = queryClient.getQueryCache();
  const cachedAddressAssets = (cache.find(userAssetsQueryKey({ address, currency, connectedToHardhat }))?.state?.data ||
    {}) as RainbowAddressAssets;

  const cachedData = Object.keys(cachedAddressAssets)
    .filter(uniqueId => {
      const cachedAsset = cachedAddressAssets[uniqueId];
      return successChainIds?.find((chainId: number) => chainId !== cachedAsset.chainId);
    })
    .reduce((cur, uniqueId) => {
      return Object.assign(cur, {
        [uniqueId]: cachedAddressAssets[uniqueId],
      });
    }, {});

  parsedSuccessResults = {
    ...cachedData,
    ...parsedSuccessResults,
  };

  queryClient.setQueryData(userAssetsQueryKey({ address, currency, connectedToHardhat }), parsedSuccessResults);
};

type UserAssetsResult = QueryFunctionResult<typeof userAssetsQueryFunction>;

interface AssetsAndMetadata {
  erroredChainIds: number[];
  meta: AddysAccountAssetsMeta;
  results: RainbowAddressAssets;
}

const fetchAndParseUserAssetsForChainIds = async ({
  address,
  currency,
  chainIds,
  staleBalanceParam,
}: {
  address: string;
  currency: NativeCurrencyKey;
  chainIds: number[];
  staleBalanceParam?: string;
}): Promise<AssetsAndMetadata> => {
  const data = await fetchUserAssetsForChainIds({ address, currency, chainIds, staleBalanceParam });
  let parsedSuccessResults = parseUserAssetsByChain(data);

  // filter out positions data
  parsedSuccessResults = filterPositionsData(address, currency, parsedSuccessResults);

  // update account empty state
  if (!isEmpty(parsedSuccessResults)) {
    saveAccountEmptyState(false, address, Network.mainnet);
  }

  const erroredChainIds = data?.meta?.chain_ids_with_errors;
  return { erroredChainIds, meta: data?.meta, results: parsedSuccessResults };
};

function parseUserAssetsByChain(message: AddysAccountAssetsResponse) {
  return Object.values(message?.payload?.assets || {}).reduce((dict, assetData) => {
    if (greaterThan(assetData?.quantity, 0)) {
      const parsedAsset = parseAddressAsset({
        assetData,
      });
      dict[parsedAsset?.uniqueId] = parsedAsset;
    }
    return dict;
  }, {} as RainbowAddressAssets);
}

// ///////////////////////////////////////////////
// Query Fetcher (Optional)

export async function fetchUserAssets<TSelectResult = UserAssetsResult>(
  { address, currency, connectedToHardhat }: UserAssetsArgs,
  config: QueryConfigWithSelect<UserAssetsResult, Error, TSelectResult, UserAssetsQueryKey> = {}
) {
  return await queryClient.fetchQuery(userAssetsQueryKey({ address, currency, connectedToHardhat }), userAssetsQueryFunction, config);
}

// ///////////////////////////////////////////////
// Query Hook

export function useUserAssets<TSelectResult = UserAssetsResult>(
  { address, currency, connectedToHardhat }: UserAssetsArgs,
  config: QueryConfigWithSelect<UserAssetsResult, Error, TSelectResult, UserAssetsQueryKey> = {}
) {
  return useQuery(userAssetsQueryKey({ address, currency, connectedToHardhat }), userAssetsQueryFunction, {
    enabled: !!address && !!currency,
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // 2 minutes
    ...config,
  });
}
