import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

const springConfig = { damping: 20, stiffness: 600 };

type FadeInViewProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  index?: number;
  /** When true, skips the entrance animation (e.g. for search results that update while typing) */
  disabled?: boolean;
};

/** Fades in with optional stagger delay for list items */
export function FadeInView({ children, delay = 0, duration = 220, style, index = 0, disabled = false }: FadeInViewProps) {
  const staggerDelay = delay + index * 25;
  const entering = disabled ? undefined : FadeInDown.delay(staggerDelay).duration(duration);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

type AnimatedPressableProps = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Pressable with scale animation on press */
export function AnimatedPressable({ children, style, onPressIn, onPressOut, ...props }: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    scale.value = withSpring(0.97, springConfig);
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    scale.value = withSpring(1, springConfig);
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...props}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

type AnimatedStarProps = {
  filled: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
};

/** Star with bounce animation on press - scales up then springs back */
export function AnimatedStar({
  filled,
  onPress,
  size = 28,
  color,
  disabled = false,
}: AnimatedStarProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.25, { damping: 28, stiffness: 800 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 28, stiffness: 800 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={8}
      disabled={disabled}
    >
      <Animated.View style={animatedStyle}>
        <FontAwesome
          name={filled ? 'star' : 'star-o'}
          size={size}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}
