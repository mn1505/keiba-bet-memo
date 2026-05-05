#!/usr/bin/env python3
"""保存済みHTMLから払戻候補を抽出し、results.json を作る補助ツール。"""

import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None


TRACKS = [
    ("札幌", "SAPPORO"),
    ("函館", "HAKODATE"),
    ("福島", "FUKUSHIMA"),
    ("新潟", "NIIGATA"),
    ("東京", "TOKYO"),
    ("中山", "NAKAYAMA"),
    ("中京", "CHUKYO"),
    ("京都", "KYOTO"),
    ("阪神", "HANSHIN"),
    ("小倉", "KOKURA"),
]
TRACK_CODE_TO_LABEL = {track_code: track_label for track_label, track_code in TRACKS}

BET_TYPES = ["単勝", "複勝", "ワイド", "馬連", "馬単", "三連複", "三連単"]

HORSE_COUNT_BY_BET_TYPE = {
    "単勝": 1,
    "複勝": 1,
    "ワイド": 2,
    "馬連": 2,
    "馬単": 2,
    "三連複": 3,
    "三連単": 3,
}

ORDERLESS_BET_TYPES = {"ワイド", "馬連", "三連複"}
ORDERED_BET_TYPES = {"馬単", "三連単"}

MAX_CANDIDATES_TO_SHOW = 80
RACE_ID_PATTERN = re.compile(r"^\d{8}-[A-Z]+-(?:[1-9]|1[0-2])R$")
DAY_HTML_FILENAME_PATTERN = re.compile(r"^(20\d{6})-([A-Z]+)-(?:all|payouts)\.html?$", re.IGNORECASE)
PAYBACK_LIST_DATE_PATTERN = re.compile(r"payback_list\.html\?[^\"'<> ]*kaisai_date=(20\d{6})", re.IGNORECASE)


def print_notice():
    print("保存HTML取込〜的中照合向け results.json 作成ツール")
    print("- ブラウザで保存したHTMLファイルのローカル読み込みだけを行います。")
    print("- 外部サイトへの直接アクセス、URL巡回、自動スクレイピング、自動リトライは行いません。")
    print("- ログイン回避、有料情報取得、CAPTCHA回避、User-Agent偽装、アクセス制限回避は行いません。")
    print("- 実際の馬券購入、送金、外部投票サイト連携は行いません。")
    print("- 対象サイトの利用規約や権利を尊重し、取得データは個人利用の範囲に留めてください。\n")


def prompt_yes_no(prompt_text, default=None):
    while True:
        suffix = ""
        if default == "y":
            suffix = " [Y/n]"
        elif default == "n":
            suffix = " [y/N]"

        value = input(f"{prompt_text}{suffix}: ").strip().lower()
        if not value and default in {"y", "n"}:
            return default == "y"
        if value in {"y", "yes"}:
            return True
        if value in {"n", "no"}:
            return False
        print("y または n で入力してください。")


def prompt_required(prompt_text, default=None):
    while True:
        suffix = f" [{default}]" if default is not None else ""
        value = input(f"{prompt_text}{suffix}: ").strip()
        if value:
            return value
        if default is not None:
            return str(default)
        print("入力してください。")


def normalize_text(text):
    return unicodedata.normalize("NFKC", str(text)).replace("\u00a0", " ").strip()


