import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import ActiveWorkoutBar from '../../src/components/ActiveWorkoutBar';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name:        string;
  title:       string;
  icon:        IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'dashboard', title: 'Home',     icon: 'home-outline',        iconFocused: 'home'        },
  { name: 'workout',   title: 'Workout',  icon: 'barbell-outline',     iconFocused: 'barbell'     },
  { name: 'feed',      title: 'Feed',     icon: 'people-outline',      iconFocused: 'people'      },
  { name: 'progress',  title: 'Progress', icon: 'trending-up-outline', iconFocused: 'trending-up' },
  { name: 'profile',   title: 'Profile',  icon: 'person-outline',      iconFocused: 'person'      },
];

export default function TabsLayout() {
  const router   = useRouter();
  const { status, tick } = useWorkoutStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg.secondary,
            borderTopColor:  colors.border,
            borderTopWidth:  1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor:   colors.accent.primary,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? tab.iconFocused : tab.icon} size={24} color={color} />
              ),
            }}
          />
        ))}
      </Tabs>

      {status === 'active' && (
        <ActiveWorkoutBar onPress={() => (router.push as any)('/workout-session')} />
      )}
    </View>
  );
}
