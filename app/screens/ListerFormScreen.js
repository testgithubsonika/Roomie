// screens/ListerFormScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../config/supabaseClient'; // Your Supabase client

function ListerFormScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [rent, setRent] = useState('');
  const [roomType, setRoomType] = useState('');
  const [amenities, setAmenities] = useState(''); // Comma-separated string
  const [availableFrom, setAvailableFrom] = useState(''); // YYYY-MM-DD
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null); // State to store the current user's ID

  useEffect(() => {
    // Get the current authenticated user's ID
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        Alert.alert('Authentication Required', 'Please log in to list a room.');
        navigation.navigate('Auth'); // Redirect to auth if no user
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated. Please log in.');
      return;
    }
    if (!title || !location || !rent || !availableFrom) {
      Alert.alert('Missing Information', 'Please fill in all required fields (Title, Location, Rent, Available From).');
      return;
    }

    setIsLoading(true);
    try {
      // First, ensure the lister exists in the 'listers' table
      // In a real app, you might have a more robust lister profile creation
      let { data: listerData, error: listerError } = await supabase
        .from('listers')
        .select('id')
        .eq('user_id', userId)
        .single();

      let listerId;
      if (listerError && listerError.code === 'PGRST116') { // No rows found
        // Create a new lister entry if one doesn't exist
        const { data: newLister, error: createListerError } = await supabase
          .from('listers')
          .insert([{ user_id: userId }])
          .select('id')
          .single();
        if (createListerError) throw createListerError;
        listerId = newLister.id;
      } else if (listerError) {
        throw listerError;
      } else {
        listerId = listerData.id;
      }

      // Now insert the listing using the listerId
      const { data, error } = await supabase.from('listings').insert([
        {
          lister_id: listerId, // Use the actual lister_id
          title,
          description,
          location,
          rent_per_month: parseFloat(rent),
          room_type: roomType,
          amenities: amenities.split(',').map(a => a.trim()).filter(a => a), // Convert to array
          available_from: availableFrom,
        },
      ]).select(); // Use .select() to get the inserted data, including the ID

      if (error) {
        throw error;
      }

      const newListing = data[0];
      Alert.alert('Success', 'Listing saved! Now let\'s scan your room.');
      navigation.navigate('SensorScan', { listingId: newListing.id });
    } catch (error) {
      console.error('Error saving listing:', error.message);
      Alert.alert('Error', 'Failed to save listing: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Room Details</Text>

      <TextInput
        style={styles.input}
        placeholder="Room Title (e.g., Cozy Private Room)"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        placeholder="Location (e.g., Downtown, City Center)"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={styles.input}
        placeholder="Rent per month (e.g., 800.00)"
        value={rent}
        onChangeText={setRent}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Room Type (e.g., Private, Shared)"
        value={roomType}
        onChangeText={setRoomType}
      />
      <TextInput
        style={styles.input}
        placeholder="Amenities (comma-separated, e.g., Wifi, Laundry)"
        value={amenities}
        onChangeText={setAmenities}
      />
      <TextInput
        style={styles.input}
        placeholder="Available From (YYYY-MM-DD)"
        value={availableFrom}
        onChangeText={setAvailableFrom}
      />

      <Button title={isLoading ? "Saving..." : "Save Listing & Scan Room"} onPress={handleSubmit} disabled={isLoading || !userId} />
      {!userId && <Text style={styles.authWarning}>Please log in to list a room.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  authWarning: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});

export default ListerFormScreen;
