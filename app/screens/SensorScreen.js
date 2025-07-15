// screens/SensorScreen.js
import { Audio } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { LightSensor } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../config/supabaseClient'; // Your Supabase client

function SensorScreen({ route, navigation }) {
  const { listingId } = route.params;

  const [lightData, setLightData] = useState(null);
  const [isLightSensorActive, setIsLightSensorActive] = useState(false);

  const [recording, setRecording] = useState(null);
  const [soundUri, setSoundUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const [image, setImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Request permissions on component mount
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: microphoneStatus } = await Audio.requestPermissionsAsync();
      // Light sensor doesn't require explicit permission on most platforms
      if (cameraStatus !== 'granted' || microphoneStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Camera and Microphone permissions are required for room scanning.');
      }
    })();

    // Cleanup light sensor subscription on unmount
    return () => {
      LightSensor.removeAllListeners();
    };
  }, []);

  // --- Light Sensor Functions ---
  const toggleLightSensor = () => {
    if (isLightSensorActive) {
      LightSensor.removeAllListeners();
      setIsLightSensorActive(false);
    } else {
      LightSensor.addListener(data => {
        setLightData(data);
      });
      LightSensor.setUpdateInterval(1000); // Update every 1 second
      setIsLightSensorActive(true);
    }
  };

  const saveLightData = async () => {
    if (lightData) {
      try {
        const { error } = await supabase.from('sensor_data').insert([
          {
            listing_id: listingId,
            sensor_type: 'light',
            value: lightData,
            timestamp: new Date().toISOString(),
          },
        ]);
        if (error) throw error;
        Alert.alert('Success', 'Light sensor data saved!');
      } catch (error) {
        console.error('Error saving light data:', error.message);
        Alert.alert('Error', 'Failed to save light data: ' + error.message);
      }
    } else {
      Alert.alert('No Data', 'Please start the light sensor scan first.');
    }
  };

  // --- Microphone Functions ---
  async function startRecording() {
    try {
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      Alert.alert('Recording', 'Recording started...');
    } catch (err) {
      setIsRecording(false);
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setSoundUri(uri);
    Alert.alert('Recording', 'Recording stopped. URI: ' + uri);
  }

  const saveMicrophoneData = async () => {
    if (soundUri) {
      setIsUploading(true);
      try {
        const response = await fetch(soundUri);
        const blob = await response.blob();
        const fileName = `audio_${listingId}_${Date.now()}.m4a`;
        const { error } = await supabase.storage
          .from('sensor_recordings') // Create this bucket in Supabase Storage
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'audio/m4a',
          });

        if (error) throw error;

        const publicUrl = supabase.storage.from('sensor_recordings').getPublicUrl(fileName).data.publicUrl;

        const { error: dbError } = await supabase.from('sensor_data').insert([
          {
            listing_id: listingId,
            sensor_type: 'microphone',
            value: { audio_url: publicUrl },
            timestamp: new Date().toISOString(),
          },
        ]);
        if (dbError) throw dbError;

        Alert.alert('Success', 'Microphone data saved!');
      } catch (error) {
        console.error('Error saving microphone data:', error.message);
        Alert.alert('Error', 'Failed to save microphone data: ' + error.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      Alert.alert('No Data', 'Please record audio first.');
    }
  };

  // --- Room Scan (Photo) Functions ---
  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const saveImageData = async () => {
    if (image) {
      setIsUploading(true);
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const fileName = `photo_${listingId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from('room_photos') // Create this bucket in Supabase Storage
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const publicUrl = supabase.storage.from('room_photos').getPublicUrl(fileName).data.publicUrl;

        // Update the listing with the photo URL
        const { error: updateError } = await supabase
          .from('listings')
          .update({ photos: [...(await supabase.from('listings').select('photos').eq('id', listingId)).data[0].photos || [], publicUrl] })
          .eq('id', listingId);

        if (updateError) throw updateError;

        // Also save to sensor_data for consistency if desired
        const { error: sensorError } = await supabase.from('sensor_data').insert([
          {
            listing_id: listingId,
            sensor_type: 'camera_photo_url',
            value: { photo_url: publicUrl },
            timestamp: new Date().toISOString(),
          },
        ]);
        if (sensorError) throw sensorError;

        Alert.alert('Success', 'Room photo saved!');
        setImage(null); // Clear image after saving
      } catch (error) {
        console.error('Error saving image:', error.message);
        Alert.alert('Error', 'Failed to save image: ' + error.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      Alert.alert('No Image', 'Please take a photo first.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Room Sensor Data Collection for Listing ID: {listingId}</Text>

      {/* Light Sensor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Light Sensor</Text>
        <Text>Current Illuminance: {lightData ? lightData.illuminance.toFixed(2) : 'N/A'} lux</Text>
        <View style={styles.buttonRow}>
          <Button title={isLightSensorActive ? "Stop Light Scan" : "Start Light Scan"} onPress={toggleLightSensor} />
          <Button title="Save Light Data" onPress={saveLightData} disabled={!lightData || isUploading} />
        </View>
      </View>

      {/* Microphone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Microphone Scan</Text>
        <Text>{isRecording ? 'Recording...' : soundUri ? 'Audio Recorded' : 'Ready to record'}</Text>
        <View style={styles.buttonRow}>
          <Button
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
          />
          <Button title="Save Audio" onPress={saveMicrophoneData} disabled={!soundUri || isUploading} />
        </View>
      </View>

      {/* Room Scan (Photo) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Room Scan (Photo)</Text>
        <View style={styles.buttonRow}>
          <Button title="Take Photo" onPress={pickImage} disabled={isUploading} />
          <Button title="Save Photo" onPress={saveImageData} disabled={!image || isUploading} />
        </View>
        {isUploading && <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 10 }} />}
        {image && <Image source={{ uri: image }} style={styles.imagePreview} />}
      </View>

      <Button
        title="Finish Sensor Scan & Go to Dashboard"
        onPress={() => navigation.navigate('Dashboard')} // Navigate to dashboard after all scans
        disabled={isUploading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginTop: 15,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#e0e0e0',
  },
});

export default SensorScreen;
