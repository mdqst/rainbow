import React, { useCallback, useMemo, useState } from 'react';
import { Alert, TextInputProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ButtonPressAnimation from '../animations/ButtonPressAnimation';
import Input from './Input';
import {
  Bleed,
  Column,
  Columns,
  Inline,
  Inset,
  Text,
  useTextStyle,
} from '@rainbow-me/design-system';

const textSize = 16;

export type InlineFieldProps = {
  autoFocus?: TextInputProps['autoFocus'];
  defaultValue?: string;
  errorMessage?: string;
  label: string;
  placeholder?: string;
  inputProps?: Partial<TextInputProps>;
  onChangeText: (text: string) => void;
  onEndEditing?: TextInputProps['onEndEditing'];
  startsWith?: string;
  validations?: {
    onChange?: {
      match?: RegExp;
    };
  };
  value?: string;
  testID?: string;
};

export default function InlineField({
  autoFocus,
  defaultValue,
  errorMessage,
  label,
  onChangeText,
  placeholder,
  inputProps,
  validations,
  onEndEditing,
  startsWith,
  value,
  testID,
}: InlineFieldProps) {
  const { colors } = useTheme();

  const paddingVertical = 17;
  const textStyle = useTextStyle({ size: `${textSize}px`, weight: 'bold' });

  const [inputHeight, setInputHeight] = useState(textSize);
  const handleContentSizeChange = useCallback(({ nativeEvent }) => {
    const contentHeight =
      nativeEvent.contentSize.height - textSize - paddingVertical;
    if (contentHeight > 30) {
      setInputHeight(contentHeight);
    } else {
      setInputHeight(textSize);
    }
  }, []);

  const handleChangeText = useCallback(
    text => {
      const { onChange: { match = null } = {} } = validations || {};
      if (!match) {
        onChangeText(text);
        return;
      }
      if (text === '') {
        onChangeText(text);
        return;
      }
      if (match?.test(text)) {
        onChangeText(text);
        return;
      }
    },
    [onChangeText, validations]
  );

  const style = useMemo(
    () => ({
      ...textStyle,
      lineHeight: android ? textStyle.lineHeight : undefined,
      marginBottom: 0,
      marginTop: 0,
      minHeight: inputHeight + paddingVertical * 2 + (android ? 2 : 0),
      paddingBottom: inputProps?.multiline ? (ios ? 15 : 7) : 0,
      paddingTop: inputProps?.multiline
        ? android
          ? 11
          : 15
        : android
        ? 11
        : 0,
      textAlignVertical: 'top',
    }),
    [textStyle, inputHeight, inputProps?.multiline]
  );

  return (
    <Columns>
      <Column width="1/3">
        <Inset top="19px">
          <Inline space="4px">
            <Text
              {...(errorMessage && {
                color: { custom: colors.red },
              })}
              size={`${textSize}px`}
              weight="heavy"
            >
              {label}
            </Text>
            {errorMessage && (
              <Bleed space="10px">
                <ButtonPressAnimation onPress={() => Alert.alert(errorMessage)}>
                  <Inset space="10px">
                    <Text
                      color={{ custom: colors.red }}
                      size={`${textSize}px`}
                      weight="heavy"
                    >
                      􀇿
                    </Text>
                  </Inset>
                </ButtonPressAnimation>
              </Bleed>
            )}
          </Inline>
        </Inset>
      </Column>
      <Column>
        <Inline alignVertical="center" space="2px">
          {startsWith && (
            <Inset top="2px">
              <Text color="secondary30" weight="heavy">
                {startsWith}
              </Text>
            </Inset>
          )}
          <Input
            autoFocus={autoFocus}
            defaultValue={defaultValue}
            onChangeText={handleChangeText}
            onContentSizeChange={
              android && inputProps?.multiline
                ? handleContentSizeChange
                : undefined
            }
            onEndEditing={onEndEditing}
            placeholder={placeholder}
            style={style}
            value={value}
            {...inputProps}
            keyboardType={
              android ? 'visible-password' : inputProps?.keyboardType
            }
            testID={testID}
          />
        </Inline>
      </Column>
    </Columns>
  );
}
