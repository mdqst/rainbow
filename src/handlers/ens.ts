import { debounce, isEmpty, sortBy } from 'lodash';
import { ensClient } from '../apollo/client';
import {
  ENS_DOMAINS,
  ENS_REGISTRATIONS,
  ENS_SUGGESTIONS,
} from '../apollo/queries';
import { profileUtils } from '@rainbow-me/utils';

export const fetchSuggestions = async (
  recipient: any,
  setSuggestions: any,
  setIsFetching = (_unused: any) => {}
) => {
  if (recipient.length > 2) {
    setIsFetching(true);
    const recpt = recipient.toLowerCase();
    let result = await ensClient.query({
      query: ENS_SUGGESTIONS,
      variables: {
        amount: 75,
        name: recpt,
      },
    });

    if (!isEmpty(result?.data?.domains)) {
      const ensSuggestions = result.data.domains
        .map((ensDomain: any) => ({
          address: ensDomain?.resolver?.addr?.id || ensDomain?.name,

          color: profileUtils.addressHashedColorIndex(
            ensDomain?.resolver?.addr?.id || ensDomain.name
          ),

          ens: true,
          network: 'mainnet',
          nickname: ensDomain?.name,
          uniqueId: ensDomain?.resolver?.addr?.id || ensDomain.name,
        }))
        .filter((domain: any) => !domain?.nickname?.includes?.('['));
      const sortedEnsSuggestions = sortBy(
        ensSuggestions,
        domain => domain.nickname.length,
        ['asc']
      );

      const slicedSortedSuggestions = sortedEnsSuggestions.slice(0, 3);
      setSuggestions(slicedSortedSuggestions);
    } else {
      setSuggestions([]);
    }
    setIsFetching(false);
  }
};

export const debouncedFetchSuggestions = debounce(fetchSuggestions, 200);

export const fetchRegistration = async (
  recipient: any,
  setRegistration: any,
  setIsFetching = (_unused: any) => {}
) => {
  if (recipient.length > 2) {
    setIsFetching(true);
    const recpt = recipient.toLowerCase();
    const result = await ensClient.query({
      query: ENS_DOMAINS,
      variables: {
        name: recpt,
      },
    });
    const labelHash = result?.data?.domains?.[0]?.labelhash;

    const registrations = await ensClient.query({
      query: ENS_REGISTRATIONS,
      variables: {
        labelHash,
      },
    });

    const { registrationDate, expiryDate } =
      registrations?.data?.registrations?.[0] || {};

    if (!isEmpty(registrations?.data?.registrations?.[0])) {
      setRegistration({ expiryDate, isRegistered: true, registrationDate });
    } else {
      setRegistration({
        expiryDate: null,
        isRegistered: false,
        registrationDate: null,
      });
    }
    setIsFetching(false);
  }
};

export const debouncedFetchRegistration = debounce(fetchRegistration, 200);
