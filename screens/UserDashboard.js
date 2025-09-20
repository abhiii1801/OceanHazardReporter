// screens/UserDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  Platform
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer'; // For image upload
import 'react-native-get-random-values'; // For uuid
import { v4 as uuidv4 } from 'uuid'; // For unique file names

const UserDashboard = () => {
  const [region, setRegion] = useState(null);
  const [reports, setReports] = useState([]);
  const [description, setDescription] = useState('');
  const [hazardType, setHazardType] = useState('');
  const [severity, setSeverity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
    fetchValidatedReports();
  }, []);

  const fetchValidatedReports = async () => {
    setLoadingReports(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'validated'); // Only fetch validated reports

    if (error) {
      console.error('Error fetching validated reports:', error.message);
      Alert.alert('Error', 'Could not load validated reports.');
    } else {
      setReports(data);
    }
    setLoadingReports(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // Request base64 for direct upload
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const uploadImageAndGetUrl = async () => {
    if (!image) return null;

    setUploading(true);
    const fileExt = image.uri.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('reports-media')
        .upload(filePath, decode(image.base64), {
          contentType: image.mimeType || `image/${fileExt}`,
        });

      if (error) {
        throw error;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('reports-media')
        .getPublicUrl(filePath);

      setUploading(false);
      return publicUrlData.publicUrl;

    } catch (error) {
      Alert.alert('Error uploading image', error.message);
      setUploading(false);
      return null;
    }
  };

  const handleSubmitReport = async () => {
    if (!description || !hazardType || !severity || !region) {
      Alert.alert('Missing Info', 'Please fill in description, hazard type, severity, and ensure location is available.');
      return;
    }

    setUploading(true); // Use uploading state for overall submission too

    let mediaUrl = null;
    if (image) {
      mediaUrl = await uploadImageAndGetUrl();
      if (!mediaUrl) {
        setUploading(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          description,
          hazard_type: hazardType,
          severity,
          latitude: region.latitude,
          longitude: region.longitude,
          location: `POINT(${region.longitude} ${region.latitude})`, // PostGIS format
          contact_name: contactName,
          contact_phone: contactPhone,
          media_url: mediaUrl,
          status: 'pending',
        },
      ]);

    if (error) {
      console.error('Error submitting report:', error.message);
      Alert.alert('Submission Error', 'Failed to submit report. Please try again.');
    } else {
      Alert.alert('Success', 'Report submitted successfully! It will be reviewed by an admin.');
      // Clear form
      setDescription('');
      setHazardType('');
      setSeverity('');
      setContactName('');
      setContactPhone('');
      setImage(null);
    }
    setUploading(false);
  };

  const getMarkerColor = (severity) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Ocean Hazard Reporter</Text>

      {/* Map Section */}
      <Text style={styles.sectionTitle}>Validated Hazard Locations</Text>
      {region ? (
        <MapView
          style={styles.map}
          initialRegion={region}
          showsUserLocation={true}
        >
          {reports.map((report) => (
            report.latitude && report.longitude && (
              <Marker
                key={report.id}
                coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                title={report.hazard_type || 'Hazard'}
                description={report.description}
                pinColor={getMarkerColor(report.severity)}
              />
            )
          ))}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading Map and Location...</Text>
        </View>
      )}

      {/* Submit Report Section */}
      <Text style={styles.sectionTitle}>Submit a New Report</Text>
      <TextInput
        style={styles.input}
        placeholder="Description of hazard"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Hazard Type (e.g., Oil Spill, Debris, Dangerous Current)"
        value={hazardType}
        onChangeText={setHazardType}
      />
      <TextInput
        style={styles.input}
        placeholder="Severity (e.g., low, medium, high)"
        value={severity}
        onChangeText={setSeverity}
      />
      <TextInput
        style={styles.input}
        placeholder="Your Name (Optional)"
        value={contactName}
        onChangeText={setContactName}
      />
      <TextInput
        style={styles.input}
        placeholder="Your Phone (Optional)"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />
      <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
        <Text style={styles.imagePickerButtonText}>Pick an image/video</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}

      <Button
        title={uploading ? "Submitting..." : "Submit Report"}
        onPress={handleSubmitReport}
        disabled={uploading}
        color="#2196F3"
      />

      {/* Validated Reports List */}
      <Text style={styles.sectionTitle}>Validated Reports</Text>
      {loadingReports ? (
        <ActivityIndicator size="small" color="#0000ff" />
      ) : (
        reports.length === 0 ? (
          <Text style={styles.noReportsText}>No validated reports to display yet.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>{report.hazard_type} - {report.severity}</Text>
              <Text>{report.description}</Text>
              {report.media_url && (
                <Image source={{ uri: report.media_url }} style={styles.reportImage} />
              )}
              <Text style={styles.reportCardMeta}>Reported: {new Date(report.created_at).toLocaleDateString()}</Text>
              <Text style={styles.reportCardMeta}>Location: {report.latitude}, {report.longitude}</Text>
            </View>
          ))
        )
      )}

      {/* Emergency Contacts */}
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      <View style={styles.emergencyContactCard}>
        <Text style={styles.emergencyContactText}>Coast Guard: 1-800-424-8802</Text>
        <Text style={styles.emergencyContactText}>Local Marine Patrol: Check local listings</Text>
        <Text style={styles.emergencyContactText}>Environmental Protection Agency: 1-800-424-8802</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f8ff', // Light blue background
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#0056b3',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#0056b3',
    borderBottomWidth: 1,
    borderBottomColor: '#cfe2f3',
    paddingBottom: 5,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapLoading: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  imagePickerButton: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  reportCardMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  reportImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 5,
    marginTop: 10,
  },
  noReportsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  emergencyContactCard: {
    backgroundColor: '#fff3cd', // Light yellow for attention
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
    marginBottom: 20,
  },
  emergencyContactText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
});

export default UserDashboard;