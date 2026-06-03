// ─── User Types ─────────────────────────────────────────

export type Role = "ADMIN" | "DRIVER";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  commissionPercent?: number;
  maintenanceFee?: number;
  sharePercent?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── Entry Types ────────────────────────────────────────

export interface EntryInput {
  date?: string;
  uber: number;
  ola: number;
  rapido: number;
  direct: number;
  uberCash: number;
  olaCash: number;
  rapidoCash: number;
  directCash: number;
  gas: number;
  toll: number;
  otherExpense: number;
  tip: number;
  driveAllowance: number;
  commission: number;
  trips?: { customerTripId: string; fare: number; isCash: boolean }[];
}

export interface Entry extends EntryInput {
  id: string;
  driverId: string;
  totalFare: number;
  balance: number;
  share: number;
  totalCashReceived: number;
  cashSettlement: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isSettled: boolean;
  maintenanceFee: number;
  sharePercent: number;
  createdAt: string;
  updatedAt: string;
  driver?: { id: string; name: string; phone: string };
  entryTrips?: EntryTrip[];
}

export interface PaginatedEntries {
  entries: Entry[];
  total: number;
  page: number;
  limit: number;
}

// ─── Analytics Types ────────────────────────────────────

export type Timeframe = "today" | "week" | "month" | "year" | "all";

export interface AnalyticsSummary {
  totalFare: number;
  balance?: number;
  ownerShare?: number;
  driverShare?: number;
  share?: number;
  totalCashReceived: number;
  cashSettlement: number;
  totalGas?: number;
  totalToll?: number;
  totalCommission?: number;
  entryCount: number;
}

export interface PlatformBreakdown {
  uber: number;
  ola: number;
  rapido: number;
  direct: number;
}

export interface DriverStat {
  driver: { id: string; name: string; phone?: string };
  totalFare: number;
  share: number;
  cashSettlement: number;
  totalCashReceived: number;
  entryCount: number;
  runningBalance: number;
}

export interface DailyTrend {
  day: string;
  totalFare: number;
  share: number;
  cashSettlement: number;
  entries?: number;
}

export interface OverviewAnalytics {
  timeframe: string;
  runningBalance: number;
  summary: AnalyticsSummary;
  platformBreakdown: PlatformBreakdown;
  driverStats: DriverStat[];
  dailyTrend: DailyTrend[];
}

export interface DriverAnalytics {
  timeframe: string;
  runningBalance: number;
  summary: AnalyticsSummary;
  platformBreakdown: PlatformBreakdown;
  dailyTrend: DailyTrend[];
}

// ─── Vehicle Types ──────────────────────────────────────

export interface VehicleService {
  id: string;
  vehicleId: string;
  serviceDate: string;
  description: string;
  cost: number;
  odometer?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  numberPlate: string;
  model?: string;
  fuelType: "CNG" | "PETROL" | "DIESEL" | "ELECTRIC";
  isActive: boolean;
  assignedDriverId?: string;
  assignedDriver?: { id: string; name: string; phone: string };
  services?: VehicleService[];
  createdAt: string;
}

// ─── Customer & Trips ───────────────────────────────

export interface Customer {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trips?: CustomerTrip[];
}

export interface CustomerTrip {
  id: string;
  customerId: string;
  destination: string;
  fare: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EntryTrip {
  id: string;
  entryId: string;
  customerTripId: string;
  customerId: string;
  fare: number;
  date: string;
  createdAt: string;
  customer?: Customer;
  customerTrip?: CustomerTrip;
}

// ─── Driver (admin listing) ─────────────────────────────

export interface DriverListItem {
  id: string;
  name: string;
  phone: string;
  commissionPercent: number;
  maintenanceFee: number;
  sharePercent: number;
  isActive: boolean;
  createdAt: string;
  _count: { entries: number };
}
