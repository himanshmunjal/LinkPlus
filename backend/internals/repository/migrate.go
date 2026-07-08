package repository

import (
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations applies all pending .up.sql files in the migrations directory.
func RunMigrations(dsn, migrationsPath string) {
	m, err := migrate.New(migrationsPath, dsn)
	if err != nil {
		log.Fatalf("[migrate] failed to initialise: %v", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			fmt.Println("[migrate] No new migrations to apply.")
			return
		}
		log.Fatalf("[migrate] migration failed: %v", err)
	}

	version, dirty, _ := m.Version()
	fmt.Printf("[migrate] Applied successfully. Current version: %d (dirty: %v)\n", version, dirty)
}