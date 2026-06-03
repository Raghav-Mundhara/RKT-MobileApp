import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Text,
  TextInput,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEntryFormStore, EntryField } from "../../store/entryFormStore";
import { calculate } from "../../utils/calculations";
import api from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { Customer, CustomerTrip } from "../../types";

interface SelectedTrip {
  customerTripId: string;
  customerId: string;
  customerName: string;
  destination: string;
  fare: number;
}

export default function AddEntryScreen() {
  const store = useEntryFormStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer trips
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTrips, setSelectedTrips] = useState<SelectedTrip[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const { data } = await api.get<Customer[]>("/entries/customers");
      setCustomers(data);
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Sum of all customer trip fares added
  const customerTripTotal = useMemo(
    () => selectedTrips.reduce((acc, t) => acc + t.fare, 0),
    [selectedTrips]
  );

  const maintenanceFee = user?.maintenanceFee ?? 160;
  const sharePercent = user?.sharePercent ?? 50;

  const result = useMemo(
    () =>
      calculate({
        uber: store.uber,
        ola: store.ola,
        rapido: store.rapido,
        direct: store.direct + customerTripTotal,
        uberCash: store.uberCash,
        olaCash: store.olaCash,
        rapidoCash: store.rapidoCash,
        directCash: store.directCash,
        gas: store.gas,
        toll: store.toll,
        otherExpense: store.otherExpense,
        tip: store.tip,
        driveAllowance: store.driveAllowance,
        commission: store.commission,
        maintenanceFee,
        sharePercent,
      }),
    [
      store.uber, store.ola, store.rapido, store.direct,
      store.uberCash, store.olaCash, store.rapidoCash, store.directCash,
      store.gas, store.toll, store.otherExpense, store.tip,
      store.driveAllowance, store.commission,
      customerTripTotal, maintenanceFee, sharePercent,
    ]
  );

  const addTrip = (trip: CustomerTrip, customer: Customer) => {
    // Allow same trip multiple times (multiple runs in a day)
    setSelectedTrips((prev) => [
      ...prev,
      {
        customerTripId: trip.id,
        customerId: customer.id,
        customerName: customer.name,
        destination: trip.destination,
        fare: trip.fare,
      },
    ]);
    setShowCustomerModal(false);
  };

  const removeTrip = (index: number) => {
    setSelectedTrips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/entries", {
        date: store.date.toISOString(),
        uber: store.uber,
        ola: store.ola,
        rapido: store.rapido,
        direct: store.direct + customerTripTotal,
        uberCash: store.uberCash,
        olaCash: store.olaCash,
        rapidoCash: store.rapidoCash,
        directCash: store.directCash,
        gas: store.gas,
        toll: store.toll,
        otherExpense: store.otherExpense,
        tip: store.tip,
        driveAllowance: store.driveAllowance,
        commission: store.commission,
        trips: selectedTrips.map((t) => ({
          customerTripId: t.customerTripId,
          fare: t.fare,
        })),
      });
      Alert.alert("Success", "Entry saved successfully!");
      store.reset();
      setSelectedTrips([]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save entry"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = (label: string, field: EntryField) => (
    <View style={styles.row} key={field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="₹ 0"
        placeholderTextColor="#475569"
        keyboardType="numeric"
        value={store[field] ? String(store[field]) : ""}
        onChangeText={(val) =>
          store.setField(field, Number(val.replace(/[^0-9]/g, "")))
        }
      />
    </View>
  );

  const summaryRow = (label: string, value: number, highlight?: boolean) => (
    <View style={styles.summaryRow} key={label}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          highlight && { color: value >= 0 ? "#22c55e" : "#ef4444", fontWeight: "800" },
        ]}
      >
        ₹ {value.toLocaleString("en-IN")}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with logout */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Daily Entry</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateText}>{store.date.toDateString()}</Text>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={store.date}
            mode="date"
            display="default"
            onChange={(_, selectedDate) => {
              if (selectedDate) store.setDate(selectedDate);
              setShowPicker(false);
            }}
          />
        )}

        {/* Platform Earnings */}
        <Text style={styles.sectionTitle}>📊 Platform Earnings</Text>
        {renderRow("Uber Fare", "uber")}
        {renderRow("Uber Cash", "uberCash")}
        {renderRow("Ola Fare", "ola")}
        {renderRow("Ola Cash", "olaCash")}
        {renderRow("Rapido Fare", "rapido")}
        {renderRow("Rapido Cash", "rapidoCash")}
        {renderRow("Direct Fare", "direct")}
        {renderRow("Direct Cash", "directCash")}

        {/* Regular Customer Trips */}
        <Text style={styles.sectionTitle}>🧑‍💼 Regular Customer Trips</Text>

        {selectedTrips.length > 0 && (
          <View style={styles.selectedTripsContainer}>
            {selectedTrips.map((trip, index) => (
              <View key={index} style={styles.selectedTripRow}>
                <View style={styles.selectedTripInfo}>
                  <Text style={styles.selectedTripCustomer}>{trip.customerName}</Text>
                  <Text style={styles.selectedTripDest}>{trip.destination}</Text>
                </View>
                <Text style={styles.selectedTripFare}>₹{trip.fare}</Text>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeTrip(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.tripTotalRow}>
              <Text style={styles.tripTotalLabel}>Customer Trips Total</Text>
              <Text style={styles.tripTotalValue}>₹{customerTripTotal}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.addTripBtn}
          onPress={() => setShowCustomerModal(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color="#06b6d4" />
          <Text style={styles.addTripBtnText}>Add Customer Trip</Text>
        </TouchableOpacity>

        {/* Expenses */}
        <Text style={styles.sectionTitle}>💰 Expenses</Text>
        {renderRow("Gas / CNG", "gas")}
        {renderRow("Commission", "commission")}
        {renderRow("Toll", "toll")}
        {renderRow("Other Expenses", "otherExpense")}
        {renderRow("Tip", "tip")}
        {renderRow("Drive Allowance", "driveAllowance")}
      </View>

      {/* Live Calculation Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Settlement Preview</Text>
        {summaryRow("Total Fare", result.totalFare)}
        {summaryRow("Balance", result.balance)}
        {summaryRow(`${sharePercent}% Share`, result.share)}
        {summaryRow("Cash Received", result.totalCashReceived)}
        <View style={styles.divider} />
        {summaryRow("Cash Settlement", result.cashSettlement, true)}
        <Text style={styles.hint}>
          {result.cashSettlement > 0
            ? "💵 Driver pays owner"
            : result.cashSettlement < 0
            ? "💵 Owner pays driver"
            : "✅ Settled"}
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Save Entry</Text>
        )}
      </TouchableOpacity>

      {/* Customer Trip Selector Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer Trip</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {loadingCustomers ? (
              <View style={{ padding: 30, alignItems: "center" }}>
                <ActivityIndicator color="#06b6d4" />
              </View>
            ) : customers.length === 0 ? (
              <View style={{ padding: 30, alignItems: "center" }}>
                <Ionicons name="people-outline" size={48} color="#334155" />
                <Text style={styles.modalEmpty}>No regular customers configured</Text>
              </View>
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item: customer }) => (
                  <View style={styles.customerBlock}>
                    <TouchableOpacity
                      style={styles.customerBlockHeader}
                      onPress={() =>
                        setExpandedCustomerId(
                          expandedCustomerId === customer.id ? null : customer.id
                        )
                      }
                    >
                      <View style={styles.customerAvatarSmall}>
                        <Text style={styles.customerAvatarText}>
                          {customer.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.customerBlockName}>{customer.name}</Text>
                      <Ionicons
                        name={expandedCustomerId === customer.id ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>

                    {expandedCustomerId === customer.id && (
                      <View style={styles.tripList}>
                        {(customer.trips || []).filter((t) => t.isActive).length === 0 ? (
                          <Text style={styles.noTripsText}>No active trips configured</Text>
                        ) : (
                          (customer.trips || [])
                            .filter((t) => t.isActive)
                            .map((trip) => (
                              <TouchableOpacity
                                key={trip.id}
                                style={styles.tripOption}
                                onPress={() => addTrip(trip, customer)}
                              >
                                <View style={styles.tripOptionInfo}>
                                  <Ionicons name="navigate-outline" size={16} color="#06b6d4" />
                                  <Text style={styles.tripOptionDest}>{trip.destination}</Text>
                                </View>
                                <View style={styles.tripOptionRight}>
                                  <Text style={styles.tripOptionFare}>₹{trip.fare}</Text>
                                  <Ionicons name="add-circle" size={22} color="#06b6d4" />
                                </View>
                              </TouchableOpacity>
                            ))
                        )}
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
  },
  logoutBtn: {
    padding: 8,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 16,
    marginBottom: 10,
  },
  row: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    width: 120,
    fontSize: 14,
    color: "#94a3b8",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    fontSize: 16,
    color: "#f8fafc",
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0f172a",
  },
  dateText: {
    fontSize: 16,
    color: "#f8fafc",
  },
  // Customer trips
  selectedTripsContainer: {
    backgroundColor: "#0f172a50",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  selectedTripRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  selectedTripInfo: {
    flex: 1,
  },
  selectedTripCustomer: {
    color: "#06b6d4",
    fontSize: 12,
    fontWeight: "700",
  },
  selectedTripDest: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  selectedTripFare: {
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "800",
    marginHorizontal: 12,
  },
  removeBtn: {
    padding: 4,
  },
  tripTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
  },
  tripTotalLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  tripTotalValue: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "800",
  },
  addTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#06b6d415",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#06b6d430",
    borderStyle: "dashed",
  },
  addTripBtnText: {
    color: "#06b6d4",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  summaryValue: {
    fontSize: 14,
    color: "#f8fafc",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 10,
  },
  hint: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  // Customer selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  modalEmpty: {
    color: "#64748b",
    fontSize: 15,
    marginTop: 12,
    textAlign: "center",
  },
  customerBlock: {
    backgroundColor: "#0f172a40",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  customerBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  customerAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  customerBlockName: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  tripList: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  noTripsText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
  },
  tripOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  tripOptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tripOptionDest: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },
  tripOptionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tripOptionFare: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
  },
});
