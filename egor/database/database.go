package database

import (
	"log"

	"egor/core"

	"github.com/boltdb/bolt"
)

// Database главная база данных.
type Database struct {
	Users              core.UserStorage
	CFProblems         core.CFProblemStorage
	UserProblems       core.UserProblemStorage
	ClientCFProblems   core.ClientCFProblemStorage
	ClientUserProblems core.ClientUserProblemStorage
}

// CreateDatabase создаёт и возвращает новую базу данных.
func CreateDatabase() *Database {
	db, err := bolt.Open("database.db", 0600, nil)
	if err != nil {
		log.Fatal(err)
	}

	userStorage, err := CreateUserStorage(db)
	if err != nil {
		log.Fatal(err)
	}

	cfProblemStorage, err := CreateCFProblemStorage(db)
	if err != nil {
		log.Fatal(err)
	}

	userProblemStorage, err := CreateUserProblemStorage(db)
	if err != nil {
		log.Fatal(err)
	}

	clientCFProblemStorage, err := CreateClientCFProblemStorage(db)
	if err != nil {
		log.Fatal(err)
	}

	clientUserProblemStorage, err := CreateClientUserProblemStorage(db)
	if err != nil {
		log.Fatal(err)
	}

	return &Database{
		Users:              userStorage,
		CFProblems:         cfProblemStorage,
		UserProblems:       userProblemStorage,
		ClientCFProblems:   clientCFProblemStorage,
		ClientUserProblems: clientUserProblemStorage,
	}
}
