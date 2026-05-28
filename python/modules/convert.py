# -*- coding: utf-8 -*-
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.ffmpeg_utils import run_ffmpeg, check_file_exists, get_ffmpeg_path


def convert_media(data):
    """转换音视频格式"""
    input_path = data.get('input_path')
    output_path = data.get('output_path')
    output_format = data.get('format')
    quality = data.get('quality', 'high')
    size = data.get('size', 'original')
    ffmpeg_path = get_ffmpeg_path(data)

    if not input_path or not output_path:
        return {"success": False, "error": "缺少输入或输出路径"}

    exists, err = check_file_exists(input_path)
    if not exists:
        return {"success": False, "error": err}

    cmd = [ffmpeg_path, '-y', '-i', input_path]

    quality_map = {'best': 2, 'high': 5, 'medium': 10, 'low': 20}
    crf = quality_map.get(quality, 10)

    # 视频格式
    if output_format in ['mp4', 'mkv', 'mov', 'avi', 'webm']:
        cmd.extend(['-c:v', 'libx264', '-crf', str(crf), '-preset', 'medium'])
        if size != 'original' and 'x' in size:
            cmd.extend(['-vf', f'scale={size}'])
        cmd.extend(['-c:a', 'aac', '-b:a', '128k'])
        cmd.append(output_path)

    # 图片格式
    elif output_format in ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff']:
        cmd.extend(['-frames:v', '1'])
        cmd.append(output_path)

    # ICO 格式特殊处理（需要缩放）
    elif output_format == 'ico':
        # ICO 格式要求尺寸不超过 256x256
        # 使用更兼容的缩放语法
        cmd.extend([
            '-frames:v', '1',
            '-vf', 'scale=iw*min(1\\,256/iw):ih*min(1\\,256/ih)',
            '-sws_flags', 'bilinear'
        ])
        cmd.append(output_path)

    # 音频格式
    elif output_format in ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a']:
        codec_map = {
            'mp3': ['-c:a', 'libmp3lame', '-b:a', '128k'],
            'aac': ['-c:a', 'aac', '-b:a', '128k'],
            'flac': ['-c:a', 'flac', '-compression_level', '5'],
            'ogg': ['-c:a', 'libvorbis', '-q:a', '5'],
        }
        if output_format in codec_map:
            cmd.extend(codec_map[output_format])
        elif output_format == 'wav':
            cmd.extend(['-c:a', 'pcm_s16le'])
        else:
            cmd.extend(['-c:a', 'copy'])
        cmd.append(output_path)

    else:
        return {"success": False, "error": f"不支持的格式: {output_format}"}

    return run_ffmpeg(cmd)