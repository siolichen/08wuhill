# WU HILL 霧丘茶宿 — 官方網站（靜態 HTML）

一頁式網站，中文、English、日本語三種語系。每個 HTML 檔已內嵌自己的樣式與腳本，只有 Google Fonts 與圖片是外部檔案。

## Vercel 部署

**做法 A：拖拉上傳**

1. 解壓縮後進入 `site` 資料夾，**全選裡面的檔案與資料夾**（`index.html`、`en`、`ja`、`assets`）。
2. 重新壓成一個 zip。重點：zip 打開後第一層就要看到 `index.html`，不能是 `site/` 這層資料夾。
3. Vercel → New Project → Deploy without Git → 拖入 zip。
4. **Framework Preset 選 `Other`**，Build Command 留空，Output Directory 留空。
5. 不要加 `vercel.json`。純靜態檔案不需要任何設定檔（先前版本附的設定檔會讓 `.html` 網址回傳 404，已移除）。

**做法 B：Git**

把上述檔案放在 repo **根目錄**（不要放在子目錄），Framework Preset 同樣選 `Other`。

### 網址規則

- 首頁：`https://你的網址/`
- 英文版：`https://你的網址/en/`
- 日文版：`https://你的網址/ja/`

若出現 **404 NOT_FOUND**，代表檔案沒有在部署的根目錄（多包了一層資料夾），或專案裡有 `vercel.json` 開啟了 `cleanUrls`。

### 先測部署管線

把 `deploy-test.html` 部署後打開 `https://你的網址/deploy-test.html`：看到「部署成功」與照片，表示檔案與圖片路徑都正常。

### 如果畫面空白

用 `_diagnostic/standalone-zh.html` 判斷（中文版單檔測試版，28 張圖片全部內嵌，不需要 `assets/`）：

- 把它改名為 `index.html` 單獨部署，若能正常顯示 → 原本是 `assets/` 沒一起上傳，或檔案被包在多一層資料夾裡。
- 若連它也空白 → 是 Vercel 專案設定問題：Framework Preset 不是 `Other`，或 Output Directory 被設成不存在的資料夾（`dist`、`build`、`public`）。

`_diagnostic/` 只是測試用，正式部署不需要，可以整個刪除。

## 一般主機部署

照原本結構上傳到網站根目錄即可：

- `https://你的網域/`
- `https://你的網域/en/`
- `https://你的網域/ja/`

## 檔案結構

```
index.html                     中文（首頁）
en/index.html                  English
ja/index.html                  日本語
assets/*.webp                  全站圖片（已降彩度）
robots.txt                     放網站根目錄
sitemap.xml                    放網站根目錄
llms.txt                       放網站根目錄（供 AI 檢索）
deploy-test.html                部署測試頁（確認完可刪）
_diagnostic/standalone-zh.html  中文版單檔測試版（圖片內嵌，正式部署不需要）
```

## 改文字

三個 HTML 檔可用任何文字編輯器開啟，區塊以中文註解分好：

```
<!-- ===== HERO 主視覺（輪播圖 3 張 / 標題 / 訂房按鈕） ===== -->
<!-- ===== 關於 / About ===== -->
<!-- ===== 房型標題 / Rooms ===== -->
<!-- ===== 茶禪靜心 / Tea meditation ===== -->
<!-- ===== 附近景點 / Nearby ===== -->
<!-- ===== 住宿須知 / Stay information ===== -->
<!-- ===== 常見問題 / FAQ（可折疊） ===== -->
<!-- ===== 訂房 CTA / Booking ===== -->
```

三個語系是獨立檔案，改文字要各改一次。

## 常用調整

**換圖片**：新檔放進 `assets/`（建議 WebP、寬 1600–1800px），覆蓋同名檔即可。

**訂房連結**：三個 HTML 中所有 `href="#booking"` 換成訂房系統網址（用編輯器全部取代）。

**電話 / Email**：`06-2923465`、`chaya@chaya.com`（footer 與 `<head>` 結構化資料各一份）。

**HERO 輪播秒數**：每個 HTML 檔 `</body>` 前的 `<script>` 內，`HERO_INTERVAL`（毫秒）。樣式與腳本都內嵌在各自的 HTML 裡，三個語系要各改一次。

**顏色**：紙色底 `#F4F2EC`、墨色字 `#26261F`、深色區 `#20211C`、茶綠按鈕 `#55684F`、淡黃線稿與 hover `#F0DFA0`。

## 放進 WordPress

把 `<body>` 內容貼進主題樣板，並把該 HTML `<head>` 裡的 `<style>` 區塊、`</body>` 前的 `<script>` 區塊一併複製過去（樣式與腳本都是內嵌的，沒有外部 CSS／JS 檔要連結）。圖片上傳到媒體庫或主題資料夾，再把 `src="assets/..."` 換成實際路徑。

## 上線前

1. 三個 HTML 的 `<head>` 與 `sitemap.xml` 中的 `https://wuhill.com.tw` 換成正式網域。
2. `href="#booking"` 換成真正的訂房連結。
3. footer 的 Instagram、LINE 連結換成實際帳號。

SEO 已內建：title、description、canonical、Open Graph、hreflang（中／英／日互指）、LodgingBusiness 與 FAQPage 結構化資料。`robots.txt` 已允許 GPTBot、ClaudeBot、PerplexityBot、Applebot 等 AI 爬蟲。
