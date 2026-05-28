package main

import "embed"

//go:embed python/** ffmpeg.exe
var embeddedFiles embed.FS
