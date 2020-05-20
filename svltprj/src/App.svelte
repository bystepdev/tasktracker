<style>
  .site-name {
    text-align: center;
    margin-bottom: 5%;
  }
  .task-name {
    float : left;
    margin-left : 5%;
  }
  .flex {
    height: 1px;
    clear: both;
  }
  .comment {
    float : right;
    margin-right : 10px;
    border: 0px;
    background: white;
    margin-top: 2%;
    vertical-align:bottom;
    text-align: justify;
    color : grey;
  }
  .table {
    background: rgb(204, 204, 204, 0.5);
    box-shadow: 20px 20px 10px 5px rgba(0, 0, 0, .2);
    width: 35%;
    height: auto;
    margin-left : 10%;
    margin-top : 5%;
    float: left;
    border-radius: 10px;
    border : 1px solid #000;
  }
  .task {
    height: auto;
  }
  .savehandle {
    margin-top: 2%;
    float: left;
    margin-left: 3%;
  }
  .test {
    margin-left: 5%;
    float : left;
  }
  #reload {
    float : right;
    margin-right: 5%;
  }
  .comment-box {
    height: auto;
    width: 90%;
    resize : vertical;
    margin-left: 5%;
  }
  .verdict {
    float: right;
    margin-right: 5%;
    color : red;
  }
  #addtask {
    float : right;
    margin-right : 5%;
  }
  #auto {
    margin-top: 0%;
    width: 100%;
    height: auto;
    background: #996699;
    border-radius: 10px;
    box-shadow: 20px 20px 10px 5px rgba(0, 0, 0, .2);
  }
  #taskurl {
    float : right;
    width: 90%;
    margin-right : 5%;
    border-radius: 10px;
  }
  #user-info {
    font-size: 1.5em;
    margin-top: 0%;
    font-weight: 600;
    text-align: center;
  }
  #taskname {
    float: right;
    width: 90%;
    margin-right : 5%;
    border-radius: 10px;
    margin-right: 5%;
  }
  .log {
    margin-top: 2%;
    float: left;
    margin-left: 3%;
  }
  .logdiv {
    margin-left: auto;
    margin-right: auto;
    position: centre;
  }
  .login-err {
    color : red;
    margin-left: 3%;
    margin-top: 0%;
    font-size: 0.8em;
  }
  .save-comment {
    float: right;
    margin-right: 5%;
  }
  #logout {
    float: right;
    margin-top: 2.5%;
    margin-right: 3%;
  }
  button {
    color: #000 !important;
    text-transform: uppercase;
    text-decoration: none;
    background: #fff;
    font-size: 0.8em;
    padding: 9px;
    border-radius: 5px;
    display: inline-block;
    border: none;
    transition: all 0.4s ease 0s;
  }
  .table > button{
    background: rgba(204, 204, 204, 0);
  }
  .task > button {
    background: rgba(204, 204, 204, 0);
  }
  button:hover {
    background: #996699;
    letter-spacing: 1px;
    -webkit-box-shadow: 0px 5px 40px -10px rgba(0,0,0,0.57);
    -moz-box-shadow: 0px 5px 40px -10px rgba(0,0,0,0.57);
    box-shadow: 5px 40px -10px rgba(0,0,0,0.57);
    transition: all 0.4s ease 0s;
  }
  .task > .delete:hover {
    height: 18px;
    width: 18px;
    transition: all 0.4s ease 0s;
  }
  .task > .delete {
    float: right;
    margin-right: 5%;
    height: 14px;
    width: 14px;
    
    transition: all 0.4s ease 0s;
  }
  input {
    border-radius: 10px;
  }
  .bottom {
    margin-top: 25%;
    text-align: center;
    font-size: 1em;
    margin-bottom: 0xp;
  }
</style>

