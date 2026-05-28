# -*- coding: utf-8 -*-
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.ffmpeg_utils import run_ffmpeg, check_file_exists, get_ffmpeg_path


def merge_video_audio(data):
    """合并视频和音频"""
    video_path = data.get('video_path')
    audio_path = data.get('audio_path')
    output_path = data.get('output_path')
    video_codec = data.get('video_codec', 'libx264')
    audio_codec = data.get('audio_codec', 'aac')
    ffmpeg_path = get_ffmpeg_path(data)

    if not video_path or not audio_path or not output_path:
        return {"success": False, "error": "缺少视频、音频或输出路径"}

    exists, err = check_file_exists(video_path)
    if not exists:
        return {"success": False, "error": err}

    exists, err = check_file_exists(audio_path)
    if not exists:
        return {"success": False, "error": err}

    video_map = {'libx264': 'libx264', 'libx265': 'libx265', 'copy': 'copy'}
    audio_map = {'aac': 'aac', 'libmp3lame': 'libmp3lame', 'copy': 'copy'}

    vcodec = video_map.get(video_codec, 'libx264')
    acodec = audio_map.get(audio_codec, 'aac')

    cmd = [
        ffmpeg_path, '-y',
        '-i', video_path,
        '-i', audio_path,

        '-map', '0:v:0',
        '-map', '1:a:0',
        '-sn',
        '-dn',

        '-c:v', vcodec,
        '-c:a', acodec,

        '-shortest',
        output_path
    ]

    return run_ffmpeg(cmd)