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
        tabBarOptions={{
          activeTintColor: 'blue',
          inactiveTintColor: 'gray',
          style: { paddingTop: 30 }, // To avoid notch issues on some phones
        }}
      >
        <Tab.Screen name="User" component={UserDashboard} />
        <Tab.Screen name="Admin" component={AdminDashboard} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}