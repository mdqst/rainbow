import { Signer } from '@ethersproject/abstract-signer';
import { CrosschainQuote, Quote } from '@rainbow-me/swaps';
import { Address } from 'viem';

import { ParsedAsset } from '@/__swaps__/types/assets';
import { GasFeeParamsBySpeed, LegacyGasFeeParamsBySpeed, LegacyTransactionGasParamAmounts, TransactionGasParamAmounts } from '@/entities';
import { ChainId } from '@/chains/types';
import { TransactionRequest } from '@ethersproject/abstract-provider';

export enum SwapModalField {
  input = 'inputAmount',
  native = 'nativeAmount',
  output = 'outputAmount',
}

export enum Source {
  AggregatorRainbow = 'rainbow',
  Aggregator0x = '0x',
  Aggregator1inch = '1inch',
  Socket = 'socket',
}

export interface UnlockActionParameters {
  amount: string;
  assetToUnlock: ParsedAsset;
  contractAddress: Address;
  chainId: number;
}

export type SwapMetadata = {
  slippage: number;
  route: Source;
  inputAsset: ParsedAsset;
  outputAsset: ParsedAsset;
  independentField: SwapModalField;
  independentValue: string;
};

export type QuoteTypeMap = {
  swap: Quote;
  crosschainSwap: CrosschainQuote;
  claimRewardsBridge: undefined;
};

export interface RapSwapActionParameters<T extends 'swap' | 'crosschainSwap' | 'claimRewardsBridge'> {
  amount?: string | null;
  sellAmount: string;
  buyAmount?: string;
  permit?: boolean;
  chainId: number;
  toChainId?: number;
  requiresApprove?: boolean;
  meta?: SwapMetadata;
  assetToSell: ParsedAsset;
  assetToBuy: ParsedAsset;
  gasParams: TransactionGasParamAmounts | LegacyTransactionGasParamAmounts;
  gasFeeParamsBySpeed: GasFeeParamsBySpeed | LegacyGasFeeParamsBySpeed;
  nonce?: number;
  flashbots?: boolean;
  quote: QuoteTypeMap[T];
  address?: Address;
}

export interface RapUnlockActionParameters {
  fromAddress: Address;
  assetToUnlock: ParsedAsset;
  contractAddress: Address;
  chainId: number;
}

export interface RapClaimRewardsActionParameters {
  address?: Address;
  assetToSell: ParsedAsset;
  sellAmount: string;
  assetToBuy: ParsedAsset;
  meta?: SwapMetadata;
  chainId: ChainId;
  toChainId?: ChainId;
  quote: undefined;
  gasParams: TransactionGasParamAmounts | LegacyTransactionGasParamAmounts;
}

export type TransactionClaimableTxPayload = TransactionRequest &
  (
    | {
        to: string;
        from: string;
        nonce: number;
        gasLimit: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        data: string;
        value: '0x0';
        chainId: number;
      }
    | {
        to: string;
        from: string;
        nonce: number;
        gasLimit: string;
        gasPrice: string;
        data: string;
        value: '0x0';
        chainId: number;
      }
  );

export interface ClaimTransactionClaimableActionParameters {
  claimTx: TransactionClaimableTxPayload;
}

export interface ClaimTransactionClaimableRapParameters {
  claim: ClaimTransactionClaimableActionParameters;
}

export type RapActionParameters =
  | RapSwapActionParameters<'swap'>
  | RapSwapActionParameters<'crosschainSwap'>
  | RapClaimRewardsActionParameters
  | RapUnlockActionParameters;

export interface RapActionTransaction {
  hash: string | null;
}

export type RapActionParameterMap = {
  swap: RapSwapActionParameters<'swap'>;
  crosschainSwap: RapSwapActionParameters<'crosschainSwap'>;
  unlock: RapUnlockActionParameters;
  claimRewards: RapClaimRewardsActionParameters;
  claimRewardsBridge: RapClaimRewardsActionParameters;
};

export type RapActionParameterMapV2 = {
  claimTransactionClaimableAction: ClaimTransactionClaimableActionParameters;
};

export type RapParameterMapV2 = {
  claimTransactionClaimableRap: ClaimTransactionClaimableRapParameters;
};

export type RapParameters = {
  type: 'claimTransactionClaimableRap';
  claimTransactionClaimableActionParameters: ClaimTransactionClaimableActionParameters;
};

export interface RapAction<T extends RapActionTypes> {
  parameters: RapActionParameterMap[T];
  transaction: RapActionTransaction;
  type: T;
}

export interface RapActionV2<T extends RapActionTypesV2> {
  parameters: RapActionParameterMapV2[T];
  transaction: RapActionTransaction;
  type: T;
}

export interface Rap {
  actions: RapAction<'swap' | 'crosschainSwap' | 'unlock' | 'claimRewards' | 'claimRewardsBridge'>[];
}

export interface RapV2 {
  actions: RapActionV2<'claimTransactionClaimableAction'>[];
}

export enum rapActions {
  swap = 'swap',
  crosschainSwap = 'crosschainSwap',
  unlock = 'unlock',
  claimRewards = 'claimRewards',
  claimRewardsBridge = 'claimRewardsBridge',
}

export enum rapActionsV2 {
  claimTransactionClaimableAction = 'claimTransactionClaimableAction',
}

export type RapActionTypes = keyof typeof rapActions;

export type RapActionTypesV2 = keyof typeof rapActionsV2;

export enum rapTypes {
  swap = 'swap',
  crosschainSwap = 'crosschainSwap',
  claimRewardsBridge = 'claimRewardsBridge',
}

export enum rapTypesV2 {
  claimTransactionClaimableRap = 'claimTransactionClaimableRap',
  claimSponsoredClaimableRap = 'claimSponsoredClaimableRap',
}

export type RapTypes = keyof typeof rapTypes;

export type RapTypesV2 = keyof typeof rapTypesV2;

export interface RapActionResponse {
  baseNonce?: number | null;
  errorMessage: string | null;
  hash?: string | null;
}

export interface RapActionResponseV2 {
  nonce: number | null;
  errorMessage: string | null;
  hash: string | null;
}

export interface RapActionResult {
  nonce?: number | undefined;
  hash?: string | undefined;
}

export interface RapActionResultV2 {
  nonce: number | null;
  hash: string | null;
}

export interface ActionProps<T extends RapActionTypes> {
  baseNonce?: number;
  index: number;
  parameters: RapActionParameterMap[T];
  wallet: Signer;
  currentRap: Rap;
  gasParams: TransactionGasParamAmounts | LegacyTransactionGasParamAmounts;
  gasFeeParamsBySpeed: GasFeeParamsBySpeed | LegacyGasFeeParamsBySpeed;
}

export interface ActionPropsV2<T extends RapActionTypesV2> {
  nonceToUse?: number;
  parameters: RapActionParameterMapV2[T];
  wallet: Signer;
  currentRap: RapV2;
}

export interface WalletExecuteRapProps {
  rapActionParameters: RapSwapActionParameters<'swap' | 'crosschainSwap' | 'claimRewardsBridge'>;
  type: RapTypes;
}

export interface RapResponse {
  nonce: number | undefined;
  errorMessage: string | null;
}

export interface RapResponseV2 {
  errorMessage: string | null;
}
