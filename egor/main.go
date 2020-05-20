package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"egor/core"
	"egor/database"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

var db *database.Database

func main() {
	// инициализация базы данных и роутера.
	db = database.CreateDatabase()
	router := mux.NewRouter().StrictSlash(false)

	// проверка работы сервера.
	router.HandleFunc("/", CheckWork)

	// запросы к базе данных пользователей.
	router.HandleFunc("/user", AddUser).Methods("POST")
	router.HandleFunc("/user/{mail}", GetUserInfo).Methods("GET")
	router.HandleFunc("/user/{mail}", DeleteUser).Methods("DELETE")

	// запросы к базе данных пользовательских задача пользователей.
	router.HandleFunc("/user_problems/{userID}", AddUserProblemToClient).Methods("POST")
	router.HandleFunc("/user_problems/{userID}", GetAllClientUserProblems).Methods("GET")
	router.HandleFunc("/user_problems/{userID}/{problemID}", DeleteUserProblemFromClient).Methods("DELETE")

	// запросы к базе данных cf задача пользователей.
	router.HandleFunc("/cf_problems/{userID}", AddCFProblemToClient).Methods("POST")
	router.HandleFunc("/cf_problems/{userID}", GetAllClientCFProblems).Methods("GET")
	router.HandleFunc("/cf_problems/{userID}/{problemID}", DeleteCFProblemFromClient).Methods("DELETE")

	// логика бд изменилась, поэтому 2 базы данных ниже стали неактуальны, но я их оставил на будущие улучшения

	// запросы к базе данных задач с codeforces.
	router.HandleFunc("/cf_problem", AddUserProblem).Methods("POST")
	router.HandleFunc("/cf_problem/{id}", GetUserProblemInfo).Methods("GET")
	router.HandleFunc("/cf_problem/{id}", DeleteUserProblem).Methods("DELETE")

	// запросы к базе данных пользовательских задач.
	router.HandleFunc("/user_problem", AddUserProblem).Methods("POST")
	router.HandleFunc("/user_problem/{id}", GetUserProblemInfo).Methods("GET")
	router.HandleFunc("/user_problem/{id}", DeleteUserProblem).Methods("DELETE")

	// разрешаем cors запросы
	headers := handlers.AllowedHeaders([]string{
		"Content-Type",
	})
	origins := handlers.AllowedOrigins([]string{
		"http://localhost:5000",
	})
	methods := handlers.AllowedMethods([]string{
		"GET",
		"POST",
		"DELETE",
	})

	// запуск сервера.
	fmt.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, origins, methods)(router)))
}

// CheckWork проверяет, что сервер запустился.
func CheckWork(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Сервер работает!!!")
}

