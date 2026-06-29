import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <SafeAreaView className="flex-1 bg-neutral-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: '#111111', textAlign: 'center' }}>
            This screen doesn't exist.
          </Text>
          <Link href="/" className="mt-6">
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FC5A03' }}>
              Go to home screen
            </Text>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}
