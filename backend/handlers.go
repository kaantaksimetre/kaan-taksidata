package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

var (
	plakaRegex     = regexp.MustCompile(`^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$`)
	digitRegex     = regexp.MustCompile(`^[0-9]+$`)
	phoneRegex     = regexp.MustCompile(`^[0-9+() .-]{7,20}$`)
	requestIDRegex = regexp.MustCompile(`^[A-Za-z0-9_-]{16,100}$`)
)

type musteriUpsertRequest struct {
	Plaka              string  `json:"plaka"`
	AdSoyad            *string `json:"ad_soyad"`
	TcVergiNo          *string `json:"tc_vergi_no"`
	Telefon            *string `json:"telefon"`
	Eposta             *string `json:"eposta"`
	DurakAdi           *string `json:"durak_adi"`
	Marka              *string `json:"marka"`
	Model              *string `json:"model"`
	SasiNo             *string `json:"sasi_no"`
	LastikEbadi        *string `json:"lastik_ebadi"`
	TaksimetreMarka    *string `json:"taksimetre_marka"`
	TaksimetreModel    *string `json:"taksimetre_model"`
	SeriNo             *string `json:"seri_no"`
	KSabiti            *string `json:"k_sabiti"`
	KelebekMuhurSeriNo *string `json:"kelebek_muhur_seri_no"`
	GeciciMuhur        *string `json:"gecici_muhur"`
	RecordVersion      int     `json:"record_version"`
}

type islemCreateRequest struct {
	Plaka           string  `json:"plaka"`
	IslemTuru       string  `json:"islem_turu"`
	AcilisUcreti    float64 `json:"acilis_ucreti"`
	ZamanTarifesi   float64 `json:"zaman_tarifesi"`
	MesafeTarifesi  float64 `json:"mesafe_tarifesi"`
	BirimZaman      *string `json:"birim_zaman"`
	BirimMesafe     *string `json:"birim_mesafe"`
	YapilanIslem    *string `json:"yapilan_islem"`
	IslemTarihi     string  `json:"islem_tarihi"`
	ClientTimezone  string  `json:"client_timezone"`
	WorkstationName string  `json:"workstation_name"`
	RequestID       string  `json:"request_id"`
}

func getMusteri(c *fiber.Ctx) error {
	plaka, err := normalizePlaka(c.Params("plaka"))
	if err != nil {
		return badRequest(c, err.Error())
	}

	m, err := readMusteri(db, plaka)
	if errors.Is(err, sql.ErrNoRows) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Müşteri bulunamadı"})
	}
	if err != nil {
		return internalError(c, "Müşteri okunamadı", err)
	}

	t, err := readTaksimetre(db, plaka)
	if errors.Is(err, sql.ErrNoRows) {
		t = nil
	} else if err != nil {
		return internalError(c, "Taksimetre okunamadı", err)
	}

	i, err := readLastIslem(plaka)
	if errors.Is(err, sql.ErrNoRows) {
		i = nil
	} else if err != nil {
		return internalError(c, "Son işlem okunamadı", err)
	}

	return c.JSON(fiber.Map{"musteri": m, "taksimetre": t, "sonIslem": i})
}

