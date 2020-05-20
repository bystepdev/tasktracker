package database

import (
	"egor/core"
	"encoding/json"
	"errors"

	"github.com/boltdb/bolt"
)

var clientUserBucket = []byte("clientuserproblems")

// clientuserProblemStorage хранит для каждого пользователя добавленные им задачи.
type clientUserProblemStorage struct {
	userProblems *bolt.DB
}

// CreateClientUserProblemStorage создаёт в основной базе данных раздел под clientUserProblemStorage.
func CreateClientUserProblemStorage(db *bolt.DB) (core.ClientUserProblemStorage, error) {
	if err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(clientUserBucket)
		return err
	}); err != nil {
		return nil, err
	}

	return &clientUserProblemStorage{db}, nil
}

// AddProblem добавляет задачу пользователю.
func (cups *clientUserProblemStorage) AddProblem(userID string, problem *core.UserProblem) error {
	return cups.userProblems.Update(func(tx *bolt.Tx) error {
		b, err := tx.Bucket(clientUserBucket).CreateBucketIfNotExists([]byte(userID))
		if err != nil {
			return err
		}

		buff, err := json.Marshal(problem)
		if err != nil {
			return err
		}

		return b.Put([]byte(problem.ID), buff)
	})
}

// DeleteProblem удаляет задачу у пользователя.
func (cups *clientUserProblemStorage) DeleteProblem(userID string, problemID string) error {
	return cups.userProblems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(clientUserBucket).Bucket([]byte(userID))

		return b.Delete([]byte(problemID))
	})
}

// GetAllProblems возращает все задачу пользователя.
func (cups *clientUserProblemStorage) GetAllProblems(userID string) ([]*core.UserProblem, error) {
	problems := make([]*core.UserProblem, 0)

	if err := cups.userProblems.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(clientUserBucket).Bucket([]byte(userID))
		if b == nil {
			return errors.New("у пользователя ещё нет задач")
		}

		return b.ForEach(func(k, v []byte) error {
			var problem core.UserProblem

			err := json.Unmarshal(v, &problem)
			if err != nil {
				return err
			}

			problems = append(problems, &problem)

			return nil
		})
	}); err != nil {
		return nil, err
	}

	return problems, nil
}
