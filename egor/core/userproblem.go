package core

// UserProblem хранит задачи для определённого пользователя.
type UserProblem struct {
	ID      string `json:"id,omitempty"`
	Name    string `json:"name,omitempty"`
	Link    string `json:"link,omitempty"`
	Comment string `json:"comment,omitempty"`
}

// UserProblemStorage интерфейс, которому должна соответствовать база данных для хранения задач пользователя.
type UserProblemStorage interface {
	DeleteProblem(id string) error
	AddProblem(userProblem *UserProblem) error
	GetProblemInfo(id string) (*UserProblem, error)
}

// ClientUserProblemStorage интерфейс, которому должна соответствовать база данных, хранящая для каждого пользователя добавленные им задачи.
type ClientUserProblemStorage interface {
	DeleteProblem(userID string, problemID string) error
	AddProblem(userID string, problem *UserProblem) error
	GetAllProblems(userID string) ([]*UserProblem, error)
}
