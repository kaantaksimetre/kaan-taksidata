package main

import (
	"bufio"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/argon2"
)

const (
	sessionCookie    = "taksimetre_session"
	sessionLifetime  = 12 * time.Hour
	maxLoginAttempts = 5
)

type authConfig struct {
	Email        string `json:"email"`
	PasswordSalt string `json:"password_salt"`
	PasswordHash string `json:"password_hash"`
}

type sessionInfo struct {
	Email     string
	ExpiresAt time.Time
}

type loginAttempt struct {
	Count       int
	BlockedTill time.Time
	LastAttempt time.Time
}

var (
	currentAuthConfig authConfig
	sessions          = map[string]sessionInfo{}
	sessionsMu        sync.Mutex
	loginAttempts     = map[string]loginAttempt{}
	loginAttemptsMu   sync.Mutex
)

func initAuth() {
	envEmail := strings.TrimSpace(os.Getenv("TAKSIMETRE_ADMIN_EMAIL"))
	envPassword := os.Getenv("TAKSIMETRE_ADMIN_PASSWORD")
	isProduction := strings.TrimSpace(os.Getenv("RENDER")) != "" || strings.TrimSpace(os.Getenv("TAKSIMETRE_ENV")) == "production"

	if envEmail != "" || envPassword != "" {
		if envEmail == "" || envPassword == "" {
			log.Fatal("TAKSIMETRE_ADMIN_EMAIL ve TAKSIMETRE_ADMIN_PASSWORD birlikte tanımlanmalıdır")
		}
		cfg, err := newAuthConfig(envEmail, envPassword)
		if err != nil {
			log.Fatalf("Ortam değişkenlerindeki kullanıcı bilgileri geçersiz: %v", err)
		}
		currentAuthConfig = cfg
		log.Printf("Yönetici hesabı ortam değişkenlerinden yüklendi: %s", cfg.Email)
		return
	}

	if isProduction {
		log.Fatal("Üretim ortamında yönetici e-posta ve şifre zorunludur! Lütfen TAKSIMETRE_ADMIN_EMAIL ve TAKSIMETRE_ADMIN_PASSWORD ortam değişkenlerini tanımlayın.")
	}

	cfg, err := readAuthConfig()
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			log.Fatalf("Kimlik doğrulama ayarları okunamadı: %v", err)
		}
		cfg, err = newAuthConfig("admin@kaan.local", "KaanTaksi123!")
		if err != nil {
			log.Fatalf("Varsayılan kullanıcı oluşturulamadı: %v", err)
		}
		if err := writeAuthConfig(cfg); err != nil {
			log.Fatalf("Kimlik doğrulama ayarları kaydedilemedi: %v", err)
		}
		log.Println("İlk kullanıcı oluşturuldu. E-posta: admin@kaan.local | Geçici şifre: KaanTaksi123!")
		log.Println("Gerçek kullanımdan önce SIFRE_DEGISTIR.bat dosyasını çalıştırın.")
	}
	currentAuthConfig = cfg
}

func configuredAuthConfigPath() string {
	value := strings.TrimSpace(os.Getenv("TAKSIMETRE_AUTH_CONFIG_PATH"))
	if value == "" {
		return "./auth_config.json"
	}
	return value
}

func readAuthConfig() (authConfig, error) {
	var cfg authConfig
	data, err := os.ReadFile(configuredAuthConfigPath())
	if err != nil {
		return cfg, err
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return cfg, err
	}
	cfg.Email = strings.ToLower(strings.TrimSpace(cfg.Email))
	if cfg.Email == "" || cfg.PasswordSalt == "" || cfg.PasswordHash == "" {
		return cfg, errors.New("auth_config.json eksik veya geçersiz")
	}
	return cfg, nil
}

func writeAuthConfig(cfg authConfig) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	path := configuredAuthConfigPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil && filepath.Dir(path) != "." {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func newAuthConfig(email, password string) (authConfig, error) {
	var cfg authConfig
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || !strings.Contains(email, "@") {
		return cfg, errors.New("geçerli bir e-posta girin")
	}
	if len(password) < 10 {
		return cfg, errors.New("şifre en az 10 karakter olmalıdır")
	}

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return cfg, err
	}
	hash := derivePasswordHash(password, salt)
	cfg.Email = email
	cfg.PasswordSalt = base64.RawStdEncoding.EncodeToString(salt)
	cfg.PasswordHash = base64.RawStdEncoding.EncodeToString(hash)
	return cfg, nil
}

func derivePasswordHash(password string, salt []byte) []byte {
	return argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
}

