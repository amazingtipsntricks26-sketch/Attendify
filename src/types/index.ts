/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  faceDescriptor: number[]; // Face embeddings from TensorFlow.js/MediaPipe
  createdAt: number;
  updatedAt: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: 'check-in' | 'check-out';
  method: 'face' | 'manual';
  offline: boolean;
}

export interface AppState {
  isOffline: boolean;
  isInitializing: boolean;
  currentUser: any | null;
}
