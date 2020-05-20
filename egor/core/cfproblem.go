package core

// CFProblem хранит информацию о конкретной задаче с codeforces.
type CFProblem struct {
	ID      string `json:"id,omitempty"`
	Name    string `json:"name,omitempty"`
	Link    string `json:"link,omitempty"`
	Result  string `json:"result,omitempty"`
	Comment string `json:"comment,omitempty"`
}

// CFProblemStorage интерфейс, которуму должна соответствовать база данных, отвечающая за задачи с codeforces.
type CFProblemStorage interface {
	AddProblem(problem *CFProblem) error
	DeleteProblem(id string) error
	GetProblemInfo(id string) (*CFProblem, error)
}

// ClientCFProblemStorage интерфейс, которому должна соответствовать база данных, хранящая cf задачи для каждого пользователя.
type ClientCFProblemStorage interface {
	AddProblem(userID string, problem *CFProblem) error
	DeleteProblem(userID string, problemID string) error
	GetAllProblems(userID string) ([]*CFProblem, error)
}
