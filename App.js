// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import UserDashboard from './screens/UserDashboard';
import AdminDashboard from './screens/AdminDashboard'; // We'll create this later

const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="User"
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',  // iOS blue
          tabBarInactiveTintColor: '#8e8e93', // muted gray
          tabBarIndicatorStyle: { backgroundColor: '#007AFF', height: 3 },
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
          tabBarStyle: {
            backgroundColor: '#fff',
            paddingTop: 30, // space for notch
          },
        }}
      >
        <Tab.Screen name="User" component={UserDashboard} />
        <Tab.Screen name="Admin" component={AdminDashboard} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
