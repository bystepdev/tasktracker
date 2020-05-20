# tasktracker
В скором времени появился полноценный сайт, а пока 
Для локального запуска установите 
Golang https://golang.org/doc/install
И Svelte https://ru.svelte.dev/blog/svelte-for-new-developers
Добавьте папку egor в Go/src
Создайте Svelte проект и добавьте в него файлы из svltprj
Для запуска сайта:
Перейдите в консоли в папку egor, пропишите go run main.go
Перейдите в проект Svelte, пропишите npm run dev
Изначально порты Svelte: 5000, go: 8080
Возможно у вас будут другие порты, их можно поменять в main.go(прописать handlers под новый порт Svelte) и app.svelte(переменная api) в самом начале <script>
По вопросам пишите telegram: egor_bocharov
