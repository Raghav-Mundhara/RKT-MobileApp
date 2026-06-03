import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import api from "../../services/api";
import { Entry, PaginatedEntries } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
};

export default function MyEntriesScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEntries = useCallback(async (p = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (p === 1 && entries.length === 0) setLoading(true);

      const { data } = await api.get<PaginatedEntries>("/entries/my", {
        params: { page: p, limit: 20 },
      });

      if (p === 1) {
        setEntries(data.entries);
      } else {
        setEntries((prev) => [...prev, ...data.entries]);
      }
      setTotal(data.total);
      setPage(p);
    } catch (error) {
      console.error("Fetch entries error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entries.length]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries(1);
    }, [fetchEntries])
  );

  const loadMore = () => {
    if (entries.length < total) {
      fetchEntries(page + 1);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await api.delete(`/entries/my/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      console.error("Failed to delete entry");
    }
  };

  const EntryCard = ({ item }: { item: Entry }) => {
    const [expanded, setExpanded] = useState(false);

    const date = new Date(item.date || "").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return (
      <View style={styles.entryContainer}>
        {/* Toggle details Top Info */}
        <TouchableOpacity 
          style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingHorizontal: 4}} 
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={{color: "#3b82f6", fontSize: 13, fontWeight: "600"}}>
              {expanded ? "HIDE DETAILS" : "VIEW DETAILS"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
            <Text style={{ color: STATUS_COLORS[item.status], fontSize: 12, fontWeight: "700" }}>
              {item.status}
            </Text>
          </View>
        </TouchableOpacity>

        {/* CARD 1: Fare & Cash Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare & Cash Summary</Text>
          <View style={styles.gridContainer}>
            {/* Left Column: Fare */}
            <View style={styles.gridColumn}>
              <Text style={styles.gridHeader}>Fare</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Uber</Text>
                <Text style={styles.value}>₹ {item.uber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Ola</Text>
                <Text style={styles.value}>₹ {item.ola}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Rapido</Text>
                <Text style={styles.value}>₹ {item.rapido}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Direct</Text>
                <Text style={styles.value}>₹ {item.direct}</Text>
              </View>
            </View>

            {/* Right Column: Cash */}
            <View style={styles.gridColumn}>
              <Text style={styles.gridHeader}>Cash</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Uber</Text>
                <Text style={styles.value}>₹ {item.uberCash}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Ola</Text>
                <Text style={styles.value}>₹ {item.olaCash}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Rapido</Text>
                <Text style={styles.value}>₹ {item.rapidoCash}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Direct</Text>
                <Text style={styles.value}>₹ {item.directCash}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total Fare</Text>
            <Text style={styles.footerValue}>₹ {item.totalFare}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total Cash</Text>
            <Text style={styles.footerValue}>₹ {item.totalCashReceived}</Text>
          </View>
        </View>

        {/* CARD 2: Analytics & Settlement */}
        {expanded && (
          <View style={styles.card}>
            <View style={styles.dateHeader}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.dateText}>{date}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.gridContainer}>
              {/* Share Calculation */}
              <View style={[styles.gridColumn, { paddingRight: 10, borderRightWidth: 1, borderRightColor: "#1e293b" }]}>
                <Text style={styles.gridHeader}>Share Calculation</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Total Fare</Text>
                  <Text style={styles.value}>₹ {item.totalFare}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Gas</Text>
                  <Text style={styles.value}>₹ {item.gas}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Maintainance</Text>
                  <Text style={styles.value}>₹ {item.maintenanceFee}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Commission</Text>
                  <Text style={styles.value}>₹ {item.commission}</Text>
                </View>

                <View style={[styles.divider, { marginVertical: 8 }]} />
                
                <View style={styles.row}>
                  <Text style={styles.footerLabel}>Balance</Text>
                  <Text style={styles.footerValue}>₹ {item.balance}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.footerLabel}>{item.sharePercent}% Share</Text>
                  <Text style={styles.footerValue}>₹ {item.share}</Text>
                </View>

                {item.entryTrips && item.entryTrips.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.gridHeader}>Customer Trips</Text>
                    {item.entryTrips.map((et) => (
                      <View style={styles.row} key={et.id}>
                        <Text style={[styles.label, { color: "#06b6d4", flex: 1, marginRight: 8 }]} numberOfLines={1}>
                          {et.customer?.name}: {et.customerTrip?.destination}
                        </Text>
                        <Text style={styles.value}>₹ {et.fare}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Cash Settlement */}
              <View style={[styles.gridColumn, { paddingLeft: 10 }]}>
                <Text style={styles.gridHeader}>Cash Settlement</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Total Cash</Text>
                  <Text style={styles.value}>₹ {item.totalCashReceived}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>50% Share</Text>
                  <Text style={styles.value}>₹ {item.share}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Gas</Text>
                  <Text style={styles.value}>₹ {item.gas}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Tip</Text>
                  <Text style={styles.value}>₹ {item.tip}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>DA</Text>
                  <Text style={styles.value}>₹ {item.driveAllowance}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Toll</Text>
                  <Text style={styles.value}>₹ {item.toll}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Other</Text>
                  <Text style={styles.value}>₹ {item.otherExpense}</Text>
                </View>

                <View style={[styles.divider, { marginVertical: 8 }]} />
                <View style={styles.row}>
                  <Text style={styles.footerLabel}>Final Balance</Text>
                  <Text style={styles.footerValue}>₹ {item.cashSettlement}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settlementSection}>
              <Text style={styles.settlementTitle}>Settlement</Text>
              <Text style={[styles.settlementValue, { color: item.cashSettlement >= 0 ? "#22c55e" : "#ef4444" }]}>
                ₹ {item.cashSettlement}
              </Text>
            </View>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.actionControls}>
          <View style={{flexDirection: "row", gap: 10}}>
            {item.isSettled ? (
              <View style={styles.settledBadge}>
                <Ionicons name="checkmark-circle" color="#10b981" size={16} />
                <Text style={styles.settledText}>Settled</Text>
              </View>
            ) : null}
          </View>
          
          {item.status === "PENDING" && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteEntry(item.id)}>
              <Ionicons name="trash" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        renderItem={({ item }) => <EntryCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEntries(1, true)}
            tintColor="#3b82f6"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="document-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No entries yet</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.headerText}>{total} entries</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b101a", // Deep dark background
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b101a",
    paddingTop: 60,
  },
  headerText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    marginTop: 12,
  },
  entryContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#161e2e", // Lighter card surface
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridColumn: {
    flex: 1,
  },
  gridHeader: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 13,
  },
  value: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 4,
  },
  footerLabel: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  footerValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  settlementSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  settlementTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  settlementValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  actionControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22c55e20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
  },
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10b98120",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settledText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: "#ef444420",
    padding: 8,
    borderRadius: 8,
  },
});