// AddUser добавляет пользователя в базу данных.
func AddUser(w http.ResponseWriter, r *http.Request) {
	var user core.User

	userData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при чтении тела запроса!: %v", err)
	}

	json.Unmarshal(userData, &user)
	if err != nil {
		w.WriteHeader(http.StatusConflict)
		fmt.Fprintf(w, "ошибка при переведении тела запроса в формат json!: %v", err)
	}

	err = db.Users.AddUser(&user)
	if err != nil {
		fmt.Fprintf(w, "ошибка при добавлении пользователя в базу данных!: %v", err)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// DeleteUser удаляет пользователя из базы данных по id.
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	userMail := mux.Vars(r)["mail"]

	err := db.Users.DeleteUser(userMail)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при удалении пользователя!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

// GetUserInfo возвращает информацию о пользователе по его почте.
func GetUserInfo(w http.ResponseWriter, r *http.Request) {
	userMail := mux.Vars(r)["mail"]

	user, err := db.Users.GetUserInfo(userMail)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, "ошибка при запросе информации о пользователе!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

// AddUserProblem добаляет пользовательскую задачу в базу данных.
func AddUserProblem(w http.ResponseWriter, r *http.Request) {
	var problem core.UserProblem

	problemData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при чтении тела запроса!: %v", err)
	}

	err = json.Unmarshal(problemData, &problem)
	if err != nil {
		w.WriteHeader(http.StatusConflict)
		fmt.Fprintf(w, "ошибка при переведении тела запроса в формат json!: %v", err)
	}

	err = db.UserProblems.AddProblem(&problem)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при сохранении задачи в базе данных!: %v", err)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(problem)
}

// DeleteUserProblem удаляет пользовательскую задачу из базы данных по её id.
func DeleteUserProblem(w http.ResponseWriter, r *http.Request) {
	problemID := mux.Vars(r)["id"]

	err := db.UserProblems.DeleteProblem(problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при удалении задачи из базы данных!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

// GetUserProblemInfo возвращает информацию о пользовательской задаче по её id.
func GetUserProblemInfo(w http.ResponseWriter, r *http.Request) {
	problemID := mux.Vars(r)["id"]

	problem, err := db.UserProblems.GetProblemInfo(problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при запросе информации о задаче!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(problem)
}

// AddCFProblem добаляет задачу в базу данных.
func AddCFProblem(w http.ResponseWriter, r *http.Request) {
	var problem core.CFProblem

	problemData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при чтении тела запроса!: %v", err)
	}

	err = json.Unmarshal(problemData, &problem)
	if err != nil {
		w.WriteHeader(http.StatusConflict)
		fmt.Fprintf(w, "ошибка при переведении тела запроса в формат json!: %v", err)
	}

	err = db.CFProblems.AddProblem(&problem)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при сохранении задачи в базе данных!: %v", err)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(problem)
}

// DeleteCFProblem удаляет задачу из базы данных по её id.
func DeleteCFProblem(w http.ResponseWriter, r *http.Request) {
	problemID := mux.Vars(r)["id"]

	err := db.CFProblems.DeleteProblem(problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при удалении задачи из базы данных!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

// GetCFProblemInfo возращает информацию о задаче по её id.
func GetCFProblemInfo(w http.ResponseWriter, r *http.Request) {
	problemID := mux.Vars(r)["id"]

	problem, err := db.CFProblems.GetProblemInfo(problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при запросе информации о задаче!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(problem)
}

// AddCFProblemToClient добаляет задачу пользователю.
func AddCFProblemToClient(w http.ResponseWriter, r *http.Request) {
	var problem core.CFProblem

	problemData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при чтении тела запроса!: %v", err)
	}

	err = json.Unmarshal(problemData, &problem)
	if err != nil {
		w.WriteHeader(http.StatusConflict)
		fmt.Fprintf(w, "ошибка при переведении тела запроса!: %v", err)
	}

	userID := mux.Vars(r)["userID"]

	err = db.ClientCFProblems.AddProblem(userID, &problem)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при добавлении задачи пользователю!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(problem)
}

// DeleteCFProblemFromClient удаляет задачу у пользователя.
func DeleteCFProblemFromClient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["userID"]
	problemID := vars["problemID"]

	err := db.ClientCFProblems.DeleteProblem(userID, problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при добавлении задачи пользователю!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

// GetAllClientCFProblems возвращает все задачи пользователя
func GetAllClientCFProblems(w http.ResponseWriter, r *http.Request) {
	userID := mux.Vars(r)["userID"]

	if problems, err := db.ClientCFProblems.GetAllProblems(userID); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при попытке получить все задачи пользователя!: %v", err)
	} else {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(problems)
	}
}

// AddUserProblemToClient добаляет задачу пользователю.
func AddUserProblemToClient(w http.ResponseWriter, r *http.Request) {
	var problem core.UserProblem

	problemData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при чтении тела запроса!: %v", err)
	}

	err = json.Unmarshal(problemData, &problem)
	if err != nil {
		w.WriteHeader(http.StatusConflict)
		fmt.Fprintf(w, "ошибка при переведении тела запроса!: %v", err)
	}

	userID := mux.Vars(r)["userID"]

	err = db.ClientUserProblems.AddProblem(userID, &problem)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при добавлении задачи пользователю!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(problem)
}

// DeleteUserProblemFromClient удаляет задачу у пользователя.
func DeleteUserProblemFromClient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["userID"]
	problemID := vars["problemID"]

	err := db.ClientUserProblems.DeleteProblem(userID, problemID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при добавлении задачи пользователю!: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

// GetAllClientUserProblems возвращает все задачи пользователя
func GetAllClientUserProblems(w http.ResponseWriter, r *http.Request) {
	userID := mux.Vars(r)["userID"]

	if problems, err := db.ClientUserProblems.GetAllProblems(userID); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "ошибка при попытке получить все задачи пользователя!: %v", err)
	} else {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(problems)
	}
}
