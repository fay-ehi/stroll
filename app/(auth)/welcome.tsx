import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text
          style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 36, color: '#111111', textAlign: 'center' }}
        >
          Stroll
        </Text>
        <Text
          style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 12 }}
        >
          Discover your city through people who actually know it.
        </Text>
      </View>
    </SafeAreaView>
  );
}
