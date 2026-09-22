/* 星墜答問｜Google Sheets API 設定檔
 * 已配置使用者目前已部署之 Apps Script Web App URL。
 */
window.STARFALL_CONFIG = {
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbya45DjgtDBPxYlnc1YWa6cWk6iqoRcjOXTLGA5P_gQ7oW542-obQHPuScCHtVyVJ2y/exec',
  apiActions: {
    questions: 'Questions',
    students: 'Students',
    settings: 'Settings',
    report: 'report'
  },
  sync: {
    enabled: true,
    requestTimeoutMs: 12000,
    retryIntervalsMs: [3000, 10000, 30000],
    offlineQueueKey: 'starfall_offline_attempt_queue_v1'
  },
  learning: {
    defaultStudentId: 'S0001',
    defaultGrade: '國小四年級',
    questionsPerBossReward: 5,
    weakRatio: 0.60,
    reviewRatio: 0.25,
    newRatio: 0.15
  }
};
