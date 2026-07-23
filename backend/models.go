package main

type Musteri struct {
	Plaka       string  `json:"plaka"`
	AdSoyad     *string `json:"ad_soyad"`
	TcVergiNo   *string `json:"tc_vergi_no"`
	Telefon     *string `json:"telefon"`
	Eposta      *string `json:"eposta"`
	DurakAdi    *string `json:"durak_adi"`
	Marka       *string `json:"marka"`
	Model       *string `json:"model"`
	SasiNo      *string `json:"sasi_no"`
	LastikEbadi *string `json:"lastik_ebadi"`
	Version     int     `json:"version"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type Taksimetre struct {
	ID                 int     `json:"id"`
	Plaka              string  `json:"plaka"`
	TaksimetreMarka    *string `json:"taksimetre_marka"`
	TaksimetreModel    *string `json:"taksimetre_model"`
	SeriNo             *string `json:"seri_no"`
	KSabiti            *string `json:"k_sabiti"`
	KelebekMuhurSeriNo *string `json:"kelebek_muhur_seri_no"`
	GeciciMuhur        *string `json:"gecici_muhur"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

type Islem struct {
	ID              int     `json:"id"`
	Plaka           string  `json:"plaka"`
	IslemTuru       string  `json:"islem_turu"`
	AcilisUcreti    float64 `json:"acilis_ucreti"`
	ZamanTarifesi   float64 `json:"zaman_tarifesi"`
	MesafeTarifesi  float64 `json:"mesafe_tarifesi"`
	BirimZaman      *string `json:"birim_zaman"`
	BirimMesafe     *string `json:"birim_mesafe"`
	BelgeNo         string  `json:"belge_no"`
	YapilanIslem    *string `json:"yapilan_islem"`
	IslemTarihi     string  `json:"islem_tarihi"`
	CreatedAt       string  `json:"created_at"`
	CreatedBy       string  `json:"created_by"`
	ClientTimezone  string  `json:"client_timezone"`
	WorkstationName string  `json:"workstation_name"`
	RequestID       string  `json:"request_id,omitempty"`
	SnapshotJSON    string  `json:"-"`
}

type Tarife struct {
	Tip            string  `json:"tip"`
	AcilisUcreti   float64 `json:"acilis_ucreti"`
	ZamanTarifesi  float64 `json:"zaman_tarifesi"`
	MesafeTarifesi float64 `json:"mesafe_tarifesi"`
	BirimZaman     *string `json:"birim_zaman"`
	BirimMesafe    *string `json:"birim_mesafe"`
	Version        int     `json:"version"`
	UpdatedAt      string  `json:"updated_at"`
}

type BelgeSnapshot struct {
	Plaka               string  `json:"plaka"`
	AdSoyad             *string `json:"ad_soyad"`
	TcVergiNo           *string `json:"tc_vergi_no"`
	Telefon             *string `json:"telefon"`
	Eposta              *string `json:"eposta"`
	DurakAdi            *string `json:"durak_adi"`
	Marka               *string `json:"marka"`
	Model               *string `json:"model"`
	SasiNo              *string `json:"sasi_no"`
	LastikEbadi         *string `json:"lastik_ebadi"`
	TaksimetreMarka     *string `json:"taksimetre_marka"`
	TaksimetreModel     *string `json:"taksimetre_model"`
	SeriNo              *string `json:"seri_no"`
	KSabiti             *string `json:"k_sabiti"`
	KelebekMuhurSeriNo  *string `json:"kelebek_muhur_seri_no"`
	GeciciMuhur         *string `json:"gecici_muhur"`
	IslemTuru           string  `json:"islem_turu"`
	AcilisUcreti        float64 `json:"acilis_ucreti"`
	ZamanTarifesi       float64 `json:"zaman_tarifesi"`
	MesafeTarifesi      float64 `json:"mesafe_tarifesi"`
	BirimZaman          *string `json:"birim_zaman"`
	BirimMesafe         *string `json:"birim_mesafe"`
	YapilanIslem        *string `json:"yapilan_islem"`
	BelgeNo             string  `json:"belge_no"`
	IslemTarihi         string  `json:"islem_tarihi"`
	IslemYapanKullanici string  `json:"islem_yapan_kullanici"`
	IstemciSaatDilimi   string  `json:"istemci_saat_dilimi"`
	IslemNoktasi        string  `json:"islem_noktasi"`
}
