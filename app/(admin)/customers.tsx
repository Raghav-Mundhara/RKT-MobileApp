import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import api from "../../services/api";
import { Customer, CustomerTrip, Timeframe } from "../../types";
import { Ionicons } from "@expo/vector-icons";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Customer modal & form
  const [showCustModal, setShowCustModal] = useState(false);
  const [custName, setCustName] = useState("");
  const [savingCust, setSavingCust] = useState(false);

  // Selected customer for details (Trips + Analytics Dashboard)
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"trips" | "dashboard">("trips");

  // Trip form (inside detail view)
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripForm, setTripForm] = useState({
    destination: "",
    fare: "",
  });
  const [savingTrip, setSavingTrip] = useState(false);

  // Customer Analytics Dashboard state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<Timeframe>("month");
  const [analyticsData, setAnalyticsData] = useState<{
    summary: { totalFare: number; tripCount: number; averageFare: number };
    recentTrips: { id: string; date: string; driverName: string; destination: string; fare: number }[];
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchCustomers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (customers.length === 0) setLoading(true);

      const { data } = await api.get<Customer[]>("/admin/customers");
      setCustomers(data);

      // Keep selected customer details in sync
      if (selectedCust) {
        const updated = data.find(c => c.id === selectedCust.id);
        if (updated) setSelectedCust(updated);
      }
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customers, selectedCust]);

  const fetchCustomerAnalytics = useCallback(async (customerId: string, tf: Timeframe) => {
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get(`/analytics/customers/${customerId}`, {
        params: { timeframe: tf }
      });
      setAnalyticsData({
        summary: data.summary,
        recentTrips: data.recentTrips,
      });
    } catch (error) {
      console.error("Fetch customer analytics error:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Whenever selected customer or timeframe changes, load analytics if dashboard subtab active
  useEffect(() => {
    if (selectedCust && activeSubTab === "dashboard") {
      fetchCustomerAnalytics(selectedCust.id, analyticsTimeframe);
    }
  }, [selectedCust?.id, activeSubTab, analyticsTimeframe]);

  const createCustomer = async () => {
    if (!custName.trim()) {
      Alert.alert("Error", "Customer name is required");
      return;
    }
    setSavingCust(true);
    try {
      await api.post("/admin/customers", { name: custName });
      Alert.alert("Success", "Customer added");
      setCustName("");
      setShowCustModal(false);
      fetchCustomers();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed");
    } finally {
      setSavingCust(false);
    }
  };

  const toggleCustomerActive = async (cust: Customer) => {
    try {
      await api.put(`/admin/customers/${cust.id}`, {
        isActive: !cust.isActive,
      });
      fetchCustomers();
    } catch (error) {
      Alert.alert("Error", "Failed to update customer status");
    }
  };

  const addTrip = async () => {
    if (!selectedCust) return;
    if (!tripForm.destination.trim() || !tripForm.fare) {
      Alert.alert("Error", "Destination and fare are required");
      return;
    }
    setSavingTrip(true);
    try {
      await api.post(`/admin/customers/${selectedCust.id}/trips`, {
        destination: tripForm.destination,
        fare: Number(tripForm.fare) || 0,
      });
      Alert.alert("Success", "Trip added");
      setTripForm({ destination: "", fare: "" });
      setShowTripModal(false);
      fetchCustomers();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed");
    } finally {
      setSavingTrip(false);
    }
  };

  const toggleTripActive = async (trip: CustomerTrip) => {
    if (!selectedCust) return;
    try {
      await api.put(`/admin/customers/trips/${trip.id}`, {
        isActive: !trip.isActive,
      });
      fetchCustomers();
    } catch (error) {
      Alert.alert("Error", "Failed to update trip status");
    }
  };

  const deleteTrip = async (trip: CustomerTrip) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete trip to "${trip.destination}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/admin/customers/trips/${trip.id}`);
              fetchCustomers();
            } catch (error) {
              Alert.alert("Error", "Failed to delete trip");
            }
          },
        },
      ]
    );
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedCust(item);
        setActiveSubTab("trips");
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>Trips configured: {item.trips?.length || 0}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statusBtn,
            { backgroundColor: item.isActive ? "#22c55e20" : "#ef444420" },
          ]}
          onPress={() => toggleCustomerActive(item)}
        >
          <Text
            style={{
              color: item.isActive ? "#22c55e" : "#ef4444",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && customers.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCustomers(true)}
            tintColor="#8b5cf6"
          />
        }
        ListHeaderComponent={
          <Text style={styles.headerText}>
            {customers.length} regular customers
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No customers added yet</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCustModal(true)}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Customer Modal */}
      <Modal visible={showCustModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Customer</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name"
              placeholderTextColor="#64748b"
              value={custName}
              onChangeText={setCustName}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCustModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, savingCust && { opacity: 0.6 }]}
                onPress={createCustomer}
                disabled={savingCust}
              >
                {savingCust ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Detail View (Trips & Analytics Dashboard) */}
      <Modal visible={!!selectedCust} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "90%", paddingBottom: 0 }]}>
            <View style={styles.detailHeaderRow}>
              <View>
                <Text style={styles.detailTitle}>{selectedCust?.name}</Text>
                <Text style={styles.detailSubtitle}>Regular Customer Dashboard</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCust(null);
                  setAnalyticsData(null);
                }}
                style={styles.closeDetailBtn}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Sub Tabs */}
            <View style={styles.subTabRow}>
              <TouchableOpacity
                style={[styles.subTab, activeSubTab === "trips" && styles.subTabActive]}
                onPress={() => setActiveSubTab("trips")}
              >
                <Text style={[styles.subTabText, activeSubTab === "trips" && styles.subTabTextActive]}>
                  Trips & Fixed Fares
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, activeSubTab === "dashboard" && styles.subTabActive]}
                onPress={() => setActiveSubTab("dashboard")}
              >
                <Text style={[styles.subTabText, activeSubTab === "dashboard" && styles.subTabTextActive]}>
                  Performance Summary
                </Text>
              </TouchableOpacity>
            </View>

            {activeSubTab === "trips" ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.addTripBtn}
                  onPress={() => setShowTripModal(true)}
                >
                  <Ionicons name="add" size={18} color="#06b6d4" />
                  <Text style={styles.addTripText}>Add Trip / Fare Configuration</Text>
                </TouchableOpacity>

                <FlatList
                  data={selectedCust?.trips || []}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 30 }}
                  renderItem={({ item }) => (
                    <View style={styles.tripCard}>
                      <View style={styles.tripCardInfo}>
                        <Text style={styles.tripDest}>{item.destination}</Text>
                        <Text style={styles.tripFare}>Fixed Fare: ₹{item.fare}</Text>
                      </View>
                      <View style={styles.tripActions}>
                        <TouchableOpacity
                          style={[
                            styles.tripStatusBadge,
                            { backgroundColor: item.isActive ? "#22c55e20" : "#ef444420" }
                          ]}
                          onPress={() => toggleTripActive(item)}
                        >
                          <Text style={{ color: item.isActive ? "#22c55e" : "#ef4444", fontSize: 11, fontWeight: "700" }}>
                            {item.isActive ? "Active" : "Disabled"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.tripDeleteBtn}
                          onPress={() => deleteTrip(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={[styles.center, { backgroundColor: "transparent", paddingTop: 40 }]}>
                      <Ionicons name="navigate-outline" size={48} color="#334155" />
                      <Text style={styles.emptyText}>No trips configured for this customer</Text>
                    </View>
                  }
                />
              </View>
            ) : (
              // Performance Dashboard View
              <View style={{ flex: 1 }}>
                {/* Analytics Timeframe Selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.timeframeRow}
                >
                  {TIMEFRAMES.map((tf) => (
                    <TouchableOpacity
                      key={tf.value}
                      style={[
                        styles.tfBtn,
                        analyticsTimeframe === tf.value && styles.tfBtnActive,
                      ]}
                      onPress={() => setAnalyticsTimeframe(tf.value)}
                    >
                      <Text
                        style={[
                          styles.tfText,
                          analyticsTimeframe === tf.value && styles.tfTextActive,
                        ]}
                      >
                        {tf.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {loadingAnalytics ? (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#06b6d4" />
                  </View>
                ) : (
                  <FlatList
                    data={analyticsData?.recentTrips || []}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListHeaderComponent={
                      <>
                        {/* Summary Grid */}
                        <View style={styles.summaryGrid}>
                          <View style={styles.summaryBox}>
                            <Text style={styles.summaryBoxLabel}>Total Revenue</Text>
                            <Text style={styles.summaryBoxValue}>
                              ₹{(analyticsData?.summary.totalFare || 0).toLocaleString("en-IN")}
                            </Text>
                          </View>
                          <View style={styles.summaryBox}>
                            <Text style={styles.summaryBoxLabel}>Trips Completed</Text>
                            <Text style={styles.summaryBoxValue}>
                              {analyticsData?.summary.tripCount || 0}
                            </Text>
                          </View>
                          <View style={styles.summaryBox}>
                            <Text style={styles.summaryBoxLabel}>Avg. Trip Fare</Text>
                            <Text style={styles.summaryBoxValue}>
                              ₹{(analyticsData?.summary.averageFare || 0).toLocaleString("en-IN")}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.recentTripsTitle}>Recent Trips List</Text>
                      </>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.historyCard}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyDest}>{item.destination}</Text>
                          <Text style={styles.historyFare}>₹{item.fare}</Text>
                        </View>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyMetaText}>
                            Driver: {item.driverName}
                          </Text>
                          <Text style={styles.historyMetaText}>
                            Date: {new Date(item.date).toLocaleDateString("en-IN")}
                          </Text>
                        </View>
                      </View>
                    )}
                    ListEmptyComponent={
                      <View style={[styles.center, { backgroundColor: "transparent", paddingTop: 40 }]}>
                        <Ionicons name="time-outline" size={48} color="#334155" />
                        <Text style={styles.emptyText}>No recent trips recorded in this period</Text>
                      </View>
                    }
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Trip Modal */}
      <Modal visible={showTripModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Trip & Fixed Fare</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Destination (e.g. City Airport)"
              placeholderTextColor="#64748b"
              value={tripForm.destination}
              onChangeText={(v) => setTripForm({ ...tripForm, destination: v })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Fixed Fare (₹)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={tripForm.fare}
              onChangeText={(v) => setTripForm({ ...tripForm, fare: v })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowTripModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: "#06b6d4" }, savingTrip && { opacity: 0.6 }]}
                onPress={addTrip}
                disabled={savingTrip}
              >
                {savingTrip ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createText}>Add Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingTop: 60,
  },
  headerText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  phone: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#f8fafc",
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#334155",
    alignItems: "center",
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "600",
  },
  createBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#06b6d4",
    alignItems: "center",
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // Customer details styling
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  detailSubtitle: {
    fontSize: 13,
    color: "#06b6d4",
    fontWeight: "600",
    marginTop: 2,
  },
  closeDetailBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#33415550",
  },
  subTabRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 4,
    borderRadius: 10,
    marginBottom: 18,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  subTabText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  subTabTextActive: {
    color: "#f8fafc",
  },
  addTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#06b6d415",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#06b6d430",
  },
  addTripText: {
    color: "#06b6d4",
    fontSize: 14,
    fontWeight: "700",
  },
  tripCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a50",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  tripCardInfo: {
    flex: 1,
  },
  tripDest: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  tripFare: {
    color: "#06b6d4",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  tripActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tripStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tripDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#ef444410",
  },
  // Timeframe selector
  timeframeRow: {
    marginBottom: 16,
    flexGrow: 0,
  },
  tfBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
  },
  tfBtnActive: {
    backgroundColor: "#06b6d4",
  },
  tfText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
  tfTextActive: {
    color: "#fff",
  },
  // Summary boxes
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#0f172a50",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  summaryBoxLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  summaryBoxValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  recentTripsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: "#0f172a30",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#06b6d4",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDest: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  historyFare: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
  },
  historyMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  historyMetaText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
});
