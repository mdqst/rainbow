import React from 'react';
import { AccentColorProvider, Bleed, Box, Inline, Text, TextShadow, globalColors, useColorMode } from '@/design-system';
import * as i18n from '@/languages';
import { ListHeader, Panel, TapToDismiss, controlPanelStyles } from '@/components/SmoothPager/ListPanel';
import { ChainNameDisplay } from '@/networks/types';
import { useAccountSettings } from '@/hooks';
import { ethereumUtils, safeAreaInsetValues } from '@/utils';
import { View } from 'react-native';
import { IS_IOS } from '@/env';
import { ButtonPressAnimation } from '@/components/animations';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Claimable } from '@/resources/addys/claimables/types';
import RainbowCoinIcon from '@/components/coin-icon/RainbowCoinIcon';
import { useTheme } from '@/theme';
import { FasterImageView } from '@candlefinance/faster-image';
import { useClaimables } from '@/resources/addys/claimables/query';
import { useMutation } from '@tanstack/react-query';
import { RapSwapActionParameters } from '@/raps/references';
import { loadWallet } from '@/model/wallet';
import { getGasSettingsBySpeed } from '@/__swaps__/screens/Swap/hooks/useSelectedGas';
// import { ContextMenuButton } from '@/components/context-menu';

type RouteParams = {
  ClaimClaimablePanelParams: { uniqueId: string };
};

export const ClaimClaimablePanel = () => {
  const {
    params: { uniqueId },
  } = useRoute<RouteProp<RouteParams, 'ClaimClaimablePanelParams'>>();

  const { accountAddress, nativeCurrency } = useAccountSettings();
  const { data = [] } = useClaimables(
    {
      address: accountAddress,
      currency: nativeCurrency,
    },
    {
      select: data => data?.filter(claimable => claimable.uniqueId === uniqueId),
    }
  );

  const [claimable] = data;

  if (!claimable) return null;

  return (
    <>
      <Box
        style={[
          controlPanelStyles.panelContainer,
          { bottom: Math.max(safeAreaInsetValues.bottom + 5, IS_IOS ? 8 : 30), alignItems: 'center', width: '100%' },
        ]}
      >
        <ClaimingClaimable claimable={claimable} />
      </Box>
      <TapToDismiss />
    </>
  );
};

