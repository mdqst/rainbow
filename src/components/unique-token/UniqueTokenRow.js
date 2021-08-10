import PropTypes from 'prop-types';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useNavigation } from '../../navigation/Navigation';
import { deviceUtils, magicMemo } from '../../utils';
import { Row } from '../layout';
import { ShowcaseContext } from '../showcase/ShowcaseHeader';
import UniqueTokenCard from './UniqueTokenCard';
import { useWallets } from '@rainbow-me/hooks';
import Routes from '@rainbow-me/routes';
import { padding, position } from '@rainbow-me/styles';

const CardMargin = 15;
const RowPadding = 19;
const CardSize =
  (deviceUtils.dimensions.width - RowPadding * 2 - CardMargin) / 2;

const Container = styled(Row).attrs({ align: 'center' })`
  ${padding(0, RowPadding)};
  margin-bottom: ${CardMargin};
  width: 100%;
`;

const UniqueTokenCardItem = styled(UniqueTokenCard).attrs({
  ...position.sizeAsObject(CardSize),
})`
  margin-left: ${({ index }) => (index >= 1 ? CardMargin : 0)};
`;

const UniqueTokenRow = magicMemo(({ item, external = false }) => {
  const { isReadOnlyWallet } = useWallets();
  const { navigate } = useNavigation();
  const showcaseContext = useContext(ShowcaseContext);
  const customHandleCollectiblePress =
    showcaseContext?.customHandleCollectiblePress;

  const handleItemPress = useCallback(
    asset =>
      customHandleCollectiblePress
        ? customHandleCollectiblePress(asset)
        : navigate(Routes.EXPANDED_ASSET_SHEET, {
            asset,
            cornerRadius: 30,
            external,
            isReadOnlyWallet,
            type: 'unique_token',
          }),
    [external, customHandleCollectiblePress, isReadOnlyWallet, navigate]
  );

  return (
    <Container>
      {item.map((uniqueToken, index) => (
        <UniqueTokenCardItem
          disabled={false}
          index={index}
          item={uniqueToken}
          key={uniqueToken.uniqueId}
          onPress={handleItemPress}
        />
      ))}
    </Container>
  );
}, 'item.uniqueId');

UniqueTokenRow.propTypes = {
  item: PropTypes.array,
};

UniqueTokenRow.height = CardSize + CardMargin;
UniqueTokenRow.cardSize = CardSize;
UniqueTokenRow.cardMargin = CardMargin;
UniqueTokenRow.rowPadding = RowPadding;

export default UniqueTokenRow;
