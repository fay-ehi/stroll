import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function StackItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-neutral-divider">
      <Text className="text-sm text-text-secondary" style={{ fontFamily: 'Inter-Regular' }}>
        {label}
      </Text>
      <Text className="text-sm text-brand-orange" style={{ fontFamily: 'Inter-SemiBold' }}>
        {value}
      </Text>
    </View>
  );
}

export default function DiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-bg">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-3 h-3 rounded-full bg-brand-orange mb-6" />
        <Text
          className="text-3xl text-text-primary text-center"
          style={{ fontFamily: 'PlusJakartaSans-Bold' }}
        >
          Stroll is ready.
        </Text>
        <Text
          className="text-sm text-text-secondary text-center mt-3"
          style={{ fontFamily: 'Inter-Regular' }}
        >
          Sprint 0 complete. Environment configured.
        </Text>
        <View className="mt-10 w-full bg-neutral-bg-secondary rounded-card p-5">
          <StackItem label="Expo SDK" value="54" />
          <StackItem label="Expo Router" value="v6" />
          <StackItem label="React" value="19" />
          <StackItem label="NativeWind" value="v4" />
          <StackItem label="TanStack Query" value="v5" />
          <StackItem label="Zustand" value="v5" />
          <StackItem label="TypeScript" value="Strict" />
          <StackItem label="Supabase" value="Configured" />
        </View>
      </View>
    </SafeAreaView>
  );
}
