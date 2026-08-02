export type Role = 'gestor' | 'motorista'

export interface Profile {
  id: string
  email: string
  nome: string
  role: Role
  telefone?: string
  created_at: string
}

export interface Paciente {
  id: string
  nome: string
  cpf: string
  data_nascimento: string
  telefone?: string
  endereco: string
  lat: number
  lng: number
  municipio: string
  created_at: string
}

export interface Hospital {
  id: string
  nome: string
  endereco: string
  lat: number
  lng: number
  municipio: string
}

export interface Viagem {
  id: string
  motorista_id: string
  veiculo_id: string
  data: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  observacoes?: string
  created_at: string
}

export interface ViagemParada {
  id: string
  viagem_id: string
  paciente_id: string
  hospital_id: string
  ordem: number
  status: 'pendente' | 'embarcado' | 'concluido'
  hora_embarque?: string
  hora_chegada?: string
}

export interface Veiculo {
  id: string
  placa: string
  modelo: string
  capacidade: number
  ativo: boolean
}

export interface MotoristaLocalizacao {
  motorista_id: string
  lat: number
  lng: number
  atualizado_em: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      pacientes: { Row: Paciente; Insert: Omit<Paciente, 'id' | 'created_at'>; Update: Partial<Paciente> }
      hospitais: { Row: Hospital; Insert: Omit<Hospital, 'id'>; Update: Partial<Hospital> }
      viagens: { Row: Viagem; Insert: Omit<Viagem, 'id' | 'created_at'>; Update: Partial<Viagem> }
      viagem_paradas: { Row: ViagemParada; Insert: Omit<ViagemParada, 'id'>; Update: Partial<ViagemParada> }
      veiculos: { Row: Veiculo; Insert: Omit<Veiculo, 'id'>; Update: Partial<Veiculo> }
      motorista_localizacao: { Row: MotoristaLocalizacao; Insert: MotoristaLocalizacao; Update: Partial<MotoristaLocalizacao> }
    }
  }
}