const ClaimingClaimable = ({ claimable }: { claimable: Claimable }) => {
  const { isDarkMode } = useColorMode();
  const { accountAddress } = useAccountSettings();
  const theme = useTheme();

  // const menuConfig = useMemo(() => {
  //   return {
  //     menuItems: {},
  //   };
  // }, []);

  // const onShowActionSheet = useCallback(() => {}, []);

  const chainName = ChainNameDisplay[claimable.chainId];

  const { mutate: claimRewards } = useMutation<{
    nonce: number | null;
  }>({
    mutationFn: async () => {
      // Fetch the native asset from the origin chain
      const opEth_ = await ethereumUtils.getNativeAssetForNetwork({ chainId: ChainId.optimism });
      const opEth = {
        ...opEth_,
        chainName: chainNameFromChainId(ChainId.optimism),
      };

      // Fetch the native asset from the destination chain
      let destinationEth_;
      if (chainId === ChainId.base) {
        destinationEth_ = await ethereumUtils.getNativeAssetForNetwork({ chainId: ChainId.base });
      } else if (chainId === ChainId.zora) {
        destinationEth_ = await ethereumUtils.getNativeAssetForNetwork({ chainId: ChainId.zora });
      } else {
        destinationEth_ = opEth;
      }

      // Add missing properties to match types
      const destinationEth = {
        ...destinationEth_,
        chainName: chainNameFromChainId(chainId as ChainId),
      };

      const selectedGas = {
        maxBaseFee: meteorologyData?.fast.maxBaseFee,
        maxPriorityFee: meteorologyData?.fast.maxPriorityFee,
      };

      let gasParams: TransactionGasParamAmounts | LegacyTransactionGasParamAmounts = {} as
        | TransactionGasParamAmounts
        | LegacyTransactionGasParamAmounts;

      gasParams = {
        maxFeePerGas: selectedGas?.maxBaseFee as string,
        maxPriorityFeePerGas: selectedGas?.maxPriorityFee as string,
      };
      const gasFeeParamsBySpeed = getGasSettingsBySpeed(claimable.chainId);

      const actionParams = {
        address: accountAddress,
        toChainId: claimable.chainId,
        sellAmount: claimable as string,
        chainId: ChainId.optimism,
        assetToSell: opEth as ParsedAsset,
        assetToBuy: destinationEth as ParsedAsset,
        quote: undefined,
        // @ts-expect-error - collision between old gas types and new
        gasFeeParamsBySpeed,
        gasParams,
      } satisfies RapSwapActionParameters<'claimRewardsBridge'>;

     const tx = {
        to?: string,
        from?: string,
        nonce?: BigNumberish,
    
        gasLimit?: BigNumberish,
        gasPrice?: BigNumberish,
    
        data?: BytesLike,
        value?: BigNumberish,
        chainId?: number
    
        type?: number;
        accessList?: AccessListish;
    
        maxPriorityFeePerGas?: BigNumberish;
        maxFeePerGas?: BigNumberish;
    
        customData?: Record<string, any>;
        ccipReadEnabled?: boolean;
    }

      const provider = getProvider({ chainId: ChainId.optimism });
      const wallet = await loadWallet({
        address,
        showErrorIfNotLoaded: false,
        provider,
      });
      if (!wallet) {
        // Biometrics auth failure (retry possible)
        setClaimStatus('error');
        return { nonce: null };
      }

      try {
        const { errorMessage, nonce: bridgeNonce } = await walletExecuteRap(
          wallet,
          'claimRewardsBridge',
          // @ts-expect-error - collision between old gas types and new
          actionParams
        );

        if (errorMessage) {
          if (errorMessage.includes('[CLAIM-REWARDS]')) {
            // Claim error (retry possible)
            setClaimStatus('error');
          } else {
            // Bridge error (retry not possible)
            setClaimStatus('bridge-error');
          }

          logger.error(new RainbowError('[ClaimRewardsPanel]: Failed to claim ETH rewards'), { message: errorMessage });

          return { nonce: null };
        }

        if (typeof bridgeNonce === 'number') {
          // Clear and refresh claim data so available claim UI disappears
          invalidatePointsQuery(address);
          refetch();
          return { nonce: bridgeNonce };
        } else {
          setClaimStatus('error');
          return { nonce: null };
        }
      } catch (e) {
        setClaimStatus('error');
        return { nonce: null };
      }
    },
    onError: error => {
      const errorCode =
        error && typeof error === 'object' && 'code' in error && isClaimError(error.code as PointsErrorType)
          ? (error.code as PointsErrorType)
          : 'error';
      setClaimStatus(errorCode);
    },
    onSuccess: async ({ nonce }: { nonce: number | null }) => {
      if (typeof nonce === 'number') {
        setClaimStatus('success');
      }
    },
  });

  return (
    <Panel>
      <ListHeader
        TitleComponent={
          <Box alignItems="center" flexDirection="row" gap={10} justifyContent="center">
            <Box
              as={FasterImageView}
              source={{ url: claimable.iconUrl }}
              style={{ height: 20, width: 20, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.03)' }}
            />
            <TextShadow shadowOpacity={0.3}>
              <Text align="center" color="label" size="20pt" weight="heavy">
                {'Claim'}
              </Text>
            </TextShadow>
          </Box>
        }
        showBackButton={false}
      />

      <Box alignItems="center" paddingTop="44px" paddingBottom="24px" gap={42}>
        {/* <Box alignItems="center" gap={20}> */}
        <Box alignItems="center" flexDirection="row" gap={8} justifyContent="center">
          <Bleed vertical={{ custom: 4.5 }}>
            <View
              style={
                IS_IOS && isDarkMode
                  ? {
                      shadowColor: globalColors.grey100,
                      shadowOpacity: 0.2,
                      shadowOffset: { height: 4, width: 0 },
                      shadowRadius: 6,
                    }
                  : {}
              }
            >
              <RainbowCoinIcon
                size={40}
                icon={claimable.asset.iconUrl}
                chainId={claimable.chainId}
                symbol={claimable.asset.symbol}
                theme={theme}
                colors={undefined}
              />
            </View>
          </Bleed>
          <TextShadow blur={12} color={globalColors.grey100} shadowOpacity={0.1} y={4}>
            <Text align="center" color="label" size="44pt" weight="black">
              {claimable.value.nativeAsset.display}
            </Text>
          </TextShadow>
        </Box>
        {/* <Inline space={{ custom: 5 }} alignVertical="center">
            <TextShadow shadowOpacity={0.3}>
              <Text align="center" color="labelTertiary" size="17pt" weight="bold">
                {'Receive'}
              </Text>
            </TextShadow>
            <ContextMenuButton
              hitSlop={20}
              menuItems={menuConfig.menuItems}
              menuTitle=""
              onPressMenuItem={() => {}}
              onPressAndroid={onShowActionSheet}
              testID={undefined}
            >
              <Box
                height={{ custom: 28 }}
                paddingHorizontal={{ custom: 7 }}
                alignItems="center"
                justifyContent="center"
                borderRadius={12}
                borderWidth={1.33}
                style={{ backgroundColor: 'rgba(9, 17, 31, 0.02)' }}
                borderColor={{ custom: 'rgba(9, 17, 31, 0.02)' }}
              >
                <Inline alignVertical="center" space="4px" wrap={false}>
                  <Text align="center" color="label" size="17pt" weight="heavy">
                    {'USDC'}
                  </Text>
                  <Text align="center" color="labelSecondary" size="icon 12px" weight="heavy">
                    􀆏
                  </Text>
                </Inline>
              </Box>
            </ContextMenuButton>
            <TextShadow shadowOpacity={0.3}>
              <Text align="center" color="labelTertiary" size="17pt" weight="bold">
                {'on'}
              </Text>
            </TextShadow>
            <ContextMenuButton
              hitSlop={20}
              menuItems={menuConfig.menuItems}
              menuTitle=""
              onPressMenuItem={() => {}}
              onPressAndroid={onShowActionSheet}
              testID={undefined}
            >
              <Box
                height={{ custom: 28 }}
                paddingHorizontal={{ custom: 7 }}
                alignItems="center"
                justifyContent="center"
                borderRadius={12}
                borderWidth={1.33}
                style={{ backgroundColor: 'rgba(9, 17, 31, 0.02)' }}
                borderColor={{ custom: 'rgba(9, 17, 31, 0.02)' }}
              >
                <Inline alignVertical="center" space="4px" wrap={false}>
                  <Text align="center" color="label" size="17pt" weight="heavy">
                    {chainName}
                  </Text>
                  <Text align="center" color="labelSecondary" size="icon 12px" weight="heavy">
                    􀆏
                  </Text>
                </Inline>
              </Box>
            </ContextMenuButton>
          </Inline> */}
        {/* </Box> */}
        <Box gap={20} alignItems="center" width="full">
          <ButtonPressAnimation style={{ width: '100%', paddingHorizontal: 18 }} scaleTo={0.96}>
            <AccentColorProvider color="#295AF7">
              <Box
                background="accent"
                shadow="30px accent"
                borderRadius={43}
                height={{ custom: 48 }}
                width="full"
                alignItems="center"
                justifyContent="center"
              >
                <Inline alignVertical="center" space="6px">
                  <TextShadow shadowOpacity={0.3}>
                    <Text align="center" color="label" size="icon 20px" weight="heavy">
                      􀎽
                    </Text>
                  </TextShadow>
                  <TextShadow shadowOpacity={0.3}>
                    <Text align="center" color="label" size="20pt" weight="heavy">
                      {`Claim ${claimable.value.claimAsset.display}`}
                    </Text>
                  </TextShadow>
                </Inline>
              </Box>
            </AccentColorProvider>
          </ButtonPressAnimation>
          <Inline alignVertical="center" space="2px">
            <Text align="center" color="labelQuaternary" size="icon 10px" weight="heavy">
              􀵟
            </Text>
            <Text color="labelQuaternary" size="13pt" weight="bold">
              {`$0.01 to claim on ${chainName}`}
            </Text>
          </Inline>
        </Box>
      </Box>
    </Panel>
  );
};
