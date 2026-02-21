import { Platform } from 'react-native';

export const defaultFontFamily = Platform.select({
  ios: 'Helvetica',
  android: 'Helvetica',
  web: 'Helvetica, Arial, sans-serif',
  default: 'Helvetica',
});

/** Use in StyleSheet text styles: { ...defaultTextStyle, fontSize: 16 } */
export const defaultTextStyle = { fontFamily: defaultFontFamily };
