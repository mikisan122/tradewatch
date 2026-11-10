import { View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';

const TABS = [
  ['index', 'Inicio', 'home'],
  ['mercado', 'Mercado', 'trending-up'],
  ['portafolio', 'Portafolio', 'pie-chart'],
  ['billetera', 'Billetera', 'wallet'],
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: '#060b1a',
          borderTopColor: C.border,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Ionicons name={focused ? icon : `${icon}-outline`} size={22} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
