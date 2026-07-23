package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type backupStatus struct {
	AppVersion       string `json:"app_version"`
	MusteriSayisi    int    `json:"musteri_sayisi"`
	TaksimetreSayisi int    `json:"taksimetre_sayisi"`
	IslemSayisi      int    `json:"islem_sayisi"`
	TarifeSayisi     int    `json:"tarife_sayisi"`
	DatabaseBytes    int64  `json:"database_bytes"`
	LastBackupName   string `json:"last_backup_name"`
	LastBackupTime   string `json:"last_backup_time"`
}

func getBackupStatus(c *fiber.Ctx) error {
	var status backupStatus
	status.AppVersion = appVersion
	if err := db.QueryRow(`SELECT
		(SELECT COUNT(*) FROM musteriler),
		(SELECT COUNT(*) FROM taksimetreler),
		(SELECT COUNT(*) FROM islemler),
		(SELECT COUNT(*) FROM tarifeler)`).Scan(
		&status.MusteriSayisi, &status.TaksimetreSayisi, &status.IslemSayisi, &status.TarifeSayisi,
	); err != nil {
		return internalError(c, "Sistem bilgileri okunamadı", err)
	}
	if info, err := os.Stat(activeDBPath); err == nil {
		status.DatabaseBytes = info.Size()
	}
	status.LastBackupName, status.LastBackupTime = latestBackupInfo()
	return c.JSON(status)
}

func downloadBackup(c *fiber.Ctx) error {
	return sendNewBackup(c, "manuel")
}

func automatedBackup(c *fiber.Ctx) error {
	expected := strings.TrimSpace(os.Getenv("TAKSIMETRE_BACKUP_TOKEN"))
	if expected == "" {
		return c.SendStatus(fiber.StatusNotFound)
	}
	provided := strings.TrimSpace(strings.TrimPrefix(c.Get("Authorization"), "Bearer "))
	if len(provided) != len(expected) || subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Yedekleme anahtarı geçersiz"})
	}
	return sendNewBackup(c, "otomatik")
}

func sendNewBackup(c *fiber.Ctx, prefix string) error {
	path, err := createConsistentBackup(prefix)
	if err != nil {
		return internalError(c, "Tutarlı veritabanı yedeği oluşturulamadı", err)
	}
	file, err := os.Open(path)
	if err != nil {
		return internalError(c, "Yedek dosyası okunamadı", err)
	}
	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		_ = file.Close()
		return internalError(c, "Yedek özeti hesaplanamadı", err)
	}
	_ = file.Close()
	filename := fmt.Sprintf("taksimetre-yedek-%s.db", time.Now().Format("20060102-150405"))
	c.Set(fiber.HeaderContentType, "application/octet-stream")
	c.Set(fiber.HeaderContentDisposition, `attachment; filename="`+filename+`"`)
	c.Set("X-Backup-SHA256", hex.EncodeToString(hasher.Sum(nil)))
	c.Set(fiber.HeaderCacheControl, "no-store")
	return c.SendFile(path)
}

func latestBackupInfo() (string, string) {
	entries, err := os.ReadDir(backupDirectory())
	if err != nil {
		return "", ""
	}
	type item struct {
		name string
		time time.Time
	}
	items := make([]item, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || strings.ToLower(filepath.Ext(entry.Name())) != ".db" {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		items = append(items, item{name: entry.Name(), time: info.ModTime()})
	}
	if len(items) == 0 {
		return "", ""
	}
	sort.Slice(items, func(i, j int) bool { return items[i].time.After(items[j].time) })
	return items[0].name, items[0].time.Format(time.RFC3339)
}
