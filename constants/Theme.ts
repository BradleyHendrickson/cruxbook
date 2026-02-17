import { DarkTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import Colors from './Colors';

export const EarthyDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.cardBorder,
    notification: Colors.dark.tint,
  },
};
