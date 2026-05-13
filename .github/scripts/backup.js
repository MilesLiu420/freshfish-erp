const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 從環境變數讀取金鑰
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'freshfish-erp'
});

const db = admin.firestore();

// 要備份的集合
const COLLECTIONS = [
  'purchases',
  'sales',
  'products',
  'customers',
  'suppliers',
  'warehouses',
  'categories',
  'transfers'
];

async function backup() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const backupDir = path.join('backups', today);

  if (!fs.existsSync('backups')) fs.mkdirSync('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  let summary = [];

  for (const col of COLLECTIONS) {
    try {
      const snapshot = await db.collection(col).get();
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data(); });
      const filePath = path.join(backupDir, `${col}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      summary.push(`✅ ${col}：${Object.keys(data).length} 筆`);
    } catch (e) {
      summary.push(`⚠️ ${col}：備份失敗 (${e.message})`);
    }
  }

  // 寫入備份摘要
  const summaryPath = path.join(backupDir, 'summary.txt');
  const summaryText = `備份時間：${new Date().toISOString()}\n\n` + summary.join('\n');
  fs.writeFileSync(summaryPath, summaryText, 'utf8');

  console.log(`\n📦 備份完成：${backupDir}`);
  console.log(summaryText);
}

backup().catch(err => {
  console.error('備份失敗：', err);
  process.exit(1);
});
