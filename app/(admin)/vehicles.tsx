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
} from "react-native";
import api from "../../services/api";
import { Vehicle, DriverListItem } from "../../types";
import { Ionicons } from "@expo/vector-icons";

const FUEL_TYPE_COLORS: Record<string, string> = {
  CNG: "#22c55e",
  PETROL: "#f59e0b",
  DIESEL: "#64748b",
  ELECTRIC: "#3b82f6",
};

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    numberPlate: "",
    model: "",
    fuelType: "CNG",
  });
  const [creating, setCreating] = useState(false);
  const [driverSelectModal, setDriverSelectModal] = useState<Vehicle | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [vehiclesRes, driversRes] = await Promise.all([
        api.get<Vehicle[]>("/admin/vehicles"),
        api.get<DriverListItem[]>("/admin/drivers"),
      ]);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error("Fetch vehicles error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createVehicle = async () => {
    if (!form.numberPlate) {
      Alert.alert("Error", "Number plate is required");
      return;
    }
    setCreating(true);
    try {
      await api.post("/admin/vehicles", form);
      Alert.alert("Success", "Vehicle added");
      setShowModal(false);
      setForm({ numberPlate: "", model: "", fuelType: "CNG" });
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const assignDriver = (vehicle: Vehicle) => {
    setDriverSelectModal(vehicle);
  };

  const doAssign = async (vehicleId: string, driverId: string | null) => {
    try {
      await api.put(`/admin/vehicles/${vehicleId}/assign`, {
        assignedDriverId: driverId,
      });
      fetchData();
    } catch (error) {
      Alert.alert("Error", "Failed to assign");
    } finally {
      setDriverSelectModal(null);
    }
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.plateArea}>
          <Ionicons name="car-sport" size={24} color="#f8fafc" />
          <Text style={styles.plate}>{item.numberPlate}</Text>
        </View>
        <View
          style={[
            styles.fuelBadge,
            {
              backgroundColor:
                (FUEL_TYPE_COLORS[item.fuelType] || "#64748b") + "20",
            },
          ]}
        >
          <Text
            style={{
              color: FUEL_TYPE_COLORS[item.fuelType] || "#64748b",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {item.fuelType}
          </Text>
        </View>
      </View>

      {item.model && (
        <Text style={styles.modelText}>{item.model}</Text>
      )}

      <TouchableOpacity
        style={styles.assignBtn}
        onPress={() => assignDriver(item)}
      >
        <Ionicons name="person-outline" size={16} color="#8b5cf6" />
        <Text style={styles.assignText}>
          {item.assignedDriver
            ? `Driver: ${item.assignedDriver.name}`
            : "Assign Driver"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor="#8b5cf6"
          />
        }
        ListHeaderComponent={
          <Text style={styles.headerText}>
            {vehicles.length} vehicles
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="car-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No vehicles yet</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Driver Select Modal */}
      <Modal visible={!!driverSelectModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDriverSelectModal(null)}>
          <View style={styles.driverListContainer}>
            <Text style={styles.modalTitle}>Choose a Driver</Text>
            <FlatList
              data={drivers.filter((d) => d.isActive)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{height: 1, backgroundColor: "#334155"}} />}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.driverListOption}
                  onPress={() => driverSelectModal && doAssign(driverSelectModal.id, item.id)}
                >
                  <Ionicons name="person" size={20} color="#8b5cf6" />
                  <Text style={styles.driverListText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity 
                  style={[styles.driverListOption, { borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 16, marginBottom: 8 }]}
                  onPress={() => driverSelectModal && doAssign(driverSelectModal.id, null)}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  <Text style={[styles.driverListText, { color: "#ef4444" }]}>Unassign Vehicle</Text>
                </TouchableOpacity>
              }
            />
            <TouchableOpacity style={[styles.cancelBtn, { flex: undefined, marginTop: 16 }]} onPress={() => setDriverSelectModal(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Vehicle Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Number Plate (e.g. KA-01-AB-1234)"
              placeholderTextColor="#64748b"
              value={form.numberPlate}
              onChangeText={(v) =>
                setForm({ ...form, numberPlate: v.toUpperCase() })
              }
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Model (optional)"
              placeholderTextColor="#64748b"
              value={form.model}
              onChangeText={(v) => setForm({ ...form, model: v })}
            />

            {/* Fuel Type Selector */}
            <View style={styles.fuelRow}>
              {["CNG", "PETROL", "DIESEL", "ELECTRIC"].map((ft) => (
                <TouchableOpacity
                  key={ft}
                  style={[
                    styles.fuelOption,
                    form.fuelType === ft && {
                      backgroundColor: FUEL_TYPE_COLORS[ft] + "30",
                      borderColor: FUEL_TYPE_COLORS[ft],
                    },
                  ]}
                  onPress={() => setForm({ ...form, fuelType: ft })}
                >
                  <Text
                    style={[
                      styles.fuelOptionText,
                      form.fuelType === ft && {
                        color: FUEL_TYPE_COLORS[ft],
                      },
                    ]}
                  >
                    {ft}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, creating && { opacity: 0.6 }]}
                onPress={createVehicle}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createText}>Add</Text>
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  plateArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  plate: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: 1,
  },
  fuelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modelText: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 10,
    marginLeft: 34,
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8b5cf620",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  assignText: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
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
  fuelRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  fuelOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  fuelOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
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
    backgroundColor: "#8b5cf6",
    alignItems: "center",
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  driverListContainer: {
    backgroundColor: "#1e293b",
    maxHeight: "70%",
    minHeight: "40%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  driverListOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  driverListText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
});
