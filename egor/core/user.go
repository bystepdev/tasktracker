package core

// User хранит данные конкретного пользователя.
type User struct {
	ID       string `json:"id,omitempty"`
	Handle   string `json:"handle,omitempty"`
	Mail     string `json:"mail,omitempty"`
	Password string `json:"password,omitempty"`
}

// UserStorage интерфейс, которому должна соответствовать база данных, отвечающая за пользователей.
type UserStorage interface {
	AddUser(user *User) error
	DeleteUser(mail string) error
	GetUserInfo(mail string) (*User, error)
}
