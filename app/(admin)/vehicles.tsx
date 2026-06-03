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

  // Vehicle service states
  const [selectedVehicleForServices, setSelectedVehicleForServices] = useState<Vehicle | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    description: "",
    cost: "",
    odometer: "",
    notes: "",
    serviceDate: new Date().toISOString().split("T")[0],
  });
  const [addingService, setAddingService] = useState(false);

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

      // Keep service modal vehicle reference up to date if open
      if (selectedVehicleForServices) {
        const updated = vehiclesRes.data.find(v => v.id === selectedVehicleForServices.id);
        if (updated) setSelectedVehicleForServices(updated);
      }
    } catch (error) {
      console.error("Fetch vehicles error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedVehicleForServices]);

  useEffect(() => {
    fetchData();
  }, []);

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

  const openServices = (vehicle: Vehicle) => {
    setSelectedVehicleForServices(vehicle);
    setShowServiceModal(true);
    setShowAddServiceForm(false);
    setServiceForm({
      description: "",
      cost: "",
      odometer: "",
      notes: "",
      serviceDate: new Date().toISOString().split("T")[0],
    });
  };

  const addServiceRecord = async () => {
    if (!selectedVehicleForServices) return;
    if (!serviceForm.description || !serviceForm.cost) {
      Alert.alert("Error", "Description and cost are required");
      return;
    }
    setAddingService(true);
    try {
      await api.post(`/admin/vehicles/${selectedVehicleForServices.id}/services`, {
        description: serviceForm.description,
        cost: Number(serviceForm.cost) || 0,
        odometer: serviceForm.odometer ? Number(serviceForm.odometer) : null,
        notes: serviceForm.notes || null,
        serviceDate: serviceForm.serviceDate,
      });
      Alert.alert("Success", "Service record added");
      setServiceForm({
        description: "",
        cost: "",
        odometer: "",
        notes: "",
        serviceDate: new Date().toISOString().split("T")[0],
      });
      setShowAddServiceForm(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to add service record");
    } finally {
      setAddingService(false);
    }
  };

  const deleteServiceRecord = async (serviceId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this service record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/admin/vehicles/services/${serviceId}`);
              fetchData();
            } catch (error) {
              Alert.alert("Error", "Failed to delete service record");
            }
          },
        },
      ]
    );
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

      <View style={styles.actionBtnRow}>
        <TouchableOpacity
          style={[styles.assignBtn, { flex: 1.2 }]}
          onPress={() => assignDriver(item)}
        >
          <Ionicons name="person-outline" size={16} color="#8b5cf6" />
          <Text style={styles.assignText} numberOfLines={1}>
            {item.assignedDriver
              ? `Driver: ${item.assignedDriver.name}`
              : "Assign Driver"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.serviceBtn, { flex: 1, marginLeft: 10 }]}
          onPress={() => openServices(item)}
        >
          <Ionicons name="construct-outline" size={16} color="#06b6d4" />
          <Text style={styles.serviceBtnText} numberOfLines={1}>
            Services ({item.services?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>
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

      {/* Service History Modal */}
      <Modal visible={showServiceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "80%", paddingBottom: 0 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Services: {selectedVehicleForServices?.numberPlate}
              </Text>
              <TouchableOpacity
                onPress={() => setShowServiceModal(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {showAddServiceForm ? (
              <View style={styles.serviceFormContainer}>
                <Text style={styles.subFormTitle}>Add Service Record</Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Service Date (YYYY-MM-DD)"
                  placeholderTextColor="#64748b"
                  value={serviceForm.serviceDate}
                  onChangeText={(v) => setServiceForm({ ...serviceForm, serviceDate: v })}
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Description (e.g. Engine Oil Change)"
                  placeholderTextColor="#64748b"
                  value={serviceForm.description}
                  onChangeText={(v) => setServiceForm({ ...serviceForm, description: v })}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Cost (₹)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={serviceForm.cost}
                    onChangeText={(v) => setServiceForm({ ...serviceForm, cost: v })}
                  />
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Odometer (km) - optional"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={serviceForm.odometer}
                    onChangeText={(v) => setServiceForm({ ...serviceForm, odometer: v })}
                  />
                </View>

                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  placeholder="Notes (optional)"
                  placeholderTextColor="#64748b"
                  multiline
                  value={serviceForm.notes}
                  onChangeText={(v) => setServiceForm({ ...serviceForm, notes: v })}
                />

                <View style={[styles.modalBtnRow, { marginTop: 4 }]}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddServiceForm(false)}
                  >
                    <Text style={styles.cancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: "#06b6d4" }, addingService && { opacity: 0.6 }]}
                    onPress={addServiceRecord}
                    disabled={addingService}
                  >
                    {addingService ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.createText}>Save Record</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={styles.serviceSummaryRow}>
                  <Text style={styles.summaryCostLabel}>Total Spent:</Text>
                  <Text style={styles.summaryCostValue}>
                    ₹{(selectedVehicleForServices?.services?.reduce((acc, curr) => acc + curr.cost, 0) || 0).toLocaleString("en-IN")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addRecordBtn}
                  onPress={() => setShowAddServiceForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#06b6d4" />
                  <Text style={styles.addRecordText}>Add Service Record</Text>
                </TouchableOpacity>

                <FlatList
                  data={selectedVehicleForServices?.services || []}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  renderItem={({ item }) => (
                    <View style={styles.serviceCard}>
                      <View style={styles.serviceCardHeader}>
                        <Text style={styles.serviceDesc}>{item.description}</Text>
                        <TouchableOpacity
                          style={styles.deleteServiceBtn}
                          onPress={() => deleteServiceRecord(item.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.serviceCardMetaRow}>
                        <Text style={styles.serviceCardMetaText}>
                          Date: {new Date(item.serviceDate).toLocaleDateString("en-IN")}
                        </Text>
                        <Text style={styles.serviceCardMetaText}>
                          Cost: ₹{item.cost.toLocaleString("en-IN")}
                        </Text>
                        {item.odometer && (
                          <Text style={styles.serviceCardMetaText}>
                            Odo: {item.odometer.toLocaleString()} km
                          </Text>
                        )}
                      </View>
                      {item.notes && (
                        <Text style={styles.serviceNotesText}>Notes: {item.notes}</Text>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={[styles.center, { backgroundColor: "transparent", paddingTop: 40 }]}>
                      <Ionicons name="construct-outline" size={48} color="#334155" />
                      <Text style={styles.emptyText}>No service records yet</Text>
                    </View>
                  }
                />
              </View>
            )}
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
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  serviceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#06b6d420",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  serviceBtnText: {
    color: "#06b6d4",
    fontSize: 14,
    fontWeight: "600",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeModalBtn: {
    padding: 4,
  },
  serviceFormContainer: {
    paddingBottom: 20,
  },
  subFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06b6d4",
    marginBottom: 16,
  },
  serviceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a50",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  summaryCostLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCostValue: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
  },
  addRecordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#06b6d4",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addRecordText: {
    color: "#06b6d4",
    fontSize: 14,
    fontWeight: "700",
  },
  serviceCard: {
    backgroundColor: "#0f172a50",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#06b6d4",
  },
  serviceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceDesc: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  deleteServiceBtn: {
    padding: 4,
  },
  serviceCardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  serviceCardMetaText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  serviceNotesText: {
    color: "#94a3b8",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
    backgroundColor: "#1e293b50",
    padding: 6,
    borderRadius: 6,
  },
});