func upsertMusteri(c *fiber.Ctx) error {
	var d musteriUpsertRequest
	if err := c.BodyParser(&d); err != nil {
		return badRequest(c, "Geçersiz istek")
	}

	plaka, err := normalizePlaka(d.Plaka)
	if err != nil {
		return badRequest(c, err.Error())
	}
	if d.RecordVersion < 0 {
		return badRequest(c, "Kayıt sürümü geçersiz")
	}
	d.Plaka = plaka
	normalizeMusteriRequest(&d)
	if err := validateMusteriRequest(d); err != nil {
		return badRequest(c, err.Error())
	}

	tx, err := db.Begin()
	if err != nil {
		return internalError(c, "Kayıt işlemi başlatılamadı", err)
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM musteriler WHERE plaka = ?`, plaka).Scan(&currentVersion)
	newVersion := 1
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if d.RecordVersion != 0 {
			return conflict(c, "Bu plaka başka bir bilgisayarda oluşturulmuş. Güncel kaydı tekrar arayın.")
		}
		_, err = tx.Exec(`INSERT INTO musteriler
			(plaka, ad_soyad, tc_vergi_no, telefon, eposta, durak_adi, marka, model, sasi_no, lastik_ebadi, version)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
			plaka, nullIfEmpty(d.AdSoyad), nullIfEmpty(d.TcVergiNo), nullIfEmpty(d.Telefon), nullIfEmpty(d.Eposta),
			nullIfEmpty(d.DurakAdi), nullIfEmpty(d.Marka), nullIfEmpty(d.Model), nullIfEmpty(d.SasiNo), nullIfEmpty(d.LastikEbadi))
		if err != nil {
			return internalError(c, "Müşteri kaydedilemedi", err)
		}
	case err != nil:
		return internalError(c, "Mevcut kayıt sürümü okunamadı", err)
	default:
		if d.RecordVersion != currentVersion {
			return conflict(c, "Bu plaka başka bir bilgisayarda değiştirilmiş. Bilgileri yeniden aratıp güncel kaydı açın.")
		}
		result, updateErr := tx.Exec(`UPDATE musteriler SET
			ad_soyad=?, tc_vergi_no=?, telefon=?, eposta=?, durak_adi=?, marka=?, model=?, sasi_no=?, lastik_ebadi=?,
			version=version+1, updated_at=CURRENT_TIMESTAMP
			WHERE plaka=? AND version=?`,
			nullIfEmpty(d.AdSoyad), nullIfEmpty(d.TcVergiNo), nullIfEmpty(d.Telefon), nullIfEmpty(d.Eposta),
			nullIfEmpty(d.DurakAdi), nullIfEmpty(d.Marka), nullIfEmpty(d.Model), nullIfEmpty(d.SasiNo), nullIfEmpty(d.LastikEbadi),
			plaka, currentVersion)
		if updateErr != nil {
			return internalError(c, "Müşteri güncellenemedi", updateErr)
		}
		affected, affectedErr := result.RowsAffected()
		if affectedErr != nil {
			return internalError(c, "Kayıt sonucu doğrulanamadı", affectedErr)
		}
		if affected != 1 {
			return conflict(c, "Bu plaka eş zamanlı olarak değiştirildi. Güncel kaydı tekrar arayın.")
		}
		newVersion = currentVersion + 1
	}

	_, err = tx.Exec(`INSERT INTO taksimetreler
		(plaka, taksimetre_marka, taksimetre_model, seri_no, k_sabiti, kelebek_muhur_seri_no, gecici_muhur)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(plaka) DO UPDATE SET
			taksimetre_marka=excluded.taksimetre_marka,
			taksimetre_model=excluded.taksimetre_model,
			seri_no=excluded.seri_no,
			k_sabiti=excluded.k_sabiti,
			kelebek_muhur_seri_no=excluded.kelebek_muhur_seri_no,
			gecici_muhur=excluded.gecici_muhur,
			updated_at=CURRENT_TIMESTAMP`,
		plaka, nullIfEmpty(d.TaksimetreMarka), nullIfEmpty(d.TaksimetreModel), nullIfEmpty(d.SeriNo),
		nullIfEmpty(d.KSabiti), nullIfEmpty(d.KelebekMuhurSeriNo), nullIfEmpty(d.GeciciMuhur))
	if err != nil {
		return internalError(c, "Taksimetre kaydedilemedi", err)
	}

	if err := tx.Commit(); err != nil {
		return internalError(c, "Kayıt tamamlanamadı", err)
	}
	return c.JSON(fiber.Map{"success": true, "message": "Kayıt başarılı", "record_version": newVersion})
}

