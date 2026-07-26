// app.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx           context.Context
	baseDir       string
	runtimeDir    string
	previewServer *http.Server
	previewPort   int
}

type TaskResult struct {
	Success bool   `json:"Success"`
	Output  string `json:"output,omitempty"`
	Error   string `json:"error,omitempty"`
}

type TaskParams struct {
	Action string                 `json:"action"`
	Data   map[string]interface{} `json:"data"`
}

type FileInfo struct {
	Success bool   `json:"success"`
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Error   string `json:"error,omitempty"`
}

type MultipleFilesResult struct {
	Success bool       `json:"success"`
	Files   []FileInfo `json:"files"`
	Path    string     `json:"path,omitempty"`
	Error   string     `json:"error,omitempty"`
}

type DirResult struct {
	Success bool   `json:"success"`
	Path    string `json:"path"`
	Error   string `json:"error,omitempty"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	execPath, err := os.Executable()
	if err != nil {
		fmt.Println("获取执行路径失败:", err)
		a.baseDir = "."
	} else {
		a.baseDir = filepath.Dir(execPath)
	}

	fmt.Println("工作目录:", a.baseDir)
	a.extractEmbeddedRuntime()

	// 启动音频预览 HTTP 服务器
	go a.startPreviewServer()
}

func (a *App) extractEmbeddedRuntime() {
	a.runtimeDir = filepath.Join(os.TempDir(), "pigeon-tool-runtime")

	_ = os.RemoveAll(a.runtimeDir)
	_ = os.MkdirAll(a.runtimeDir, 0755)

	err := fs.WalkDir(embeddedFiles, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		data, err := embeddedFiles.ReadFile(path)
		if err != nil {
			return nil
		}

		outPath := filepath.Join(a.runtimeDir, path)
		_ = os.MkdirAll(filepath.Dir(outPath), 0755)

		mode := os.FileMode(0644)
		if strings.HasSuffix(strings.ToLower(path), ".exe") {
			mode = 0755
		}

		_ = os.WriteFile(outPath, data, mode)
		return nil
	})

	if err != nil {
		fmt.Println("释放内置运行文件失败:", err)
		return
	}

	fmt.Println("运行文件释放目录:", a.runtimeDir)
}

// ========== 音频预览 HTTP 服务器 ==========

func (a *App) startPreviewServer() {
	mux := http.NewServeMux()

	mux.HandleFunc("/preview", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")

		if path == "" {
			http.Error(w, "missing path", 400)
			return
		}

		file, err := os.Open(path)
		if err != nil {
			http.Error(w, err.Error(), 404)
			return
		}
		defer file.Close()

		stat, _ := file.Stat()

		// 设置正确的 Content-Type
		ext := strings.ToLower(filepath.Ext(path))
		contentType := "audio/mpeg"
		switch ext {
		case ".mp3":
			contentType = "audio/mpeg"
		case ".wav":
			contentType = "audio/wav"
		case ".ogg":
			contentType = "audio/ogg"
		case ".flac":
			contentType = "audio/flac"
		case ".aac", ".m4a":
			contentType = "audio/mp4"
		case ".opus":
			contentType = "audio/opus"
		case ".wma":
			contentType = "audio/x-ms-wma"
		default:
			contentType = "audio/mpeg"
		}
		w.Header().Set("Content-Type", contentType)

		// 允许跨域（Wails 内部使用）
		w.Header().Set("Access-Control-Allow-Origin", "*")

		http.ServeContent(w, r, filepath.Base(path), stat.ModTime(), file)
	})

	server := &http.Server{
		Addr:    "127.0.0.1:0",
		Handler: mux,
	}

	ln, err := net.Listen("tcp", server.Addr)
	if err != nil {
		fmt.Println("预览服务器启动失败:", err)
		return
	}

	a.previewPort = ln.Addr().(*net.TCPAddr).Port
	a.previewServer = server

	fmt.Println("🎵 音频预览端口:", a.previewPort)

	if err := server.Serve(ln); err != nil && err != http.ErrServerClosed {
		fmt.Println("预览服务器错误:", err)
	}
}

// ========== 获取预览端口 ==========

func (a *App) GetPreviewPort() int {
	return a.previewPort
}

func (a *App) getPythonScriptPath() string {
	possiblePaths := []string{
		filepath.Join(a.runtimeDir, "python", "main.py"),
		filepath.Join(a.baseDir, "python", "main.py"),
		filepath.Join(a.baseDir, "main.py"),
		filepath.Join(a.baseDir, "../python", "main.py"),
		"./python/main.py",
		"./main.py",
		"python/main.py",
	}

	for _, path := range possiblePaths {
		if path == "" {
			continue
		}
		if _, err := os.Stat(path); err == nil {
			fmt.Println("找到Python脚本:", path)
			return path
		}
	}

	fmt.Println("警告: 未找到 python/main.py，使用默认路径")
	return "python/main.py"
}

func (a *App) getFFmpegPath() string {
	possiblePaths := []string{
		filepath.Join(a.runtimeDir, "ffmpeg.exe"),
		filepath.Join(a.runtimeDir, "ffmpeg"),
		filepath.Join(a.baseDir, "ffmpeg.exe"),
		filepath.Join(a.baseDir, "ffmpeg"),
		filepath.Join(a.baseDir, "../ffmpeg.exe"),
		"./ffmpeg.exe",
		"./ffmpeg",
		"ffmpeg.exe",
		"ffmpeg",
	}

	for _, path := range possiblePaths {
		if path == "" {
			continue
		}
		if _, err := os.Stat(path); err == nil {
			fmt.Println("找到FFmpeg:", path)
			return path
		}
	}

	fmt.Println("警告: 未找到 ffmpeg，使用系统PATH中的ffmpeg")
	return "ffmpeg"
}

func (a *App) executePythonTask(action string, data map[string]interface{}) (*TaskResult, error) {
	data["ffmpeg_path"] = a.getFFmpegPath()

	params := TaskParams{
		Action: action,
		Data:   data,
	}

	jsonData, err := json.Marshal(params)
	if err != nil {
		return &TaskResult{Success: false, Error: fmt.Sprintf("参数序列化失败: %v", err)}, nil
	}

	tempDir := os.TempDir()
	timestamp := time.Now().UnixNano()
	paramsFile := filepath.Join(tempDir, fmt.Sprintf("wails_task_%s_%d_%d.json", action, os.Getpid(), timestamp))

	err = os.WriteFile(paramsFile, jsonData, 0644)
	if err != nil {
		return &TaskResult{Success: false, Error: fmt.Sprintf("写入参数文件失败: %v", err)}, nil
	}
	defer os.Remove(paramsFile)

	fmt.Printf("📝 参数文件: %s\n", paramsFile)
	fmt.Printf("📝 参数内容 (前200字符): %s\n", string(jsonData)[:min(len(string(jsonData)), 200)])

	scriptPath := a.getPythonScriptPath()
	fmt.Printf("📝 Python脚本: %s\n", scriptPath)

	cmd := exec.Command("python", scriptPath, paramsFile)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

	output, err := cmd.CombinedOutput()

	fmt.Printf("📝 Python原始输出: %s\n", string(output))

	if err != nil {
		fmt.Printf("❌ Python执行错误: %v\n", err)
		return &TaskResult{
			Success: false,
			Error:   fmt.Sprintf("Python执行失败: %v\n输出: %s", err, string(output)),
		}, nil
	}

	var result TaskResult
	if err := json.Unmarshal(output, &result); err != nil {
		fmt.Printf("❌ JSON解析失败: %v\n", err)
		fmt.Printf("原始输出: %s\n", string(output))
		return &TaskResult{
			Success: false,
			Error:   fmt.Sprintf("JSON解析失败: %v\n原始输出: %s", err, string(output)),
		}, nil
	}

	fmt.Printf("✅ 解析成功: Success=%v, Output长度=%d, Error=%s\n", result.Success, len(result.Output), result.Error)

	return &result, nil
}

// ========== 文件选择对话框 ==========

func (a *App) SelectFile() (*FileInfo, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "所有文件 (*.*)",
				Pattern:     "*.*",
			},
		},
	})

	if err != nil {
		return &FileInfo{Success: false, Error: err.Error()}, nil
	}

	if path == "" {
		return &FileInfo{Success: false, Error: "未选择文件"}, nil
	}

	fileInfo, err := os.Stat(path)
	if err != nil {
		return &FileInfo{Success: false, Error: err.Error()}, nil
	}

	return &FileInfo{
		Success: true,
		Name:    filepath.Base(path),
		Path:    path,
		Size:    fileInfo.Size(),
	}, nil
}

func (a *App) SelectFiles() (*MultipleFilesResult, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择媒体文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "媒体文件",
				Pattern:     "*.mp4;*.mkv;*.mov;*.avi;*.webm;*.mp3;*.wav;*.ogg;*.flac;*.aac;*.m4a;*.wma;*.opus;*.jpg;*.jpeg;*.png;*.webp;*.bmp;*.tiff;*.ico",
			},
			{
				DisplayName: "所有文件 (*.*)",
				Pattern:     "*.*",
			},
		},
	})

	if err != nil {
		return &MultipleFilesResult{Success: false, Error: err.Error()}, nil
	}

	if len(paths) == 0 {
		return &MultipleFilesResult{Success: false, Error: "未选择文件"}, nil
	}

	var files []FileInfo
	for _, path := range paths {
		fileInfo, err := os.Stat(path)
		if err != nil {
			continue
		}
		files = append(files, FileInfo{
			Success: true,
			Name:    filepath.Base(path),
			Path:    path,
			Size:    fileInfo.Size(),
		})
	}

	return &MultipleFilesResult{
		Success: true,
		Files:   files,
	}, nil
}

func (a *App) SelectFolder() (*MultipleFilesResult, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择包含媒体文件的文件夹",
	})

	if err != nil {
		return &MultipleFilesResult{Success: false, Error: err.Error()}, nil
	}

	if path == "" {
		return &MultipleFilesResult{Success: false, Error: "未选择文件夹"}, nil
	}

	var files []FileInfo
	mediaExts := map[string]bool{
		"mp4": true, "mkv": true, "mov": true, "avi": true, "webm": true,
		"mp3": true, "wav": true, "ogg": true, "flac": true,
		"aac": true, "m4a": true, "wma": true, "opus": true,
		"jpg": true, "jpeg": true, "png": true, "webp": true,
		"bmp": true, "tiff": true, "ico": true,
	}

	err = filepath.Walk(path, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			ext := strings.ToLower(filepath.Ext(filePath))
			if len(ext) > 0 {
				ext = ext[1:]
			}
			if mediaExts[ext] {
				files = append(files, FileInfo{
					Success: true,
					Name:    info.Name(),
					Path:    filePath,
					Size:    info.Size(),
				})
			}
		}
		return nil
	})

	if err != nil {
		return &MultipleFilesResult{Success: false, Error: err.Error()}, nil
	}

	return &MultipleFilesResult{
		Success: true,
		Files:   files,
		Path:    path,
	}, nil
}

func (a *App) SelectOutputDir() (*DirResult, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择输出目录",
	})

	if err != nil {
		return &DirResult{Success: false, Error: err.Error()}, nil
	}

	if path == "" {
		return &DirResult{Success: false, Error: "未选择目录"}, nil
	}

	return &DirResult{
		Success: true,
		Path:    path,
	}, nil
}

func (a *App) SelectFileWithFilter(title string, filterPattern string, filterName string) (*FileInfo, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{
				DisplayName: filterName,
				Pattern:     filterPattern,
			},
			{
				DisplayName: "所有文件 (*.*)",
				Pattern:     "*.*",
			},
		},
	})

	if err != nil {
		return &FileInfo{Success: false, Error: err.Error()}, nil
	}

	if path == "" {
		return &FileInfo{Success: false, Error: "未选择文件"}, nil
	}

	fileInfo, err := os.Stat(path)
	if err != nil {
		return &FileInfo{Success: false, Error: err.Error()}, nil
	}

	return &FileInfo{
		Success: true,
		Name:    filepath.Base(path),
		Path:    path,
		Size:    fileInfo.Size(),
	}, nil
}

// ========== 拖拽上传：保存临时文件 ==========

func (a *App) SaveTempFile(name string, data []byte) (*FileInfo, error) {
	if name == "" {
		return &FileInfo{Success: false, Error: "文件名不能为空"}, nil
	}

	tempDir := os.TempDir()
	timestamp := time.Now().UnixNano()
	tempPath := filepath.Join(tempDir, fmt.Sprintf("wails_temp_%d_%s", timestamp, name))

	err := os.WriteFile(tempPath, data, 0644)
	if err != nil {
		return &FileInfo{Success: false, Error: fmt.Sprintf("保存临时文件失败: %v", err)}, nil
	}

	go func() {
		time.Sleep(10 * time.Minute)
		_ = os.Remove(tempPath)
	}()

	return &FileInfo{
		Success: true,
		Name:    name,
		Path:    tempPath,
		Size:    int64(len(data)),
	}, nil
}

func (a *App) DeleteTempFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	return os.Remove(filePath)
}

// ========== 1. 格式转换 ==========

func (a *App) ConvertVideo(inputPath string, outputPath string, format string, quality string, size string) (*TaskResult, error) {
	if inputPath == "" {
		return &TaskResult{Success: false, Error: "输入文件路径不能为空"}, nil
	}
	if outputPath == "" {
		return &TaskResult{Success: false, Error: "输出文件路径不能为空"}, nil
	}
	if format == "" {
		return &TaskResult{Success: false, Error: "目标格式不能为空"}, nil
	}

	data := map[string]interface{}{
		"input_path":  inputPath,
		"output_path": outputPath,
		"format":      format,
		"quality":     quality,
		"size":        size,
	}

	return a.executePythonTask("convert", data)
}

// ========== 2. 音视频合并 ==========

func (a *App) MergeVideoAudio(videoPath string, audioPath string, outputPath string, outputFormat string, videoCodec string, audioCodec string) (*TaskResult, error) {
	if videoPath == "" {
		return &TaskResult{Success: false, Error: "视频文件路径不能为空"}, nil
	}
	if audioPath == "" {
		return &TaskResult{Success: false, Error: "音频文件路径不能为空"}, nil
	}
	if outputPath == "" {
		return &TaskResult{Success: false, Error: "输出文件路径不能为空"}, nil
	}

	data := map[string]interface{}{
		"video_path":    videoPath,
		"audio_path":    audioPath,
		"output_path":   outputPath,
		"output_format": outputFormat,
		"video_codec":   videoCodec,
		"audio_codec":   audioCodec,
	}

	return a.executePythonTask("merge", data)
}

// ========== 3. 音量调节 ==========

func (a *App) AdjustVolume(inputPath string, outputPath string, volume int, outputFormat string) (*TaskResult, error) {
	if inputPath == "" {
		return &TaskResult{Success: false, Error: "输入文件路径不能为空"}, nil
	}
	if outputPath == "" {
		return &TaskResult{Success: false, Error: "输出文件路径不能为空"}, nil
	}
	if volume < 0 || volume > 200 {
		return &TaskResult{Success: false, Error: "音量值必须在0-200之间"}, nil
	}

	data := map[string]interface{}{
		"input_path":    inputPath,
		"output_path":   outputPath,
		"volume":        volume,
		"output_format": outputFormat,
	}

	return a.executePythonTask("volume", data)
}

// ========== 获取音频信息 ==========

func (a *App) GetAudioInfo(filePath string) (*TaskResult, error) {
	if filePath == "" {
		return &TaskResult{Success: false, Error: "文件路径不能为空"}, nil
	}

	data := map[string]interface{}{
		"input_path": filePath,
	}

	return a.executePythonTask("info", data)
}

// ========== 4. 辅助功能 ==========

func (a *App) GetFileInfo(filePath string) (*TaskResult, error) {
	if filePath == "" {
		return &TaskResult{Success: false, Error: "文件路径不能为空"}, nil
	}

	data := map[string]interface{}{
		"input_path": filePath,
	}

	return a.executePythonTask("info", data)
}

func (a *App) CheckFFmpeg() (*TaskResult, error) {
	ffmpegPath := a.getFFmpegPath()
	cmd := exec.Command(ffmpegPath, "-version")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return &TaskResult{
			Success: false,
			Error:   fmt.Sprintf("FFmpeg不可用: %v", err),
		}, nil
	}

	return &TaskResult{
		Success: true,
		Output:  string(output),
	}, nil
}

// ========== 二维码生成 ==========

func (a *App) GenerateQRCode(text string, size int, fgColor string, bgColor string, embedImage string, embedMode string, errorCorrection string, border int) (*TaskResult, error) {
	if text == "" {
		return &TaskResult{Success: false, Error: "文本内容不能为空"}, nil
	}

	if border == 0 {
		border = 4
	}

	fmt.Printf("📝 收到二维码生成请求: text=%s, size=%d, fg=%s, bg=%s, mode=%s, border=%d, embedImage长度=%d\n",
		text[:min(len(text), 50)], size, fgColor, bgColor, embedMode, border, len(embedImage))

	data := map[string]interface{}{
		"text":             text,
		"size":             size,
		"fg_color":         fgColor,
		"bg_color":         bgColor,
		"embed_image":      embedImage,
		"embed_mode":       embedMode,
		"error_correction": errorCorrection,
		"border":           border,
	}

	return a.executePythonTask("qrcode", data)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
