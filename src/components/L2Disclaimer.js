import React from 'react';
import RadialGradient from 'react-native-radial-gradient';
import Divider from '@/components/Divider';
import ButtonPressAnimation from './animations/ButtonPressAnimation';
import ChainBadge from './coin-icon/ChainBadge';
import { Column, Row } from './layout';
import { Text } from './text';
import { padding, position } from '@/styles';
import { darkModeThemeColors } from '@/styles/colors';
import * as lang from '@/languages';
import { isL2Chain } from '@/handlers/web3';
import { EthCoinIcon } from './coin-icon/EthCoinIcon';
import { chainsName } from '@/chains';

const L2Disclaimer = ({
  chainId,
  colors,
  hideDivider,
  isNft = false,
  marginBottom = 24,
  marginHorizontal = 19,
  onPress,
  prominent,
  customText,
  symbol,
  forceDarkMode,
}) => {
  const localColors = isNft ? darkModeThemeColors : colors;
  const radialGradientProps = {
    center: [0, 1],
    colors: localColors.gradients.lightGreyWhite,
    pointerEvents: 'none',
    style: {
      ...position.coverAsObject,
      overflow: 'hidden',
    },
  };

  const isL2 = isL2Chain({ chainId });

  return (
    <>
      <ButtonPressAnimation marginBottom={marginBottom} onPress={onPress} scaleTo={0.95}>
        <Row borderRadius={16} marginHorizontal={marginHorizontal} style={padding.object(android ? 6 : 10, 10, android ? 6 : 10, 10)}>
          <RadialGradient {...radialGradientProps} borderRadius={16} radius={600} />
          <Column justify="center">
            {isL2 ? <ChainBadge chainId={chainId} position="relative" size="small" forceDark={forceDarkMode} /> : <EthCoinIcon size={20} />}
          </Column>
          <Column flex={1} justify="center" marginHorizontal={8}>
            <Text
              color={prominent ? colors.alpha(localColors.blueGreyDark, 0.8) : colors.alpha(localColors.blueGreyDark, 0.6)}
              numberOfLines={2}
              size="smedium"
              weight={prominent ? 'heavy' : 'bold'}
            >
              {customText
                ? customText
                : lang.t(lang.l.expanded_state.asset.l2_disclaimer, {
                    symbol,
                    network: chainsName[chainId],
                  })}
            </Text>
          </Column>
          <Column align="end" justify="center">
            <Text align="center" color={colors.alpha(localColors.blueGreyDark, 0.3)} size="smedium" weight="heavy">
              􀅵
            </Text>
          </Column>
        </Row>
      </ButtonPressAnimation>
      {hideDivider ? null : <Divider color={localColors.rowDividerExtraLight} />}
    </>
  );
};

export default L2Disclaimer;
