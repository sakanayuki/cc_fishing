# うみづり

スマホ縦画面向けの 2D ドット絵釣りゲーム。仕様は [docs/SPEC.md](docs/SPEC.md)。

## 遊び方

- 針は自動で沈んでいく。画面下の丸ボタンを **タップ** で少し巻き上げ、**長押し** で巻き続ける。
- 魚に針が重なった瞬間（「！」が出たとき）にタップすると食いつく。
- 食いついたら **連打** で巻き上げる。テンションゲージが上の赤に届くと糸が切れ、下の赤に届くと逃げられる。
- 制限時間は 90 秒。深い層の魚ほど高得点で、暴れ方も激しい。
- PC ではスペースキーでも操作できる。

## 開発

```sh
npm install
npm run dev        # http://localhost:5173/cc_fishing/
npm test           # ロジックのユニットテスト（Vitest）
npm run build      # 型チェック + dist/ へビルド
```

ゲームバランスの調整値は `src/config.ts`（針の速度・テンション・制限時間など）と `src/fish.ts`（魚ごとの得点・出現率・速さ）にまとまっている。

## 魚の画像

元の魚カード画像は `art/fish/<id>.jpg`。差し替えたら次を実行すると、背景を透過したゲーム用画像（`src/assets/fish/`）が作り直される。泳いでいる時の大きさも `tools/extract_fish.py` の `SWIM_WIDTH` で調整できる。

```sh
pip install pillow numpy scipy
python3 tools/extract_fish.py
```

## デプロイ

`main` ブランチへの push で GitHub Actions（`.github/workflows/deploy.yml`）が 型チェック → テスト → ビルド → GitHub Pages への公開 を行う。PR ではビルドとテストのみ実行する。

初回のみ、GitHub のリポジトリ設定 **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしておく必要がある。
