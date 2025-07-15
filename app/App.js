// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Import your screens and Supabase client
// import AuthScreen from './screens/AuthScreen';
import ListerFormScreen from './screens/ListerFormScreen';
import SensorScreen from './screens/SensorScreen';
import SeekerChatScreen from './screens/SeekerChatScreen';
import DashboardScreen from './screens/DashboardScreen';
import HomeScreen from './screens/HomeScreen'; // Re-using the simple Home screen

import { supabase } from './config/supabaseClient';
import AuthScreen from './screens/AuthScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state for initial auth check

  useEffect(() => {
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChanged((_event, session) => {
      setSession(session);
      setLoading(false); // Set loading to false once initial check is done
    });

    // Cleanup the listener on unmount
    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) {
    // Show a loading indicator while checking auth status
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        {session && session.user ? (
          // User is logged in
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Welcome' }} />
            <Stack.Screen name="ListerForm" component={ListerFormScreen} options={{ title: 'List Your Room' }} />
            <Stack.Screen name="SensorScan" component={SensorScreen} options={{ title: 'Room Scan' }} />
            <Stack.Screen name="SeekerChat" component={SeekerChatScreen} options={{ title: 'Find Your Room' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Your Dashboard' }} />
          </>
        ) : (
          // User is not logged in
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// // Re-using the simple Home Screen from previous step, but adding a logout button
// function HomeScreen({ navigation }) {
//   async function signOut() {
//     const { error } = await supabase.auth.signOut();
//     if (error) Alert.alert('Logout Error', error.message);
//   }

//   return (
//     <View style={styles.homeContainer}>
//       <Text style={styles.homeTitle}>Welcome to RoomFinder!</Text>
//       <Button
//         title="I want to list a room"
//         onPress={() => navigation.navigate('ListerForm')}
//       />
//       <View style={{ marginVertical: 10 }} />
//       <Button
//         title="I want to find a room"
//         onPress={() => navigation.navigate('SeekerChat')}
//       />
//       <View style={{ marginVertical: 20 }} />
//       <Button title="Logout" onPress={signOut} color="#FF6347" />
//     </View>
//   );
// }

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  homeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
});