func createIslem(c *fiber.Ctx) error {
	var d islemCreateRequest
	if err := c.BodyParser(&d); err != nil {
		return badRequest(c, "Geçersiz istek")
	}
	plaka, err := normalizePlaka(d.Plaka)
	if err != nil {
		return badRequest(c, err.Error())
	}
	d.Plaka = plaka
	d.IslemTuru = strings.TrimSpace(d.IslemTuru)
	d.ClientTimezone = cleanString(d.ClientTimezone, 80)
	d.WorkstationName = cleanString(d.WorkstationName, 80)
	d.RequestID = cleanString(d.RequestID, 100)
	d.BirimZaman = cleanStringPtr(d.BirimZaman, 30)
	d.BirimMesafe = cleanStringPtr(d.BirimMesafe, 30)
	d.YapilanIslem = cleanStringPtr(d.YapilanIslem, 100)

	if d.IslemTuru != "tamir_ayar" && d.IslemTuru != "tarife_yukleme" {
		return badRequest(c, "Geçersiz işlem türü")
	}
	if d.WorkstationName == "" {
		return badRequest(c, "İşlem noktası/bilgisayar adı boş olamaz")
	}
	if !requestIDRegex.MatchString(d.RequestID) {
		return badRequest(c, "İşlem anahtarı geçersiz")
	}
	if err := validateMoney(d.AcilisUcreti, d.ZamanTarifesi, d.MesafeTarifesi); err != nil {
		return badRequest(c, err.Error())
	}
	if d.IslemTuru == "tarife_yukleme" && (isEmpty(d.BirimZaman) || isEmpty(d.BirimMesafe)) {
		return badRequest(c, "Birim zaman ve birim mesafe zorunludur")
	}

	islemTarihi, err := resolveClientDateTime(d.IslemTarihi)
	if err != nil {
		return badRequest(c, err.Error())
	}
	d.AcilisUcreti = roundCurrency(d.AcilisUcreti)
	d.ZamanTarifesi = roundCurrency(d.ZamanTarifesi)
	d.MesafeTarifesi = roundCurrency(d.MesafeTarifesi)
	createdBy, _ := c.Locals("auth_email").(string)

	tx, err := db.Begin()
	if err != nil {
		return internalError(c, "İşlem başlatılamadı", err)
	}
	defer tx.Rollback()

	existing, existingErr := readIslemByRequestID(tx, d.RequestID)
	if existingErr == nil {
		if existing.Plaka != plaka || existing.IslemTuru != d.IslemTuru {
			return conflict(c, "Aynı işlem anahtarı farklı bir kayıt için daha önce kullanılmış")
		}
		return respondWithExistingIslem(c, existing)
	}
	if !errors.Is(existingErr, sql.ErrNoRows) {
		return internalError(c, "Önceki işlem isteği kontrol edilemedi", existingErr)
	}

	m, err := readMusteri(tx, plaka)
	if errors.Is(err, sql.ErrNoRows) {
		return badRequest(c, "Önce müşteri ve araç bilgilerini kaydedin")
	}
	if err != nil {
		return internalError(c, "Müşteri bilgileri okunamadı", err)
	}
	t, err := readTaksimetre(tx, plaka)
	if errors.Is(err, sql.ErrNoRows) {
		return badRequest(c, "Önce taksimetre bilgilerini kaydedin")
	}
	if err != nil {
		return internalError(c, "Taksimetre bilgileri okunamadı", err)
	}

	belgeNo, err := createDocumentNumber(islemTarihi)
	if err != nil {
		return internalError(c, "Belge numarası üretilemedi", err)
	}
	snapshot := BelgeSnapshot{
		Plaka: plaka, AdSoyad: m.AdSoyad, TcVergiNo: m.TcVergiNo, Telefon: m.Telefon, Eposta: m.Eposta,
		DurakAdi: m.DurakAdi, Marka: m.Marka, Model: m.Model, SasiNo: m.SasiNo, LastikEbadi: m.LastikEbadi,
		TaksimetreMarka: t.TaksimetreMarka, TaksimetreModel: t.TaksimetreModel, SeriNo: t.SeriNo,
		KSabiti: t.KSabiti, KelebekMuhurSeriNo: t.KelebekMuhurSeriNo, GeciciMuhur: t.GeciciMuhur,
		IslemTuru: d.IslemTuru, AcilisUcreti: d.AcilisUcreti, ZamanTarifesi: d.ZamanTarifesi,
		MesafeTarifesi: d.MesafeTarifesi, BirimZaman: d.BirimZaman, BirimMesafe: d.BirimMesafe,
		YapilanIslem: d.YapilanIslem, BelgeNo: belgeNo, IslemTarihi: islemTarihi,
		IslemYapanKullanici: createdBy, IstemciSaatDilimi: d.ClientTimezone, IslemNoktasi: d.WorkstationName,
	}
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		return internalError(c, "Belge özeti oluşturulamadı", err)
	}

	_, err = tx.Exec(`INSERT INTO islemler
		(plaka, islem_turu, acilis_ucreti, zaman_tarifesi, mesafe_tarifesi, birim_zaman, birim_mesafe,
		 belge_no, yapilan_islem, islem_tarihi, snapshot_json, created_by, client_timezone, workstation_name, request_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		plaka, d.IslemTuru, d.AcilisUcreti, d.ZamanTarifesi, d.MesafeTarifesi, nullIfEmpty(d.BirimZaman),
		nullIfEmpty(d.BirimMesafe), belgeNo, nullIfEmpty(d.YapilanIslem), islemTarihi, string(snapshotJSON),
		createdBy, d.ClientTimezone, d.WorkstationName, d.RequestID)
	if err != nil {
		// İstemci aynı isteği bağlantı sorunu nedeniyle tekrar göndermiş olabilir.
		if duplicate, duplicateErr := readIslemByRequestID(tx, d.RequestID); duplicateErr == nil {
			return respondWithExistingIslem(c, duplicate)
		}
		return internalError(c, "İşlem kaydedilemedi", err)
	}
	if err := tx.Commit(); err != nil {
		return internalError(c, "İşlem tamamlanamadı", err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true, "belge_no": belgeNo, "islem_tarihi": islemTarihi, "snapshot": snapshot,
	})
}

func getBelge(c *fiber.Ctx) error {
	belgeNo := strings.TrimSpace(c.Params("belgeNo"))
	if len(belgeNo) < 8 || len(belgeNo) > 60 {
		return badRequest(c, "Geçersiz belge numarası")
	}

	i, err := readIslemByBelgeNo(belgeNo)
	if errors.Is(err, sql.ErrNoRows) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Belge bulunamadı"})
	}
	if err != nil {
		return internalError(c, "Belge okunamadı", err)
	}

	if strings.TrimSpace(i.SnapshotJSON) != "" {
		var snapshot BelgeSnapshot
		unmarshalErr := json.Unmarshal([]byte(i.SnapshotJSON), &snapshot)
		if unmarshalErr == nil {
			return c.JSON(fiber.Map{"islem": i, "snapshot": snapshot})
		}
		log.Printf("Belge snapshot çözülemedi (%s): %v", belgeNo, unmarshalErr)
	}

	// Eski kayıtlar için geriye dönük uyumluluk. Yeni belgeler her zaman snapshot kullanır.
	m, err := readMusteri(db, i.Plaka)
	if err != nil {
		return internalError(c, "Eski belge müşteri bilgileri okunamadı", err)
	}
	t, err := readTaksimetre(db, i.Plaka)
	if err != nil {
		return internalError(c, "Eski belge taksimetre bilgileri okunamadı", err)
	}
	return c.JSON(fiber.Map{"islem": i, "musteri": m, "taksimetre": t, "legacy": true})
}

func getIslemGecmisi(c *fiber.Ctx) error {
	plaka, err := normalizePlaka(c.Params("plaka"))
	if err != nil {
		return badRequest(c, err.Error())
	}
	rows, err := db.Query(`SELECT id, plaka, islem_turu, acilis_ucreti, zaman_tarifesi, mesafe_tarifesi,
		birim_zaman, birim_mesafe, belge_no, yapilan_islem, islem_tarihi, created_at,
		COALESCE(snapshot_json,''), COALESCE(created_by,''), COALESCE(client_timezone,''),
		COALESCE(workstation_name,''), COALESCE(request_id,'')
		FROM islemler WHERE plaka = ? ORDER BY id DESC LIMIT 500`, plaka)
	if err != nil {
		return internalError(c, "İşlem geçmişi okunamadı", err)
	}
	defer rows.Close()

	islemler := make([]Islem, 0)
	for rows.Next() {
		var i Islem
		if err := scanIslem(rows, &i); err != nil {
			return internalError(c, "İşlem geçmişi çözülemedi", err)
		}
		islemler = append(islemler, i)
	}
	if err := rows.Err(); err != nil {
		return internalError(c, "İşlem geçmişi tamamlanamadı", err)
	}
	return c.JSON(islemler)
}

func getTarifeler(c *fiber.Ctx) error {
	rows, err := db.Query(`SELECT tip, acilis_ucreti, zaman_tarifesi, mesafe_tarifesi,
		birim_zaman, birim_mesafe, version, updated_at FROM tarifeler ORDER BY tip`)
	if err != nil {
		return internalError(c, "Tarifeler okunamadı", err)
	}
	defer rows.Close()

	tarifeler := make([]Tarife, 0)
	for rows.Next() {
		var t Tarife
		if err := rows.Scan(&t.Tip, &t.AcilisUcreti, &t.ZamanTarifesi, &t.MesafeTarifesi, &t.BirimZaman, &t.BirimMesafe, &t.Version, &t.UpdatedAt); err != nil {
			return internalError(c, "Tarife bilgisi çözülemedi", err)
		}
		tarifeler = append(tarifeler, t)
	}
	if err := rows.Err(); err != nil {
		return internalError(c, "Tarifeler tamamlanamadı", err)
	}
	return c.JSON(tarifeler)
}

func upsertTarife(c *fiber.Ctx) error {
	var d Tarife
	if err := c.BodyParser(&d); err != nil {
		return badRequest(c, "Geçersiz istek")
	}
	d.Tip = strings.TrimSpace(d.Tip)
	if d.Tip != "İl" && d.Tip != "İlçe" {
		return badRequest(c, "Tarife tipi yalnızca İl veya İlçe olabilir")
	}
	if d.Version < 0 {
		return badRequest(c, "Tarife sürümü geçersiz")
	}
	d.BirimZaman = cleanStringPtr(d.BirimZaman, 30)
	d.BirimMesafe = cleanStringPtr(d.BirimMesafe, 30)
	if isEmpty(d.BirimZaman) || isEmpty(d.BirimMesafe) {
		return badRequest(c, "Birim zaman ve birim mesafe zorunludur")
	}
	if err := validateMoney(d.AcilisUcreti, d.ZamanTarifesi, d.MesafeTarifesi); err != nil {
		return badRequest(c, err.Error())
	}
	d.AcilisUcreti = roundCurrency(d.AcilisUcreti)
	d.ZamanTarifesi = roundCurrency(d.ZamanTarifesi)
	d.MesafeTarifesi = roundCurrency(d.MesafeTarifesi)

	tx, err := db.Begin()
	if err != nil {
		return internalError(c, "Tarife işlemi başlatılamadı", err)
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM tarifeler WHERE tip = ?`, d.Tip).Scan(&currentVersion)
	newVersion := 1
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if d.Version != 0 {
			return conflict(c, "Bu tarife başka bir bilgisayarda oluşturuldu. Sayfayı yenileyin.")
		}
		_, err = tx.Exec(`INSERT INTO tarifeler
			(tip, acilis_ucreti, zaman_tarifesi, mesafe_tarifesi, birim_zaman, birim_mesafe, version)
			VALUES (?, ?, ?, ?, ?, ?, 1)`, d.Tip, d.AcilisUcreti, d.ZamanTarifesi, d.MesafeTarifesi,
			nullIfEmpty(d.BirimZaman), nullIfEmpty(d.BirimMesafe))
		if err != nil {
			return internalError(c, "Tarife kaydedilemedi", err)
		}
	case err != nil:
		return internalError(c, "Tarife sürümü okunamadı", err)
	default:
		if d.Version != currentVersion {
			return conflict(c, "Bu tarife başka bir bilgisayarda değiştirildi. Sayfayı yenileyip tekrar deneyin.")
		}
		result, updateErr := tx.Exec(`UPDATE tarifeler SET
			acilis_ucreti=?, zaman_tarifesi=?, mesafe_tarifesi=?, birim_zaman=?, birim_mesafe=?,
			version=version+1, updated_at=CURRENT_TIMESTAMP WHERE tip=? AND version=?`,
			d.AcilisUcreti, d.ZamanTarifesi, d.MesafeTarifesi, nullIfEmpty(d.BirimZaman), nullIfEmpty(d.BirimMesafe),
			d.Tip, currentVersion)
		if updateErr != nil {
			return internalError(c, "Tarife güncellenemedi", updateErr)
		}
		affected, affectedErr := result.RowsAffected()
		if affectedErr != nil {
			return internalError(c, "Tarife sonucu doğrulanamadı", affectedErr)
		}
		if affected != 1 {
			return conflict(c, "Tarife eş zamanlı olarak değiştirildi. Sayfayı yenileyin.")
		}
		newVersion = currentVersion + 1
	}

	if err := tx.Commit(); err != nil {
		return internalError(c, "Tarife kaydı tamamlanamadı", err)
	}
	return c.JSON(fiber.Map{"success": true, "message": "Tarife kaydedildi", "version": newVersion})
}

