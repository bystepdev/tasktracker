package database

import (
	"egor/core"
	"encoding/json"
	"errors"
	"strconv"

	"github.com/boltdb/bolt"
)

var cfProblemsBucket = []byte("cfproblems")

// cfproblemStorage хранит задачи с codeforces.
type cfproblemStorage struct {
	problems *bolt.DB
}

// CreateCFProblemStorage создаёт и возвращает базу данных для задач с codeforces.
func CreateCFProblemStorage(db *bolt.DB) (core.CFProblemStorage, error) {
	if err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(cfProblemsBucket)
		return err
	}); err != nil {
		return nil, err
	}

	return &cfproblemStorage{db}, nil
}

// AddProblem добавляет задачу в базу данных.
func (cfps *cfproblemStorage) AddProblem(problem *core.CFProblem) error {
	return cfps.problems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(cfProblemsBucket)

		problemID, err := b.NextSequence()
		if err != nil {
			return errors.New("ошибки при генерации id для задачи")
		}
		problem.ID = strconv.FormatUint(problemID, 10)

		buff, err := json.Marshal(problem)
		if err != nil {
			return err
		}

		return b.Put([]byte(problem.ID), buff)
	})

}

// DeleteProblem удаляет задачу из базы данных по её id.
func (cfps *cfproblemStorage) DeleteProblem(id string) error {
	return cfps.problems.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(cfProblemsBucket)

		return b.Delete([]byte(id))
	})
}

// GetProblemInfo возвращает информацию о задаче по её id.
func (cfps *cfproblemStorage) GetProblemInfo(id string) (*core.CFProblem, error) {
	problem := &core.CFProblem{}

	if err := cfps.problems.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(userProblemsBucket)

		byteProblem := b.Get([]byte(id))
		if byteProblem == nil {
			return errors.New("не найдено задачи с таким id")
		}

		return json.Unmarshal(byteProblem, &problem)
	}); err != nil {
		return nil, err
	}

	return problem, nil
}