<script>
  import { MD5 } from "./md5.js"
  // создает уникальный id мс с начала эпохи
  function getUniq() { 
    let f = new Date();
    return f.getTime();
  }
  const api = "http://localhost:8080"; // api сервера к которому будем обращаться
  $: openComment = new Set();
  // открытие и закрытие комментария, их номера хранятся в openComment
  function handleClick(x) {
    x = Number(x);
    if (openComment.has(x)) {
      openComment.delete(x);
    }
    else {
      openComment.add(x);
    }
    openComment = openComment;
  }
  let name = ''; // handle
  $: res = []; // список задач с CF
  
  let num = 0; // для нумерации комментов
  let add = false; // для открытия понели добавления задач
  let taskurl = ''; // поле ввода ссылки на задачу
  let taskname = ''; // поле ввода имени задачи
  let clienttask = []; // задачи пользователя
  let result = ''; // ошибка если некоректно ввели данные задачи
  let call = false;

  // удаление задачи с CF, чтобы потом понять, что эту задачу удалили, мы ставим ей result = -1
  async function problemCfDelete(x) { 
    let backup = res[x];
    let prob_id = backup[6];
    await fetch(api + "/cf_problems/" + bd_id + '/' + prob_id, {
      method: 'DELETE',
    }).catch(error => {console.log(error)});

    const problem_add = {
              "id": String(getUniq()),
              "name": String(backup[1]),
              "link": backup[0],
              "result": '-1',
              "comment": String(backup[5])
          }
    await fetch(api + "/cf_problems/" + bd_id, {
             method: "POST",
            headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(problem_add)
            }).catch(error => {console.log(error)}); 
    res.splice(x, 1);
    res = res;
  }

  // удаление задачи пользователя
  async function userProblemDelete(x) { 
    let prob_id = clienttask[x][4];
    fetch(api + "/user_problems/" + bd_id + '/' + prob_id, {
      method: 'DELETE',
    }).catch(error => {console.log(error)});
    clienttask.splice(x, 1);
    clienttask = clienttask;
  }

  // сохранение комментария для задач пользователя
  async function saveUserProblem(x) { 
    //удаление из бд данных о старой задаче и создание новой
    let backup = clienttask[x];
    let prob_id = clienttask[x][4];
    await fetch(api + "/user_problems/" + bd_id + '/' + prob_id, {
      method: 'DELETE',
    }).catch(error => {console.log(error)});

    const problem_add = {
            "id": backup[4],
            "name": backup[1],
            "link": backup[0],
            "comment": backup[3]
          }
    await fetch(api + "/user_problems/" + bd_id, {
             method: "POST",
            headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(problem_add)
            }).catch(error => {console.log(error)});      
    handleClick(backup[2]);     
  }

   // сохранение комметария задачи с CF аналогия с задачами пользователя
  async function saveCfProblem(x) {
    // repeat func выше
    let backup = res[x];
    let prob_id = backup[6];
    await fetch(api + "/cf_problems/" + bd_id + '/' + prob_id, {
      method: 'DELETE',
    }).catch(error => {console.log(error)});
    const newProb = {
              "id": String(getUniq()),
              "name": String(backup[1]),
              "link": backup[0],
              "result": String(backup[2]) + ' ' + String(backup[3]),
              "comment": String(backup[5])
            }
            await fetch(api + "/cf_problems/" + bd_id, {
             method: "POST",
            headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(newProb)
            }).catch(error => {console.log(error)});
    handleClick(backup[4]);        
  }
  
  // добавление задачи пользователя
  function blockAdd() { 
      if (!add) {
        add = true;
      } else {
        if (taskurl.length == 0 && taskname == 0) {
          add = false;
          return;
        }
        if (taskurl.length == 0) {
          result = 'Добавьте ссылку на задачу';
          call = true;
          return;
        }
        if (taskname.length == 0) {
          result = 'Добавьте название задачи';
          call = true;
          return;
        }
        const problem_add = {
            "id": String(getUniq()),
            "name": taskname,
            "link": taskurl,
            "comment": ''
          }
          fetch(api + "/user_problems/" + bd_id, {
             method: "POST",
            headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(problem_add)
            })
            
            .then(response => response.json())
            .then(new_prob => {
              // ссылка на задачу, название, номер для открытие коммента, комментарий, index в бд
              let fl = [taskurl, taskname, Number(num), '', new_prob.id];
              num = num + 1;
              clienttask.unshift(fl);
              clienttask = clienttask;
              taskurl = '';
              taskname = '';
              call = false;
              add = false;}).catch(error => {console.log(error)});    
        }
  }

  // загружает задачи пользователя из бд
  async function updClientTask() {
      fetch(api + '/user_problems/' + bd_id).then(response => {
                                return response.json();
                                })
                                .then(response => {
                                  for (let i = response.length - 1; i >= 0; i--) {
                                    let element = [response[i].link, response[i].name, Number(num), '', response[i].id];
                       
                                    num++;
                                    if (response[i].comment != undefined) {
                                      element[3] = response[i].comment;
                               
                                    }
                                    clienttask.unshift(element);
                                  }
                                  clienttask = clienttask;
                                })
                                .catch(error => {{console.log('Задач пользователя нет')}});
      
  }

  let reload_err = 'Обновить'; // состояние кнопки обновления

  // обновление списка задач codeforces
  async function updCfProblems() { 
    reload_err = 'Обновлнение...';
    let url = 'https://codeforces.com/api/user.status?handle=' + name + '&from=1&count=10000';
    let response = await fetch(url).catch(error => { // запрос к Codeforces
      reload_err = 'Обновить';

    });
    let newCfProblems = await response.json();
    if (response.ok) {
        let dbCfProblems = undefined;
        await fetch(api + '/cf_problems/' + bd_id).then(response => {return response.json()}).then(dbdb => { // запрос к бд
          dbCfProblems = dbdb;
        }).catch(error => {reload_err = 'Обновить'; console.log(error);});
        console.log('ok');
        let us = new Set();
        let ok = new Set();
        let map = new Map();
        let buffer = [];
        let Comments = new Map();
        let Ids = new Map();
        console.log(newCfProblems.result);
        for (let element of newCfProblems.result) { // записывает все нерешенные задачи с codeforces
          let problem = element.problem;
          let name = String(element.problem.contestId) + '/problem/' + String(element.problem.index);
          if (String(element.verdict) != 'OK' && !us.has(name)) {
              us.add(name);
              buffer.push([name, element.problem.name, Number(element.passedTestCount), String(element.verdict)]);
          } else {
            ok.add(name);
          }
        }
        while (res.length > 0) { // чистит список задач с Cf
          res.pop();
        }

        let notSolvedTasks = [];
        for (let element of buffer) { // генерирует список нерешенных задач
          let name = element[0];
          if (us.has(name) && !ok.has(name)) {
            us.delete(name);
            let add = element;
            element.push(num);
            element.push('');
            element.push('');
            num += 1;
            notSolvedTasks.unshift(element);
          }
        }

        let setDbProblems = new Set();
        let delTasks = new Set();
        if (dbCfProblems != undefined) {
          for (let i = 0; i < dbCfProblems.length; i++) {
            setDbProblems.add(dbCfProblems[i].link);
            Comments.set(dbCfProblems[i].link, dbCfProblems[i].comment);
            Ids.set(dbCfProblems[i].link, dbCfProblems[i].id);
            if (dbCfProblems[i].result === '-1') {
              delTasks.add(dbCfProblems[i].link);
            }
          }
        }

        let addTask = [];
        for (let i = 0; i < notSolvedTasks.length; i++) {
          let element = notSolvedTasks[i];
          let taskLink = element[0];
          if (!setDbProblems.has(taskLink)) {
            addTask.unshift(element);
          } else {
            if (Comments.get(element[0]) != undefined) {
              element[5] = Comments.get(element[0]);
            } else {
              element[5] = '';
            }
            element[6] = Ids.get(element[0]);
            if (!delTasks.has(element[0]))
              res.unshift(element);
          }
        }

        res = res;
        for (let i = addTask.length - 1; i >= 0; i--) {
          let element = addTask[i];
          reload_err = 'Обновление...';
          const newProb = {
              "id": String(getUniq()),
              "name": String(element[1]),
              "link": element[0],
              "result": String(element[2]) + ' ' + String(element[3]),
              "comment": ''
            }
            fetch(api + "/cf_problems/" + bd_id, {
             method: "POST",
            headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(newProb)
            }).then(response => {response.json()}).then(response => {
              reload_err = 'Обновить';
              res.unshift(element);
              res = res;
            });
        }
        reload_err = 'Обновить';
    } else {
      reload_err = 'Обновить';
      alert("Ошибка HTTP: " + response.status);
    }
  }
  
  let login = 0; // состояние авторизации 
  let mail = ''; // логин
  let password = ''; // пароль
  let bd_id = ''; // id пользователя
  let login_err = ''; // сообщение о проблемах со входом
  let reg_err = ''; // сообщение о проблеме с регистрацией

  // регистрация
  async function UserReg() { 
    reg_err = '';
    if (mail != '' && password != '') {
      let goodAsk = true;
      let response = await fetch(api + '/user/' + mail).catch(error => {goodAsk = false;});
      
      if (!goodAsk) {
        reg_err = 'Какие-то проблемы, попробуйте позже';
        return;
      }
      if (response.ok) {
        reg_err = 'Такой логин уже существует';
      } else {
        login = 3;
      }
    } else {
      reg_err = 'Неверный формал логина или пароля';
    }
  }

  // кнопка регистрации
  function Registr() {
    login = 2;
  }
  let save_err = '';
  // сохранение хэндла и окончание регистрации
  async function saveHandle() { 
    save_err = '';
    let url = 'https://codeforces.com/api/user.info?handles=' + name;
    let goodAsk = true;
    let response = await fetch(url).catch(error => {goodAsk = false;});
    if (!goodAsk) {
      save_err = 'Что-то пошло не так, проверьте вводимый Хэндл';
      return;
    }
    if (response.ok) {
    const user = {
      "handle": name,
      "mail": mail,
      "password": MD5(password)
    }
    fetch(api + "/user", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
      })
      .then(response => response.json())
      .then(new_user => {
        login = 0;
        save_err = '';
        login_err = 'Регистрация прошла успешно!';
      })
      .catch(error => {
        save_err = 'Технические шоколадки';
      })
    } else {
      save_err = 'Что-то пошло не так, проверьте вводимый Хэндл';
    }
  }
  // авторизация и проверка пароля логина
  async function UserLogin() { 
    login_err = '';
    if (mail != '' && password != '') {
      let res = await fetch(api + '/user/' + mail).catch(error => {login_err = 'Технические шоколадки'});
      if (login_err == '') {
        if (!res.ok) {
          login_err = 'Такого логина не существует';
        } else {
      fetch(api + '/user/' + mail).then(response => {
                                return response.json();
                                })
                                .then(response => {

                                    if (MD5(password) == response.password) {
                                      password = '';
                                      name = response.handle;
                                      bd_id = response.id;
                                      updClientTask();
                                      updCfProblems();
                                      login = 1;
                                    } else {
                                      login_err = 'Неверный пароль';
                                    }
                                
                                })
                                .catch(error => {login_err = 'Технические шоколадки'});
        }
      }
      
    } else {
        login_err = 'Неверный формат';
    }
  }

  // выход из аккаунта
  function logout() { 
    res.splice(0, res.length);
    clienttask.splice(0, clienttask.length);
    mail = '';
    name = '';
    password = '';
    login = 0;
  }
