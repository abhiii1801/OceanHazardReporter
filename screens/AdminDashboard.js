// screens/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Button,
  Image, 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../utils/supabase';

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
      .order('created_at', { ascending: false }); // Show latest first

    if (error) {
      console.error('Error fetching all reports:', error.message);
      Alert.alert('Error', 'Could not load all reports for admin.');
    } else {
      setReports(data);
      if (data.length > 0) {
        // Set initial map region to the first report's location, or a default
        setMapRegion({
          latitude: data[0].latitude || 0, // Default to 0 if no reports or lat
          longitude: data[0].longitude || 0, // Default to 0 if no reports or long
          latitudeDelta: 5, // Wider view for admin map
          longitudeDelta: 5,
        });
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
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107'; // Yellow
      case 'validated': return '#28a745'; // Green
      case 'resolved': return '#17a2b8'; // Teal
      case 'false': return '#dc3545'; // Red
      default: return '#6c757d'; // Gray
    }
  };

  const getSeveritySummary = () => {
    const summary = { high: 0, medium: 0, low: 0, unknown: 0, total: reports.length };
    reports.forEach(report => {
      switch (report.severity) {
        case 'high': summary.high++; break;
        case 'medium': summary.medium++; break;
        case 'low': summary.low++; break;
        default: summary.unknown++; break;
      }
    });
    return summary;
  };

  const summary = getSeveritySummary();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>

      {/* Summary */}
      <Text style={styles.sectionTitle}>Reports Summary</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Total Reports: {summary.total}</Text>
        <Text style={[styles.summaryText, { color: 'red' }]}>High Severity: {summary.high}</Text>
        <Text style={[styles.summaryText, { color: 'orange' }]}>Medium Severity: {summary.medium}</Text>
        <Text style={[styles.summaryText, { color: 'green' }]}>Low Severity: {summary.low}</Text>
        {summary.unknown > 0 && <Text style={styles.summaryText}>Unknown Severity: {summary.unknown}</Text>}
      </View>

      {/* Map Section */}
      <Text style={styles.sectionTitle}>All Reported Locations</Text>
      {loading ? (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading Map...</Text>
        </View>
      ) : (
        mapRegion && (
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation={false} // Admin map doesn't necessarily need admin's location
          >
            {reports.map((report) => (
              report.latitude && report.longitude && (
                <Marker
                  key={report.id}
                  coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                  title={`${report.hazard_type} (${report.status})`}
                  description={report.description}
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
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        reports.length === 0 ? (
          <Text style={styles.noReportsText}>No reports to manage.</Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>{report.hazard_type} ({report.severity})</Text>
              <Text style={[styles.reportCardStatus, { color: getStatusColor(report.status) }]}>Status: {report.status.toUpperCase()}</Text>
              <Text>{report.description}</Text>
              {report.media_url && (
                <Image source={{ uri: report.media_url }} style={styles.reportImage} />
              )}
              <Text style={styles.reportCardMeta}>Reported: {new Date(report.created_at).toLocaleDateString()}</Text>
              <Text style={styles.reportCardMeta}>Lat: {report.latitude?.toFixed(4)}, Lon: {report.longitude?.toFixed(4)}</Text>
              {report.contact_name && <Text style={styles.reportCardMeta}>Contact: {report.contact_name} ({report.contact_phone})</Text>}

              <View style={styles.adminActions}>
                <Picker
                  selectedValue={report.status}
                  style={styles.statusPicker}
                  onValueChange={(itemValue) => updateReportStatus(report.id, itemValue)}
                >
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Validated" value="validated" />
                  <Picker.Item label="Resolved" value="resolved" />
                  <Picker.Item label="False" value="false" />
                </Picker>
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
    padding: 10,
    backgroundColor: '#f8f9fa', // Lighter background for admin
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#343a40',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#343a40',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 5,
  },
  summaryCard: {
    backgroundColor: '#e9f7ef', // Light green for summary
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#28a745',
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
  reportCardStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
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
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  statusPicker: {
    height: 50,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
});

export default AdminDashboard;