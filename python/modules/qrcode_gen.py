# python/modules/qrcode_gen.py
# -*- coding: utf-8 -*-
import os
import sys
import json
import base64
import io
from PIL import Image, ImageDraw, ImageFilter
import qrcode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def generate_qrcode(data):
    """生成二维码，支持嵌入图片"""
    text = data.get('text', '')
    size = data.get('size', 300)
    fg_color = data.get('fg_color', '#000000')
    bg_color = data.get('bg_color', '#ffffff')
    embed_image = data.get('embed_image', None)
    embed_mode = data.get('embed_mode', 'logo')
    error_correction = data.get('error_correction', 'H')
    border = data.get('border', 4)

    if not text:
        return {"success": False, "error": "文本内容不能为空"}

    error_map = {
        'L': qrcode.constants.ERROR_CORRECT_L,
        'M': qrcode.constants.ERROR_CORRECT_M,
        'Q': qrcode.constants.ERROR_CORRECT_Q,
        'H': qrcode.constants.ERROR_CORRECT_H
    }
    error_level = error_map.get(error_correction, qrcode.constants.ERROR_CORRECT_H)

    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=error_level,
            box_size=10,
            border=border,
        )
        qr.add_data(text)
        qr.make(fit=True)

        qr_img = qr.make_image(
            fill_color=fg_color,
            back_color=bg_color,
        )

        if embed_image and embed_image != 'null' and embed_image != '' and len(embed_image) > 100:
            try:
                if ',' in embed_image:
                    embed_image = embed_image.split(',')[1]
                img_data = base64.b64decode(embed_image)
                logo_img = Image.open(io.BytesIO(img_data))

                if embed_mode == 'logo':
                    qr_img = embed_logo_center(qr_img, logo_img)
                elif embed_mode == 'background':
                    qr_img = embed_background(qr_img, logo_img, fg_color)
                elif embed_mode == 'blend':
                    qr_img = embed_blend(qr_img, logo_img, fg_color)
            except Exception as e:
                pass

        if size and size > 0:
            qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return {
            "success": True,
            "output": img_base64,
            "size": size
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def embed_logo_center(qr_img, logo_img):
    """Logo 居中嵌入 - 圆形裁剪"""
    if qr_img.mode != 'RGBA':
        qr_img = qr_img.convert('RGBA')
    if logo_img.mode != 'RGBA':
        logo_img = logo_img.convert('RGBA')

    qr_width, qr_height = qr_img.size
    logo_size = int(min(qr_width, qr_height) * 0.25)

    logo_w, logo_h = logo_img.size
    if logo_w != logo_h:
        crop_size = min(logo_w, logo_h)
        left = (logo_w - crop_size) // 2
        top = (logo_h - crop_size) // 2
        logo_img = logo_img.crop((left, top, left + crop_size, top + crop_size))

    logo_img = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    mask = Image.new('L', (logo_size, logo_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, logo_size, logo_size), fill=255)

    logo_circular = Image.new('RGBA', (logo_size, logo_size), (0, 0, 0, 0))
    logo_circular.paste(logo_img, (0, 0), mask)

    x = (qr_width - logo_size) // 2
    y = (qr_height - logo_size) // 2

    temp = Image.new('RGBA', (qr_width, qr_height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(temp)

    padding = 4
    shadow_offset = 2

    draw.ellipse(
        [x - padding + shadow_offset, y - padding + shadow_offset,
         x + logo_size + padding + shadow_offset, y + logo_size + padding + shadow_offset],
        fill=(0, 0, 0, 60)
    )

    draw.ellipse(
        [x - padding, y - padding, x + logo_size + padding, y + logo_size + padding],
        fill=(255, 255, 255, 255)
    )

    qr_img = Image.alpha_composite(qr_img, temp)
    qr_img.paste(logo_circular, (x, y), logo_circular)

    return qr_img


def embed_background(qr_img, bg_img, fg_color):
    """
    图片作为背景 - 增强对比度版本
    深色模块使用纯前景色，浅色模块使用背景图片
    这样二维码扫描器可以正常识别
    """
    qr_width, qr_height = qr_img.size

    # 背景图片缩放到二维码尺寸
    bg_img = bg_img.resize((qr_width, qr_height), Image.Resampling.LANCZOS)
    if bg_img.mode != 'RGBA':
        bg_img = bg_img.convert('RGBA')

    # 获取二维码的灰度数据（判断哪些是深色模块）
    qr_gray = qr_img.convert('L')
    qr_data = qr_gray.getdata()

    fg_rgb = hex_to_rgb(fg_color)

    # 创建结果图像
    result = bg_img.copy()
    pixels = result.load()

    # ===== 关键修改：提高对比度 =====
    # 阈值降低到 100，让更多模块被识别为深色
    threshold = 100

    for y in range(qr_height):
        for x in range(qr_width):
            idx = y * qr_width + x
            if qr_data[idx] < threshold:
                # 深色模块：使用纯前景色（不混合背景）
                result.putpixel((x, y), (
                    fg_rgb[0],
                    fg_rgb[1],
                    fg_rgb[2],
                    255
                ))
            # 浅色模块：保持背景图片不变

    return result


def embed_blend(qr_img, bg_img, fg_color):
    """
    混合融合 - 增强对比度版本
    深色模块使用半透明前景色叠加在背景上，保持一定对比度
    """
    qr_width, qr_height = qr_img.size

    bg_img = bg_img.resize((qr_width, qr_height), Image.Resampling.LANCZOS)
    if bg_img.mode != 'RGBA':
        bg_img = bg_img.convert('RGBA')

    qr_gray = qr_img.convert('L')
    qr_data = qr_gray.getdata()

    fg_rgb = hex_to_rgb(fg_color)

    result = bg_img.copy()
    pixels = result.load()

    # ===== 关键修改：提高对比度 =====
    threshold = 100
    # 深色模块使用 80% 前景色 + 20% 背景色（原来是 60% + 40%）
    fg_weight = 0.85  # 前景色权重提高到 85%
    bg_weight = 0.15  # 背景色权重降低到 15%

    for y in range(qr_height):
        for x in range(qr_width):
            idx = y * qr_width + x
            if qr_data[idx] < threshold:
                r, g, b, a = pixels[x, y]
                result.putpixel((x, y), (
                    int(fg_rgb[0] * fg_weight + r * bg_weight),
                    int(fg_rgb[1] * fg_weight + g * bg_weight),
                    int(fg_rgb[2] * fg_weight + b * bg_weight),
                    255
                ))

    return result


def hex_to_rgb(hex_color):
    """将十六进制颜色转为 RGB 元组"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join([c * 2 for c in hex_color])
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def generate(data):
    return generate_qrcode(data)