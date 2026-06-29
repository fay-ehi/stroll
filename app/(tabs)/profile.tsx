import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-bg">
      <View className="flex-1 items-center justify-center">
        <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 20, color: '#111111' }}>
          profile
        </Text>
        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>
          Coming in a later sprint.
        </Text>
      </View>
    </SafeAreaView>
  );
}
