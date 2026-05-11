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
import { DriverListItem } from "../../types";
import { Ionicons } from "@expo/vector-icons";

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    commissionPercent: "0",
  });
  const [creating, setCreating] = useState(false);

  const fetchDrivers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await api.get<DriverListItem[]>("/admin/drivers");
      setDrivers(data);
    } catch (error) {
      console.error("Fetch drivers error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const createDriver = async () => {
    if (!form.name || !form.phone || !form.password) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    setCreating(true);
    try {
      await api.post("/admin/drivers", {
        name: form.name,
        phone: form.phone,
        password: form.password,
        commissionPercent: Number(form.commissionPercent) || 0,
      });
      Alert.alert("Success", "Driver created");
      setShowModal(false);
      setForm({ name: "", phone: "", password: "", commissionPercent: "0" });
      fetchDrivers();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (driver: DriverListItem) => {
    try {
      await api.put(`/admin/drivers/${driver.id}`, {
        isActive: !driver.isActive,
      });
      fetchDrivers();
    } catch (error) {
      Alert.alert("Error", "Failed to update driver");
    }
  };

  const renderDriver = ({ item }: { item: DriverListItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statusBtn,
            { backgroundColor: item.isActive ? "#22c55e20" : "#ef444420" },
          ]}
          onPress={() => toggleActive(item)}
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
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          Commission: {item.commissionPercent}%
        </Text>
        <Text style={styles.meta}>
          Entries: {item._count.entries}
        </Text>
        <Text style={styles.meta}>
          Since: {new Date(item.createdAt).toLocaleDateString("en-IN")}
        </Text>
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
        data={drivers}
        renderItem={renderDriver}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDrivers(true)}
            tintColor="#8b5cf6"
          />
        }
        ListHeaderComponent={
          <Text style={styles.headerText}>
            {drivers.length} drivers
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Driver Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Driver</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#64748b"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
              maxLength={10}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Commission %"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={form.commissionPercent}
              onChangeText={(v) =>
                setForm({ ...form, commissionPercent: v })
              }
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, creating && { opacity: 0.6 }]}
                onPress={createDriver}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createText}>Create</Text>
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
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8b5cf6",
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
  metaRow: {
    flexDirection: "row",
    gap: 16,
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
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
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    marginTop: 8,
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
});
