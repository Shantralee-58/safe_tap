import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '@react-navigation/native';
// Ensure these icons are imported from lucide-react-native
import { 
    Home, MapPin, AlertCircle, EyeOff, ShieldAlert, Video 
} from 'lucide-react-native'; 

export default function TabLayout() {
  const theme = useTheme(); 
  // theme.colors.primary: rgb(51, 102, 153) (Active color)
  // theme.colors.card: rgb(30, 64, 119) (Tab bar background)

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E90FF', // Using a cyan-blue for active tab
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card, 
          borderTopWidth: 0,
          paddingVertical: 5,
          height: 80, // Space for the icons and text
        },
        tabBarLabelStyle: {
            fontSize: 10,
            marginBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home', // This is the main Chat screen
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: 'Live Loc...',
          tabBarIcon: ({ color }) => <MapPin color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="panic"
        options={{
          title: 'Panic',
          tabBarIcon: ({ color }) => <AlertCircle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="fake-screen"
        options={{
          title: 'Fake Screen',
          tabBarIcon: ({ color }) => <EyeOff color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color }) => <ShieldAlert color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="recording"
        options={{
          title: 'Recording',
          tabBarIcon: ({ color }) => <Video color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