type rowScanner interface {
	Scan(dest ...any) error
}

type queryer interface {
	QueryRow(query string, args ...any) *sql.Row
}

func readMusteri(q queryer, plaka string) (*Musteri, error) {
	m := new(Musteri)
	err := q.QueryRow(`SELECT plaka, ad_soyad, tc_vergi_no, telefon, eposta, durak_adi,
		marka, model, sasi_no, lastik_ebadi, version, created_at, updated_at
		FROM musteriler WHERE plaka = ?`, plaka).Scan(
		&m.Plaka, &m.AdSoyad, &m.TcVergiNo, &m.Telefon, &m.Eposta, &m.DurakAdi,
		&m.Marka, &m.Model, &m.SasiNo, &m.LastikEbadi, &m.Version, &m.CreatedAt, &m.UpdatedAt)
	return m, err
}

func readTaksimetre(q queryer, plaka string) (*Taksimetre, error) {
	t := new(Taksimetre)
	err := q.QueryRow(`SELECT id, plaka, taksimetre_marka, taksimetre_model, seri_no,
		k_sabiti, kelebek_muhur_seri_no, gecici_muhur, created_at, updated_at
		FROM taksimetreler WHERE plaka = ? ORDER BY id DESC LIMIT 1`, plaka).Scan(
		&t.ID, &t.Plaka, &t.TaksimetreMarka, &t.TaksimetreModel, &t.SeriNo,
		&t.KSabiti, &t.KelebekMuhurSeriNo, &t.GeciciMuhur, &t.CreatedAt, &t.UpdatedAt)
	return t, err
}

