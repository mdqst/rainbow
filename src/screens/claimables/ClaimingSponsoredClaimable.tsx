import React, { useState } from 'react';
import { useAccountSettings } from '@/hooks';
import { ClaimResponse, SponsoredClaimable } from '@/resources/addys/claimables/types';
import { ADDYS_BASE_URL, addysHttp, claimablesQueryKey, useClaimables } from '@/resources/addys/claimables/query';
import { useMutation } from '@tanstack/react-query';
import { loadWallet } from '@/model/wallet';
import { getProvider } from '@/handlers/web3';
import { logger, RainbowError } from '@/logger';
import { queryClient } from '@/react-query';
import { ClaimingClaimableSharedUI, ClaimStatus } from './ClaimingClaimableSharedUI';

export const ClaimingSponsoredClaimable = ({ claimable }: { claimable: SponsoredClaimable }) => {
  const { accountAddress, nativeCurrency } = useAccountSettings();

  const { refetch } = useClaimables({ address: accountAddress, currency: nativeCurrency });

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');

  const { mutate: claimClaimable } = useMutation({
    mutationFn: async () => {
      const provider = getProvider({ chainId: claimable.chainId });
      const wallet = await loadWallet({
        address: accountAddress,
        showErrorIfNotLoaded: true,
        provider,
      });

      if (!wallet) {
        // Biometrics auth failure (retry possible)
        setClaimStatus('error');
        return;
      }

      const path = claimable.action.url.replace(ADDYS_BASE_URL, '');
      let response: { data: ClaimResponse };

      if (claimable.action.method === 'GET') {
        try {
          response = await addysHttp.get(path);
        } catch (e) {
          setClaimStatus('error');
          logger.error(new RainbowError('[ClaimSponsoredClaimable]: failed to execute sponsored claim api call'));
          return;
        }
      } else {
        try {
          response = await addysHttp.post(path);
        } catch (e) {
          setClaimStatus('error');
          logger.error(new RainbowError('[ClaimSponsoredClaimable]: failed to execute sponsored claim api call'));
          return;
        }
      }

      if (!response.data.payload.success) {
        setClaimStatus('error');
        logger.warn('[ClaimSponsoredClaimable]: sponsored claim api call returned unsuccessful response');
      } else {
        setClaimStatus('success');
        // Clear and refresh claimables data
        queryClient.invalidateQueries(claimablesQueryKey({ address: accountAddress, currency: nativeCurrency }));
        refetch();
      }
    },
    onError: e => {
      setClaimStatus('error');
      logger.error(new RainbowError('[ClaimingSponsoredClaimable]: Failed to claim claimable due to unhandled error'), {
        message: (e as Error)?.message,
      });
    },
    onSuccess: () => {
      if (claimStatus === 'claiming') {
        logger.error(
          new RainbowError('[ClaimingSponsoredClaimable]: claim function completed but never resolved status to success or error state')
        );
        setClaimStatus('error');
      }
    },
  });

  return (
    <ClaimingClaimableSharedUI claim={claimClaimable} claimable={claimable} claimStatus={claimStatus} setClaimStatus={setClaimStatus} />
  );
};
