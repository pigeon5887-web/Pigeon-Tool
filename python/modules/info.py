# -*- coding: utf-8 -*-
import subprocess
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.ffmpeg_utils import check_file_exists, get_ffmpeg_path


def get_file_info(data):
    """获取音视频文件信息"""
    input_path = data.get('input_path')
    ffmpeg_path = get_ffmpeg_path(data)

    if not input_path:
        return {"success": False, "error": "缺少输入路径"}

    exists, err = check_file_exists(input_path)
    if not exists:
        return {"success": False, "error": err}

    ffprobe_path = ffmpeg_path.replace('ffmpeg', 'ffprobe')
    if ffprobe_path == ffmpeg_path:
        base_dir = os.path.dirname(ffmpeg_path)
        ffprobe_path = os.path.join(base_dir, 'ffprobe.exe')
        if not os.path.exists(ffprobe_path):
            ffprobe_path = 'ffprobe'

    cmd = [
        ffprobe_path,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        input_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            info = json.loads(result.stdout)
            return {
                "success": True,
                "output": json.dumps(info, ensure_ascii=False)
            }
        else:
            return {"success": False, "error": result.stderr}
    except Exception as e:
        return {"success": False, "error": str(e)}