func readLastIslem(plaka string) (*Islem, error) {
	i := new(Islem)
	err := scanIslem(db.QueryRow(`SELECT id, plaka, islem_turu, acilis_ucreti, zaman_tarifesi,
		mesafe_tarifesi, birim_zaman, birim_mesafe, belge_no, yapilan_islem, islem_tarihi,
		created_at, COALESCE(snapshot_json,''), COALESCE(created_by,''), COALESCE(client_timezone,''),
		COALESCE(workstation_name,''), COALESCE(request_id,'')
		FROM islemler WHERE plaka = ? ORDER BY id DESC LIMIT 1`, plaka), i)
	return i, err
}

func readIslemByBelgeNo(belgeNo string) (*Islem, error) {
	i := new(Islem)
	err := scanIslem(db.QueryRow(`SELECT id, plaka, islem_turu, acilis_ucreti, zaman_tarifesi,
		mesafe_tarifesi, birim_zaman, birim_mesafe, belge_no, yapilan_islem, islem_tarihi,
		created_at, COALESCE(snapshot_json,''), COALESCE(created_by,''), COALESCE(client_timezone,''),
		COALESCE(workstation_name,''), COALESCE(request_id,'')
		FROM islemler WHERE belge_no = ?`, belgeNo), i)
	return i, err
}

