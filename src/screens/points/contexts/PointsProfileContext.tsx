import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { noop } from 'lodash';

import { pointsQueryKey } from '@/resources/points';
import * as i18n from '@/languages';
import {
  RainbowPointsFlowSteps,
  buildTwitterIntentMessage,
} from '../constants';
import {
  OnboardPointsMutation,
  PointsOnboardingCategory,
  PointsErrorType,
} from '@/graphql/__generated__/metadataPOST';
import { WrappedAlert as Alert } from '@/helpers/alert';

import { metadataPOSTClient } from '@/graphql';
import { useAccountProfile, useWallets } from '@/hooks';
import { signPersonalMessage } from '@/model/wallet';
import { RainbowError, logger } from '@/logger';
import { queryClient } from '@/react-query';
import { LedgerSigner } from '@/handlers/LedgerSigner';

type PointsProfileContext = {
  step: RainbowPointsFlowSteps;
  setStep: Dispatch<SetStateAction<RainbowPointsFlowSteps>>;
  profile: OnboardPointsMutation | undefined;
  setProfile: Dispatch<SetStateAction<OnboardPointsMutation | undefined>>;
  referralCode: string | undefined;
  setReferralCode: Dispatch<SetStateAction<string | undefined>>;
  intent: string | undefined;
  setIntent: Dispatch<SetStateAction<string | undefined>>;
  animationKey: number;
  setAnimationKey: Dispatch<SetStateAction<number>>;
  shareBonusPoints: number;
  setShareBonusPoints: Dispatch<SetStateAction<number>>;

  signIn: () => Promise<void>;

  rainbowSwaps: PointsOnboardingCategory | undefined;
  metamaskSwaps: PointsOnboardingCategory | undefined;
  rainbowBridges: PointsOnboardingCategory | undefined;
  nftCollections: PointsOnboardingCategory | undefined;
  historicBalance: PointsOnboardingCategory | undefined;
  bonus: PointsOnboardingCategory | undefined;

  hasRetroActivePoints: number | undefined;
};

const enum PointsOnboardingCategoryType {
  RainbowSwaps = 'rainbow-swaps',
  MetamaskSwaps = 'metamask-swaps',
  RainbowBridges = 'rainbow-bridges',
  NFTCollections = 'nft-collections',
  HistoricBalance = 'historic-balance',
  Bonus = 'bonus',
}

const PointsProfileContext = createContext<PointsProfileContext>({
  step: RainbowPointsFlowSteps.Initialize,
  setStep: noop,
  profile: undefined,
  setProfile: noop,
  referralCode: undefined,
  setReferralCode: noop,
  intent: undefined,
  setIntent: noop,
  animationKey: 0,
  setAnimationKey: noop,
  shareBonusPoints: 0,
  setShareBonusPoints: noop,

  signIn: async () => void 0,

  // helpers
  rainbowSwaps: undefined,
  metamaskSwaps: undefined,
  rainbowBridges: undefined,
  nftCollections: undefined,
  historicBalance: undefined,
  bonus: undefined,
  hasRetroActivePoints: 0,
});

export const usePointsProfileContext = () => useContext(PointsProfileContext);

export const PointsProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { accountAddress } = useAccountProfile();
  const { isHardwareWallet, selectedWallet } = useWallets();

  const [step, setStep] = useState<RainbowPointsFlowSteps>(
    RainbowPointsFlowSteps.Initialize
  );
  const [profile, setProfile] = useState<OnboardPointsMutation | undefined>();
  const [referralCode, setReferralCode] = useState<string>();
  const [intent, setIntent] = useState<string>();
  const [animationKey, setAnimationKey] = useState(0);
  const [shareBonusPoints, setShareBonusPoints] = useState(0);

  const rainbowSwaps = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.RainbowSwaps
  );
  const metamaskSwaps = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.MetamaskSwaps
  );
  const rainbowBridges = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.RainbowBridges
  );
  const nftCollections = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.NFTCollections
  );
  const historicBalance = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.HistoricBalance
  );
  const bonus = profile?.onboardPoints?.user?.onboarding?.categories?.find(
    ({ type }) => type === PointsOnboardingCategoryType.Bonus
  );

  const hasRetroActivePoints =
    rainbowSwaps?.earnings?.total ||
    metamaskSwaps?.earnings?.total ||
    rainbowBridges?.earnings?.total ||
    nftCollections?.earnings?.total ||
    historicBalance?.earnings?.total;

  const signIn = useCallback(async () => {
    // if (isHardwareWallet) {
    //   Alert.alert(i18n.t(i18n.l.points.console.hardware_wallet_alert));
    //   return;
    // }
    let points;
    let signature;
    const challengeResponse = await metadataPOSTClient.getPointsOnboardChallenge(
      {
        address: accountAddress,
        referral: referralCode,
      }
    );

    const challenge = challengeResponse?.pointsOnboardChallenge;
    if (challenge) {
      let signature;
      if (isHardwareWallet) {
        signature = await (selectedWallet as LedgerSigner).signMessage(
          challenge
        );
      } else {
        const signatureResponse = await signPersonalMessage(challenge);
        signature = signatureResponse?.result;
      }
      if (signature) {
        points = await metadataPOSTClient.onboardPoints({
          address: accountAddress,
          signature,
          referral: referralCode,
        });
      }
    }
    if (!points || !points.onboardPoints) {
      logger.error(new RainbowError('Error onboarding points user'), {
        referralCode,
        challenge,
        signature,
      });
      Alert.alert(i18n.t(i18n.l.points.console.generic_alert));
    } else {
      if (points.onboardPoints?.error) {
        const errorType = points.onboardPoints?.error?.type;
        if (errorType === PointsErrorType.ExistingUser) {
          Alert.alert(i18n.t(i18n.l.points.console.existing_user_alert));
        } else if (errorType === PointsErrorType.InvalidReferralCode) {
          Alert.alert(
            i18n.t(i18n.l.points.console.invalid_referral_code_alert)
          );
        }
      } else {
        setProfile(points);
        queryClient.setQueryData(
          pointsQueryKey({ address: accountAddress }),
          points
        );
      }
    }
  }, [accountAddress, isHardwareWallet, referralCode]);

  useEffect(() => {
    const msg = buildTwitterIntentMessage(profile, metamaskSwaps);
    setIntent(msg);
  }, [profile, metamaskSwaps]);

  return (
    <PointsProfileContext.Provider
      value={{
        // internals
        step,
        setStep,
        profile,
        setProfile,
        referralCode,
        setReferralCode,
        intent,
        setIntent,
        animationKey,
        setAnimationKey,
        shareBonusPoints,
        setShareBonusPoints,

        // functions
        signIn,

        // helpers
        rainbowSwaps,
        metamaskSwaps,
        rainbowBridges,
        nftCollections,
        historicBalance,
        bonus,
        hasRetroActivePoints,
      }}
    >
      {children}
    </PointsProfileContext.Provider>
  );
};
