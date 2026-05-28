# -*- coding: utf-8 -*-
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.ffmpeg_utils import run_ffmpeg, check_file_exists, get_ffmpeg_path


def adjust_volume(data):
    """调节音频音量"""
    input_path = data.get('input_path')
    output_path = data.get('output_path')
    volume = data.get('volume', 100)
    output_format = data.get('output_format', 'same')
    ffmpeg_path = get_ffmpeg_path(data)

    if not input_path or not output_path:
        return {"success": False, "error": "缺少输入或输出路径"}

    exists, err = check_file_exists(input_path)
    if not exists:
        return {"success": False, "error": err}

    # 音量增益系数
    volume_factor = volume / 100.0

    # 构建命令（不使用 copy，因为需要应用音量滤镜）
    cmd = [ffmpeg_path, '-y', '-i', input_path]
    cmd.extend(['-af', f'volume={volume_factor}'])

    # 输出格式处理
    if output_format == 'same':
        # 保持原格式，但必须重新编码（因为用了音量滤镜）
        # 从输入文件推断编码格式
        cmd.extend(['-c:a', 'libvorbis'])  # ogg 默认用 libvorbis
        cmd.append(output_path)
    elif output_format == 'mp3':
        cmd.extend(['-c:a', 'libmp3lame', '-b:a', '192k'])
        cmd.append(output_path)
    elif output_format == 'wav':
        cmd.extend(['-c:a', 'pcm_s16le'])
        cmd.append(output_path)
    elif output_format == 'ogg':
        cmd.extend(['-c:a', 'libvorbis', '-q:a', '5'])
        cmd.append(output_path)
    elif output_format == 'flac':
        cmd.extend(['-c:a', 'flac', '-compression_level', '5'])
        cmd.append(output_path)
    elif output_format == 'aac' or output_format == 'm4a':
        cmd.extend(['-c:a', 'aac', '-b:a', '192k'])
        cmd.append(output_path)
    else:
        # 默认使用 libvorbis
        cmd.extend(['-c:a', 'libvorbis'])
        cmd.append(output_path)

    return run_ffmpeg(cmd)