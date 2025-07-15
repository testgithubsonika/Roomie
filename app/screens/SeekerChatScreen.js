// screens/SeekerChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../config/supabaseClient'; // Your Supabase client

function SeekerChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [seekerPreferences, setSeekerPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null); // State to store the current user's ID
  const flatListRef = useRef(null);

  // Pre-defined important questions for Gemini to "ask"
  const onboardingQuestions = [
    "What's your preferred budget range for rent per month?",
    "Which areas or neighborhoods are you interested in (e.g., Downtown, University Area)?",
    "How many roommates are you looking for, if any?",
    "Are you open to sharing a room, or do you prefer a private one?",
    "What's most important to you in a room: amenities, location, or price?",
  ];

  useEffect(() => {
    // Get the current authenticated user's ID
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Initial message from Gemini (first question)
        if (messages.length === 0 && onboardingQuestions[currentQuestionIndex]) {
          addMessage('Gemini', onboardingQuestions[currentQuestionIndex]);
        }
      } else {
        Alert.alert('Authentication Required', 'Please log in to find a room.');
        navigation.navigate('Auth'); // Redirect to auth if no user
      }
    };
    fetchUser();
  }, []); // Run only once on mount

  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const addMessage = (sender, text) => {
    setMessages(prevMessages => [...prevMessages, { id: prevMessages.length.toString(), sender, text }]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !userId) return;

    const userMessage = inputText;
    addMessage('You', userMessage);
    setInputText('');
    setIsLoading(true);

    // Store the user's answer
    setSeekerPreferences(prev => ({
      ...prev,
      [onboardingQuestions[currentQuestionIndex]]: userMessage,
    }));

    if (currentQuestionIndex < onboardingQuestions.length - 1) {
      // Move to the next question
      setCurrentQuestionIndex(prev => prev + 1);
      // Simulate Gemini response with the next question
      setTimeout(() => {
        addMessage('Gemini', onboardingQuestions[currentQuestionIndex + 1]);
        setIsLoading(false);
      }, 1000); // Simulate network delay
    } else {
      // All questions asked, finalize and save preferences
      addMessage('Gemini', "Thanks for answering! We're now processing your preferences to find the best matches.");
      await saveSeekerProfile();
      setIsLoading(false);
      navigation.navigate('Dashboard'); // Navigate to dashboard
    }
  };

  const saveSeekerProfile = async () => {
    try {
      // Ensure the seeker profile exists in the 'seeker_profiles' table
      let { data: seekerProfileData, error: seekerProfileError } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      let seekerProfileId;
      if (seekerProfileError && seekerProfileError.code === 'PGRST116') { // No rows found
        // Create a new seeker profile entry if one doesn't exist
        const { data: newSeekerProfile, error: createSeekerProfileError } = await supabase
          .from('seeker_profiles')
          .insert([{ user_id: userId, preferences: seekerPreferences, completed_onboarding: true }])
          .select('id')
          .single();
        if (createSeekerProfileError) throw createSeekerProfileError;
        seekerProfileId = newSeekerProfile.id;
      } else if (seekerProfileError) {
        throw seekerProfileError;
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('seeker_profiles')
          .update({ preferences: seekerPreferences, completed_onboarding: true })
          .eq('user_id', userId);
        if (updateError) throw updateError;
        seekerProfileId = seekerProfileData.id;
      }

      console.log('Seeker profile saved/updated for ID:', seekerProfileId);
      Alert.alert('Success', 'Your preferences have been saved!');
    } catch (error) {
      console.error('Error saving seeker profile:', error.message);
      Alert.alert('Error', 'Failed to save your preferences: ' + error.message);
    }
  };

  const progress = (currentQuestionIndex + (isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'You' ? 0.5 : 0)) / onboardingQuestions.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressText}>
          Question {Math.min(currentQuestionIndex + 1, onboardingQuestions.length)}/{onboardingQuestions.length}
        </Text>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.sender === 'You' ? styles.userMessage : styles.geminiMessage
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
      />

      {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'You' && (
        <ActivityIndicator size="small" color="#0000ff" style={styles.loadingIndicator} />
      )}

      {currentQuestionIndex < onboardingQuestions.length ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your answer..."
            editable={!isLoading && !!userId} // Disable if not authenticated
          />
          <Button title="Send" onPress={handleSendMessage} disabled={isLoading || !userId} />
        </View>
      ) : (
        <Text style={styles.completionText}>Onboarding complete! Navigating to dashboard...</Text>
      )}
      {!userId && <Text style={styles.authWarning}>Please log in to find a room.</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  progressBarContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50', // Green for progress
    borderRadius: 4,
  },
  messageList: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginVertical: 5,
    elevation: 1, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6', // Light green for user
  },
  geminiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF', // White for Gemini
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  loadingIndicator: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  completionText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    color: '#555',
  },
  authWarning: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    paddingBottom: 10, // Ensure it's not covered by keyboard
  },
});

export default SeekerChatScreen;
