package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx        context.Context
	baseDir    string
	runtimeDir string
}

type TaskResult struct {
	Success bool   `json:"success"`
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

// 获取Python脚本路径
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

// 获取FFmpeg路径
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

// 执行Python任务（使用临时文件，UTF-8编码）
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
	paramsFile := filepath.Join(tempDir, fmt.Sprintf("wails_task_%s_%d.json", action, os.Getpid()))

	err = os.WriteFile(paramsFile, jsonData, 0644)
	if err != nil {
		return &TaskResult{Success: false, Error: fmt.Sprintf("写入参数文件失败: %v", err)}, nil
	}
	defer os.Remove(paramsFile)

	scriptPath := a.getPythonScriptPath()

	cmd := exec.Command("python", scriptPath, paramsFile)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return &TaskResult{
			Success: false,
			Error:   fmt.Sprintf("Python执行失败: %v\n输出: %s", err, string(output)),
		}, nil
	}

	var result TaskResult
	if err := json.Unmarshal(output, &result); err != nil {
		return &TaskResult{
			Success: true,
			Output:  string(output),
		}, nil
	}

	return &result, nil
}

// ========== 文件选择对话框 ==========

// SelectFile 选择单个文件
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

// SelectFiles 选择文件（支持多选）
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

// SelectFolder 选择文件夹，返回文件夹中所有媒体文件
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

// SelectOutputDir 选择输出目录
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

// SelectFileWithFilter 带过滤器的文件选择
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

// SaveTempFile 保存临时文件（用于拖拽上传）
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

// DeleteTempFile 删除临时文件
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
