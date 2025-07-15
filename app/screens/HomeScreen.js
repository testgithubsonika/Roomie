
// import React, { useState, useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { StatusBar } from 'expo-status-bar';
import { View,  StyleSheet, Text, Button, Alert } from 'react-native';
import { supabase } from '../config/supabaseClient';

export default function HomeScreen({ navigation }) {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Logout Error', error.message);
  }

  return (
    <View style={styles.homeContainer}>
      <Text style={styles.homeTitle}>Welcome to RoomFinder!</Text>
      <Button
        title="I want to list a room"
        onPress={() => navigation.navigate('ListerForm')}
      />
      <View style={{ marginVertical: 10 }} />
      <Button
        title="I want to find a room"
        onPress={() => navigation.navigate('SeekerChat')}
      />
      <View style={{ marginVertical: 20 }} />
      <Button title="Logout" onPress={signOut} color="#FF6347" />
    </View>
  );
}

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
