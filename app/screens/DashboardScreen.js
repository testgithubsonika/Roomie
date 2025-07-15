// screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { Image, View, Text, StyleSheet, Button, ActivityIndicator, FlatList, Alert, ScrollView } from 'react-native';
import { supabase } from '../config/supabaseClient';

function DashboardScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [matchedRooms, setMatchedRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeker, setIsSeeker] = useState(false); // To differentiate lister/seeker dashboard

  useEffect(() => {
    const fetchUserAndMatches = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check if the user has a seeker profile to determine dashboard type
        const { data: seekerProfile, error: seekerError } = await supabase
          .from('seeker_profiles')
          .select('id, completed_onboarding')
          .eq('user_id', user.id)
          .single();

        if (seekerProfile && seekerProfile.completed_onboarding) {
          setIsSeeker(true);
          await fetchMatchedRooms(seekerProfile.id);
        } else {
          // Assume lister or user who hasn't completed seeker onboarding
          setIsSeeker(false);
          // For listers, you might fetch their own listings here
          setIsLoading(false);
        }
      } else {
        Alert.alert('Authentication Required', 'Please log in to view your dashboard.');
        navigation.navigate('Auth');
      }
    };
    fetchUserAndMatches();
  }, []);

  const fetchMatchedRooms = async (seekerProfileId) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-rooms', {
        body: JSON.stringify({ seeker_id: seekerProfileId }),
      });

      if (error) {
        throw error;
      }

      if (data && data.matches) {
        setMatchedRooms(data.matches);
      } else {
        setMatchedRooms([]);
      }
    } catch (error) {
      console.error('Error fetching matched rooms:', error.message);
      Alert.alert('Error', 'Failed to fetch matched rooms: ' + error.message);
      setMatchedRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoomItem = ({ item }) => (
    <View style={styles.roomCard}>
      <Text style={styles.roomTitle}>{item.title}</Text>
      <Text style={styles.roomLocation}>{item.location}</Text>
      <Text style={styles.roomRent}>Rent: ${item.rent_per_month}</Text>
      <Text style={styles.roomType}>Type: {item.room_type}</Text>
      {item.amenities && item.amenities.length > 0 && (
        <Text style={styles.roomAmenities}>Amenities: {item.amenities.join(', ')}</Text>
      )}
      <Text style={styles.roomSimilarity}>Similarity: {item.similarity_score ? (item.similarity_score * 100).toFixed(2) : 'N/A'}%</Text>
      {item.photos && item.photos.length > 0 && (
        <Image source={{ uri: item.photos[0] }} style={styles.roomImage} />
      )}
      <Text style={styles.roomDescription}>{item.description}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Finding your perfect room matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Dashboard</Text>

      {isSeeker ? (
        <View style={styles.seekerSection}>
          <Text style={styles.subHeader}>Top Room Matches for You:</Text>
          {matchedRooms.length > 0 ? (
            <FlatList
              data={matchedRooms}
              keyExtractor={(item) => item.listing_id}
              renderItem={renderRoomItem}
              contentContainerStyle={styles.roomList}
            />
          ) : (
            <Text style={styles.noMatchesText}>No room matches found yet. Try adjusting your preferences or check back later!</Text>
          )}
          <Button title="Refresh Matches" onPress={() => fetchMatchedRooms(userId)} />
        </View>
      ) : (
        <View style={styles.listerSection}>
          <Text style={styles.subHeader}>Lister Dashboard</Text>
          <Text style={styles.infoText}>
            (Here you would display your own listings and their status.)
          </Text>
          <Button title="List a New Room" onPress={() => navigation.navigate('ListerForm')} />
        </View>
      )}

      <View style={styles.bottomButton}>
        <Button title="Go Home" onPress={() => navigation.navigate('Home')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
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
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#555',
  },
  seekerSection: {
    flex: 1,
    padding: 10,
  },
  listerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 30,
    textAlign: 'center',
  },
  roomList: {
    paddingBottom: 20, // Add some padding at the bottom
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  roomLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  roomRent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF', // Blue for rent
    marginBottom: 5,
  },
  roomType: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  roomAmenities: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  roomSimilarity: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50', // Green for similarity
    marginTop: 5,
    marginBottom: 10,
  },
  roomImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  roomDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  noMatchesText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomButton: {
    marginTop: 20,
    marginBottom: 10,
  },
});

export default DashboardScreen;
