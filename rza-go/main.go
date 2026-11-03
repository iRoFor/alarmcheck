package main

import (
	"embed"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
)

//go:embed index.html
var htmlContent embed.FS

func main() {
	// Находим свободный порт
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	url := fmt.Sprintf("http://127.0.0.1:%d", port)

	// Открываем браузер
	openBrowser(url)

	// Запускаем HTTP-сервер
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		content, _ := htmlContent.ReadFile("index.html")
		tmpl := template.Must(template.New("index").Parse(string(content)))
		tmpl.Execute(w, nil)
	})

	fmt.Printf("Программа запущена на %s\n", url)
	fmt.Println("Закройте это окно, чтобы остановить программу")
	
	if err := http.ListenAndServe(fmt.Sprintf("127.0.0.1:%d", port), nil); err != nil {
		log.Fatal(err)
	}
}

func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("неподдерживаемая платформа")
	}
	if err != nil {
		log.Printf("Не удалось открыть браузер: %v\n", err)
	}
}
