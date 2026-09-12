package main

import (
	"log"
	"net"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--set-credentials":
			if err := setCredentialsInteractive(); err != nil {
				log.Fatal(err)
			}
			return
		case "--restore-db":
			if len(os.Args) < 3 {
				log.Fatal("Kullanım: go run . --restore-db C:\\Yedekler\\taksimetre-yedek.db")
			}
			if err := restoreDatabaseFromFile(os.Args[2]); err != nil {
				log.Fatal(err)
			}
			log.Println("Veritabanı yedeği başarıyla geri yüklendi.")
			return
		}
	}

	initAuth()
	initDB()

	config := fiber.Config{
		AppName:               "Kaan Taksimetre Yönetim Sistemi",
		DisableStartupMessage: true,
		BodyLimit:             2 * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if fiberErr, ok := err.(*fiber.Error); ok {
				code = fiberErr.Code
			}
			if code >= 500 {
				log.Printf("Sunucu hatası: %v", err)
			}
			return c.Status(code).JSON(fiber.Map{"error": "İşlem tamamlanamadı"})
		},
	}
	if envBool("TAKSIMETRE_TRUST_PROXY") || strings.TrimSpace(os.Getenv("RENDER")) != "" {
		config.ProxyHeader = fiber.HeaderXForwardedFor
	}
	app := fiber.New(config)
	app.Use(recover.New())

	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("Referrer-Policy", "no-referrer")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		if strings.HasPrefix(c.Path(), "/api/") {
			c.Set("Cache-Control", "no-store")
			c.Set("Pragma", "no-cache")
		}
		return c.Next()
	})

	api := app.Group("/api")
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": appVersion})
	})
	api.Post("/auth/login", loginHandler)
	api.Post("/auth/logout", logoutHandler)
	api.Get("/auth/me", meHandler)
	api.Get("/backup/automated", automatedBackup)

	protected := api.Group("", authRequired)
	protected.Get("/musteri/:plaka", getMusteri)
	protected.Post("/musteri", upsertMusteri)
	protected.Post("/islem", createIslem)
	protected.Get("/islem/belge/:belgeNo", getBelge)
	protected.Get("/islem/filtrele", filterIslemler)
	protected.Get("/islem/:plaka", getIslemGecmisi)
	protected.Get("/tarifeler", getTarifeler)
	protected.Post("/tarifeler", upsertTarife)
	protected.Get("/backup/status", getBackupStatus)
	protected.Get("/backup/download", downloadBackup)

	publicDir := strings.TrimSpace(os.Getenv("TAKSIMETRE_PUBLIC_DIR"))
	if publicDir == "" {
		publicDir = "./public"
	}
	if _, err := os.Stat(publicDir); err == nil {
		app.Static("/", publicDir)
		app.Get("/*", func(c *fiber.Ctx) error {
			if strings.HasPrefix(c.Path(), "/api/") {
				return c.SendStatus(fiber.StatusNotFound)
			}
			return c.SendFile(publicDir + "/index.html")
		})
	}

	host := strings.TrimSpace(os.Getenv("TAKSIMETRE_HOST"))
	port := strings.TrimSpace(os.Getenv("TAKSIMETRE_PORT"))
	if port == "" {
		port = strings.TrimSpace(os.Getenv("PORT"))
	}
	if port == "" {
		port = "3000"
	}
	if host == "" {
		if strings.TrimSpace(os.Getenv("PORT")) != "" || strings.TrimSpace(os.Getenv("RENDER")) != "" {
			host = "0.0.0.0"
		} else {
			host = "127.0.0.1"
		}
	}
	if portNumber, err := strconv.Atoi(port); err != nil || portNumber < 1 || portNumber > 65535 {
		log.Fatalf("Geçersiz port değeri: %q", port)
	}

	address := net.JoinHostPort(host, port)
	log.Printf("Kaan Taksimetre sunucusu başladı. Sürüm: %s", appVersion)
	if host == "0.0.0.0" || host == "::" {
		log.Printf("Bu bilgisayarda: http://127.0.0.1:%s", port)
		for _, ip := range localIPv4Addresses() {
			log.Printf("Yerel ağda: http://%s:%s", ip, port)
		}
	} else {
		log.Printf("Adres: http://%s", address)
	}

	listenErrors := make(chan error, 1)
	go func() { listenErrors <- app.Listen(address) }()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	select {
	case sig := <-signals:
		log.Printf("Kapatma sinyali alındı: %s", sig)
		if err := app.Shutdown(); err != nil {
			log.Printf("HTTP sunucusu kapatılırken hata: %v", err)
		}
		if backupPath, err := createConsistentBackup("kapanis"); err != nil {
			log.Printf("Kapanış yedeği alınamadı: %v", err)
		} else {
			log.Printf("Kapanış yedeği alındı: %s", backupPath)
		}
		_, _ = db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
		_ = db.Close()
	case err := <-listenErrors:
		if err != nil {
			log.Fatal(err)
		}
	}
}

func envBool(name string) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	return value == "1" || value == "true" || value == "yes"
}

func localIPv4Addresses() []string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil
	}

	seen := make(map[string]struct{})
	var result []string
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addresses, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, address := range addresses {
			var ip net.IP
			switch value := address.(type) {
			case *net.IPNet:
				ip = value.IP
			case *net.IPAddr:
				ip = value.IP
			}
			ipv4 := ip.To4()
			if ipv4 == nil || ipv4.IsLoopback() || ipv4.IsLinkLocalUnicast() {
				continue
			}
			text := ipv4.String()
			if _, ok := seen[text]; ok {
				continue
			}
			seen[text] = struct{}{}
			result = append(result, text)
		}
	}
	return result
}
