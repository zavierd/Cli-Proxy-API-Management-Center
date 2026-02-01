/**
 * Sora2API 服务接口
 * 用于连接和管理 Sora2API 服务
 */

export interface SoraConfig {
  enabled: boolean;
  baseUrl: string;
  adminUser: string;
  adminPass: string;
}

export interface SoraToken {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  plan_type: string;
  plan_title: string;
  sora2_supported: boolean;
  sora2_remaining_count: number;
  image_count: number;
  video_count: number;
  created_at: string;
  last_used_at: string;
}

export interface SoraStats {
  total_tokens: number;
  active_tokens: number;
  total_images: number;
  total_videos: number;
  today_images: number;
  today_videos: number;
}

class SoraApiClient {
  private baseUrl: string = '';
  private token: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        this.token = data.token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sora2API login failed:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<SoraStats | null> {
    if (!this.token) return null;
    try {
      const response = await fetch(`${this.baseUrl}/api/stats`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getTokens(): Promise<SoraToken[]> {
    if (!this.token) return [];
    try {
      const response = await fetch(`${this.baseUrl}/api/tokens`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch {
      return [];
    }
  }

  async triggerSync(): Promise<{ success: boolean; message: string }> {
    // 这个需要调用同步服务的 API（如果有的话）
    // 或者可以通过 CLIProxyAPI 的配置来触发
    return { success: false, message: 'Manual sync not implemented yet' };
  }
}

export const soraApiClient = new SoraApiClient();

// CLIProxyAPI 端的 Sora 配置 API
export const soraConfigApi = {
  // 获取 Sora 配置
  async getConfig(): Promise<SoraConfig | null> {
    try {
      // 从 localStorage 读取配置
      const stored = localStorage.getItem('sora_config');
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        enabled: false,
        baseUrl: 'http://localhost:8000',
        adminUser: 'admin',
        adminPass: 'admin',
      };
    } catch {
      return null;
    }
  },

  // 保存 Sora 配置
  async saveConfig(config: SoraConfig): Promise<boolean> {
    try {
      localStorage.setItem('sora_config', JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  },

  // 测试连接
  async testConnection(baseUrl: string, username: string, password: string): Promise<{
    success: boolean;
    message: string;
    stats?: SoraStats;
  }> {
    try {
      soraApiClient.setBaseUrl(baseUrl);
      
      // 检查健康状态
      const healthy = await soraApiClient.checkHealth();
      if (!healthy) {
        return { success: false, message: 'Sora2API 服务不可用' };
      }

      // 尝试登录
      const loggedIn = await soraApiClient.login(username, password);
      if (!loggedIn) {
        return { success: false, message: '登录失败，请检查用户名和密码' };
      }

      // 获取统计信息
      const stats = await soraApiClient.getStats();
      
      return {
        success: true,
        message: '连接成功',
        stats: stats || undefined,
      };
    } catch (error) {
      return { success: false, message: `连接失败: ${error}` };
    }
  },
};
