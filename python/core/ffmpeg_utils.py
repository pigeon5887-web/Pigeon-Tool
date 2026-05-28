# -*- coding: utf-8 -*-
import subprocess
import os
import json

def run_ffmpeg(cmd):
    """执行ffmpeg命令"""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout if result.returncode == 0 else result.stderr,
            "error": None if result.returncode == 0 else result.stderr
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e)
        }

def check_file_exists(filepath):
    """检查文件是否存在"""
    if not os.path.exists(filepath):
        return False, f"文件不存在: {filepath}"
    return True, ""

def get_ffmpeg_path(data):
    """从参数中获取ffmpeg路径"""
    return data.get('ffmpeg_path', 'ffmpeg.exe')