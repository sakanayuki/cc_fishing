"""魚カード画像（art/fish/*.jpg）から、背景を透過したゲーム用スプライトを作る。

カード1枚につき2つ出力する:
  src/assets/fish/<id>.png        泳いでいる時の小さい絵（右向きにそろえる）
  src/assets/fish/<id>-large.png  釣り上げカットイン用の大きい絵
サイズ情報は src/assets/fish/sizes.json に書き出し、src/fish.ts が読む。

使い方: pip install pillow numpy scipy && python3 tools/extract_fish.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'fish'
OUT = ROOT / 'src' / 'assets' / 'fish'

# 泳いでいる時の横幅（ゲーム内ピクセル。画面は 360x640）
SWIM_WIDTH = {
    'aji': 34,
    'saba': 40,
    'kawahagi': 34,
    'madai': 50,
    'hirame': 48,
    'katsuo': 56,
    'maguro': 72,
    'mehikari': 34,
    'yumekasago': 44,
    'gindara': 56,
    'ankou': 60,
}
# カード上の絵の向き（小さい絵は指定がなければ左向き、大きい絵は指定がなければ頭が上）
SMALL_FACING = {'ankou': 'right'}
LARGE_POSE = {'ankou': 'right', 'kawahagi': 'left', 'hirame': 'left'}
# カットインで表示する大きい絵の長辺（ゲーム内ピクセル）
LARGE_LONG_SIDE = 280

# カード上の配置：大きい絵は上部、小さい絵は SMALL / LARGE の文字より下にある
LARGE_BAND = (380, 1500)
SMALL_BAND = (1600, 1950)
MARGIN = 70  # カードの枠線を避ける
BG_THRESHOLD = 60  # 背景色からの色差（RGB の差の合計）


def background_color(a: np.ndarray) -> np.ndarray:
    return np.median(a[60:120, 60:1050].reshape(-1, 3), axis=0)


def largest_box(mask: np.ndarray, band: tuple[int, int]) -> tuple[int, int, int, int]:
    """band 内で最も大きい塊の外接矩形 (y0, y1, x0, x1)。"""
    m = np.zeros_like(mask)
    m[band[0] : band[1]] = mask[band[0] : band[1]]
    lab, n = ndimage.label(ndimage.binary_closing(m, iterations=2))
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    best = int(np.argmax(sizes)) + 1
    ys, xs = ndimage.find_objects(lab)[best - 1]
    return ys.start, ys.stop, xs.start, xs.stop


def cut_out(a: np.ndarray, bg: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    """外側から背景を塗りつぶして透過し、魚本体（最大の塊）だけを残す。"""
    y0, y1, x0, x1 = box
    pad = 8
    crop = a[y0 - pad : y1 + pad, x0 - pad : x1 + pad]
    near_bg = np.abs(crop - bg).sum(2) < BG_THRESHOLD
    # 縁から繋がっている背景色の領域だけを背景とみなす（魚の中の明るい部分は残す）
    lab, _ = ndimage.label(near_bg)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    background = np.isin(lab, list(edge_labels))
    fg = ~background
    # 紙のシミなど小さな塊を除き、最大の塊（魚）だけ残す
    flab, fn = ndimage.label(fg)
    if fn > 1:
        sizes = ndimage.sum(fg, flab, range(1, fn + 1))
        fg = flab == (int(np.argmax(sizes)) + 1)
    rgba = np.dstack([crop.astype(np.uint8), (fg * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA')
    return img.crop(img.getbbox())


def shrink(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """縮小してから半透明をなくし、ドット絵らしいくっきりした縁にする。"""
    small = img.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    arr = np.asarray(small).copy()
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(arr, 'RGBA')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for fish_id, swim_w in SWIM_WIDTH.items():
        a = np.asarray(Image.open(SRC / f'{fish_id}.jpg').convert('RGB')).astype(int)
        bg = background_color(a)
        mask = np.abs(a - bg).sum(2) > BG_THRESHOLD
        mask[:, :MARGIN] = mask[:, -MARGIN:] = False

        # 小さい絵：右向きにそろえる
        small = cut_out(a, bg, largest_box(mask, SMALL_BAND))
        if SMALL_FACING.get(fish_id, 'left') == 'left':
            small = small.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        swim_h = max(1, round(small.height * swim_w / small.width))
        shrink(small, (swim_w, swim_h)).save(OUT / f'{fish_id}.png')

        # 大きい絵：向きは LARGE_POSE の指定を記録する
        large = cut_out(a, bg, largest_box(mask, LARGE_BAND))
        scale = LARGE_LONG_SIDE / max(large.width, large.height)
        large_size = (round(large.width * scale), round(large.height * scale))
        shrink(large, large_size).save(OUT / f'{fish_id}-large.png')

        sizes[fish_id] = {
            'width': swim_w,
            'height': swim_h,
            'large': {
                'width': large_size[0],
                'height': large_size[1],
                'pose': LARGE_POSE.get(fish_id, 'up'),
            },
        }
        print(fish_id, sizes[fish_id])

    (OUT / 'sizes.json').write_text(json.dumps(sizes, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