func readIslemByRequestID(q queryer, requestID string) (*Islem, error) {
	i := new(Islem)
	err := scanIslem(q.QueryRow(`SELECT id, plaka, islem_turu, acilis_ucreti, zaman_tarifesi,
		mesafe_tarifesi, birim_zaman, birim_mesafe, belge_no, yapilan_islem, islem_tarihi,
		created_at, COALESCE(snapshot_json,''), COALESCE(created_by,''), COALESCE(client_timezone,''),
		COALESCE(workstation_name,''), COALESCE(request_id,'')
		FROM islemler WHERE request_id = ?`, requestID), i)
	return i, err
}

func respondWithExistingIslem(c *fiber.Ctx, i *Islem) error {
	var snapshot BelgeSnapshot
	if strings.TrimSpace(i.SnapshotJSON) == "" || json.Unmarshal([]byte(i.SnapshotJSON), &snapshot) != nil {
		return internalError(c, "Tekrarlanan işlemin belge özeti okunamadı", errors.New("snapshot eksik veya geçersiz"))
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true, "duplicate": true, "belge_no": i.BelgeNo, "islem_tarihi": i.IslemTarihi, "snapshot": snapshot,
	})
}

func scanIslem(row rowScanner, i *Islem) error {
	return row.Scan(&i.ID, &i.Plaka, &i.IslemTuru, &i.AcilisUcreti, &i.ZamanTarifesi,
		&i.MesafeTarifesi, &i.BirimZaman, &i.BirimMesafe, &i.BelgeNo, &i.YapilanIslem,
		&i.IslemTarihi, &i.CreatedAt, &i.SnapshotJSON, &i.CreatedBy, &i.ClientTimezone, &i.WorkstationName, &i.RequestID)
}