</script>



<div id="auto">
  {#if login == 0} 
    <div class="logdiv"> 
      <input class="log" bind:value={mail} placeholder="логин"> 
      <input class="log" type="password" bind:value={password} placeholder="пароль">
      <button class="log" on:click="{() => UserLogin()}">
              Войти
          </button>
      <button class="log" on:click="{() => Registr()}"> Регистрация </button>    
      <div class = "flex"> </div>
      {#if login_err != ''} 
      <p class="login-err">{login_err}</p>
      {/if}    
    </div>
  {/if}
  {#if login === 1}
    <button id="logout" on:click="{() => logout()}">Выйти</button>
    <p id="user-info"> Пользователь: {mail} </p>
  {/if}
  {#if login == 2} 
    <div class="logdiv"> 
      <input class="log" bind:value={mail} placeholder="логин"> 
      <input class="log" type="password" bind:value={password} placeholder="пароль">
      <button class="log" on:click="{() => UserReg()}">
              Зарегистрироваться
          </button>
      <div class = "flex"> </div>    
      {#if reg_err != ''} 
        <p class="login-err">{reg_err}</p>
      {/if}    
    </div>
  {/if}
  {#if login == 3} 
    <div class="logdiv">
    <input class="savehandle" bind:value={name} placeholder="Ваш хэндл?">
    <button class="savehandle" on:click="{() => saveHandle()}"> Сохранить </button>
    <div class = "flex"> </div>
    <p class="login-err">{save_err}</p>
    </div>
  {/if}
  <br>
</div>


<div class = "table">
  <p class = "site-name"> Codeforces </p>
  {#if login == 1}  <button id = "reload" on:click="{() => updCfProblems()}">
    {reload_err}
  </button>
  {/if}
  <div class = "flex"> </div>
  {#if res.length > 0}
    {#each res as ar, i}
          <hr/>
        <div class = "task">
          <a target="_blank" class = "task-name" href = "https://codeforces.com/contest/{ar[0]}"> {ar[1]} </a>
          <img src="secdel.png" on:click="{() => problemCfDelete(i)}" alt = "удалить" class = "delete">
          <div class = "flex"> </div>
          <p class = "test"> Номер теста {ar[2] + 1} </p>
          <p class = "verdict"> {ar[3]} </p>
          <div class = "flex"> </div>
          <button class = "comment" on:click="{() => handleClick(ar[4])}">
              комментарий
          </button>
          <div class = "flex"> </div>
          {#if openComment.has(ar[4]) === true}
            <textarea bind:value={ar[5]} wrap = "soft" class = "comment-box" placeholder="комментарий"></textarea>
            
            <button class="save-comment" on:click="{() => saveCfProblem(i)}"> Сохранить </button>
          {/if}
          <div class = "flex"> </div>
        </div>
    {/each}
  {/if}  
</div>

<div class = "table">
  <p class = "site-name"> Мои задачи</p>
  {#if login == 1}
  <button id = "addtask" on:click="{() => blockAdd()}">
    Добавить задачу
  </button>
  {/if}
  {#if add}
    <input bind:value={taskurl} id = "taskurl" type="url" placeholder="Ссылка на задачу">
    <input bind:value={taskname} id = "taskname" type="text" placeholder="Название задачи">
    <br>
  {/if}
  {#if call}
        <p color="red">{result}</p>
  {/if}
  <div class = "flex"> </div>
  {#if clienttask.length > 0} 
      {#each clienttask as ar, i}
          <hr/>
        <div class = "task">
          <a target="_blank" class = "task-name" href = "{ar[0]}"> {ar[1]} </a>
          <img src="secdel.png" on:click="{() => userProblemDelete(i)}" alt = "удалить" border-radius = "50%" class = "delete">
          <div class = "flex"> </div>
          <button class = "comment" on:click="{() => handleClick(ar[2])}">
              комментарий
          </button>
          <div class = "flex"> </div>
          {#if openComment.has(ar[2]) === true}
          
            <textarea bind:value={ar[3]} wrap = "soft" class = "comment-box" placeholder="комментарий"></textarea>
            <button class="save-comment" on:click="{() => saveUserProblem(i)}"> Сохранить </button>
          {/if}
          <div class = "flex"> </div>
        </div>
    {/each}
    {/if}
</div>
<div class = "flex"> </div>
<div class="bottom"> 
        <hr>
        <p> Task Tracker </p>
        <p> Бочаров Егор Telegram: <a target="_blank" href="https://teleg.run/bystepdev">@egor_bocharov</a></p>
        <br>

    </div>

