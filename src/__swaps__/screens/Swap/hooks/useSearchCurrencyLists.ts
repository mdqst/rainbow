import { rankings } from 'match-sorter';
import { useCallback, useMemo } from 'react';

import { useTokenSearch } from '@/__swaps__/screens/Swap/resources/search';
import { ChainId } from '@/__swaps__/types/chains';
import { SearchAsset, TokenSearchAssetKey, TokenSearchListId, TokenSearchThreshold } from '@/__swaps__/types/search';
import { addHexPrefix } from '@/__swaps__/utils/hex';
import { isLowerCaseMatch } from '@/__swaps__/utils/strings';
import { filterList } from '@/utils';

import { isAddress } from '@ethersproject/address';
import { useSwapAssets } from '@/state/swaps/assets';
import { useSwapSearchStore } from '@/state/swaps/search';
import { useSwapSortByStore } from '@/state/swaps/sortBy';
import { useFavorites } from '@/resources/favorites';
import { ETH_ADDRESS } from '@/references';
import { AddressZero } from '@ethersproject/constants';
import { RainbowToken } from '@/entities';

const VERIFIED_ASSETS_PAYLOAD: {
  keys: TokenSearchAssetKey[];
  list: TokenSearchListId;
  threshold: TokenSearchThreshold;
  query: string;
} = {
  keys: ['symbol', 'name'],
  list: 'verifiedAssets',
  threshold: 'CONTAINS',
  query: '',
};

export type AssetToBuySectionId = 'bridge' | 'favorites' | 'verified' | 'unverified' | 'other_networks';

export interface AssetToBuySection {
  data: SearchAsset[];
  id: AssetToBuySectionId;
}

const filterBridgeAsset = ({ asset, filter = '' }: { asset?: SearchAsset; filter?: string }) =>
  asset?.address?.toLowerCase()?.startsWith(filter?.toLowerCase()) ||
  asset?.name?.toLowerCase()?.startsWith(filter?.toLowerCase()) ||
  asset?.symbol?.toLowerCase()?.startsWith(filter?.toLowerCase());