func normalizePlaka(value string) (string, error) {
	plaka := strings.ToUpper(strings.TrimSpace(value))
	plaka = strings.NewReplacer(" ", "", "-", "", ".", "").Replace(plaka)
	if !plakaRegex.MatchString(plaka) {
		return "", errors.New("Plaka geçersiz. Örnek: 07T2859")
	}
	return plaka, nil
}

func normalizeMusteriRequest(d *musteriUpsertRequest) {
	d.AdSoyad = cleanStringPtr(d.AdSoyad, 150)
	d.TcVergiNo = cleanStringPtr(d.TcVergiNo, 11)
	d.Telefon = cleanStringPtr(d.Telefon, 20)
	d.Eposta = cleanStringPtr(d.Eposta, 150)
	d.DurakAdi = cleanStringPtr(d.DurakAdi, 200)
	d.Marka = cleanStringPtr(d.Marka, 80)
	d.Model = cleanStringPtr(d.Model, 80)
	d.SasiNo = cleanStringPtr(d.SasiNo, 50)
	d.LastikEbadi = cleanStringPtr(d.LastikEbadi, 40)
	d.TaksimetreMarka = cleanStringPtr(d.TaksimetreMarka, 80)
	d.TaksimetreModel = cleanStringPtr(d.TaksimetreModel, 80)
	d.SeriNo = cleanStringPtr(d.SeriNo, 80)
	d.KSabiti = cleanStringPtr(d.KSabiti, 40)
	d.KelebekMuhurSeriNo = cleanStringPtr(d.KelebekMuhurSeriNo, 80)
	d.GeciciMuhur = cleanStringPtr(d.GeciciMuhur, 80)
}

