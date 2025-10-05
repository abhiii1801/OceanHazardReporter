// screens/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity, // Import TouchableOpacity for the button
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../utils/supabase';

// Define theme colors (Light theme with light blues)
const Colors = {
  primaryDark: '#F6FAFE', // Light background
  secondaryDark: '#FFFFFF', // Cards/sections
  accentBlue: '#3B82F6', // Light blue accent
  textPrimary: '#0F172A', // Dark text
  textSecondary: '#475569', // Muted dark
  redSeverity: '#DC2626',
  orangeSeverity: '#F59E0B',
  greenSeverity: '#16A34A',
  borderColor: '#CFE3FF',
  statusPending: '#F59E0B',
  statusValidated: '#16A34A',
  statusFalse: '#DC2626',
};

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all reports:', error.message);
      Alert.alert('Error', 'Could not load all reports for admin.');
    } else {
      setReports(data);
      if (data.length > 0) {
        // Set initial map region to the average of all report locations, or a default if none
        const latitudes = data.filter(r => r.latitude).map(r => r.latitude);
        const longitudes = data.filter(r => r.longitude).map(r => r.longitude);
        
        if (latitudes.length > 0 && longitudes.length > 0) {
          const avgLat = latitudes.reduce((sum, lat) => sum + lat, 0) / latitudes.length;
          const avgLon = longitudes.reduce((sum, lon) => sum + lon, 0) / longitudes.length;
          setMapRegion({
            latitude: avgLat,
            longitude: avgLon,
            latitudeDelta: 15, // Wider view for admin map
            longitudeDelta: 15,
          });
        } else {
          setMapRegion({ latitude: 0, longitude: 0, latitudeDelta: 5, longitudeDelta: 5 });
        }
      } else {
        // If no reports, set a default map region (e.g., center of a country/continent)
        setMapRegion({ latitude: 34.0522, longitude: -118.2437, latitudeDelta: 5, longitudeDelta: 5 }); // Example: Los Angeles
      }
    }
    setLoading(false);
  };

  const updateReportStatus = async (reportId, newStatus) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report status:', error.message);
      Alert.alert('Error', `Failed to update status to ${newStatus}.`);
    } else {
      Alert.alert('Success', `Report status updated to ${newStatus}.`);
      fetchReports(); // Refresh reports
    }
  };

  const getMarkerColor = (severity) => {
    switch (severity) {
      case 'critical': return Colors.redSeverity;
      case 'high': return Colors.redSeverity;
      case 'medium': return Colors.orangeSeverity;
      case 'low': return Colors.greenSeverity;
      default: return Colors.accentBlue; // Default for unknown/other
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return Colors.statusPending;
      case 'validated': return Colors.statusValidated;
      case 'resolved': return Colors.statusResolved;
      case 'false': return Colors.statusFalse;
      default: return Colors.textSecondary;
    }
  };

  const getSeveritySummary = () => {
    const summary = { high: 0, medium: 0, low: 0, unknown: 0, pending:0, validated:0, resolved:0, false:0, total: reports.length };
    reports.forEach(report => {
      switch (report.severity) {
        case 'critical': summary.high++; break; // Treat critical as high
        case 'high': summary.high++; break;
        case 'medium': summary.medium++; break;
        case 'low': summary.low++; break;
        default: summary.unknown++; break;
      }
      switch (report.status) {
        case 'pending': summary.pending++; break;
        case 'validated': summary.validated++; break;
        case 'resolved': summary.resolved++; break;
        case 'false': summary.false++; break;
      }
    });
    return summary;
  };

  const summary = getSeveritySummary();

  const mapRef = React.useRef(null);
  
    const indiaBounds = [
          { latitude: 6.5546, longitude: 68.1114 },  // Southwest
          { latitude: 37.0841, longitude: 97.3956 }, // Northeast
        ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Admin Dashboard</Text>
        <TouchableOpacity onPress={fetchReports} style={styles.refreshButton}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primaryDark} />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <Text style={styles.sectionTitle}>Reports Summary</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Total Reports: {summary.total}</Text>
        <Text style={[styles.summaryText, { color: Colors.redSeverity }]}>High Severity: {summary.high}</Text>
        <Text style={[styles.summaryText, { color: Colors.orangeSeverity }]}>Medium Severity: {summary.medium}</Text>
        <Text style={[styles.summaryText, { color: Colors.greenSeverity }]}>Low Severity: {summary.low}</Text>
        {summary.unknown > 0 && <Text style={styles.summaryText}>Unknown Severity: {summary.unknown}</Text>}
        <View style={styles.summaryDivider} />
        <Text style={[styles.summaryText, { color: Colors.statusPending }]}>Pending: {summary.pending}</Text>
        <Text style={[styles.summaryText, { color: Colors.statusValidated }]}>Validated: {summary.validated}</Text>
        <Text style={[styles.summaryText, { color: Colors.statusResolved }]}>Resolved: {summary.resolved}</Text>
        <Text style={[styles.summaryText, { color: Colors.statusFalse }]}>False: {summary.false}</Text>
      </View>

      {/* Map Section */}
      <Text style={styles.sectionTitle}>All Reported Locations</Text>
      {loading ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
          <Text style={styles.textPrimary}>Loading Map...</Text>
        </View>
      ) : (
        mapRegion && (
          <MapView
            ref={mapRef}
            style={styles.map}
            onMapReady={() => {
              mapRef.current?.fitToCoordinates(indiaBounds, {
                edgePadding: { top: 10, right: 10, bottom: 10, left: 10 },
                animated: true,
              });
            }}
            showsUserLocation={true}
            // customMapStyle={mapStyle}
          >
            {reports.map((report) => (
              report.latitude && report.longitude && (
                <Marker
                  key={report.id}
                  coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                  title={`${report.hazard_type} (${report.status})`}
                  description={`${report.description} (Severity: ${report.severity})`}
                  pinColor={getMarkerColor(report.severity)}
                />
              )
            ))}
          </MapView>
        )
      )}

      {/* All Reports List */}
      <Text style={styles.sectionTitle}>Manage Reports</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.accentBlue} />
      ) : (
        reports.length === 0 ? (
          <Text style={styles.noReportsText}>No reports to manage.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>{report.hazard_type}</Text>
              <Text style={[styles.reportCardMeta, { color: getMarkerColor(report.severity) }]}>Severity: {report.severity.toUpperCase()}</Text>
              <Text style={[styles.reportCardStatus, { color: getStatusColor(report.status) }]}>Status: {report.status.toUpperCase()}</Text>
              <Text style={styles.reportCardDescription}>{report.description}</Text>
              {report.media_url && (
                <Image source={{ uri: report.media_url }} style={styles.reportImage} />
              )}
              <Text style={styles.reportCardMeta}>Reported: {new Date(report.created_at).toLocaleDateString()}</Text>
              <Text style={styles.reportCardMeta}>Lat: {report.latitude?.toFixed(4)}, Lon: {report.longitude?.toFixed(4)}</Text>
              {report.contact_name && <Text style={styles.reportCardMeta}>Contact: {report.contact_name} ({report.contact_phone})</Text>}

              <View style={styles.adminActions}>
                <View style={styles.pickerContainer}>
                    <Picker
                    selectedValue={report.status}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                    dropdownIconColor={Colors.accentBlue}
                    onValueChange={(itemValue) => updateReportStatus(report.id, itemValue)}
                    >
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Validated" value="validated" />
                    <Picker.Item label="False" value="false" />
                    </Picker>
                </View>
              </View>
            </View>
          ))
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: Colors.primaryDark,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 5,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.accentBlue,
    fontFamily: 'Times New Roman',
  },
  refreshButton: {
    backgroundColor: Colors.accentBlue,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80, // Ensure button has a minimum width
  },
  refreshButtonText: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Times New Roman',
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
    fontFamily: 'Times New Roman',
  },
  summaryCard: {
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
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
    color: Colors.textPrimary,
    fontFamily: 'Times New Roman',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderColor,
    marginVertical: 10,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    overflow: 'hidden',
  },
  mapLoading: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.secondaryDark,
    borderRadius: 10,
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
    fontFamily: 'Times New Roman',
  },
  reportCardDescription: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 5,
    fontFamily: 'Times New Roman',
  },
  reportCardMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 5,
    fontFamily: 'Times New Roman',
  },
  reportCardStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Times New Roman',
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
    fontFamily: 'Times New Roman',
  },
  adminActions: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    paddingTop: 15,
  },
  pickerContainer: {
    backgroundColor: Colors.primaryDark, // Darker background for picker itself
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 8,
    overflow: 'hidden',
    height: 50, // Fixed height for consistency
    justifyContent: 'center',
  },
  picker: {
    color: Colors.textPrimary,
    // The height of the picker component on iOS is usually fixed.
    // On Android, it's often best controlled by its container.
  },
  pickerItem: {
    backgroundColor: Colors.primaryDark, // May not work on all platforms
    color: Colors.textPrimary, // May not work on all platforms
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


export default AdminDashboard;