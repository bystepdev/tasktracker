package database

import (
	"egor/core"
	"encoding/json"
	"errors"
	"strconv"

	"github.com/boltdb/bolt"
)

var userProblemsBucket = []byte("userproblems")

// userProblemStorage хранит задачи, созданные пользователем.
type userProblemStorage struct {
	problems *bolt.DB
}

// CreateUserProblemStorage создаёт базу данных для пользовательских задач в главной базе данных.
func CreateUserProblemStorage(db *bolt.DB) (core.UserProblemStorage, error) {
	if err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(userProblemsBucket)
		return err
	}); err != nil {
		return nil, err
	}

	return &userProblemStorage{db}, nil
}

// AddUserProblem добавляем задачу в базу данных.
func (ups *userProblemStorage) AddProblem(userProblem *core.UserProblem) error {
	return ups.problems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(userProblemsBucket)

		problemID, err := b.NextSequence()
		if err != nil {
			return errors.New("ошибки при генерации id для задачи")
		}
		userProblem.ID = strconv.FormatUint(problemID, 10)

		buff, err := json.Marshal(userProblem)
		if err != nil {
			return err
		}

		return b.Put([]byte(userProblem.ID), buff)
	})
}

// DeleteUserProblem удаляет задачу из базы данных по её id.
func (ups *userProblemStorage) DeleteProblem(id string) error {
	return ups.problems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(userProblemsBucket)

		return b.Delete([]byte(id))
	})
}

// GetProblemInfo возращает информацию о задаче по её id.
func (ups *userProblemStorage) GetProblemInfo(id string) (*core.UserProblem, error) {
	userProblem := &core.UserProblem{}

	if err := ups.problems.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(userProblemsBucket)

		byteProblem := b.Get([]byte(id))
		if byteProblem == nil {
			return errors.New("не найдено задачи с таким id")
		}

		return json.Unmarshal(byteProblem, &userProblem)
	}); err != nil {
		return nil, err
	}

	return userProblem, nil
}
