/**
 * Application Types
 */

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  HR = 'hr',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  address?: string;
  employeeId?: string;
  designation?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  bio?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Attendance Types
export enum AttendanceSessionStatus {
  NOT_STARTED = 'NOT_STARTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}

export enum AttendanceSource {
  MOBILE = 'mobile',
  WEB = 'web',
  DESKTOP = 'desktop',
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
  status: AttendanceSessionStatus;
  source: AttendanceSource;
  totalDuration?: number; // minutes
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStatusResponse {
  status: AttendanceSessionStatus;
  today?: AttendanceRecord;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface CheckInRequest {
  source: AttendanceSource;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  wifi?: {
    ssid: string;
    bssid?: string;
  };
}

export interface CheckOutRequest {
  source: AttendanceSource;
  wifi?: {
    ssid: string;
    bssid?: string;
  };
}

export interface AttendanceDashboardData {
  checkedIn: Array<{
    employeeId: string;
    employeeName: string;
    department?: string;
    role?: string;
    checkInTime: string;
    status: AttendanceSessionStatus;
  }>;
  checkedOut: Array<{
    employeeId: string;
    employeeName: string;
    department?: string;
    role?: string;
    checkInTime: string;
    checkOutTime: string;
    totalDuration: number;
    status: AttendanceSessionStatus;
  }>;
  notStarted: Array<{
    employeeId: string;
    employeeName: string;
    department?: string;
    role?: string;
  }>;
  summary: {
    totalEmployees: number;
    checkedInCount: number;
    checkedOutCount: number;
    notStartedCount: number;
  };
}

// Reports Types
export interface ReportAttachment {
  fileName: string;
  fileUrl: string;
  filePublicId: string;
  fileSize: number;
  mimeType: string;
}

export interface WorkReport {
  id: string;
  employeeId: string;
  title: string;
  content: string;
  attachments: ReportAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkReportRequest {
  title: string;
  content: string;
  attachments: File[];
}