export function useSearchCurrencyLists() {
  const inputChainId = useSwapAssets(state => state.assetToSell?.chainId) ?? ChainId.mainnet;
  const toChainId = useSwapSortByStore(state => state.outputChainId);
  const searchQuery = useSwapSearchStore(state => state.query)
    .toLowerCase()
    .trim();
  const assetToSellAddress = useSwapAssets(state => state.assetToSell?.address);
  const assetToSellMainnetAddress = useSwapAssets(state => state.assetToSell?.mainnetAddress);

  const enableUnverifiedSearch = useMemo(() => searchQuery.trim().length > 2, [searchQuery]);
  const isCrosschainSearch = useMemo(() => {
    return inputChainId && inputChainId !== toChainId;
  }, [inputChainId, toChainId]);

  // provided during swap to filter token search by available routes
  const fromChainId = useMemo(() => {
    return isCrosschainSearch ? inputChainId : undefined;
  }, [inputChainId, isCrosschainSearch]);

  const queryIsAddress = useMemo(() => isAddress(searchQuery), [searchQuery]);

  const keys: TokenSearchAssetKey[] = useMemo(() => (queryIsAddress ? ['address'] : ['name', 'symbol']), [queryIsAddress]);

  const threshold: TokenSearchThreshold = useMemo(() => (queryIsAddress ? 'CASE_SENSITIVE_EQUAL' : 'CONTAINS'), [queryIsAddress]);

  // static search data
  const { data: mainnetVerifiedAssets, isLoading: mainnetVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.mainnet,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: optimismVerifiedAssets, isLoading: optimismVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.optimism,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: bscVerifiedAssets, isLoading: bscVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.bsc,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: polygonVerifiedAssets, isLoading: polygonVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.polygon,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: arbitrumVerifiedAssets, isLoading: arbitrumVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.arbitrum,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: baseVerifiedAssets, isLoading: baseVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.base,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: zoraVerifiedAssets, isLoading: zoraVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.zora,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: avalancheVerifiedAssets, isLoading: avalancheVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.avalanche,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: blastVerifiedAssets, isLoading: blastVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.blast,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  const { data: degenVerifiedAssets, isLoading: degenVerifiedAssetsLoading } = useTokenSearch({
    chainId: ChainId.degen,
    ...VERIFIED_ASSETS_PAYLOAD,
    fromChainId,
  });

  // current search
  const { data: targetVerifiedAssets, isLoading: targetVerifiedAssetsLoading } = useTokenSearch({
    chainId: toChainId,
    keys,
    list: 'verifiedAssets',
    threshold,
    query: searchQuery,
    fromChainId,
  });
  const { data: targetUnverifiedAssets, isLoading: targetUnverifiedAssetsLoading } = useTokenSearch(
    {
      chainId: toChainId,
      keys,
      list: 'highLiquidityAssets',
      threshold,
      query: searchQuery,
      fromChainId,
    },
    {
      enabled: enableUnverifiedSearch,
    }
  );

  const { favoritesMetadata: favorites } = useFavorites();

  const favoritesList = useMemo(() => {
    const getAddressForChainId = (chainId: ChainId, token: RainbowToken) => {
      if (chainId === ChainId.mainnet) {
        if (token.address === ETH_ADDRESS) {
          return AddressZero;
        }
        return token.address;
      }

      return token.networks[chainId].address;
    };

    const unfilteredFavorites = Object.values(favorites)
      .filter(token => token.networks[toChainId])
      .map(favToken => ({
        ...favToken,
        chainId: toChainId,
        address: getAddressForChainId(toChainId, favToken),
        mainnetAddress: favToken.mainnet_address,
      })) as SearchAsset[];

    if (searchQuery === '') {
      return unfilteredFavorites;
    } else {
      const formattedQuery = queryIsAddress ? addHexPrefix(searchQuery).toLowerCase() : searchQuery;
      return filterList(unfilteredFavorites || [], formattedQuery, keys, {
        threshold: queryIsAddress ? rankings.CASE_SENSITIVE_EQUAL : rankings.CONTAINS,
      });
    }
  }, [favorites, keys, toChainId, searchQuery, queryIsAddress]);

  // const { favorites } = useFavoriteAssets();

  // const favoritesList = useMemo(() => {
  //   const favoritesByChain = favorites[toChainId] || [];
  //   if (searchQuery === '') {
  //     return favoritesByChain;
  //   } else {
  //     const formattedQuery = queryIsAddress
  //       ? addHexPrefix(searchQuery).toLowerCase()
  //       : searchQuery;
  //     return filterList<SearchAsset>(
  //       favoritesByChain || [],
  //       formattedQuery,
  //       keys,
  //       {
  //         threshold: queryIsAddress
  //           ? rankings.CASE_SENSITIVE_EQUAL
  //           : rankings.CONTAINS,
  //       },
  //     );
  //   }
  // }, [favorites, keys, toChainId, searchQuery, queryIsAddress]);

  // static verified asset lists prefetched to display curated lists
  // we only display crosschain exact matches if located here
  const verifiedAssets = useMemo(
    () => ({
      [ChainId.mainnet]: {
        assets: mainnetVerifiedAssets,
        loading: mainnetVerifiedAssetsLoading,
      },
      [ChainId.optimism]: {
        assets: optimismVerifiedAssets,
        loading: optimismVerifiedAssetsLoading,
      },
      [ChainId.bsc]: {
        assets: bscVerifiedAssets,
        loading: bscVerifiedAssetsLoading,
      },
      [ChainId.polygon]: {
        assets: polygonVerifiedAssets,
        loading: polygonVerifiedAssetsLoading,
      },
      [ChainId.arbitrum]: {
        assets: arbitrumVerifiedAssets,
        loading: arbitrumVerifiedAssetsLoading,
      },
      [ChainId.base]: {
        assets: baseVerifiedAssets,
        loading: baseVerifiedAssetsLoading,
      },
      [ChainId.zora]: {
        assets: zoraVerifiedAssets,
        loading: zoraVerifiedAssetsLoading,
      },
      [ChainId.avalanche]: {
        assets: avalancheVerifiedAssets,
        loading: avalancheVerifiedAssetsLoading,
      },
      [ChainId.blast]: {
        assets: blastVerifiedAssets,
        loading: blastVerifiedAssetsLoading,
      },
      [ChainId.degen]: {
        assets: degenVerifiedAssets,
        loading: degenVerifiedAssetsLoading,
      },
    }),
    [
      mainnetVerifiedAssets,
      mainnetVerifiedAssetsLoading,
      optimismVerifiedAssets,
      optimismVerifiedAssetsLoading,
      bscVerifiedAssets,
      bscVerifiedAssetsLoading,
      polygonVerifiedAssets,
      polygonVerifiedAssetsLoading,
      arbitrumVerifiedAssets,
      arbitrumVerifiedAssetsLoading,
      baseVerifiedAssets,
      baseVerifiedAssetsLoading,
      zoraVerifiedAssets,
      zoraVerifiedAssetsLoading,
      avalancheVerifiedAssets,
      avalancheVerifiedAssetsLoading,
      blastVerifiedAssets,
      blastVerifiedAssetsLoading,
      degenVerifiedAssets,
      degenVerifiedAssetsLoading,
    ]
  );

  // temporarily limiting the number of assets to display
  // for performance after deprecating `isRainbowCurated`
  const getVerifiedAssets = useCallback((chainId: ChainId) => verifiedAssets[chainId]?.assets?.slice(0, 50), [verifiedAssets]);

  const bridgeAsset = useMemo(() => {
    const curatedAssets = getVerifiedAssets(toChainId);
    const bridgeAsset = curatedAssets?.find(asset =>
      isLowerCaseMatch(asset.mainnetAddress, inputChainId === ChainId.mainnet ? assetToSellMainnetAddress : assetToSellAddress)
    );
    const filteredBridgeAsset = filterBridgeAsset({
      asset: bridgeAsset,
      filter: searchQuery,
    })
      ? bridgeAsset
      : null;
    return toChainId === fromChainId ? null : filteredBridgeAsset;
  }, [getVerifiedAssets, toChainId, searchQuery, fromChainId, inputChainId, assetToSellMainnetAddress, assetToSellAddress]);

  const loading = useMemo(() => {
    return searchQuery === '' ? verifiedAssets[toChainId]?.loading : targetVerifiedAssetsLoading || targetUnverifiedAssetsLoading;
  }, [toChainId, targetUnverifiedAssetsLoading, targetVerifiedAssetsLoading, searchQuery, verifiedAssets]);

  // displayed when no search query is present
  const curatedAssets = useMemo(
    () => ({
      [ChainId.mainnet]: getVerifiedAssets(ChainId.mainnet),
      [ChainId.optimism]: getVerifiedAssets(ChainId.optimism),
      [ChainId.bsc]: getVerifiedAssets(ChainId.bsc),
      [ChainId.polygon]: getVerifiedAssets(ChainId.polygon),
      [ChainId.arbitrum]: getVerifiedAssets(ChainId.arbitrum),
      [ChainId.base]: getVerifiedAssets(ChainId.base),
      [ChainId.zora]: getVerifiedAssets(ChainId.zora),
      [ChainId.avalanche]: getVerifiedAssets(ChainId.avalanche),
      [ChainId.blast]: getVerifiedAssets(ChainId.blast),
      [ChainId.degen]: getVerifiedAssets(ChainId.degen),
    }),
    [getVerifiedAssets]
  );

  const crosschainExactMatches = Object.values(verifiedAssets)
    ?.map(verifiedList => {
      return verifiedList?.assets?.filter(t => {
        const symbolMatch = isLowerCaseMatch(t?.symbol, searchQuery);
        const nameMatch = isLowerCaseMatch(t?.name, searchQuery);
        return symbolMatch || nameMatch;
      });
    })
    .flat()
    .filter(Boolean) as SearchAsset[];

  const filterAssetsFromBridgeAndAssetToSell = useCallback(
    (assets?: SearchAsset[]) =>
      assets?.filter(
        curatedAsset =>
          !isLowerCaseMatch(curatedAsset?.address, bridgeAsset?.address) && !isLowerCaseMatch(curatedAsset?.address, assetToSellAddress)
      ) || [],
    [assetToSellAddress, bridgeAsset?.address]
  );

  const filterAssetsFromFavoritesBridgeAndAssetToSell = useCallback(
    (assets?: SearchAsset[]) =>
      filterAssetsFromBridgeAndAssetToSell(assets)?.filter(
        curatedAsset => !favoritesList?.map(fav => fav.address).includes(curatedAsset.address)
      ) || [],
    [favoritesList, filterAssetsFromBridgeAndAssetToSell]
  );

  // the lists below should be filtered by favorite/bridge asset match
  const results = useMemo(() => {
    const sections: AssetToBuySection[] = [];
    if (bridgeAsset) {
      sections.push({
        data: [bridgeAsset],
        id: 'bridge',
      });
    }
    if (favoritesList?.length) {
      sections.push({
        data: filterAssetsFromBridgeAndAssetToSell(favoritesList),
        id: 'favorites',
      });
    }

    if (searchQuery === '') {
      sections.push({
        data: filterAssetsFromFavoritesBridgeAndAssetToSell(curatedAssets[toChainId]),
        id: 'verified',
      });
    } else {
      if (targetVerifiedAssets?.length) {
        sections.push({
          data: filterAssetsFromFavoritesBridgeAndAssetToSell(targetVerifiedAssets),
          id: 'verified',
        });
      }

      if (targetUnverifiedAssets?.length && enableUnverifiedSearch) {
        sections.push({
          data: filterAssetsFromFavoritesBridgeAndAssetToSell(targetUnverifiedAssets),
          id: 'unverified',
        });
      }

      if (!sections.length && crosschainExactMatches?.length) {
        sections.push({
          data: filterAssetsFromFavoritesBridgeAndAssetToSell(crosschainExactMatches),
          id: 'other_networks',
        });
      }
    }

    return sections;
  }, [
    bridgeAsset,
    favoritesList,
    searchQuery,
    filterAssetsFromBridgeAndAssetToSell,
    filterAssetsFromFavoritesBridgeAndAssetToSell,
    curatedAssets,
    toChainId,
    targetVerifiedAssets,
    targetUnverifiedAssets,
    crosschainExactMatches,
    enableUnverifiedSearch,
  ]);

  return {
    loading,
    results,
  };

  // const isCrosschainSearch = useMemo(() => {
  //   return inputChainId && inputChainId !== toChainId;
  // }, [inputChainId, toChainId]);

  // // provided during swap to filter token search by available routes
  // const fromChainId = useMemo(() => {
  //   return isCrosschainSearch ? inputChainId : undefined;
  // }, [inputChainId, isCrosschainSearch]);

  // const queryIsAddress = useMemo(() => isAddress(query), [query]);

  // const keys: TokenSearchAssetKey[] = useMemo(() => (queryIsAddress ? ['address'] : ['name', 'symbol']), [queryIsAddress]);

  // const threshold: TokenSearchThreshold = useMemo(() => (queryIsAddress ? 'CASE_SENSITIVE_EQUAL' : 'CONTAINS'), [queryIsAddress]);

  // // static search data
  // const { data: mainnetVerifiedAssets, isLoading: mainnetVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.mainnet,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: optimismVerifiedAssets, isLoading: optimismVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.optimism,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: bscVerifiedAssets, isLoading: bscVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.bsc,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: polygonVerifiedAssets, isLoading: polygonVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.polygon,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: arbitrumVerifiedAssets, isLoading: arbitrumVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.arbitrum,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: baseVerifiedAssets, isLoading: baseVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.base,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: zoraVerifiedAssets, isLoading: zoraVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.zora,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: avalancheVerifiedAssets, isLoading: avalancheVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.avalanche,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // const { data: blastVerifiedAssets, isLoading: blastVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: ChainId.blast,
  //   ...VERIFIED_ASSETS_PAYLOAD,
  //   fromChainId,
  // });

  // // current search
  // const { data: targetVerifiedAssets, isLoading: targetVerifiedAssetsLoading } = useTokenSearch({
  //   chainId: toChainId,
  //   keys,
  //   list: 'verifiedAssets',
  //   threshold,
  //   query,
  //   fromChainId,
  // });
  // const { data: targetUnverifiedAssets, isLoading: targetUnverifiedAssetsLoading } = useTokenSearch(
  //   {
  //     chainId: toChainId,
  //     keys,
  //     list: 'highLiquidityAssets',
  //     threshold,
  //     query,
  //     fromChainId,
  //   },
  //   {
  //     enabled: !!enableUnverifiedSearch,
  //   }
  // );

  // const { favoritesMetadata: favorites } = useFavorites();

  // const favoritesList = useMemo(() => {
  //   const getAddressForChainId = (chainId: ChainId, token: RainbowToken) => {
  //     if (chainId === ChainId.mainnet) {
  //       if (token.address === ETH_ADDRESS) {
  //         return AddressZero;
  //       }
  //       return token.address;
  //     }

  //     return token.networks[chainId].address;
  //   };

  //   const unfilteredFavorites = Object.values(favorites)
  //     .filter(token => token.networks[toChainId])
  //     .map(favToken => ({
  //       ...favToken,
  //       chainId: toChainId,
  //       address: getAddressForChainId(toChainId, favToken),
  //       mainnetAddress: favToken.mainnet_address,
  //     })) as SearchAsset[];

  //   if (query === '') {
  //     return unfilteredFavorites;
  //   } else {
  //     const formattedQuery = queryIsAddress ? addHexPrefix(query).toLowerCase() : query;
  //     return filterList(unfilteredFavorites || [], formattedQuery, keys, {
  //       threshold: queryIsAddress ? rankings.CASE_SENSITIVE_EQUAL : rankings.CONTAINS,
  //     });
  //   }
  // }, [favorites, keys, toChainId, query, queryIsAddress]);

  // // static verified asset lists prefetched to display curated lists
  // // we only display crosschain exact matches if located here
  // const verifiedAssets = useMemo(
  //   () => ({
  //     [ChainId.mainnet]: {
  //       assets: mainnetVerifiedAssets,
  //       loading: mainnetVerifiedAssetsLoading,
  //     },
  //     [ChainId.optimism]: {
  //       assets: optimismVerifiedAssets,
  //       loading: optimismVerifiedAssetsLoading,
  //     },
  //     [ChainId.bsc]: {
  //       assets: bscVerifiedAssets,
  //       loading: bscVerifiedAssetsLoading,
  //     },
  //     [ChainId.polygon]: {
  //       assets: polygonVerifiedAssets,
  //       loading: polygonVerifiedAssetsLoading,
  //     },
  //     [ChainId.arbitrum]: {
  //       assets: arbitrumVerifiedAssets,
  //       loading: arbitrumVerifiedAssetsLoading,
  //     },
  //     [ChainId.base]: {
  //       assets: baseVerifiedAssets,
  //       loading: baseVerifiedAssetsLoading,
  //     },
  //     [ChainId.zora]: {
  //       assets: zoraVerifiedAssets,
  //       loading: zoraVerifiedAssetsLoading,
  //     },
  //     [ChainId.avalanche]: {
  //       assets: avalancheVerifiedAssets,
  //       loading: avalancheVerifiedAssetsLoading,
  //     },
  //     [ChainId.blast]: {
  //       assets: blastVerifiedAssets,
  //       loading: blastVerifiedAssetsLoading,
  //     },
  //   }),
  //   [
  //     mainnetVerifiedAssets,
  //     mainnetVerifiedAssetsLoading,
  //     optimismVerifiedAssets,
  //     optimismVerifiedAssetsLoading,
  //     bscVerifiedAssets,
  //     bscVerifiedAssetsLoading,
  //     polygonVerifiedAssets,
  //     polygonVerifiedAssetsLoading,
  //     arbitrumVerifiedAssets,
  //     arbitrumVerifiedAssetsLoading,
  //     baseVerifiedAssets,
  //     baseVerifiedAssetsLoading,
  //     zoraVerifiedAssets,
  //     zoraVerifiedAssetsLoading,
  //     avalancheVerifiedAssets,
  //     avalancheVerifiedAssetsLoading,
  //     blastVerifiedAssets,
  //     blastVerifiedAssetsLoading,
  //   ]
  // );

  // const getVerifiedAssets = useCallback(
  //   (chainId: ChainId) => verifiedAssets[chainId]?.assets?.filter(({ isVerified }) => isVerified),
  //   [verifiedAssets]
  // );

  // const bridgeAsset = useMemo(() => {
  //   const verifiedAssets = getVerifiedAssets(toChainId);
  //   const bridgeAsset = verifiedAssets?.find(asset => isLowerCaseMatch(asset.mainnetAddress, assetToSellAddress));

  //   const filteredBridgeAsset = filterBridgeAsset({
  //     asset: bridgeAsset,
  //     filter: query,
  //   })
  //     ? bridgeAsset
  //     : null;

  //   return toChainId === inputChainId ? null : filteredBridgeAsset;
  // }, [getVerifiedAssets, toChainId, query, inputChainId, assetToSellAddress]);

  // const loading = useMemo(() => {
  //   return query === '' ? verifiedAssets[toChainId]?.loading : targetVerifiedAssetsLoading || targetUnverifiedAssetsLoading;
  // }, [toChainId, targetUnverifiedAssetsLoading, targetVerifiedAssetsLoading, query, verifiedAssets]);

  // // displayed when no search query is present
  // const verifiedAssetsByChain = useMemo(
  //   () => ({
  //     [ChainId.mainnet]: getVerifiedAssets(ChainId.mainnet),
  //     [ChainId.optimism]: getVerifiedAssets(ChainId.optimism),
  //     [ChainId.bsc]: getVerifiedAssets(ChainId.bsc),
  //     [ChainId.polygon]: getVerifiedAssets(ChainId.polygon),
  //     [ChainId.arbitrum]: getVerifiedAssets(ChainId.arbitrum),
  //     [ChainId.base]: getVerifiedAssets(ChainId.base),
  //     [ChainId.zora]: getVerifiedAssets(ChainId.zora),
  //     [ChainId.avalanche]: getVerifiedAssets(ChainId.avalanche),
  //     [ChainId.blast]: getVerifiedAssets(ChainId.blast),
  //   }),
  //   [getVerifiedAssets]
  // );

  // const crosschainExactMatches = Object.values(verifiedAssets)
  //   ?.map(verifiedList => {
  //     return verifiedList?.assets?.filter(t => {
  //       const symbolMatch = isLowerCaseMatch(t?.symbol, query);
  //       const nameMatch = isLowerCaseMatch(t?.name, query);
  //       return symbolMatch || nameMatch;
  //     });
  //   })
  //   .flat()
  //   .filter(Boolean) as SearchAsset[];

  // const filterAssetsFromBridgeAndAssetToSell = useCallback(
  //   (assets?: SearchAsset[]) =>
  //     assets?.filter(
  //       curatedAsset =>
  //         !isLowerCaseMatch(curatedAsset?.address, bridgeAsset?.address) &&
  //         !isLowerCaseMatch(curatedAsset?.address, assetToSell.value?.address)
  //     ) || [],
  //   [assetToSell.value?.address, bridgeAsset?.address]
  // );

  // const filterAssetsFromFavoritesBridgeAndAssetToSell = useCallback(
  //   (assets?: SearchAsset[]) =>
  //     filterAssetsFromBridgeAndAssetToSell(assets)?.filter(
  //       curatedAsset =>
  //         !(
  //           favoritesList?.map(fav => fav.networks[curatedAsset.chainId]?.address).includes(curatedAsset.address) ||
  //           favoritesList?.map(fav => fav.networks[ChainId.mainnet]?.address).includes(curatedAsset.address)
  //         )
  //     ) || [],
  //   [favoritesList, filterAssetsFromBridgeAndAssetToSell]
  // );

  // // the lists below should be filtered by favorite/bridge asset match
  // const results = useMemo(() => {
  //   const sections: AssetToBuySection[] = [];
  //   if (bridgeAsset) {
  //     sections.push({
  //       data: [bridgeAsset],
  //       id: 'bridge',
  //     });
  //   }

  //   if (favoritesList?.length) {
  //     sections.push({
  //       // TODO: Refactor favorites to SearchAsset type
  //       data: filterAssetsFromBridgeAndAssetToSell(favoritesList),
  //       id: 'favorites',
  //     });
  //   }

  //   if (query === '') {
  //     sections.push({
  //       data: filterAssetsFromFavoritesBridgeAndAssetToSell(verifiedAssetsByChain[toChainId]),
  //       id: 'verified',
  //     });
  //   } else {
  //     if (targetVerifiedAssets?.length) {
  //       sections.push({
  //         data: filterAssetsFromFavoritesBridgeAndAssetToSell(targetVerifiedAssets),
  //         id: 'verified',
  //       });
  //     }

  //     if (targetUnverifiedAssets?.length && enableUnverifiedSearch) {
  //       sections.push({
  //         data: filterAssetsFromFavoritesBridgeAndAssetToSell(targetUnverifiedAssets),
  //         id: 'unverified',
  //       });
  //     }

  //     if (!sections.length && crosschainExactMatches?.length) {
  //       sections.push({
  //         data: filterAssetsFromFavoritesBridgeAndAssetToSell(crosschainExactMatches),
  //         id: 'other_networks',
  //       });
  //     }
  //   }

  //   return sections;
  // }, [
  //   bridgeAsset,
  //   favoritesList,
  //   query,
  //   filterAssetsFromBridgeAndAssetToSell,
  //   filterAssetsFromFavoritesBridgeAndAssetToSell,
  //   verifiedAssetsByChain,
  //   toChainId,
  //   targetVerifiedAssets,
  //   targetUnverifiedAssets,
  //   crosschainExactMatches,
  //   enableUnverifiedSearch,
  // ]);

  // return {
  //   loading,
  //   results,
  // };
}
