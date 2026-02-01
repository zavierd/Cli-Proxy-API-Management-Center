import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  IconExternalLink,
  IconRefresh,
  IconCheck,
  IconX,
  IconVideo,
  IconImage,
  IconUsers,
  IconSettings,
} from '@/components/ui/icons';
import { soraConfigApi, soraApiClient, type SoraConfig, type SoraStats } from '@/services/api/sora';
import { useNotificationStore } from '@/stores';
import styles from './SoraPage.module.scss';

interface ConnectionState {
  status: 'idle' | 'testing' | 'connected' | 'error';
  message: string;
}

export function SoraPage() {
  const { t } = useTranslation();
  const notify = useNotificationStore((s) => s.notify);

  const [config, setConfig] = useState<SoraConfig>({
    enabled: false,
    baseUrl: 'http://localhost:8000',
    adminUser: 'admin',
    adminPass: 'admin',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
    message: '',
  });
  const [stats, setStats] = useState<SoraStats | null>(null);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await soraConfigApi.getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        // 如果已启用，自动测试连接
        if (savedConfig.enabled) {
          testConnection(savedConfig);
        }
      }
      setLoading(false);
    };
    loadConfig();
  }, []);

  // 测试连接
  const testConnection = useCallback(async (cfg: SoraConfig) => {
    setConnection({ status: 'testing', message: '正在连接...' });
    const result = await soraConfigApi.testConnection(
      cfg.baseUrl,
      cfg.adminUser,
      cfg.adminPass
    );
    if (result.success) {
      setConnection({ status: 'connected', message: result.message });
      if (result.stats) {
        setStats(result.stats);
      }
    } else {
      setConnection({ status: 'error', message: result.message });
      setStats(null);
    }
  }, []);

  // 保存配置
  const saveConfig = async () => {
    setSaving(true);
    const success = await soraConfigApi.saveConfig(config);
    if (success) {
      notify({ type: 'success', message: '配置已保存' });
      if (config.enabled) {
        await testConnection(config);
      }
    } else {
      notify({ type: 'error', message: '保存配置失败' });
    }
    setSaving(false);
  };

  // 刷新统计
  const refreshStats = async () => {
    if (connection.status !== 'connected') return;
    const newStats = await soraApiClient.getStats();
    if (newStats) {
      setStats(newStats);
      notify({ type: 'success', message: '统计已刷新' });
    }
  };

  // 打开 Sora2API 管理界面
  const openSoraManagement = () => {
    window.open(`${config.baseUrl}/manage.html`, '_blank');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <IconVideo className={styles.titleIcon} />
          Sora2API 集成
        </h1>
        <p className={styles.subtitle}>
          管理 Sora 视频/图片生成服务，与 CLIProxyAPI Codex 号池同步
        </p>
      </div>

      {/* 连接配置 */}
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <IconSettings className={styles.cardIcon} />
            连接配置
          </h2>
          <ToggleSwitch
            checked={config.enabled}
            onChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        <div className={styles.cardContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Sora2API 地址</label>
            <Input
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="http://localhost:8000"
              disabled={!config.enabled}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>管理员用户名</label>
              <Input
                value={config.adminUser}
                onChange={(e) => setConfig({ ...config, adminUser: e.target.value })}
                placeholder="admin"
                disabled={!config.enabled}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>管理员密码</label>
              <Input
                type="password"
                value={config.adminPass}
                onChange={(e) => setConfig({ ...config, adminPass: e.target.value })}
                placeholder="••••••"
                disabled={!config.enabled}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => testConnection(config)}
              disabled={!config.enabled || connection.status === 'testing'}
            >
              {connection.status === 'testing' ? (
                <>
                  <LoadingSpinner size="small" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
            <Button
              variant="primary"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>

          {/* 连接状态 */}
          {connection.status !== 'idle' && (
            <div
              className={`${styles.connectionStatus} ${
                connection.status === 'connected'
                  ? styles.connected
                  : connection.status === 'error'
                  ? styles.error
                  : ''
              }`}
            >
              {connection.status === 'connected' && <IconCheck />}
              {connection.status === 'error' && <IconX />}
              {connection.status === 'testing' && <LoadingSpinner size="small" />}
              <span>{connection.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* 统计信息 */}
      {config.enabled && connection.status === 'connected' && stats && (
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <IconUsers className={styles.cardIcon} />
              服务统计
            </h2>
            <Button variant="ghost" onClick={refreshStats}>
              <IconRefresh />
            </Button>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total_tokens}</span>
              <span className={styles.statLabel}>总账号数</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.active_tokens}</span>
              <span className={styles.statLabel}>活跃账号</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total_videos}</span>
              <span className={styles.statLabel}>视频生成总数</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total_images}</span>
              <span className={styles.statLabel}>图片生成总数</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.today_videos}</span>
              <span className={styles.statLabel}>今日视频</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.today_images}</span>
              <span className={styles.statLabel}>今日图片</span>
            </div>
          </div>
        </Card>
      )}

      {/* 快捷操作 */}
      {config.enabled && (
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>快捷操作</h2>
          </div>

          <div className={styles.quickActions}>
            <Button
              variant="primary"
              onClick={openSoraManagement}
              disabled={connection.status !== 'connected'}
            >
              <IconExternalLink />
              打开 Sora2API 管理面板
            </Button>

            <Button
              variant="secondary"
              onClick={() => window.open(`${config.baseUrl}/generate.html`, '_blank')}
              disabled={connection.status !== 'connected'}
            >
              <IconVideo />
              视频生成测试
            </Button>
          </div>

          <div className={styles.infoBox}>
            <h3>关于账号同步</h3>
            <p>
              Sora2API 会自动从 CLIProxyAPI 的 Codex 号池同步账号。
              同步服务每小时自动执行一次，无需手动操作。
            </p>
            <p>
              只有 ChatGPT Team/Plus/Pro 订阅的账号才支持 Sora 功能。
            </p>
          </div>
        </Card>
      )}

      {/* API 信息 */}
      {config.enabled && connection.status === 'connected' && (
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>API 接口</h2>
          </div>

          <div className={styles.apiInfo}>
            <div className={styles.apiItem}>
              <span className={styles.apiLabel}>API 端点</span>
              <code className={styles.apiValue}>{config.baseUrl}/v1/chat/completions</code>
            </div>
            <div className={styles.apiItem}>
              <span className={styles.apiLabel}>认证方式</span>
              <code className={styles.apiValue}>Authorization: Bearer YOUR_API_KEY</code>
            </div>
            <div className={styles.apiItem}>
              <span className={styles.apiLabel}>支持模型</span>
              <div className={styles.modelList}>
                <span className={styles.modelTag}>sora2-landscape-10s</span>
                <span className={styles.modelTag}>sora2-landscape-15s</span>
                <span className={styles.modelTag}>sora2-portrait-10s</span>
                <span className={styles.modelTag}>gpt-image</span>
                <span className={styles.modelTag}>gpt-image-landscape</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
