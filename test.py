import json
import sys
import os

# 添加 python 目录到路径
sys.path.insert(0, './python')

from modules.qrcode_gen import generate_qrcode

# 测试数据
data = {
    "text": "https://example.com",
    "size": 300,
    "fg_color": "#000000",
    "bg_color": "#ffffff",
    "embed_image": None,
    "embed_mode": "logo",
    "error_correction": "H"
}

result = generate_qrcode(data)
print(json.dumps(result, ensure_ascii=False))