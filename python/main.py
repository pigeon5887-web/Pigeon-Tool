#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import json
import os


def main():
    if len(sys.argv) < 2:
        result = {"success": False, "error": "缺少参数文件路径"}
        print(json.dumps(result, ensure_ascii=False))
        return

    params_file = sys.argv[1]

    try:
        with open(params_file, 'r', encoding='utf-8-sig') as f:
            content = f.read()
            params = json.loads(content)
    except Exception as e:
        result = {"success": False, "error": f"读取参数失败: {str(e)}"}
        print(json.dumps(result, ensure_ascii=False))
        return

    action = params.get('action')
    data = params.get('data', {})

    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)

    try:
        if action == 'convert':
            from modules.convert import convert_media
            result = convert_media(data)
        elif action == 'merge':
            from modules.merge import merge_video_audio
            result = merge_video_audio(data)
        elif action == 'volume':
            from modules.volume import adjust_volume
            result = adjust_volume(data)
        elif action == 'info':
            from modules.info import get_file_info
            result = get_file_info(data)
        elif action == 'qrcode':
            from modules.qrcode_gen import generate_qrcode
            result = generate_qrcode(data)
        else:
            result = {"success": False, "error": f"未知操作: {action}"}
    except ImportError as e:
        result = {"success": False, "error": f"导入模块失败: {str(e)}"}
    except Exception as e:
        result = {"success": False, "error": f"执行失败: {str(e)}"}

    # ===== 只输出 JSON =====
    try:
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"序列化结果失败: {str(e)}"}, ensure_ascii=False))


if __name__ == "__main__":
    main()