func verifyCredentials(email, password string) bool {
	if subtle.ConstantTimeCompare([]byte(strings.ToLower(strings.TrimSpace(email))), []byte(currentAuthConfig.Email)) != 1 {
		// Kullanıcı adı bulunup bulunmadığını belli etmemek için aynı maliyetli hesabı yine yap.
		fakeSalt := make([]byte, 16)
		_ = derivePasswordHash(password, fakeSalt)
		return false
	}

	salt, err := base64.RawStdEncoding.DecodeString(currentAuthConfig.PasswordSalt)
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(currentAuthConfig.PasswordHash)
	if err != nil {
		return false
	}
	actual := derivePasswordHash(password, salt)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func setCredentialsInteractive() error {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Yeni e-posta: ")
	email, _ := reader.ReadString('\n')
	fmt.Print("Yeni şifre (en az 10 karakter): ")
	password, _ := reader.ReadString('\n')

	cfg, err := newAuthConfig(strings.TrimSpace(email), strings.TrimSpace(password))
	if err != nil {
		return err
	}
	if err := writeAuthConfig(cfg); err != nil {
		return err
	}
	fmt.Println("Kullanıcı bilgileri güncellendi.")
	return nil
}

func loginHandler(c *fiber.Ctx) error {
	ip := c.IP()
	if wait, blocked := loginBlocked(ip); blocked {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": fmt.Sprintf("Çok fazla hatalı deneme. %d dakika sonra tekrar deneyin.", int(wait.Minutes())+1),
		})
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz giriş isteği"})
	}
	if !verifyCredentials(req.Email, req.Password) {
		recordFailedLogin(ip)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "E-posta veya şifre hatalı"})
	}
	clearLoginAttempts(ip)

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		log.Printf("Oturum anahtarı üretilemedi: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Oturum başlatılamadı"})
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	expires := time.Now().Add(sessionLifetime)

	sessionsMu.Lock()
	cleanupExpiredSessionsLocked()
	sessions[token] = sessionInfo{Email: currentAuthConfig.Email, ExpiresAt: expires}
	sessionsMu.Unlock()

	c.Cookie(&fiber.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Strict",
		Secure:   secureSessionCookies(),
		Expires:  expires,
		MaxAge:   int(sessionLifetime.Seconds()),
	})
	return c.JSON(fiber.Map{"success": true, "email": currentAuthConfig.Email})
}

func logoutHandler(c *fiber.Ctx) error {
	token := c.Cookies(sessionCookie)
	if token != "" {
		sessionsMu.Lock()
		delete(sessions, token)
		sessionsMu.Unlock()
	}
	clearSessionCookie(c)
	return c.JSON(fiber.Map{"success": true})
}

func meHandler(c *fiber.Ctx) error {
	info, ok := getValidSession(c.Cookies(sessionCookie))
	if !ok {
		clearSessionCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Oturum bulunamadı"})
	}
	return c.JSON(fiber.Map{"authenticated": true, "email": info.Email})
}

func authRequired(c *fiber.Ctx) error {
	info, ok := getValidSession(c.Cookies(sessionCookie))
	if !ok {
		clearSessionCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Bu işlem için giriş yapmalısınız"})
	}
	c.Locals("auth_email", info.Email)
	return c.Next()
}

func getValidSession(token string) (sessionInfo, bool) {
	if token == "" {
		return sessionInfo{}, false
	}
	sessionsMu.Lock()
	defer sessionsMu.Unlock()
	cleanupExpiredSessionsLocked()
	info, ok := sessions[token]
	return info, ok
}

func cleanupExpiredSessionsLocked() {
	now := time.Now()
	for token, info := range sessions {
		if now.After(info.ExpiresAt) {
			delete(sessions, token)
		}
	}
}

func clearSessionCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Strict",
		Secure:   secureSessionCookies(),
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func secureSessionCookies() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("TAKSIMETRE_SECURE_COOKIES")))
	if value == "1" || value == "true" || value == "yes" {
		return true
	}
	return strings.TrimSpace(os.Getenv("RENDER")) != ""
}

func loginBlocked(ip string) (time.Duration, bool) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	attempt, ok := loginAttempts[ip]
	if !ok {
		return 0, false
	}
	if time.Now().After(attempt.BlockedTill) {
		if time.Since(attempt.LastAttempt) > 15*time.Minute {
			delete(loginAttempts, ip)
		}
		return 0, false
	}
	return time.Until(attempt.BlockedTill), true
}

func recordFailedLogin(ip string) {
	loginAttemptsMu.Lock()
	defer loginAttemptsMu.Unlock()
	attempt := loginAttempts[ip]
	if time.Since(attempt.LastAttempt) > 15*time.Minute {
		attempt.Count = 0
	}
	attempt.Count++
	attempt.LastAttempt = time.Now()
	if attempt.Count >= maxLoginAttempts {
		attempt.BlockedTill = time.Now().Add(15 * time.Minute)
		attempt.Count = 0
	}
	loginAttempts[ip] = attempt
}

func clearLoginAttempts(ip string) {
	loginAttemptsMu.Lock()
	delete(loginAttempts, ip)
	loginAttemptsMu.Unlock()
}