def normalize_date_input(raw_value):
    value = normalize_text(raw_value)
    compact_match = re.fullmatch(r"(\d{4})(\d{2})(\d{2})", value)
    separated_match = re.fullmatch(r"(\d{4})([-/.])(\d{1,2})\2(\d{1,2})", value)
    japanese_match = re.fullmatch(r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日", value)

    if compact_match:
        year_text, month_text, day_text = compact_match.groups()
    elif separated_match:
        year_text, _separator, month_text, day_text = separated_match.groups()
    elif japanese_match:
        year_text, month_text, day_text = japanese_match.groups()
    else:
        raise ValueError("日付の形式が正しくありません。")

    date_value = datetime(int(year_text), int(month_text), int(day_text))
    return date_value.strftime("%Y-%m-%d"), date_value.strftime("%Y%m%d")


def validate_race_id(race_id):
    return bool(RACE_ID_PATTERN.fullmatch(race_id))


def prompt_choice(title, choices, default_label=None):
    print(title)
    for index, (label, _value) in enumerate(choices, start=1):
        print(f"  {index}. {label}")

    while True:
        value = prompt_required("番号または名前を入力してください", default_label)

        if value.isdigit():
            index = int(value)
            if 1 <= index <= len(choices):
                return choices[index - 1]

        for label, choice_value in choices:
            if value == label:
                return label, choice_value
            if str(value).upper() == str(choice_value).upper():
                return label, choice_value

        print("選択肢にある番号または名前を入力してください。")


def prompt_date(default=None):
    while True:
        value = prompt_required("日付を入力してください（例: 2026-05-02）", default)
        try:
            display_date, _compact_date = normalize_date_input(value)
            return display_date
        except ValueError:
            print("日付の形式が正しくありません。2026-05-02、2026/05/02、20260502 などで入力してください。")


def prompt_race_number(default=None):
    while True:
        value = prompt_required("レース番号を 1〜12 で入力してください", default)
        if value.endswith(("R", "r")):
            value = value[:-1]
        if value.isdigit() and 1 <= int(value) <= 12:
            return int(value)
        print("レース番号は 1〜12 の整数で入力してください。")


def create_race_id(date_text, track_code, race_number):
    _display_date, compact_date = normalize_date_input(date_text)
    return f"{compact_date}-{track_code}-{race_number}R"


def prompt_race_id(inferred_race):
    print("\nraceId を指定してください。")
    inferred_race_id = inferred_race.get("raceId")

    if inferred_race:
        print("HTMLから推測できた情報:")
        if inferred_race.get("date"):
            print(f"  日付: {inferred_race['date']}")
        if inferred_race.get("track_label"):
            print(f"  競馬場: {inferred_race['track_label']}")
        if inferred_race.get("race_number"):
            print(f"  レース番号: {inferred_race['race_number']}R")
        if inferred_race_id:
            print(f"  raceId候補: {inferred_race_id}")
            if prompt_yes_no("この raceId を使いますか", default="y"):
                return inferred_race_id

    if prompt_yes_no("raceId を直接入力しますか", default="y" if not inferred_race else "n"):
        while True:
            race_id = prompt_required("raceId（例: 20260502-TOKYO-11R）", inferred_race_id)
            if validate_race_id(race_id):
                return race_id
            print("raceId は 20260502-TOKYO-11R のような形式で入力してください。")

    date_text = prompt_date(inferred_race.get("date"))
    default_track_label = inferred_race.get("track_label")
    track_label, track_code = prompt_choice("競馬場を選んでください。", TRACKS, default_track_label)
    race_number = prompt_race_number(inferred_race.get("race_number"))
    race_id = create_race_id(date_text, track_code, race_number)
    print(f"作成した raceId: {race_id}")
    return race_id


def prompt_tool_mode():
    _label, mode = prompt_choice(
        "作成方法を選んでください。",
        [
            ("1日分の払戻一覧HTMLから結果JSONを作成", "day_payout_list"),
            ("1レース分の保存HTMLから results.json を作成", "single_race"),
        ],
        default_label="1",
    )
    return mode


def clean_file_path(raw_path):
    path_text = raw_path.strip()
    if len(path_text) >= 2 and path_text[0] == path_text[-1] and path_text[0] in {"'", '"'}:
        path_text = path_text[1:-1]
    return Path(path_text).expanduser()


def prompt_html_file_path():
    print("例:")
    print("  scraped_pages/netkeiba-result.html")
    print("  scraped_pages/keibalab-result.html")
    print("  /Users/nagahisamichiya/Downloads/result.html")
    while True:
        raw_path = prompt_required("ブラウザで保存したHTMLファイルのパス")
        html_path = clean_file_path(raw_path)
        if html_path.exists() and html_path.is_file():
            return html_path
        print(f"HTMLファイルが見つかりません: {html_path}")
        print("Command + S などで保存したHTMLファイルの正しいパスを入力してください。")


def prompt_day_html_file_path():
    print("例:")
    print("  scraped_pages/20260502-TOKYO-all.html")
    print("  scraped_pages/20260502-TOKYO-payouts.html")
    print("  /Users/nagahisamichiya/Downloads/20260502-TOKYO-all.html")
    while True:
        raw_path = prompt_required("1日分の払戻一覧HTMLファイルのパス")
        html_path = clean_file_path(raw_path)
        if html_path.exists() and html_path.is_file():
            return html_path
        print(f"HTMLファイルが見つかりません: {html_path}")
        print("Chromeなどで保存したHTMLファイルの正しいパスを入力してください。")


def load_local_html(html_path):
    encodings = ["utf-8", "cp932", "euc-jp"]
    last_error = None

    for encoding in encodings:
        try:
            with html_path.open("r", encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError as error:
            last_error = error
        except OSError as error:
            raise RuntimeError(f"HTMLファイルを読み込めませんでした: {error}") from error

    raise RuntimeError(f"HTMLファイルの文字コードを判定できませんでした: {last_error}")


def get_soup(html_text):
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 が見つかりません。`pip install -r requirements.txt` を実行してください。")

    soup = BeautifulSoup(html_text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup


def infer_race_info(html_text):
    soup = get_soup(html_text)
    text = normalize_text(soup.get_text(" "))

    inferred = {}
    date_patterns = [
        r"(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日",
        r"(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            year, month, day = match.groups()
            try:
                inferred["date"] = normalize_date_input(f"{year}-{month}-{day}")[0]
            except ValueError:
                pass
            break

    for track_label, track_code in TRACKS:
        if track_label in text:
            inferred["track_label"] = track_label
            inferred["track_code"] = track_code
            break

    race_match = re.search(r"(?<!\d)([1-9]|1[0-2])\s*R(?=\D|$)", text, re.IGNORECASE)
    if race_match:
        inferred["race_number"] = int(race_match.group(1))

    if {"date", "track_code", "race_number"} <= set(inferred):
        inferred["raceId"] = create_race_id(inferred["date"], inferred["track_code"], inferred["race_number"])

    return inferred


def find_date_in_text(text):
    normalized = normalize_text(text)
    date_patterns = [
        r"(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日",
        r"(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})",
        r"(20\d{2})(\d{2})(\d{2})",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, normalized)
        if not match:
            continue
        year, month, day = match.groups()
        try:
            display_date, compact_date = normalize_date_input(f"{year}-{month}-{day}")
            return display_date, compact_date
        except ValueError:
            continue
    return None, None


def find_track_in_text(text):
    normalized = normalize_text(text)
    upper_text = normalized.upper()
    for track_label, track_code in TRACKS:
        if track_label in normalized or track_code in upper_text:
            return track_label, track_code
    return None, None


def infer_day_info(html_path, html_text):
    inferred = {}
    filename_match = DAY_HTML_FILENAME_PATTERN.fullmatch(html_path.name)
    if filename_match:
        compact_date, raw_track_code = filename_match.groups()
        track_code = raw_track_code.upper()
        if track_code in TRACK_CODE_TO_LABEL:
            display_date, normalized_compact_date = normalize_date_input(compact_date)
            inferred.update(
                {
                    "date": display_date,
                    "compact_date": normalized_compact_date,
                    "track_label": TRACK_CODE_TO_LABEL[track_code],
                    "track_code": track_code,
                    "source": "ファイル名",
                }
            )
            return inferred

    payback_date_match = PAYBACK_LIST_DATE_PATTERN.search(html_text)
    if payback_date_match:
        display_date, compact_date = normalize_date_input(payback_date_match.group(1))
        inferred["date"] = display_date
        inferred["compact_date"] = compact_date

    soup = get_soup(html_text)
    body_text = soup.get_text(" ")
    combined_text = f"{html_path.name} {html_text[:12000]} {body_text[:12000]}"

    display_date, compact_date = find_date_in_text(combined_text)
    track_label, track_code = find_track_in_text(combined_text)
    if display_date and "date" not in inferred:
        inferred["date"] = display_date
        inferred["compact_date"] = compact_date
    if track_label:
        inferred["track_label"] = track_label
        inferred["track_code"] = track_code
    if inferred:
        inferred["source"] = "HTMLコメント/本文/ファイル名"
    return inferred


def prompt_day_info(inferred_day):
    print("\n日付・競馬場の推定結果")
    if inferred_day:
        print(f"  推定元: {inferred_day.get('source', '不明')}")
        print(f"  日付: {inferred_day.get('date', '推定不可')}")
        print(f"  競馬場: {inferred_day.get('track_label', '推定不可')}")
    else:
        print("  推定できませんでした。手入力してください。")

    use_inferred = (
        inferred_day.get("date")
        and inferred_day.get("track_label")
        and prompt_yes_no("この日付・競馬場を使いますか。修正する場合は n を入力してください", default="y")
    )
    if use_inferred:
        return inferred_day["date"], inferred_day["track_label"], inferred_day["track_code"]

    date_text = prompt_date(inferred_day.get("date"))
    default_track_label = inferred_day.get("track_label")
    track_label, track_code = prompt_choice("競馬場を選んでください。", TRACKS, default_track_label)
    return date_text, track_label, track_code


def detect_race_number(text):
    normalized = normalize_text(text).upper()
    patterns = [
        r"第\s*([1-9]|1[0-2])\s*レース",
        r"(?<!\d)([1-9]|1[0-2])\s*レース",
        r"(?<!\d)([1-9]|1[0-2])\s*R(?![A-Z0-9])",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            return int(match.group(1))
    return None


def is_block_tag(tag):
    return tag.name in {
        "article",
        "caption",
        "div",
        "dl",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "p",
        "section",
        "table",
        "tbody",
        "td",
        "th",
        "tr",
        "ul",
    }


def find_nearby_race_number(tag):
    """テーブルや行の近くにあるレース番号を探します。"""
    for parent in [tag] + list(tag.parents):
        if parent is not tag and parent.name in {"body", "html", "[document]"}:
            continue
        parent_text = normalize_text(parent.get_text(" ", strip=True))
        if parent is not tag and len(parent_text) > 300:
            continue
        race_number = detect_race_number(parent_text)
        if race_number is not None:
            return race_number

    current = tag
    for _step in range(20):
        current = current.find_previous(is_block_tag)
        if current is None:
            break
        current_text = normalize_text(current.get_text(" ", strip=True))
        race_number = detect_race_number(current_text)
        if race_number is not None:
            return race_number

    return None


def split_lines_by_race(text):
    lines = [normalize_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    blocks = {race_number: [] for race_number in range(1, 13)}
    unknown_lines = []
    current_race_number = None

    for line in lines:
        race_number = detect_race_number(line)
        if race_number is not None:
            current_race_number = race_number
        if current_race_number is None:
            if any(bet_type in line or bet_type.replace("三", "3") in line for bet_type in BET_TYPES):
                unknown_lines.append(line)
            continue
        blocks[current_race_number].append(line)

    return blocks, unknown_lines


def extract_day_candidates_from_html(html_text, date_text, track_code):
    soup = get_soup(html_text)
    by_race = {race_number: [] for race_number in range(1, 13)}
    unknown_candidates = []

    table_candidates_by_race, table_unknown_candidates = extract_day_candidates_from_tables(soup, date_text, track_code)
    for race_number, candidates in table_candidates_by_race.items():
        by_race[race_number].extend(candidates)
    unknown_candidates.extend(table_unknown_candidates)

    for table in soup.find_all("table"):
        table.decompose()

    text = soup.get_text("\n")
    blocks, unknown_lines = split_lines_by_race(text)

    for race_number, block_lines in blocks.items():
        block_text = "\n".join(block_lines)
        if not block_text:
            continue
        race_id = create_race_id(date_text, track_code, race_number)
        candidates = extract_from_text_blocks(block_text)
        for candidate in candidates:
            candidate["raceId"] = race_id
            candidate["sourceMemo"] = f"{race_number}R {candidate['sourceMemo']}"
        by_race[race_number].extend(candidates)

    unknown_text = "\n".join(unknown_lines)
    if unknown_text:
        text_unknown_candidates = extract_from_text_blocks(unknown_text)
        for candidate in text_unknown_candidates:
            candidate["sourceMemo"] = f"race unknown {candidate['sourceMemo']}"
        unknown_candidates.extend(text_unknown_candidates)

    for race_number in by_race:
        by_race[race_number] = dedupe_candidate_items(by_race[race_number])
    unknown_candidates = dedupe_unknown_candidate_items(unknown_candidates)
    return by_race, unknown_candidates


def normalize_bet_type(value):
    normalized = normalize_text(value).replace("3連", "三連")
    for bet_type in BET_TYPES:
        if bet_type in normalized:
            return bet_type
    return None


def normalize_payout(value):
    normalized = normalize_text(value)
    normalized = normalized.replace("円", "").replace(",", "").strip()
    if not re.fullmatch(r"\d+", normalized):
        return None
    return int(normalized)


def parse_horse_numbers(raw_value):
    normalized = normalize_text(raw_value)
    normalized = normalized.replace("、", ",").replace(" ", ",").replace("　", ",")
    normalized = normalized.replace("-", ",").replace("－", ",").replace("ー", ",").replace("–", ",")
    normalized = normalized.replace("→", ",").replace(">", ",")
    parts = [part.strip() for part in normalized.split(",") if part.strip()]

    horse_numbers = []
    for part in parts:
        if not part.isdigit():
            raise ValueError("馬番は数字で入力してください。")
        number = int(part)
        if not 1 <= number <= 18:
            raise ValueError("馬番は 1〜18 で入力してください。")
        horse_numbers.append(number)

    return horse_numbers


def normalize_combination(bet_type, value):
    try:
        horse_numbers = parse_horse_numbers(value)
    except ValueError:
        return None

    required_count = HORSE_COUNT_BY_BET_TYPE[bet_type]
    if len(horse_numbers) != required_count:
        return None
    if len(set(horse_numbers)) != len(horse_numbers):
        return None

    if bet_type in ORDERLESS_BET_TYPES:
        return "-".join(str(number) for number in sorted(horse_numbers))
    if bet_type in ORDERED_BET_TYPES:
        return "→".join(str(number) for number in horse_numbers)
    return str(horse_numbers[0])


def make_result_item(race_id, bet_type, combination, payout, source_memo):
    return {
        "raceId": race_id,
        "betType": bet_type,
        "combination": combination,
        "payout": payout,
        "sourceMemo": source_memo,
    }


def find_payout_values(text):
    normalized = normalize_text(text)
    yen_values = []
    plain_values = []
    for match in re.finditer(r"(\d{1,3}(?:,\d{3})+|\d+)\s*(円)?", normalized):
        payout = normalize_payout(match.group(1))
        if payout is None:
            continue
        if match.group(2):
            yen_values.append((payout, match.start(), match.group(0)))
        elif payout >= 100:
            plain_values.append((payout, match.start(), match.group(0)))
    return yen_values or plain_values


def find_combination_values(text, required_count):
    normalized = normalize_text(text)
    separator = r"(?:[-－ー–→>,、,\s]+)"
    if required_count == 1:
        pattern = r"(?<![\d,])([1-9]|1[0-8])(?![\d,])"
    elif required_count == 2:
        pattern = rf"(?<![\d,])([1-9]|1[0-8]){separator}([1-9]|1[0-8])(?![\d,])"
    else:
        pattern = rf"(?<![\d,])([1-9]|1[0-8]){separator}([1-9]|1[0-8]){separator}([1-9]|1[0-8])(?![\d,])"

    combinations = []
    for match in re.finditer(pattern, normalized):
        raw = "-".join(match.groups())
        combinations.append((raw, match.start(), match.group(0)))
    return combinations


def split_cell_lines(cell):
    lines = []
    for line in cell.get_text("\n").splitlines():
        normalized = normalize_text(line)
        if normalized:
            lines.append(normalized)
    return lines


def text_looks_like_popularity(text):
    normalized = normalize_text(text)
    return "人気" in normalized or re.fullmatch(r"\d+\s*番人気", normalized) is not None


def collect_combinations_from_texts(bet_type, texts):
    required_count = HORSE_COUNT_BY_BET_TYPE[bet_type]
    combinations = []
    for text in texts:
        if "円" in text or text_looks_like_popularity(text):
            continue
        for raw_combination, _position, _raw_text in find_combination_values(text, required_count):
            combination = normalize_combination(bet_type, raw_combination)
            if combination is not None:
                combinations.append(combination)
    return combinations


def collect_payouts_from_texts(texts):
    payouts = []
    for text in texts:
        if text_looks_like_popularity(text):
            continue
        for payout, _position, _raw_text in find_payout_values(text):
            payouts.append(payout)
    return payouts


def build_candidates_from_table_row(row, source_memo):
    cells = row.find_all(["th", "td"])
    if not cells:
        return []

    cell_lines = [split_cell_lines(cell) for cell in cells]
    cell_texts = [" ".join(lines) for lines in cell_lines]
    row_text = " ".join(text for text in cell_texts if text)
    bet_type = normalize_bet_type(row_text)
    if bet_type is None:
        return []

    bet_cell_index = 0
    for index, text in enumerate(cell_texts):
        if normalize_bet_type(text) == bet_type:
            bet_cell_index = index
            break

    value_lines = []
    for lines in cell_lines[bet_cell_index + 1 :]:
        value_lines.extend(lines)

    combinations = collect_combinations_from_texts(bet_type, value_lines)
    payouts = collect_payouts_from_texts(value_lines)
    candidates = []

    if combinations and payouts and len(combinations) == len(payouts):
        for combination, payout in zip(combinations, payouts):
            candidates.append(make_result_item(None, bet_type, combination, payout, source_memo))
        return candidates

    return build_candidates_from_text(row_text, source_memo)


def extract_day_candidates_from_tables(soup, date_text, track_code):
    by_race = {race_number: [] for race_number in range(1, 13)}
    unknown_candidates = []

    for table_index, table in enumerate(soup.find_all("table"), start=1):
        table_race_number = find_nearby_race_number(table)
        for row_index, row in enumerate(table.find_all("tr"), start=1):
            row_text = normalize_text(row.get_text(" ", strip=True))
            if not any(bet_type in row_text or bet_type.replace("三", "3") in row_text for bet_type in BET_TYPES):
                continue

            race_number = detect_race_number(row_text) or table_race_number or find_nearby_race_number(row)
            source_memo = f"table {table_index} row {row_index}"
            candidates = build_candidates_from_table_row(row, source_memo)
            if not candidates:
                continue

            if race_number is None:
                unknown_candidates.extend(candidates)
                continue

            race_id = create_race_id(date_text, track_code, race_number)
            for candidate in candidates:
                candidate["raceId"] = race_id
                candidate["sourceMemo"] = f"{race_number}R {candidate['sourceMemo']}"
            by_race[race_number].extend(candidates)

    return by_race, unknown_candidates


def build_candidates_from_text(text, source_memo):
    normalized = normalize_text(text)
    normalized = re.sub(r"第\s*([1-9]|1[0-2])\s*レース", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!\d)([1-9]|1[0-2])\s*レース", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"(?<!\d)([1-9]|1[0-2])\s*R(?![A-Z0-9])", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\d+\s*番?人気", " ", normalized)
    candidates = []

    for bet_type in BET_TYPES:
        if bet_type not in normalized and bet_type.replace("三", "3") not in normalized:
            continue

        required_count = HORSE_COUNT_BY_BET_TYPE[bet_type]
        combinations = find_combination_values(normalized, required_count)
        payouts = find_payout_values(normalized)
        if not combinations or not payouts:
            continue

        if len(combinations) == len(payouts):
            for (raw_combination, _combination_pos, _combination_text), (payout, _payout_pos, _payout_text) in zip(combinations, payouts):
                combination = normalize_combination(bet_type, raw_combination)
                if combination is not None:
                    candidates.append(make_result_item(None, bet_type, combination, payout, source_memo))
            continue

        for raw_combination, combination_pos, _combination_text in combinations:
            combination = normalize_combination(bet_type, raw_combination)
            if combination is None:
                continue

            later_payouts = [item for item in payouts if item[1] >= combination_pos]
            payout = (later_payouts or payouts)[0][0]
            candidates.append(make_result_item(None, bet_type, combination, payout, source_memo))

    return candidates


def extract_from_tables(soup):
    candidates = []
    for table_index, table in enumerate(soup.find_all("table"), start=1):
        for row_index, row in enumerate(table.find_all("tr"), start=1):
            cells = [normalize_text(cell.get_text(" ")) for cell in row.find_all(["th", "td"])]
            row_text = " ".join(cell for cell in cells if cell)
            if not row_text:
                continue
            source_memo = f"table {table_index} row {row_index}"
            candidates.extend(build_candidates_from_text(row_text, source_memo))
    return candidates


def extract_from_text_blocks(text):
    lines = [normalize_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    candidates = []
    for index, line in enumerate(lines):
        if not any(bet_type in line or bet_type.replace("三", "3") in line for bet_type in BET_TYPES):
            continue

        window_lines = [line]
        for next_line in lines[index + 1 : index + 6]:
            if any(bet_type in next_line or bet_type.replace("三", "3") in next_line for bet_type in BET_TYPES):
                break
            window_lines.append(next_line)
        window_text = " ".join(window_lines)
        candidates.extend(build_candidates_from_text(window_text, f"text line {index + 1}"))

    return candidates


def dedupe_candidate_items(candidates):
    unique = []
    seen = set()
    for candidate in candidates:
        key = (candidate["betType"], candidate["combination"], candidate["payout"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def dedupe_unknown_candidate_items(candidates):
    unique = []
    seen = set()
    for candidate in candidates:
        key = (
            candidate["betType"],
            candidate["combination"],
            candidate["payout"],
            candidate.get("sourceMemo"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def extract_from_html(html_text):
    soup = get_soup(html_text)
    table_candidates = extract_from_tables(soup)
    text_candidates = extract_from_text_blocks(soup.get_text("\n"))
    return dedupe_candidate_items(table_candidates + text_candidates)


def show_candidates(candidates):
    print("\n抽出候補プレビュー")
    if not candidates:
        print("候補は見つかりませんでした。手動追加モードへ進みます。")
        return

    for index, candidate in enumerate(candidates[:MAX_CANDIDATES_TO_SHOW], start=1):
        print(
            f"[{index}] {candidate['betType']} "
            f"{candidate['combination']} {candidate['payout']}円 "
            f"{candidate['sourceMemo']}"
        )

    if len(candidates) > MAX_CANDIDATES_TO_SHOW:
        hidden_count = len(candidates) - MAX_CANDIDATES_TO_SHOW
        print(f"残り {hidden_count} 件の候補は省略しました。保存HTMLを見て確認してください。")


def prompt_bet_type():
    choices = [(bet_type, bet_type) for bet_type in BET_TYPES]
    label, _value = prompt_choice("券種を選んでください。", choices)
    return label


def prompt_combination(bet_type):
    required_count = HORSE_COUNT_BY_BET_TYPE[bet_type]
    guide = f"{bet_type}は馬番を{required_count}頭分入力してください"
    if required_count >= 2:
        guide += "（例: 7,13）"
    else:
        guide += "（例: 7）"

    while True:
        raw_value = prompt_required(guide)
        combination = normalize_combination(bet_type, raw_value)
        if combination is not None:
            return combination
        print(f"{bet_type}の買い目として正しくありません。馬番は1〜18で、必要頭数分だけ入力してください。")


def prompt_payout():
    while True:
        value = prompt_required("100円あたりの払戻金を0以上の整数で入力してください（例: 680）")
        payout = normalize_payout(value)
        if payout is not None:
            return payout
        print("払戻金は0以上の整数で入力してください。")


def prompt_manual_result_item(race_id):
    bet_type = prompt_bet_type()
    combination = prompt_combination(bet_type)
    payout = prompt_payout()
    result = make_result_item(race_id, bet_type, combination, payout, "manual")
    print("\n手動追加予定データ:")
    print_result_preview([result])

    if prompt_yes_no("この内容で追加しますか", default="y"):
        return result
    print("追加しませんでした。")
    return None


def strip_source_memo(result):
    return {
        "raceId": result["raceId"],
        "betType": result["betType"],
        "combination": result["combination"],
        "payout": result["payout"],
    }


def parse_candidate_selection(raw_value, candidate_count):
    value = normalize_text(raw_value).lower()
    if value in {"all", "a", "全部", "すべて"}:
        return list(range(candidate_count))
    if value in {"none", "n", "0", "除外"}:
        return []

    selected = set()
    for part in re.split(r"[,、\s]+", value):
        if not part:
            continue
        if not part.isdigit():
            raise ValueError("候補番号は数字、all、none のいずれかで指定してください。")
        index = int(part)
        if not 1 <= index <= candidate_count:
            raise ValueError(f"候補番号は 1〜{candidate_count} の範囲で指定してください。")
        selected.add(index - 1)
    return sorted(selected)


def prompt_adopt_candidates(candidates, race_id):
    if not candidates:
        return []

    print("\n採用する候補を選んでください。")
    print("  all: すべて採用")
    print("  none または 0: すべて除外")
    print("  例: 1,3,5")

    while True:
        raw_value = prompt_required("採用する候補番号", "all")
        try:
            selected_indexes = parse_candidate_selection(raw_value, len(candidates))
        except ValueError as error:
            print(error)
            continue

        adopted = []
        for index in selected_indexes:
            item = dict(candidates[index])
            item["raceId"] = race_id
            adopted.append(item)
        return adopted


def prompt_manual_results(race_id, has_results):
    results = []
    default = "n" if has_results else "y"
    while prompt_yes_no("手動で結果データを追加しますか", default=default):
        item = prompt_manual_result_item(race_id)
        if item is not None:
            results.append(item)
        default = "n"
    return results


def print_result_preview(results):
    if not results:
        print("  （なし）")
        return
    for index, result in enumerate(results, start=1):
        print(
            f"[{index}] {result['raceId']} "
            f"{result['betType']} {result['combination']} {result['payout']}円"
        )


def count_by_race_id(results):
    counts = {}
    for result in results:
        race_id = result.get("raceId") or "raceId未確定"
        counts[race_id] = counts.get(race_id, 0) + 1
    return counts


def race_id_sort_key(race_id):
    match = re.search(r"-(?:[1-9]|1[0-2])R$", race_id)
    if not match:
        return (99, race_id)
    race_number = int(race_id.rsplit("-", 1)[1].replace("R", ""))
    return (race_number, race_id)


def print_final_day_preview(results):
    print(f"出力予定件数: {len(results)}件")
    print("raceIdごとの件数:")
    for race_id, count in sorted(count_by_race_id(results).items(), key=lambda item: race_id_sort_key(item[0])):
        print(f"  {race_id}: {count}件")

    print("\nサンプル:")
    print_result_preview(results[:12])


def count_by_bet_type(results):
    counts = {}
    for result in results:
        counts[result["betType"]] = counts.get(result["betType"], 0) + 1
    return counts


def format_bet_type_counts(results):
    counts = count_by_bet_type(results)
    if not counts:
        return "候補なし"
    parts = []
    for bet_type in BET_TYPES:
        if counts.get(bet_type, 0) > 0:
            parts.append(f"{bet_type}{counts[bet_type]}件")
    return "、".join(parts)


def show_day_candidates_preview(candidates_by_race, unknown_candidates):
    print("\n抽出結果プレビュー")
    total_count = 0
    for race_number in range(1, 13):
        race_candidates = candidates_by_race.get(race_number, [])
        total_count += len(race_candidates)
        print(f"  {race_number}R: {format_bet_type_counts(race_candidates)}")
    print(f"全体件数: {total_count}件")

    samples = []
    for race_number in range(1, 13):
        samples.extend(candidates_by_race.get(race_number, [])[:2])
        if len(samples) >= 12:
            break
    if samples:
        print("\nサンプル:")
        print_result_preview(samples[:12])

    if unknown_candidates:
        print("\nレース番号を推定できない候補があります。手動確認してください。")
        print_result_preview(unknown_candidates[:MAX_CANDIDATES_TO_SHOW])


def group_candidates_by_payout_sets(candidates):
    """単勝の出現を次レース開始の目印として、候補をまとまりに分けます。"""
    groups = []
    current_group = []

    for candidate in candidates:
        if candidate.get("betType") == "単勝" and current_group:
            groups.append(current_group)
            current_group = []
        current_group.append(candidate)

    if current_group:
        groups.append(current_group)

    return groups


def assign_candidate_groups_to_races(candidate_groups, date_text, track_code, start_race_number=1):
    assigned_by_race = {race_number: [] for race_number in range(1, 13)}
    overflow_candidates = []

    for group_index, group in enumerate(candidate_groups):
        race_number = start_race_number + group_index
        if race_number > 12:
            overflow_candidates.extend(group)
            continue

        race_id = create_race_id(date_text, track_code, race_number)
        for candidate in group:
            item = dict(candidate)
            item["raceId"] = race_id
            item["sourceMemo"] = f"{race_number}R fallback {item.get('sourceMemo', '')}".strip()
            assigned_by_race[race_number].append(item)

    return assigned_by_race, overflow_candidates


def first_empty_race_number(candidates_by_race):
    for race_number in range(1, 13):
        if not candidates_by_race.get(race_number):
            return race_number
    return 13


def show_fallback_assignment_preview(candidate_groups, date_text, track_code, start_race_number=1):
    print("\nレース見出しから推定できなかったため、払戻セットの並び順からレース番号を推定しました")
    for group_index, group in enumerate(candidate_groups):
        race_number = start_race_number + group_index
        if race_number > 12:
            print(f"  割当不可: {len(group)}件")
            continue
        race_id = create_race_id(date_text, track_code, race_number)
        print(f"  {race_number}R ({race_id}): {len(group)}件")


def merge_candidates_by_race(base_by_race, extra_by_race):
    merged = {race_number: list(base_by_race.get(race_number, [])) for race_number in range(1, 13)}
    for race_number, candidates in extra_by_race.items():
        merged[race_number].extend(candidates)
        merged[race_number] = dedupe_candidate_items(merged[race_number])
    return merged


def prompt_manual_assign_unknown_candidates(candidate_groups, date_text, track_code):
    assigned_by_race = {race_number: [] for race_number in range(1, 13)}
    excluded_candidates = []
    start_index = 1

    print("\n手動割当モード")
    print("候補のまとまりごとに、割り当てるレース番号を入力してください。除外する場合は 0 を入力します。")

    for group in candidate_groups:
        end_index = start_index + len(group) - 1
        print(f"\n候補{start_index}〜{end_index}: {format_bet_type_counts(group)}")
        print_result_preview(group[:5])
        while True:
            value = prompt_required(f"候補{start_index}〜{end_index}を何Rにしますか（1〜12、除外は0）")
            if value.endswith(("R", "r")):
                value = value[:-1]
            if value == "0":
                excluded_candidates.extend(group)
                break
            if value.isdigit() and 1 <= int(value) <= 12:
                race_number = int(value)
                race_id = create_race_id(date_text, track_code, race_number)
                for candidate in group:
                    item = dict(candidate)
                    item["raceId"] = race_id
                    item["sourceMemo"] = f"{race_number}R manual assign {item.get('sourceMemo', '')}".strip()
                    assigned_by_race[race_number].append(item)
                break
            print("1〜12 のレース番号、または 0 を入力してください。")
        start_index = end_index + 1

    return assigned_by_race, excluded_candidates


def handle_unresolved_after_auto_assignment(candidates_by_race, unresolved, date_text, track_code):
    if not unresolved:
        return candidates_by_race, []

    print("\nraceIdを自動割当できなかった候補があります。")
    print_result_preview(unresolved[:MAX_CANDIDATES_TO_SHOW])
    _label, overflow_action = prompt_choice(
        "未割当候補をどう扱いますか。",
        [
            ("手動で割り当てる", "manual"),
            ("除外する", "exclude"),
            ("中止", "cancel"),
        ],
        default_label="1",
    )
    if overflow_action == "cancel":
        print("中止しました。raceId未確定の候補が残っていたため、JSONは出力していません。")
        sys.exit(0)
    if overflow_action == "exclude":
        print("raceId未確定の候補を除外しました。")
        return candidates_by_race, []

    overflow_groups = group_candidates_by_payout_sets(unresolved)
    manual_by_race, excluded = prompt_manual_assign_unknown_candidates(overflow_groups, date_text, track_code)
    if excluded:
        print(f"手動割当で除外した候補: {len(excluded)}件")
    return merge_candidates_by_race(candidates_by_race, manual_by_race), []


def prompt_resolve_unknown_day_candidates(candidates_by_race, unknown_candidates, date_text, track_code):
    if not unknown_candidates:
        return candidates_by_race, []

    candidate_groups = group_candidates_by_payout_sets(unknown_candidates)
    known_count = sum(len(items) for items in candidates_by_race.values())
    start_race_number = 1 if known_count == 0 else first_empty_race_number(candidates_by_race)

    if known_count == 0 and candidate_groups:
        show_fallback_assignment_preview(candidate_groups, date_text, track_code, start_race_number)
        if prompt_yes_no("この割当で続行しますか", default="y"):
            assigned_by_race, unresolved = assign_candidate_groups_to_races(
                candidate_groups, date_text, track_code, start_race_number
            )
            merged_by_race = merge_candidates_by_race(candidates_by_race, assigned_by_race)
            return handle_unresolved_after_auto_assignment(merged_by_race, unresolved, date_text, track_code)

    print("\nraceId未確定の候補があります")
    _label, action = prompt_choice(
        "未確定候補をどう扱いますか。",
        [
            ("自動割当する", "auto"),
            ("手動で割り当てる", "manual"),
            ("除外する", "exclude"),
            ("中止", "cancel"),
        ],
        default_label="1",
    )

    if action == "cancel":
        print("中止しました。raceId未確定の候補が残っていたため、JSONは出力していません。")
        sys.exit(0)
    if action == "exclude":
        print("raceId未確定の候補を除外しました。")
        return candidates_by_race, []
    if action == "manual":
        assigned_by_race, excluded = prompt_manual_assign_unknown_candidates(candidate_groups, date_text, track_code)
        if excluded:
            print(f"手動割当で除外した候補: {len(excluded)}件")
        return merge_candidates_by_race(candidates_by_race, assigned_by_race), []

    show_fallback_assignment_preview(candidate_groups, date_text, track_code, start_race_number)
    if not prompt_yes_no("この割当で続行しますか", default="y"):
        print("自動割当を中止しました。手動割当に進みます。")
        assigned_by_race, excluded = prompt_manual_assign_unknown_candidates(candidate_groups, date_text, track_code)
        if excluded:
            print(f"手動割当で除外した候補: {len(excluded)}件")
        return merge_candidates_by_race(candidates_by_race, assigned_by_race), []

    assigned_by_race, unresolved = assign_candidate_groups_to_races(
        candidate_groups, date_text, track_code, start_race_number
    )
    merged_by_race = merge_candidates_by_race(candidates_by_race, assigned_by_race)
    return handle_unresolved_after_auto_assignment(merged_by_race, unresolved, date_text, track_code)


def prompt_day_candidate_action():
    _label, action = prompt_choice(
        "\n抽出結果をどう扱いますか。",
        [
            ("全部採用", "all"),
            ("レース単位で採用/除外", "race_select"),
            ("手動補正", "manual"),
            ("中止", "cancel"),
        ],
        default_label="1",
    )
    return action


def prompt_adopt_day_candidates(candidates_by_race):
    action = prompt_day_candidate_action()
    if action == "cancel":
        print("中止しました。")
        sys.exit(0)
    if action == "manual":
        return []
    if action == "all":
        adopted = []
        for race_number in range(1, 13):
            adopted.extend(candidates_by_race.get(race_number, []))
        return adopted

    adopted = []
    for race_number in range(1, 13):
        race_candidates = candidates_by_race.get(race_number, [])
        if not race_candidates:
            continue
        print(f"\n{race_number}R 候補: {format_bet_type_counts(race_candidates)}")
        if prompt_yes_no(f"{race_number}R の候補を採用しますか", default="y"):
            adopted.extend(race_candidates)
    return adopted


def prompt_manual_day_result_item(date_text, track_code):
    if prompt_yes_no("raceId を直接入力しますか", default="n"):
        while True:
            race_id = prompt_required("raceId（例: 20260502-TOKYO-11R）")
            if validate_race_id(race_id):
                return prompt_manual_result_item(race_id)
            print("raceId は 20260502-TOKYO-11R のような形式で入力してください。")

    race_number = prompt_race_number()
    race_id = create_race_id(date_text, track_code, race_number)
    print(f"raceId: {race_id}")
    return prompt_manual_result_item(race_id)


def prompt_manual_day_results(date_text, track_code, has_results):
    results = []
    default = "n" if has_results else "y"
    while prompt_yes_no("手動で結果データを追加・補正しますか", default=default):
        item = prompt_manual_day_result_item(date_text, track_code)
        if item is not None:
            results.append(item)
        default = "n"
    return results


def choose_conflicting_duplicate(key, items):
    race_id, bet_type, combination = key
    print("\n払戻金が異なる重複があります。手動確認してください。")
    print(f"対象: {race_id} / {bet_type} / {combination}")
    for index, item in enumerate(items, start=1):
        source_memo = item.get("sourceMemo", "existing")
        print(f"  {index}. {item['payout']}円 ({source_memo})")

    while True:
        value = prompt_required("採用する番号")
        if value.isdigit() and 1 <= int(value) <= len(items):
            return items[int(value) - 1]
        print("表示されている番号で入力してください。")


def dedupe_results_with_confirmation(results):
    grouped = {}
    order = []
    for result in results:
        key = (result["raceId"], result["betType"], result["combination"])
        if key not in grouped:
            grouped[key] = []
            order.append(key)
        grouped[key].append(result)

    deduped = []
    for key in order:
        items = grouped[key]
        payout_values = {item["payout"] for item in items}
        if len(payout_values) == 1:
            deduped.append(items[0])
        else:
            deduped.append(choose_conflicting_duplicate(key, items))
    return deduped


def resolve_day_output_path(compact_date, track_code):
    output_dir = Path("results")
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"{compact_date}-{track_code}-all-results.json"

    if not output_path.exists():
        return output_path

    print(f"\n既に {output_path} があります。")
    _label, action = prompt_choice(
        "既存ファイルをどうしますか。",
        [
            ("上書き", "overwrite"),
            ("別名保存", "rename"),
            ("中止", "cancel"),
        ],
        default_label="1",
    )
    if action == "overwrite":
        return output_path
    if action == "cancel":
        print("中止しました。")
        sys.exit(0)

    while True:
        raw_name = prompt_required("別名ファイル名", f"{compact_date}-{track_code}-all-results-2.json")
        candidate_path = Path(raw_name)
        if not candidate_path.is_absolute():
            candidate_path = output_dir / candidate_path
        if candidate_path.suffix.lower() != ".json":
            candidate_path = candidate_path.with_suffix(".json")
        if not candidate_path.exists():
            return candidate_path
        print(f"そのファイルは既に存在します: {candidate_path}")


def load_existing_results(output_path):
    if not output_path.exists():
        return [], "new"

    print(f"\n既に {output_path} があります。")
    try:
        with output_path.open("r", encoding="utf-8") as file:
            existing_data = json.load(file)
    except json.JSONDecodeError:
        print("既存ファイルのJSON形式が正しくありません。")
        if prompt_yes_no("既存ファイルを上書きしますか", default="n"):
            return [], "overwrite"
        print("中止しました。")
        sys.exit(1)

    if not isinstance(existing_data, list):
        print("既存ファイルは配列形式ではありません。")
        if prompt_yes_no("既存ファイルを上書きしますか", default="n"):
            return [], "overwrite"
        print("中止しました。")
        sys.exit(1)

    while True:
        action = input("既存ファイルをどうしますか？ append=追記 / overwrite=上書き / cancel=中止 [append]: ").strip().lower()
        if action == "":
            action = "append"
        if action in {"append", "a"}:
            return existing_data, "append"
        if action in {"overwrite", "o"}:
            return [], "overwrite"
        if action in {"cancel", "c"}:
            print("中止しました。")
            sys.exit(1)
        print("append、overwrite、cancel のいずれかを入力してください。")


def write_results(output_path, results):
    clean_results = [strip_source_memo(result) for result in results]
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(clean_results, file, ensure_ascii=False, indent=2)
        file.write("\n")


def print_summary(source_label, html_path, loaded_at, candidate_count, adopted_count, output_count, race_id):
    print("\n実行結果")
    print(f"HTML入力元: {source_label}")
    print(f"HTMLファイル: {html_path.resolve()}")
    print(f"HTML読み込み日時: {loaded_at}")
    print(f"対象raceId: {race_id}")
    print(f"抽出候補数: {candidate_count}件")
    print(f"採用件数: {adopted_count}件")
    print(f"results.json 出力件数: {output_count}件")

    print("\nアプリへの連携手順:")
    print("  1. BAKENONIを開く")
    print("  2. 結果データ取り込みで results.json を選択")
    print("  3. プレビューを確認")
    print("  4. 結果を反映")
    print("  5. 対象レースの未確定を不的中にする")


def print_day_summary(html_path, loaded_at, candidate_count, output_count, output_path):
    print("\n実行結果")
    print(f"HTML入力元: ローカルHTML: {html_path}")
    print(f"HTMLファイル: {html_path.resolve()}")
    print(f"HTML読み込み日時: {loaded_at}")
    print(f"抽出候補数: {candidate_count}件")
    print(f"JSON出力件数: {output_count}件")
    print(f"出力ファイル: {output_path}")

    print("\nBAKENONI本体への取り込み手順:")
    print("  1. BAKENONIを開く")
    print(f"  2. 結果データ取り込みで {output_path} を選択")
    print("  3. プレビューを確認")
    print("  4. 結果を反映")
    print("  5. 対象レースの未確定を不的中にする")


def run_single_race_mode():
    try:
        local_html_path = prompt_html_file_path()
        html = load_local_html(local_html_path)
        html_path = local_html_path
        source_label = f"ローカルHTML: {local_html_path}"
        loaded_at = datetime.now().isoformat(timespec="seconds")
        inferred_race = infer_race_info(html)
        race_id = prompt_race_id(inferred_race)

        print("\nHTML読み込みログ")
        print(f"  ファイル名: {html_path}")
        print(f"  読み込み日時: {loaded_at}")
        print(f"  raceId: {race_id}")

        candidates = extract_from_html(html)
    except RuntimeError as error:
        print(f"\nエラー: {error}")
        sys.exit(1)

    show_candidates(candidates)
    adopted_results = prompt_adopt_candidates(candidates, race_id)
    manual_results = prompt_manual_results(race_id, bool(adopted_results))
    added_results = adopted_results + manual_results

    if not added_results:
        print("\nresults.json に出力するデータがないため、ファイルは変更しません。")
        print_summary(source_label, html_path, loaded_at, len(candidates), 0, 0, race_id)
        return

    print("\n最終確認: これから出力する結果データ")
    print_result_preview(added_results)
    if not prompt_yes_no("この内容で results.json に出力しますか", default="y"):
        print("中止しました。")
        return

    output_path = Path("results.json")
    existing_results, output_mode = load_existing_results(output_path)
    existing_with_source = [dict(result, sourceMemo="existing results.json") for result in existing_results]
    all_results = dedupe_results_with_confirmation(existing_with_source + added_results)
    write_results(output_path, all_results)

    added_after_dedupe = dedupe_results_with_confirmation(added_results)
    output_count = len(added_after_dedupe) if output_mode in {"new", "overwrite"} else len(all_results)
    print(f"\nresults.json を作成しました: {output_path.resolve()}")
    print_summary(source_label, html_path, loaded_at, len(candidates), len(added_after_dedupe), output_count, race_id)


def run_day_payout_list_mode():
    try:
        html_path = prompt_day_html_file_path()
        html = load_local_html(html_path)
        loaded_at = datetime.now().isoformat(timespec="seconds")
        inferred_day = infer_day_info(html_path, html)
        date_text, track_label, track_code = prompt_day_info(inferred_day)
        _display_date, compact_date = normalize_date_input(date_text)
        candidates_by_race, unknown_candidates = extract_day_candidates_from_html(html, date_text, track_code)
    except RuntimeError as error:
        print(f"\nエラー: {error}")
        sys.exit(1)

    print("\nHTML読み込みログ")
    print(f"  ファイル名: {html_path}")
    print(f"  読み込み日時: {loaded_at}")
    print(f"  日付: {date_text}")
    print(f"  競馬場: {track_label} / {track_code}")

    show_day_candidates_preview(candidates_by_race, unknown_candidates)
    candidate_count = sum(len(items) for items in candidates_by_race.values()) + len(unknown_candidates)
    candidates_by_race, unresolved_candidates = prompt_resolve_unknown_day_candidates(
        candidates_by_race, unknown_candidates, date_text, track_code
    )
    if unresolved_candidates:
        print("\nraceId未確定の候補が残っています。")
        print_result_preview(unresolved_candidates[:MAX_CANDIDATES_TO_SHOW])
        print("JSONに出力できる形式へ補完できなかったため、未確定候補は出力対象外です。")

    if unknown_candidates:
        print("\nレース番号補完後のプレビュー")
        show_day_candidates_preview(candidates_by_race, [])

    adopted_results = prompt_adopt_day_candidates(candidates_by_race)
    manual_results = prompt_manual_day_results(date_text, track_code, bool(adopted_results))
    added_results = dedupe_results_with_confirmation(adopted_results + manual_results)

    if not added_results:
        print("\nJSONに出力するデータがないため、ファイルは変更しません。")
        return

    print("\n最終確認: これから出力する結果データ")
    print_final_day_preview(added_results)
    if not prompt_yes_no("この内容でJSONに出力しますか", default="y"):
        print("中止しました。")
        return

    output_path = resolve_day_output_path(compact_date, track_code)
    write_results(output_path, added_results)
    print(f"\n結果JSONを作成しました: {output_path.resolve()}")
    print_day_summary(html_path, loaded_at, candidate_count, len(added_results), output_path)


def main():
    print_notice()
    if not prompt_yes_no("注意事項を確認しましたか？", default="n"):
        print("中止しました。")
        return

    tool_mode = prompt_tool_mode()
    if tool_mode == "day_payout_list":
        run_day_payout_list_mode()
    else:
        run_single_race_mode()


if __name__ == "__main__":
    main()
