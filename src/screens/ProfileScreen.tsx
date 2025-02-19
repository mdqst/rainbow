import React, { useCallback } from 'react';
import { ActivityList } from '../components/activity-list';
import { Page } from '../components/layout';
import { useNavigation } from '../navigation/Navigation';
import { ButtonPressAnimation } from '@/components/animations';
import { useAccountProfile, useAccountSettings, useAccountTransactions } from '@/hooks';
import Routes from '@/navigation/routesNames';
import styled from '@/styled-thing';
import { position } from '@/styles';
import { Navbar } from '@/components/navbar/Navbar';
import ImageAvatar from '@/components/contacts/ImageAvatar';
import { ContactAvatar } from '@/components/contacts';
import { usePendingTransactionWatcher } from '@/hooks/usePendingTransactionWatcher';

const ProfileScreenPage = styled(Page)({
  ...position.sizeAsObject('100%'),
  flex: 1,
});

export default function ProfileScreen() {
  const { navigate } = useNavigation();

  const { accountAddress } = useAccountSettings();
  const { accountSymbol, accountColor, accountImage } = useAccountProfile();
  usePendingTransactionWatcher({ address: accountAddress });

  const onChangeWallet = useCallback(() => {
    navigate(Routes.CHANGE_WALLET_SHEET);
  }, [navigate]);

  return (
    <ProfileScreenPage testID="profile-screen">
      <Navbar
        title="Activity"
        hasStatusBarInset
        leftComponent={
          <ButtonPressAnimation onPress={onChangeWallet} scaleTo={0.8} overflowMargin={50}>
            {accountImage ? (
              <ImageAvatar image={accountImage} marginRight={10} size="header" />
            ) : (
              <ContactAvatar color={accountColor} marginRight={10} size="small" value={accountSymbol} />
            )}
          </ButtonPressAnimation>
        }
      />

      <ActivityList />
    </ProfileScreenPage>
  );
}
