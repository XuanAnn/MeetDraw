import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  Room,
  RoomDetails,
  CreateRoomDto,
  User,
} from '@meetdraw/shared';

const API_BASE = import.meta.env.VITE_API_URL || 'https://meetgold.onrender.com/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('meetdraw_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('meetdraw_token', token);
    } else {
      localStorage.removeItem('meetdraw_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && data?.code === 'DUPLICATE_LOGIN') {
        window.dispatchEvent(
          new CustomEvent('session-terminated', {
            detail: { reason: data.message || 'Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc trình duyệt khác.' },
          })
        );
      }
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // Auth endpoints
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    this.setToken(res.token);
    return res;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Room endpoints
  async createRoom(dto: CreateRoomDto): Promise<Room> {
    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getRoomDetails(roomId: string): Promise<RoomDetails> {
    return this.request<RoomDetails>(`/rooms/${roomId}`);
  }

  async saveSnapshot(roomId: string, data: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/rooms/${roomId}/snapshot`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  async getSnapshot(roomId: string): Promise<{ data: string | null }> {
    return this.request<{ data: string | null }>(`/rooms/${roomId}/snapshot`);
  }

  async getMyRooms(): Promise<RoomDetails[]> {
    return this.request<RoomDetails[]>('/rooms/user/history');
  }

  async joinRoom(roomId: string): Promise<{ success: boolean; room: RoomDetails }> {
    return this.request<{ success: boolean; room: RoomDetails }>(`/rooms/${roomId}/join`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
