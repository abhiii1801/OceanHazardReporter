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
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { supabase } from '../utils/supabase';
import { decode } from 'base64-arraybuffer';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Define theme colors
const Colors = {
  primaryDark: '#0A192F', // Deep dark blue
  secondaryDark: '#172A45', // Slightly lighter dark blue for cards
  accentBlue: '#64FFDA', // Bright greenish-blue for accents/buttons
  textPrimary: '#CCD6F6', // Light gray for primary text
  textSecondary: '#8892B0', // Gray for secondary text
  redSeverity: '#FF6B6B', // Red for high severity
  orangeSeverity: '#FFA07A', // Orange for medium severity
  greenSeverity: '#84DCC6', // Teal/Green for low severity
  borderColor: '#303C55', // Border color for inputs/cards
};

// Hazard Type and Severity options for Pickers
const hazardTypes = [
  'Oil Spill', 'Debris', 'Dangerous Current', 'Algae Bloom', 'Chemical Leak',
  'Illegal Dumping', 'Marine Life Disturbance', 'Other'
];
const severities = ['low', 'medium', 'high'];

const UserDashboard = () => {
  const [region, setRegion] = useState(null);
  const [reports, setReports] = useState([]);
  const [description, setDescription] = useState('');
  const [selectedHazardType, setSelectedHazardType] = useState(hazardTypes[0]); // Default to first hazard type
  const [selectedSeverity, setSelectedSeverity] = useState(severities[0]); // Default to first severity
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied. Some features may not work.');
      } else {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }

      if (Platform.OS !== 'web') {
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
          Alert.alert('Permission denied', 'We need camera roll and camera permissions to upload images.');
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
      .eq('status', 'validated');

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
      base64: true,
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
      const { error } = await supabase.storage
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
    if (!description || !selectedHazardType || !selectedSeverity || !region) {
      Alert.alert('Missing Info', 'Please fill in description, hazard type, severity, and ensure location is available.');
      return;
    }

    setUploading(true);

    let mediaUrl = null;
    if (image) {
      mediaUrl = await uploadImageAndGetUrl();
      if (!mediaUrl) {
        setUploading(false);
        return;
      }
    }

    const { error } = await supabase
      .from('reports')
      .insert([
        {
          description,
          hazard_type: selectedHazardType,
          severity: selectedSeverity,
          latitude: region.latitude,
          longitude: region.longitude,
          location: `POINT(${region.longitude} ${region.latitude})`,
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
      setSelectedHazardType(hazardTypes[0]);
      setSelectedSeverity(severities[0]);
      setContactName('');
      setContactPhone('');
      setImage(null);
    }
    setUploading(false);
  };

  const getMarkerColor = (severity) => {
    switch (severity) {
      case 'high': return Colors.redSeverity;
      case 'medium': return Colors.orangeSeverity;
      case 'low': return Colors.greenSeverity;
      default: return Colors.accentBlue; // Default for unknown/other
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
          customMapStyle={mapStyle} // Apply dark map style
        >
          {reports.map((report) => (
            report.latitude && report.longitude && (
              <Marker
                key={report.id}
                coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                title={report.hazard_type || 'Hazard'}
                description={`${report.description} (Severity: ${report.severity})`}
                pinColor={getMarkerColor(report.severity)}
              />
            )
          ))}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
          <Text style={styles.textPrimary}>Loading Map and Location...</Text>
        </View>
      )}

      {/* Submit Report Section */}
      <Text style={styles.sectionTitle}>Submit a New Report</Text>
      <TextInput
        style={styles.input}
        placeholder="Description of hazard"
        placeholderTextColor={Colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedHazardType}
          onValueChange={(itemValue) => setSelectedHazardType(itemValue)}
          style={styles.picker}
          itemStyle={styles.pickerItem}
          dropdownIconColor={Colors.accentBlue}
        >
          {hazardTypes.map((type, index) => (
            <Picker.Item key={index} label={type} value={type} />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedSeverity}
          onValueChange={(itemValue) => setSelectedSeverity(itemValue)}
          style={styles.picker}
          itemStyle={styles.pickerItem}
          dropdownIconColor={Colors.accentBlue}
        >
          {severities.map((severity, index) => (
            <Picker.Item key={index} label={severity.charAt(0).toUpperCase() + severity.slice(1)} value={severity} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Your Name (Optional)"
        placeholderTextColor={Colors.textSecondary}
        value={contactName}
        onChangeText={setContactName}
      />
      <TextInput
        style={styles.input}
        placeholder="Your Phone (Optional)"
        placeholderTextColor={Colors.textSecondary}
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />
      <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
        <Text style={styles.imagePickerButtonText}>Pick an image/video</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}

      <TouchableOpacity
        style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
        onPress={handleSubmitReport}
        disabled={uploading}
      >
        <Text style={styles.submitButtonText}>{uploading ? "Submitting..." : "Submit Report"}</Text>
      </TouchableOpacity>

      {/* Validated Reports List */}
      <Text style={styles.sectionTitle}>Validated Reports</Text>
      {loadingReports ? (
        <ActivityIndicator size="small" color={Colors.accentBlue} />
      ) : (
        reports.length === 0 ? (
          <Text style={styles.noReportsText}>No validated reports to display yet.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>{report.hazard_type}</Text>
              <Text style={[styles.reportCardMeta, { color: getMarkerColor(report.severity) }]}>Severity: {report.severity.toUpperCase()}</Text>
              <Text style={styles.reportCardDescription}>{report.description}</Text>
              {report.media_url && (
                <Image source={{ uri: report.media_url }} style={styles.reportImage} />
              )}
              <Text style={styles.reportCardMeta}>Reported: {new Date(report.created_at).toLocaleDateString()}</Text>
              <Text style={styles.reportCardMeta}>Location: {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}</Text>
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
    padding: 15,
    backgroundColor: Colors.primaryDark,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: Colors.accentBlue,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    paddingBottom: 8,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    overflow: 'hidden', // Ensures borderRadius works
  },
  mapLoading: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondaryDark,
    borderRadius: 10,
  },
  input: {
    backgroundColor: Colors.secondaryDark,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: Colors.secondaryDark,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden', // Required for Android Picker styling
  },
  picker: {
    color: Colors.textPrimary,
    // Adjust height if necessary, typically handled by container
  },
  pickerItem: {
    backgroundColor: Colors.secondaryDark, // May not work on all platforms
    color: Colors.textPrimary, // May not work on all platforms
  },
  imagePickerButton: {
    backgroundColor: Colors.borderColor,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerButtonText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  submitButton: {
    backgroundColor: Colors.accentBlue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 18,
  },
  reportCard: {
    backgroundColor: Colors.secondaryDark,
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.accentBlue,
  },
  reportCardDescription: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 5,
  },
  reportCardMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  reportImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    borderRadius: 8,
    marginTop: 15,
  },
  noReportsText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 15,
    fontSize: 16,
  },
  emergencyContactCard: {
    backgroundColor: Colors.secondaryDark,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: 30,
  },
  emergencyContactText: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
});


// Custom Map Style for Dark Theme (Optional, but looks good with dark UI)
// You can generate custom styles from Snazzy Maps or Google Cloud Console
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#172a45"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#172a45"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#172a45"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#ccd6f6"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#172a45"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#172a45"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#ccd6f6"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0A192F"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#ccd6f6"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8892b0"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0F1E3A"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#ccd6f6"
      }
    ]
  }
];

export default UserDashboard;