package database

import (
	"egor/core"
	"encoding/json"
	"errors"

	"github.com/boltdb/bolt"
)

var clientCFBucket = []byte("clientcfproblems")

// clientCFProblemStorage хранит все cf задачи конкретного клиента.
type clientCFProblemStorage struct {
	cfProblems *bolt.DB
}

// CreateClientCFProblemStorage создаёт в основной базе данных раздел под clientCFProblemStorage.
func CreateClientCFProblemStorage(db *bolt.DB) (core.ClientCFProblemStorage, error) {
	if err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(clientCFBucket)
		return err
	}); err != nil {
		return nil, err
	}

	return &clientCFProblemStorage{db}, nil
}

// AddProblem добавляет cf задачу пользователю.
func (cfps *clientCFProblemStorage) AddProblem(userID string, problem *core.CFProblem) error {
	return cfps.cfProblems.Update(func(tx *bolt.Tx) error {
		b, err := tx.Bucket(clientCFBucket).CreateBucketIfNotExists([]byte(userID))
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

// DeleteProblem удаляет cf задачу у пользователя.
func (cfps *clientCFProblemStorage) DeleteProblem(userID string, problemID string) error {
	return cfps.cfProblems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(clientCFBucket).Bucket([]byte(userID))

		return b.Delete([]byte(problemID))
	})
}

// GetAllProblems возвращает все задачи пользователя
func (cfps *clientCFProblemStorage) GetAllProblems(userID string) ([]*core.CFProblem, error) {
	problems := make([]*core.CFProblem, 0)

	if err := cfps.cfProblems.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(clientCFBucket).Bucket([]byte(userID))
		if b == nil {
			return errors.New("у пользователя ещё нет задач")
		}

		return b.ForEach(func(k, v []byte) error {
			var problem core.CFProblem

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
