export type UserRole = 'gestor' | 'motorista'

export interface Profile {
  id: string
  name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface Vehicle {
  id: string
  plate: string
  model: string
  capacity: number
  driver_id: string | null
  is_active: boolean
  created_at: string
}

export interface Patient {
  id: string
  name: string
  phone: string | null
  address: string
  neighborhood: string | null
  city: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  is_active: boolean
}

export interface Hospital {
  id: string
  name: string
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  is_active: boolean
}

export interface DriverLocation {
  id: string
  driver_id: string
  leg_id: string | null
  latitude: number
  longitude: number
  updated_at: string
}

export interface RoutePlan {
  id: string
  vehicle_id: string
  driver_id: string
  plan_date: string
  origin_city: string
  origin_lat: number | null
  origin_lng: number | null
  status: 'draft' | 'active' | 'done'
  total_legs: number
  created_by: string
  created_at: string
}

export interface RouteLeg {
  id: string
  plan_id: string
  leg_number: number
  hospital_id: string
  est_departure_at: string | null
  est_hospital_at: string | null
  est_return_at: string | null
  est_outbound_min: number | null
  est_return_min: number | null
  est_distance_km: number | null
  actual_departure_at: string | null
  actual_arrival_at: string | null
  actual_return_at: string | null
  status: 'pending' | 'outbound' | 'at_hospital' | 'returning' | 'done'
}

export interface LegPassenger {
  id: string
  leg_id: string
  patient_id: string
  pickup_order: number
  est_pickup_at: string | null
  boarding_status: 'waiting' | 'boarded' | 'absent' | 'cancelled'
}
