import React, { useCallback, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '../../navigation/Navigation';
import { enableActionsOnReadOnlyWallet } from '@/config';
import {
  Box,
  ColorModeProvider,
  globalColors,
  Stack,
  Text,
} from '@/design-system';
import { REGISTRATION_MODES } from '@/helpers/ens';
import { useENSPendingRegistrations, useWallets } from '@/hooks';
import Routes from '@/navigation/routesNames';
import { watchingAlert } from '@/utils';
import { GenericCard } from './GenericCard';
import { IconOrb } from './reusables/IconOrb';
import * as i18n from '@/languages';

const springConfig = {
  damping: 20,
  mass: 1,
  stiffness: 300,
};

export const ENSSearchCard = () => {
  const { pendingRegistrations } = useENSPendingRegistrations();
  const { navigate } = useNavigation();
  const { isReadOnlyWallet } = useWallets();

  const pendingBadgeProgress = useSharedValue(0);

  useEffect(() => {
    if (pendingRegistrations?.length > 0) {
      // This setTimeout prevents the badge from appearing before the number in the badge is updated.
      setTimeout(() => {
        pendingBadgeProgress.value = withSpring(1, springConfig);
      }, 0);
    } else {
      pendingBadgeProgress.value = withSpring(0, springConfig);
    }
  }, [pendingBadgeProgress, pendingRegistrations?.length]);

  const handlePress = useCallback(() => {
    if (!isReadOnlyWallet || enableActionsOnReadOnlyWallet) {
      navigate(Routes.REGISTER_ENS_NAVIGATOR, {
        fromDiscover: true,
        mode: REGISTRATION_MODES.SEARCH,
      });
    } else {
      watchingAlert();
    }
  }, [isReadOnlyWallet, navigate]);

  const pendingBadgeStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 * pendingBadgeProgress.value,
      transform: [
        {
          scale: 1 * pendingBadgeProgress.value,
        },
      ],
    };
  }, [pendingRegistrations]);

  const searchIconStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 * (1 - pendingBadgeProgress.value),
      transform: [
        {
          scale: 1 * (1 - pendingBadgeProgress.value),
        },
      ],
    };
  }, [pendingRegistrations]);

  const translations = i18n.l.cards.ens_search;

  return (
    <GenericCard
      color={globalColors.blue60}
      gradient={[globalColors.blue60, '#61B5FF']}
      onPress={handlePress}
      testID="ens-register-name-banner"
      type="square"
    >
      <ColorModeProvider value="darkTinted">
        <Box
          height="full"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box as={Animated.View} style={pendingBadgeStyle}>
            <IconOrb
              borderColor={globalColors.blue10}
              borderWidth={2.5}
              color={globalColors.blue50}
              icon={pendingRegistrations?.length.toString()}
              shadowColor="shadow"
              textSize="20pt"
              textWeight="heavy"
            />
          </Box>
          <Box as={Animated.View} position="absolute" style={searchIconStyle}>
            <IconOrb
              color={globalColors.blue70}
              icon="􀊫"
              shadowColor="shadow"
            />
          </Box>
          <Stack space="10px">
            <Text
              color={{ custom: globalColors.blue20 }}
              size="13pt"
              weight="bold"
            >
              {i18n.t(translations.mini_title)}
            </Text>
            <Text color="label" size="20pt" weight="heavy">
              {i18n.t(translations.title)}
            </Text>
          </Stack>
        </Box>
      </ColorModeProvider>
    </GenericCard>
  );
};
