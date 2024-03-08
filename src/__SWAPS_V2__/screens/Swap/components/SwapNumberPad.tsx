import React from 'react';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { inputKeys, inputMethods } from '../types';
import { Box, Columns, HitSlop, Separator, Text, useColorMode, useForegroundColor } from '@/design-system';
import { stripCommas } from '../utils';
import {
  CUSTOM_KEYBOARD_HEIGHT,
  LIGHT_SEPARATOR_COLOR,
  LONG_PRESS_DELAY_DURATION,
  LONG_PRESS_REPEAT_DURATION,
  SEPARATOR_COLOR,
  THICK_BORDER_WIDTH,
  buttonPressConfig,
} from '../constants';
import { LongPressGestureHandler, LongPressGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { ButtonPressAnimation } from '@/components/animations';
import { colors } from '@/styles';

type numberPadCharacter = number | 'backspace' | '.';

export const SwapNumberPad = ({
  focusedInput,
  formattedInputValue,
  formattedOutputValue,
  inputMethod,
  inputValues,
}: {
  focusedInput: Animated.SharedValue<inputKeys>;
  formattedInputValue: Readonly<Animated.SharedValue<string>>;
  formattedOutputValue: Readonly<Animated.SharedValue<string>>;
  inputMethod: Animated.SharedValue<inputMethods>;
  inputValues: Animated.SharedValue<{ [key in inputKeys]: number | string }>;
}) => {
  const { isDarkMode } = useColorMode();

  const longPressTimer = useSharedValue(0);

  const addNumber = (number?: number) => {
    'worklet';
    const inputKey = focusedInput.value;
    if (inputMethod.value !== inputKey) {
      inputMethod.value = inputKey;

      if (typeof inputValues.value[inputKey] === 'number') {
        inputValues.modify(value => {
          return {
            ...value,
            [inputKey]: inputKey === 'inputAmount' ? stripCommas(formattedInputValue.value) : stripCommas(formattedOutputValue.value),
          };
        });
      }
    }
    const currentValue = inputValues.value[inputKey];
    const newValue = currentValue === 0 || currentValue === '0' ? `${number}` : `${currentValue}${number}`;

    inputValues.modify(value => {
      return {
        ...value,
        [inputKey]: newValue,
      };
    });
  };

  const addDecimalPoint = () => {
    'worklet';
    const inputKey = focusedInput.value;
    const currentValue = inputValues.value[inputKey].toString();
    if (!currentValue.includes('.')) {
      if (inputMethod.value !== inputKey) {
        inputMethod.value = inputKey;

        inputValues.modify(values => {
          return {
            ...values,
            [inputKey]: inputKey === 'inputAmount' ? stripCommas(formattedInputValue.value) : stripCommas(formattedOutputValue.value),
          };
        });
      }

      const newValue = `${currentValue}.`;

      inputValues.modify(values => {
        return {
          ...values,
          [inputKey]: newValue,
        };
      });
    }
  };

  const deleteLastCharacter = () => {
    'worklet';
    const inputKey = focusedInput.value;
    if (inputMethod.value !== inputKey) {
      inputMethod.value = inputKey;

      inputValues.modify(values => {
        return {
          ...values,
          [inputKey]: inputKey === 'inputAmount' ? stripCommas(formattedInputValue.value) : stripCommas(formattedOutputValue.value),
        };
      });
    }
    const currentValue = inputValues.value[inputKey].toString();
    // Handle deletion, ensuring a placeholder zero remains if the entire number is deleted
    const newValue = currentValue.length > 1 ? currentValue.slice(0, -1) : 0;
    if (newValue === 0) {
      inputValues.modify(values => {
        return {
          ...values,
          inputAmount: 0,
          inputNativeValue: 0,
          outputAmount: 0,
          outputNativeValue: 0,
        };
      });
    } else {
      inputValues.modify(values => {
        return {
          ...values,
          [inputKey]: newValue,
        };
      });
    }
  };

  return (
    <Box height={{ custom: CUSTOM_KEYBOARD_HEIGHT }} paddingHorizontal="6px" width="full">
      <Box style={{ gap: 6 }} width="full">
        <Separator
          color={{
            custom: isDarkMode ? SEPARATOR_COLOR : LIGHT_SEPARATOR_COLOR,
          }}
          thickness={1}
        />
        <Columns space="6px">
          <NumberPadKey char={1} onPressWorklet={addNumber} />
          <NumberPadKey char={2} onPressWorklet={addNumber} />
          <NumberPadKey char={3} onPressWorklet={addNumber} />
        </Columns>
        <Columns space="6px">
          <NumberPadKey char={4} onPressWorklet={addNumber} />
          <NumberPadKey char={5} onPressWorklet={addNumber} />
          <NumberPadKey char={6} onPressWorklet={addNumber} />
        </Columns>
        <Columns space="6px">
          <NumberPadKey char={7} onPressWorklet={addNumber} />
          <NumberPadKey char={8} onPressWorklet={addNumber} />
          <NumberPadKey char={9} onPressWorklet={addNumber} />
        </Columns>
        <Columns space="6px">
          <NumberPadKey char="." onPressWorklet={addDecimalPoint} transparent />
          <NumberPadKey char={0} onPressWorklet={addNumber} />
          <NumberPadKey char="backspace" longPressTimer={longPressTimer} onPressWorklet={deleteLastCharacter} small transparent />
        </Columns>
      </Box>
    </Box>
  );
};

const NumberPadKey = ({
  char,
  longPressTimer,
  onPressWorklet,
  small,
  transparent,
}: {
  char: numberPadCharacter;
  longPressTimer?: Animated.SharedValue<number>;
  onPressWorklet: (number?: number) => void;
  small?: boolean;
  transparent?: boolean;
}) => {
  const { isDarkMode } = useColorMode();

  const pressProgress = useSharedValue(0);

  const scale = useDerivedValue(() => {
    return withTiming(pressProgress.value === 1 ? 0.95 : 1, buttonPressConfig);
  });

  const backgroundColorProgress = useDerivedValue(() => {
    return pressProgress.value === 1
      ? withTiming(1, {
          duration: 50,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        })
      : withTiming(0);
  });

  const separator = useForegroundColor('separator');
  const separatorSecondary = useForegroundColor('separatorSecondary');
  const separatorTertiary = useForegroundColor('separatorTertiary');

  // TODO: Refactor to use GestureDetector
  const onLongPress = useAnimatedGestureHandler<LongPressGestureHandlerGestureEvent>({
    onActive: (_, context: { alreadyTriggered?: boolean }) => {
      if (!context.alreadyTriggered) {
        pressProgress.value = 1;
        if (typeof char === 'number') {
          onPressWorklet(char);
        } else {
          onPressWorklet();
        }

        if (longPressTimer !== undefined && char === 'backspace') {
          longPressTimer.value = 0;
          longPressTimer.value = withTiming(10, { duration: 10000, easing: Easing.linear });
        } else {
          pressProgress.value = withDelay(500, withTiming(0, { duration: 0 }));
        }
      }

      context.alreadyTriggered = true;
    },
    onFinish: (_, context: { alreadyTriggered?: boolean }) => {
      pressProgress.value = 0;
      if (longPressTimer !== undefined) {
        longPressTimer.value = 0;
      }
      context.alreadyTriggered = false;
    },
  });

  useAnimatedReaction(
    () => Math.floor(((longPressTimer?.value ?? 0) * 1000) / LONG_PRESS_REPEAT_DURATION),
    (current, previous) => {
      if (
        pressProgress.value === 1 &&
        longPressTimer !== undefined &&
        previous &&
        current > previous &&
        current > Math.floor(LONG_PRESS_DELAY_DURATION / LONG_PRESS_REPEAT_DURATION)
      ) {
        onPressWorklet();
      } else if (longPressTimer !== undefined) {
        longPressTimer.value === 0;
      }
    },
    []
  );

  const pressStyle = useAnimatedStyle(() => {
    const fill = isDarkMode ? separatorSecondary : 'rgba(255, 255, 255, 0.72)';
    const pressedFill = isDarkMode ? separator : 'rgba(255, 255, 255, 1)';

    const backgroundColor = transparent ? 'transparent' : fill;
    const pressedColor = transparent ? fill : pressedFill;

    return {
      backgroundColor: interpolateColor(backgroundColorProgress.value, [0, 1], [backgroundColor, pressedColor]),
      transform: [
        {
          scale: scale.value,
        },
      ],
    };
  }, [isDarkMode]);

  return (
    <LongPressGestureHandler
      // This 0.1ms activation delay gives ButtonPressAnimation time to trigger
      // haptic feedback natively before the LongPressGestureHandler takes over
      minDurationMs={0.1}
      onGestureEvent={onLongPress}
      shouldCancelWhenOutside
    >
      <Animated.View accessible accessibilityRole="button">
        <HitSlop space="3px">
          <ButtonPressAnimation scaleTo={1} useLateHaptic={false}>
            <Box
              alignItems="center"
              as={Animated.View}
              borderRadius={8}
              height={{ custom: 46 }}
              justifyContent="center"
              style={[
                !transparent && {
                  borderColor: isDarkMode ? separatorTertiary : 'transparent',
                  borderCurve: 'continuous',
                  borderWidth: THICK_BORDER_WIDTH,
                  shadowColor: isDarkMode ? 'transparent' : colors.dark,
                  shadowOffset: {
                    width: 0,
                    height: isDarkMode ? 4 : 4,
                  },
                  shadowOpacity: isDarkMode ? 0 : 0.1,
                  shadowRadius: 6,
                },
                pressStyle,
              ]}
            >
              <Text align="center" color="label" size={small ? '22pt' : '26pt'} weight="semibold">
                {char === 'backspace' ? '􀆛' : char}
              </Text>
            </Box>
          </ButtonPressAnimation>
        </HitSlop>
      </Animated.View>
    </LongPressGestureHandler>
  );
};
