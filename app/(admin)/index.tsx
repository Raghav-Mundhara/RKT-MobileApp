import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import api from "../../services/api";
import { OverviewAnalytics, Timeframe } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useFocusEffect } from "expo-router";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  const fetchData = async (tf: Timeframe, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (!data) setLoading(true); // only show loading indicator if no data yet

      const { data: res } = await api.get<OverviewAnalytics>(
        "/analytics/overview",
        { params: { timeframe: tf } }
      );
      setData(res);
    } catch (error) {
      console.error("Admin dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(timeframe);
    }, [timeframe])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const s = data?.summary;
  const p = data?.platformBreakdown;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(timeframe, true)}
          tintColor="#8b5cf6"
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Fleet Overview</Text>
          <Text style={styles.subtitle}>Analytics & Earnings</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Timeframe Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tfRow}
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

      {/* Fleet Unsettled Balance Banner */}
      {data && (
        <View style={styles.runningBalanceCard}>
          <View>
            <Text style={styles.runningBalanceLabel}>Fleet Unsettled Balance</Text>
            <Text style={{
              ...styles.runningBalanceValue, 
              color: data.runningBalance >= 0 ? "#22c55e" : "#ef4444"
            }}>
              {data.runningBalance >= 0 ? `Receive: ₹${data.runningBalance}` : `Pay Out: ₹${Math.abs(data.runningBalance)}`}
            </Text>
          </View>
          <Ionicons 
            name="wallet" 
            size={40} 
            color={data.runningBalance >= 0 ? "#22c55e" : "#ef4444"} 
            style={{ opacity: 0.8 }} 
          />
        </View>
      )}

      {/* Main Stats */}
      <View style={styles.grid}>
        <View style={[styles.bigCard, { borderTopColor: "#3b82f6" }]}>
          <Ionicons name="cash-outline" size={28} color="#3b82f6" />
          <Text style={styles.bigLabel}>Total Fare</Text>
          <Text style={styles.bigValue}>
            ₹{(s?.totalFare || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={[styles.bigCard, { borderTopColor: "#22c55e" }]}>
          <Ionicons name="trending-up" size={28} color="#22c55e" />
          <Text style={styles.bigLabel}>Owner Share (50%)</Text>
          <Text style={styles.bigValue}>
            ₹{(s?.ownerShare || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={[styles.bigCard, { borderTopColor: "#f59e0b" }]}>
          <Ionicons name="wallet-outline" size={28} color="#f59e0b" />
          <Text style={styles.bigLabel}>Cash Received</Text>
          <Text style={styles.bigValue}>
            ₹{(s?.totalCashReceived || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={[styles.bigCard, { borderTopColor: "#8b5cf6" }]}>
          <Ionicons name="swap-horizontal" size={28} color="#8b5cf6" />
          <Text style={styles.bigLabel}>Settlement</Text>
          <Text
            style={[
              styles.bigValue,
              {
                color:
                  (s?.cashSettlement || 0) >= 0 ? "#22c55e" : "#ef4444",
              },
            ]}
          >
            ₹{(s?.cashSettlement || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* Expense Row */}
      <View style={styles.expenseRow}>
        <View style={styles.expenseCard}>
          <Text style={styles.expLabel}>Gas</Text>
          <Text style={styles.expValue}>
            ₹{(s?.totalGas || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.expenseCard}>
          <Text style={styles.expLabel}>Commission</Text>
          <Text style={styles.expValue}>
            ₹{(s?.totalCommission || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.expenseCard}>
          <Text style={styles.expLabel}>Entries</Text>
          <Text style={styles.expValue}>{s?.entryCount || 0}</Text>
        </View>
      </View>

      {/* Platform Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Breakdown</Text>
        {p && (
          <>
            {renderBar("Uber", p.uber, "#64748b", s?.totalFare)}
            {renderBar("Ola", p.ola, "#fbbf24", s?.totalFare)}
            {renderBar("Rapido", p.rapido, "#f97316", s?.totalFare)}
            {renderBar("Direct", p.direct, "#22c55e", s?.totalFare)}
          </>
        )}
      </View>

      {/* Driver Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver Performance</Text>
        {data?.driverStats?.map((ds) => (
          <View style={styles.driverRow} key={ds.driver.id}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarText}>
                {ds.driver.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{ds.driver.name}</Text>
              <Text style={styles.driverMeta}>
                {ds.entryCount} entries
              </Text>
            </View>
            <View style={styles.driverStats}>
              <Text style={styles.driverFare}>
                ₹{ds.totalFare.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.driverShare}>
                Unsettled: <Text style={{color: ds.runningBalance >= 0 ? "#22c55e" : "#ef4444"}}>₹{ds.runningBalance}</Text>
              </Text>
            </View>
          </View>
        ))}
        {(!data?.driverStats || data.driverStats.length === 0) && (
          <Text style={styles.emptyText}>No data for this period</Text>
        )}
      </View>
    </ScrollView>
  );
}

function renderBar(
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
  },
  tfRow: {
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
    backgroundColor: "#8b5cf6",
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
    gap: 12,
    marginBottom: 12,
  },
  bigCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
  },
  bigLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
  bigValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    marginTop: 4,
  },
  expenseRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  expenseCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  expLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  expValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 4,
  },
  section: {
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
    width: 80,
    fontSize: 13,
    color: "#f8fafc",
    fontWeight: "600",
    textAlign: "right",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  driverMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  driverStats: {
    alignItems: "flex-end",
  },
  driverFare: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  driverShare: {
    fontSize: 12,
    color: "#22c55e",
    marginTop: 2,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 20,
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
});
