import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import api from "../../services/api";
import { DriverAnalytics, Timeframe } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
];

const webInputStyle = {
  backgroundColor: "#0f172a",
  color: "#f8fafc",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#334155",
  padding: "10px",
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
};

export default function DriverDashboard() {
  const [data, setData] = useState<DriverAnalytics | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom date range state
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchData = async (tf: Timeframe, isRefresh = false, start = startDate, end = endDate) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (!data) setLoading(true);

      const params: any = { timeframe: tf };
      if (tf === "custom") {
        params.startDate = start.toISOString().split("T")[0];
        params.endDate = end.toISOString().split("T")[0];
      }

      const { data: res } = await api.get<DriverAnalytics>("/analytics/my", {
        params,
      });
      setData(res);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(timeframe, false, startDate, endDate);
    }, [timeframe, startDate, endDate])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const summary = data?.summary;
  const platforms = data?.platformBreakdown;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(timeframe, true)}
          tintColor="#3b82f6"
        />
      }
    >
      <Text style={styles.title}>My Performance</Text>

      {/* Timeframe Selector */}
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
              timeframe === tf.value && styles.tfBtnActive,
            ]}
            onPress={() => setTimeframe(tf.value)}
          >
            <Text
              style={[
                styles.tfText,
                timeframe === tf.value && styles.tfTextActive,
              ]}
            >
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom Date Range Picker */}
      {timeframe === "custom" && (
        <View style={styles.customDateContainer}>
          <View style={styles.datePickerCol}>
            <Text style={styles.datePickerLabel}>Start Date</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={startDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setStartDate(d);
                    fetchData("custom", false, d, endDate);
                  }
                }}
                style={webInputStyle}
              />
            ) : (
              <TouchableOpacity
                style={styles.customDateBtn}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                <Text style={styles.customDateBtnText}>{startDate.toLocaleDateString("en-IN")}</Text>
              </TouchableOpacity>
            )}
            {Platform.OS !== "web" && showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) {
                    setStartDate(selectedDate);
                    fetchData("custom", false, selectedDate, endDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.datePickerCol}>
            <Text style={styles.datePickerLabel}>End Date</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={endDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setEndDate(d);
                    fetchData("custom", false, startDate, d);
                  }
                }}
                style={webInputStyle}
              />
            ) : (
              <TouchableOpacity
                style={styles.customDateBtn}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                <Text style={styles.customDateBtnText}>{endDate.toLocaleDateString("en-IN")}</Text>
              </TouchableOpacity>
            )}
            {Platform.OS !== "web" && showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) {
                    setEndDate(selectedDate);
                    fetchData("custom", false, startDate, selectedDate);
                  }
                }}
              />
            )}
          </View>
        </View>
      )}

      {/* Running Balance Banner */}
      {data && (
        <View style={styles.runningBalanceCard}>
          <View>
            <Text style={styles.runningBalanceLabel}>Unsettled Balance</Text>
            <Text style={{
              ...styles.runningBalanceValue, 
              color: data.runningBalance >= 0 ? "#ef4444" :"#22c55e"
            }}>
              {data.runningBalance >= 0 ? `Pay Owner: ₹${data.runningBalance}` : `Receive: ₹${Math.abs(data.runningBalance)}`}
            </Text>
          </View>
          <Ionicons 
            name="wallet" 
            size={40} 
            color={data.runningBalance >= 0 ?  "#ef4444":"#22c55e" } 
            style={{ opacity: 0.8 }} 
          />
        </View>
      )}

      {/* Summary Cards */}
      <View style={styles.grid}>
        <View style={[styles.statCard, { borderLeftColor: "#3b82f6" }]}>
          <Ionicons name="cash-outline" size={24} color="#3b82f6" />
          <Text style={styles.statLabel}>Total Fare</Text>
          <Text style={styles.statValue}>
            ₹{(summary?.totalFare || 0).toLocaleString("en-IN")}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#22c55e" }]}>
          <Ionicons name="trending-up" size={24} color="#22c55e" />
          <Text style={styles.statLabel}>My Share</Text>
          <Text style={styles.statValue}>
            ₹{(summary?.share || 0).toLocaleString("en-IN")}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}>
          <Ionicons name="wallet-outline" size={24} color="#f59e0b" />
          <Text style={styles.statLabel}>Cash Received</Text>
          <Text style={styles.statValue}>
            ₹{(summary?.totalCashReceived || 0).toLocaleString("en-IN")}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#8b5cf6" }]}>
          <Ionicons name="swap-horizontal" size={24} color="#8b5cf6" />
          <Text style={styles.statLabel}>Settlement</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  (summary?.cashSettlement || 0) >= 0
                    ? "#ef4444"
                    : "#22c55e",
              },
            ]}
          >
            ₹{(summary?.cashSettlement || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* Extra Stats */}
      <View style={styles.extraRow}>
        <View style={styles.extraCard}>
          <Ionicons name="flame-outline" size={20} color="rgba(249, 115, 22, 1)" />
          <Text style={styles.extraLabel}>Gas</Text>
          <Text style={styles.extraValue}>
            ₹{(summary?.totalGas || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.extraCard}>
          <Ionicons name="navigate-outline" size={20} color="#06b6d4" />
          <Text style={styles.extraLabel}>Toll</Text>
          <Text style={styles.extraValue}>
            ₹{(summary?.totalToll || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.extraCard}>
          <Ionicons name="document-text-outline" size={20} color="#a78bfa" />
          <Text style={styles.extraLabel}>Entries</Text>
          <Text style={styles.extraValue}>{summary?.entryCount || 0}</Text>
        </View>
      </View>

      {/* Platform Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Platform Breakdown</Text>
        {platforms && (
          <>
            {renderPlatformBar("Uber", platforms.uber, "#000", summary?.totalFare)}
            {renderPlatformBar("Ola", platforms.ola, "#fbbf24", summary?.totalFare)}
            {renderPlatformBar("Rapido", platforms.rapido, "#f97316", summary?.totalFare)}
            {renderPlatformBar("Direct", platforms.direct, "#22c55e", summary?.totalFare)}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function renderPlatformBar(
  name: string,
  value: number,
  color: string,
  total?: number
) {
  const pct = total && total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.barRow} key={name}>
      <Text style={styles.barLabel}>{name}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(pct, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.barValue}>₹{value.toLocaleString("en-IN")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 16,
  },
  timeframeRow: {
    marginBottom: 20,
    flexGrow: 0,
  },
  tfBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    marginRight: 8,
  },
  tfBtnActive: {
    backgroundColor: "#3b82f6",
  },
  tfText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 14,
  },
  tfTextActive: {
    color: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginTop: 4,
  },
  extraRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  extraCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  extraLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  extraValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 14,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  barLabel: {
    width: 56,
    fontSize: 13,
    color: "#94a3b8",
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#0f172a",
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  barValue: {
    width: 70,
    fontSize: 13,
    color: "#f8fafc",
    fontWeight: "600",
    textAlign: "right",
  },
  runningBalanceCard: {
    backgroundColor: "#1e293b",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  runningBalanceLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  runningBalanceValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  customDateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  datePickerCol: {
    flex: 1,
  },
  datePickerLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  customDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  customDateBtnText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
});
