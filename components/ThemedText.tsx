import { Text, TextProps } from 'react-native';
import { useColorScheme } from 'nativewind';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const { colorScheme } = useColorScheme();

  const baseStyle = 'text-base';
  const typeStyles = {
    default: '',
    title: 'text-3xl font-bold',
    defaultSemiBold: 'font-semibold',
    subtitle: 'text-xl font-bold',
    link: 'text-blue-500',
  };

  const colorStyle = colorScheme === 'dark' ? 'text-white' : 'text-black';

  return (
    <Text
      className={`${baseStyle} ${typeStyles[type]} ${colorStyle}`}
      style={style}
      {...rest}
    />
  );
}
