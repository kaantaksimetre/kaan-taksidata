package main

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var (
	db           *sql.DB
	activeDBPath string
)

func configuredDatabasePath() (string, error) {
	dbPath := strings.TrimSpace(os.Getenv("TAKSIMETRE_DB_PATH"))
	if dbPath == "" {
		dbPath = "./taksimetre.db"
	}
	return filepath.Abs(dbPath)
}

func initDB() {
	absPath, err := configuredDatabasePath()
	if err != nil {
		log.Fatalf("Veritabanı yolu çözülemedi: %v", err)
	}
	activeDBPath = absPath

	if err := os.MkdirAll(filepath.Dir(absPath), 0o700); err != nil {
		log.Fatalf("Veritabanı klasörü oluşturulamadı: %v", err)
	}
	_, statErr := os.Stat(absPath)
	databaseExisted := statErr == nil

	db, err = sql.Open("sqlite", absPath)
	if err != nil {
		log.Fatalf("Veritabanı açılamadı: %v", err)
	}
	// Tek bağlantı, SQLite yazma işlemlerini güvenli biçimde sıraya alır.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA busy_timeout = 10000",
		"PRAGMA journal_mode = WAL",
		"PRAGMA synchronous = NORMAL",
	}
	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			log.Fatalf("SQLite ayarı uygulanamadı (%s): %v", pragma, err)
		}
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("Veritabanına bağlanılamadı: %v", err)
	}

	createTables := `
	CREATE TABLE IF NOT EXISTS musteriler (
		plaka TEXT PRIMARY KEY,
		ad_soyad TEXT,
		tc_vergi_no TEXT,
		telefon TEXT,
		eposta TEXT,
		durak_adi TEXT,
		marka TEXT,
		model TEXT,
		sasi_no TEXT,
		lastik_ebadi TEXT,
		version INTEGER NOT NULL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS taksimetreler (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		plaka TEXT NOT NULL,
		taksimetre_marka TEXT,
		taksimetre_model TEXT,
		seri_no TEXT,
		k_sabiti TEXT,
		kelebek_muhur_seri_no TEXT,
		gecici_muhur TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (plaka) REFERENCES musteriler (plaka) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS islemler (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		plaka TEXT NOT NULL,
		islem_turu TEXT NOT NULL,
		acilis_ucreti REAL DEFAULT 0,
		zaman_tarifesi REAL DEFAULT 0,
		mesafe_tarifesi REAL DEFAULT 0,
		birim_zaman TEXT,
		birim_mesafe TEXT,
		belge_no TEXT NOT NULL,
		yapilan_islem TEXT,
		islem_tarihi DATETIME NOT NULL,
		snapshot_json TEXT,
		created_by TEXT,
		client_timezone TEXT,
		workstation_name TEXT,
		request_id TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (plaka) REFERENCES musteriler (plaka) ON DELETE RESTRICT
	);

	CREATE TABLE IF NOT EXISTS tarifeler (
		tip TEXT PRIMARY KEY,
		acilis_ucreti REAL DEFAULT 0,
		zaman_tarifesi REAL DEFAULT 0,
		mesafe_tarifesi REAL DEFAULT 0,
		birim_zaman TEXT,
		birim_mesafe TEXT,
		version INTEGER NOT NULL DEFAULT 1,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createTables); err != nil {
		log.Fatalf("Tablolar oluşturulamadı: %v", err)
	}

	migrateColumn("musteriler", "version", "INTEGER NOT NULL DEFAULT 1")
	migrateColumn("islemler", "snapshot_json", "TEXT")
	migrateColumn("islemler", "created_by", "TEXT")
	migrateColumn("islemler", "client_timezone", "TEXT")
	migrateColumn("islemler", "workstation_name", "TEXT")
	migrateColumn("islemler", "request_id", "TEXT")
	migrateColumn("tarifeler", "version", "INTEGER NOT NULL DEFAULT 1")

	if _, err := db.Exec(`UPDATE musteriler SET version = 1 WHERE version IS NULL OR version < 1`); err != nil {
		log.Fatalf("Müşteri sürümleri güncellenemedi: %v", err)
	}
	if _, err := db.Exec(`UPDATE tarifeler SET version = 1 WHERE version IS NULL OR version < 1`); err != nil {
		log.Fatalf("Tarife sürümleri güncellenemedi: %v", err)
	}

	// Uygulama plaka başına tek güncel taksimetre kaydı kullanır.
	if _, err := db.Exec(`DELETE FROM taksimetreler
		WHERE id NOT IN (SELECT MAX(id) FROM taksimetreler GROUP BY plaka)`); err != nil {
		log.Printf("Yinelenen taksimetre kayıtları temizlenemedi: %v", err)
	}

	indexes := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_taksimetreler_plaka_unique ON taksimetreler(plaka)",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_islemler_belge_no_unique ON islemler(belge_no)",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_islemler_request_id_unique ON islemler(request_id) WHERE request_id IS NOT NULL AND request_id <> ''",
		"CREATE INDEX IF NOT EXISTS idx_islemler_plaka_id ON islemler(plaka, id DESC)",
	}
	for _, statement := range indexes {
		if _, err := db.Exec(statement); err != nil {
			log.Fatalf("Veritabanı indeksi oluşturulamadı: %v", err)
		}
	}

	rows, err := db.Query("PRAGMA foreign_key_check")
	if err == nil {
		if rows.Next() {
			log.Println("UYARI: Eski veritabanında foreign-key ile eşleşmeyen kayıtlar var. Yeni kayıtlar artık engellenecek.")
		}
		_ = rows.Close()
	}

	if databaseExisted {
		if backupPath, err := createConsistentBackup("acilis"); err != nil {
			log.Printf("Açılış yedeği alınamadı: %v", err)
		} else {
			log.Printf("Açılış yedeği alındı: %s", backupPath)
		}
	}
	log.Printf("Veritabanı hazır: %s", absPath)
}

func migrateColumn(table, column, definition string) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		log.Fatalf("Tablo bilgisi okunamadı: %v", err)
	}
	found := false
	for rows.Next() {
		var cid int
		var name, columnType string
		var notNull, pk int
		var defaultValue any
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			_ = rows.Close()
			log.Fatalf("Tablo bilgisi çözülemedi: %v", err)
		}
		if name == column {
			found = true
			break
		}
	}
	_ = rows.Close()
	if found {
		return
	}
	if _, err := db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition)); err != nil {
		log.Fatalf("Veritabanı güncellemesi yapılamadı (%s.%s): %v", table, column, err)
	}
}

func backupDirectory() string {
	return filepath.Join(filepath.Dir(activeDBPath), "backups")
}

func createConsistentBackup(prefix string) (string, error) {
	if db == nil || strings.TrimSpace(activeDBPath) == "" {
		return "", errors.New("veritabanı henüz hazır değil")
	}
	backupDir := backupDirectory()
	if err := os.MkdirAll(backupDir, 0o700); err != nil {
		return "", err
	}
	prefix = sanitizeBackupPrefix(prefix)
	filename := fmt.Sprintf("taksimetre-%s-%s.db", prefix, time.Now().Format("20060102-150405.000000000"))
	backupPath := filepath.Join(backupDir, filename)
	statement := "VACUUM INTO '" + strings.ReplaceAll(filepath.ToSlash(backupPath), "'", "''") + "'"
	if _, err := db.Exec(statement); err != nil {
		return "", err
	}
	maxBackups := 15
	if val := os.Getenv("TAKSIMETRE_MAX_BACKUPS"); val != "" {
		if parsed, err := strconv.Atoi(strings.TrimSpace(val)); err == nil && parsed > 0 {
			maxBackups = parsed
		}
	}
	pruneBackups(backupDir, maxBackups)
	return backupPath, nil
}

func sanitizeBackupPrefix(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "yedek"
	}
	var result strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			result.WriteRune(r)
		}
	}
	if result.Len() == 0 {
		return "yedek"
	}
	return result.String()
}

func pruneBackups(dir string, keep int) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	type backupFile struct {
		path    string
		modTime time.Time
	}
	files := make([]backupFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".db") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		files = append(files, backupFile{path: filepath.Join(dir, entry.Name()), modTime: info.ModTime()})
	}
	sort.Slice(files, func(i, j int) bool { return files[i].modTime.After(files[j].modTime) })

	// Saklanacak yedek sayısı mevcut dosya sayısından fazlaysa
	// dilimleme yapma. Aksi halde files[keep:] panik oluşturur.
	if keep < 0 {
		keep = 0
	}
	if len(files) <= keep {
		return
	}

	for _, file := range files[keep:] {
		_ = os.Remove(file.path)
	}
}

func copyFile(source, destination string, mode os.FileMode) error {
	src, err := os.Open(source)
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.OpenFile(destination, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	if _, err := io.Copy(dst, src); err != nil {
		_ = dst.Close()
		return err
	}
	if err := dst.Sync(); err != nil {
		_ = dst.Close()
		return err
	}
	return dst.Close()
}

func validateSQLiteBackup(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() || info.Size() == 0 {
		return errors.New("yedek dosyası boş veya geçersiz")
	}

	candidate, err := sql.Open("sqlite", path)
	if err != nil {
		return err
	}
	candidate.SetMaxOpenConns(1)
	defer candidate.Close()

	var integrity string
	if err := candidate.QueryRow("PRAGMA integrity_check").Scan(&integrity); err != nil {
		return err
	}
	if strings.ToLower(strings.TrimSpace(integrity)) != "ok" {
		return fmt.Errorf("SQLite bütünlük kontrolü başarısız: %s", integrity)
	}

	requiredTables := []string{"musteriler", "taksimetreler", "islemler", "tarifeler"}
	for _, table := range requiredTables {
		var count int
		if err := candidate.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&count); err != nil {
			return err
		}
		if count != 1 {
			return fmt.Errorf("yedekte gerekli tablo bulunamadı: %s", table)
		}
	}
	return nil
}

// restoreDatabaseFromFile yalnızca sunucu kapalıyken komut satırından çalıştırılmalıdır.
func restoreDatabaseFromFile(sourcePath string) error {
	sourceAbs, err := filepath.Abs(strings.TrimSpace(sourcePath))
	if err != nil {
		return err
	}
	if err := validateSQLiteBackup(sourceAbs); err != nil {
		return fmt.Errorf("yedek doğrulanamadı: %w", err)
	}

	targetPath, err := configuredDatabasePath()
	if err != nil {
		return err
	}
	if samePath(sourceAbs, targetPath) {
		return errors.New("yedek dosyası aktif veritabanıyla aynı olamaz")
	}
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o700); err != nil {
		return err
	}

	tempPath := targetPath + ".restore-temp"
	_ = os.Remove(tempPath)
	if err := copyFile(sourceAbs, tempPath, 0o600); err != nil {
		return err
	}
	defer os.Remove(tempPath)
	if err := validateSQLiteBackup(tempPath); err != nil {
		return fmt.Errorf("kopyalanan yedek doğrulanamadı: %w", err)
	}

	backupDir := filepath.Join(filepath.Dir(targetPath), "backups")
	if err := os.MkdirAll(backupDir, 0o700); err != nil {
		return err
	}
	if info, statErr := os.Stat(targetPath); statErr == nil && info.Size() > 0 {
		preRestore := filepath.Join(backupDir, "taksimetre-geri-yukleme-oncesi-"+time.Now().Format("20060102-150405")+".db")
		if err := copyFile(targetPath, preRestore, 0o600); err != nil {
			return fmt.Errorf("mevcut veritabanı yedeklenemedi: %w", err)
		}
	}

	oldPath := targetPath + ".old"
	_ = os.Remove(oldPath)
	if _, err := os.Stat(targetPath); err == nil {
		if err := os.Rename(targetPath, oldPath); err != nil {
			return fmt.Errorf("aktif veritabanı taşınamadı; sunucunun kapalı olduğundan emin olun: %w", err)
		}
	}
	if err := os.Rename(tempPath, targetPath); err != nil {
		if _, oldErr := os.Stat(oldPath); oldErr == nil {
			_ = os.Rename(oldPath, targetPath)
		}
		return err
	}
	_ = os.Remove(oldPath)
	_ = os.Remove(targetPath + "-wal")
	_ = os.Remove(targetPath + "-shm")
	return nil
}

func samePath(first, second string) bool {
	firstClean := filepath.Clean(first)
	secondClean := filepath.Clean(second)
	if filepath.Separator == '\\' {
		return strings.EqualFold(firstClean, secondClean)
	}
	return firstClean == secondClean
}
