import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

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
  return (
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.3,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