func validateMusteriRequest(d musteriUpsertRequest) error {
	if !isEmpty(d.TcVergiNo) {
		value := strings.TrimSpace(*d.TcVergiNo)
		if (len(value) != 10 && len(value) != 11) || !digitRegex.MatchString(value) {
			return errors.New("T.C. kimlik/vergi no 10 veya 11 rakam olmalıdır")
		}
	}
	if !isEmpty(d.Telefon) && !phoneRegex.MatchString(*d.Telefon) {
		return errors.New("Telefon numarası geçersiz")
	}
	if !isEmpty(d.Eposta) {
		parsed, err := mail.ParseAddress(*d.Eposta)
		if err != nil || !strings.Contains(parsed.Address, "@") {
			return errors.New("E-posta adresi geçersiz")
		}
	}
	return nil
}

func cleanStringPtr(value *string, maxLength int) *string {
	if value == nil {
		return nil
	}
	cleaned := cleanString(*value, maxLength)
	return &cleaned
}

func cleanString(value string, maxLength int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) > maxLength {
		value = string(runes[:maxLength])
	}
	return value
}

func nullIfEmpty(value *string) any {
	if isEmpty(value) {
		return nil
	}
	return *value
}

func isEmpty(value *string) bool {
	return value == nil || strings.TrimSpace(*value) == ""
}

func validateMoney(values ...float64) error {
	for _, value := range values {
		if math.IsNaN(value) || math.IsInf(value, 0) || value < 0 || value > 1_000_000 {
			return errors.New("Tarife değerleri 0 ile 1.000.000 arasında olmalıdır")
		}
	}
	return nil
}

func roundCurrency(value float64) float64 {
	return math.Round(value*100) / 100
}

func resolveClientDateTime(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Now().Format("2006-01-02 15:04:05"), nil
	}
	parsed, err := time.ParseInLocation("2006-01-02 15:04:05", value, time.Local)
	if err != nil {
		return "", errors.New("Bilgisayar tarih/saat bilgisi geçersiz")
	}
	if parsed.Year() < 2000 || parsed.Year() > 2100 {
		return "", errors.New("Bilgisayar tarih/saat ayarını kontrol edin")
	}
	// Belge tarihi, siteyi kullanan bilgisayarın tarayıcısından gelir.
	// Sunucu başka bir bilgisayarda bulunabileceği için sunucu saatiyle eşitlik zorlanmaz.
	// Sunucunun gerçek kayıt zamanı ayrıca created_at alanında tutulur.
	return parsed.Format("2006-01-02 15:04:05"), nil
}

func createDocumentNumber(tarih string) (string, error) {
	parsed, err := time.ParseInLocation("2006-01-02 15:04:05", tarih, time.Local)
	if err != nil {
		return "", err
	}
	randomBytes := make([]byte, 5)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("BLG-%s-%s", parsed.Format("20060102-150405"), strings.ToUpper(hex.EncodeToString(randomBytes))), nil
}

func badRequest(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": message})
}

func conflict(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": message})
}

func internalError(c *fiber.Ctx, context string, err error) error {
	log.Printf("%s: %v", context, err)
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": context})
}
