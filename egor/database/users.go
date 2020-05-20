package database

import (
	"encoding/json"
	"errors"
	"strconv"

	"egor/core"

	"github.com/boltdb/bolt"
)

var usersBucket = []byte("users")

// UserStorage хранит всех пользователей.
type userStorage struct {
	users *bolt.DB
}

// CreateUserStorage создаёт базу данных для пользователей в главной базе данных.
func CreateUserStorage(db *bolt.DB) (core.UserStorage, error) {
	if err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(usersBucket)
		return err
	}); err != nil {
		return nil, err
	}

	return &userStorage{db}, nil
}

// AddUser добаляет пользователя в базу данных.
func (userStorage *userStorage) AddUser(user *core.User) error {
	return userStorage.users.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(usersBucket)

		userID, err := b.NextSequence()
		if err != nil {
			return errors.New("ошибка во время генерации id для пользователя")
		}
		user.ID = strconv.FormatUint(userID, 10)

		buff, err := json.Marshal(user)
		if err != nil {
			return err
		}

		return b.Put([]byte(user.Mail), buff)
	})
}

// DeleteUser удаляет пользователя из базы данных по его id.
func (userStorage *userStorage) DeleteUser(mail string) error {
	return userStorage.users.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(usersBucket)

		return b.Delete([]byte(mail))
	})
}

// GetUserInfo возвращает информацию о пользователю по его почте.
func (userStorage *userStorage) GetUserInfo(mail string) (*core.User, error) {
	user := &core.User{}

	if err := userStorage.users.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(usersBucket)

		byteUser := b.Get([]byte(mail))
		if byteUser == nil {
			return errors.New("пользователь с такой почтой не найдeн")
		}

		return json.Unmarshal(byteUser, &user)
	}); err != nil {
		return nil, err
	}

	return user, nil
}
