import React, { useState, useMemo } from "react";
import {
  Text,
  TextInput,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEntryFormStore, EntryField } from "../../store/entryFormStore";
import { calculate } from "../../utils/calculations";
import api from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function AddEntryScreen() {
  const store = useEntryFormStore();
  const logout = useAuthStore((s) => s.logout);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const result = useMemo(
    () =>
      calculate({
        uber: store.uber,
        ola: store.ola,
        rapido: store.rapido,
        direct: store.direct,
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
      }),
    [
      store.uber, store.ola, store.rapido, store.direct,
      store.uberCash, store.olaCash, store.rapidoCash, store.directCash,
      store.gas, store.toll, store.otherExpense, store.tip,
      store.driveAllowance, store.commission,
    ]
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/entries", {
        date: store.date.toISOString(),
        uber: store.uber,
        ola: store.ola,
        rapido: store.rapido,
        direct: store.direct,
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
      });
      Alert.alert("Success", "Entry saved successfully!");
      store.reset();
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
        {summaryRow("50% Share", result.share)}
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
});
