#!/usr/bin/env python3
"""スクレイピング試験版: 払戻情報の候補を見ながら results.json を作る補助ツール。"""

import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    requests = None

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

DEFAULT_TIMEOUT_SECONDS = 15
MAX_CANDIDATES_TO_SHOW = 30
ACCESS_LIMIT_STATUS_CODES = {400, 401, 403, 429}


def print_notice():
    print("スクレイピング試験版の注意事項")
    print("- 対象サイトの利用規約を確認してください。")
    print("- 対象サイトの robots.txt を確認してください。")
    print("- ログインが必要なページ、有料ページ、CAPTCHAがあるページには使わないでください。")
    print("- アクセス制限やサイト側の拒否を回避する処理は行いません。")
    print("- 短時間に大量アクセスしないでください。")
    print("- 取得データは個人利用の範囲に留めてください。")
    print("- このツールは手動実行で、1回の実行につき1URLだけ取得します。")
    print("- 実際の馬券購入、外部投票サイト連携、アクセス制限回避は行いません。\n")


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


def normalize_date_input(raw_value):
    value = unicodedata.normalize("NFKC", str(raw_value).strip())
    compact_match = re.fullmatch(r"(\d{4})(\d{2})(\d{2})", value)
    separated_match = re.fullmatch(r"(\d{4})([-/.])(\d{1,2})\2(\d{1,2})", value)

    if compact_match:
        year_text, month_text, day_text = compact_match.groups()
    elif separated_match:
        year_text, _separator, month_text, day_text = separated_match.groups()
    else:
        raise ValueError("日付の形式が正しくありません。")

    date_value = datetime(int(year_text), int(month_text), int(day_text))
    return date_value.strftime("%Y-%m-%d"), date_value.strftime("%Y%m%d")


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


def prompt_race_id():
    print("raceId を指定してください。")
    if prompt_yes_no("raceId を直接入力しますか", default="n"):
        while True:
            race_id = prompt_required("raceId（例: 20260502-TOKYO-11R）")
            if re.fullmatch(r"\d{8}-[A-Z]+-(?:[1-9]|1[0-2])R", race_id):
                return race_id
            print("raceId は 20260502-TOKYO-11R のような形式で入力してください。")

    date_text = prompt_date()
    track_label, track_code = prompt_choice("競馬場を選んでください。", TRACKS)
    race_number = prompt_race_number()
    race_id = create_race_id(date_text, track_code, race_number)
    print(f"作成した raceId: {race_id}")
    return race_id


def prompt_url():
    while True:
        url = prompt_required("対象レース結果ページURL")
        parsed = urlparse(url)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return url
        print("http または https のURLを入力してください。")


def prompt_input_mode():
    _label, mode = prompt_choice(
        "HTMLの読み込み方法を選んでください。",
        [
            ("URLから取得する", "url"),
            ("ローカルHTMLファイルを読み込む", "local"),
        ],
    )
    return mode


def clean_file_path(raw_path):
    path_text = raw_path.strip()
    if len(path_text) >= 2 and path_text[0] == path_text[-1] and path_text[0] in {"'", '"'}:
        path_text = path_text[1:-1]
    return Path(path_text).expanduser()


def prompt_html_file_path():
    while True:
        raw_path = prompt_required("ブラウザで保存したHTMLファイルのパス")
        html_path = clean_file_path(raw_path)
        if html_path.exists() and html_path.is_file():
            return html_path
        print(f"HTMLファイルが見つかりません: {html_path}")
        print("ブラウザで保存したHTMLファイルの正しいパスを入力してください。")


def load_config():
    """将来拡張用。tools/scraper_config.json があれば timeoutSeconds だけ読みます。"""
    config_path = Path("tools/scraper_config.json")
    if not config_path.exists():
        return {"timeoutSeconds": DEFAULT_TIMEOUT_SECONDS}

    try:
        with config_path.open("r", encoding="utf-8") as file:
            config = json.load(file)
    except (OSError, json.JSONDecodeError):
        print("tools/scraper_config.json を読み込めませんでした。デフォルト設定で続行します。")
        return {"timeoutSeconds": DEFAULT_TIMEOUT_SECONDS}

    timeout = config.get("timeoutSeconds", DEFAULT_TIMEOUT_SECONDS)
    if not isinstance(timeout, int) or timeout <= 0:
        timeout = DEFAULT_TIMEOUT_SECONDS
    return {"timeoutSeconds": timeout}


def fetch_html(url, timeout_seconds):
    if requests is None:
        raise RuntimeError("requests が見つかりません。`pip install -r requirements.txt` を実行してください。")

    try:
        response = requests.get(url, timeout=timeout_seconds)
        response.raise_for_status()
    except requests.HTTPError as error:
        status_code = error.response.status_code if error.response is not None else None
        if status_code in ACCESS_LIMIT_STATUS_CODES:
            raise RuntimeError(
                f"HTMLの取得に失敗しました: {error}\n"
                "アクセス制限やサイト側の拒否の可能性があります。\n"
                "このツールでは User-Agent 偽装、ログイン回避、CAPTCHA回避、"
                "連続リトライなどの回避処理は行いません。\n"
                "ブラウザでページを保存し、ローカルHTML読み込みモードを使ってください。"
            ) from error
        raise RuntimeError(f"HTMLの取得に失敗しました: {error}") from error
    except requests.RequestException as error:
        raise RuntimeError(f"HTMLの取得に失敗しました: {error}") from error

    return response.text


def load_local_html(html_path):
    encodings = ["utf-8", "cp932"]
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


def save_html(html, url, race_id):
    output_dir = Path("scraped_pages")
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_path = output_dir / f"{timestamp}.html"
    fetched_at = datetime.now().isoformat(timespec="seconds")

    metadata = (
        "<!--\n"
        "scrape_results_trial.py saved this page for local inspection.\n"
        f"sourceUrl: {url}\n"
        f"fetchedAt: {fetched_at}\n"
        f"raceId: {race_id}\n"
        "-->\n"
    )
    with output_path.open("w", encoding="utf-8") as file:
        file.write(metadata)
        file.write(html)
    return output_path


def normalize_text(text):
    return unicodedata.normalize("NFKC", text).replace("\u00a0", " ").strip()


def extract_candidates(html):
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 が見つかりません。`pip install -r requirements.txt` を実行してください。")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text("\n")
    lines = [normalize_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    candidates = []
    for index, line in enumerate(lines):
        found_bet_types = [bet_type for bet_type in BET_TYPES if bet_type in line]
        if not found_bet_types:
            continue

        window_lines = lines[index : index + 8]
        context = " / ".join(window_lines)
        numbers = re.findall(r"\d[\d,]*", context)
        combinations = re.findall(r"\d{1,2}\s*(?:[-－ー–→>]\s*\d{1,2}){1,2}", context)

        candidates.append(
            {
                "betTypes": found_bet_types,
                "context": context[:240],
                "numbers": numbers[:12],
                "combinations": [normalize_combination_text(value) for value in combinations[:5]],
            }
        )

    return candidates


def normalize_combination_text(value):
    normalized = normalize_text(value)
    normalized = re.sub(r"\s+", "", normalized)
    normalized = normalized.replace("－", "-").replace("ー", "-").replace("–", "-").replace(">", "→")
    return normalized


def show_candidates(candidates):
    print("\n抽出候補")
    if not candidates:
        print("候補は見つかりませんでした。手入力で results.json を作成してください。")
        return

    for index, candidate in enumerate(candidates[:MAX_CANDIDATES_TO_SHOW], start=1):
        print(f"\n[{index}] 券種候補: {', '.join(candidate['betTypes'])}")
        if candidate["combinations"]:
            print(f"    組み合わせ候補: {', '.join(candidate['combinations'])}")
        if candidate["numbers"]:
            print(f"    数値候補: {', '.join(candidate['numbers'])}")
        print(f"    周辺テキスト: {candidate['context']}")

    if len(candidates) > MAX_CANDIDATES_TO_SHOW:
        hidden_count = len(candidates) - MAX_CANDIDATES_TO_SHOW
        print(f"\n残り {hidden_count} 件の候補は省略しました。保存HTMLを見て確認してください。")


def prompt_bet_type():
    choices = [(bet_type, bet_type) for bet_type in BET_TYPES]
    label, _value = prompt_choice("券種を選んでください。", choices)
    return label


def parse_horse_numbers(raw_value):
    normalized = raw_value.replace("、", ",").replace(" ", ",").replace("　", ",")
    normalized = normalized.replace("-", ",").replace("－", ",").replace("ー", ",")
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


def prompt_combination(bet_type):
    required_count = HORSE_COUNT_BY_BET_TYPE[bet_type]
    guide = f"{bet_type}は馬番を{required_count}頭分入力してください"
    if required_count >= 2:
        guide += "（例: 7,13）"
    else:
        guide += "（例: 7）"

    while True:
        raw_value = prompt_required(guide)
        try:
            horse_numbers = parse_horse_numbers(raw_value)
        except ValueError as error:
            print(error)
            continue

        if len(horse_numbers) != required_count:
            print(f"{bet_type}は{required_count}頭分の馬番が必要です。")
            continue
        if len(set(horse_numbers)) != len(horse_numbers):
            print("同じ買い目内で馬番は重複できません。")
            continue

        if bet_type in ORDERLESS_BET_TYPES:
            return "-".join(str(number) for number in sorted(horse_numbers))
        if bet_type in ORDERED_BET_TYPES:
            return "→".join(str(number) for number in horse_numbers)
        return str(horse_numbers[0])


def prompt_payout():
    while True:
        value = prompt_required("100円あたりの払戻金を0以上の整数で入力してください（例: 680）")
        normalized = value.replace(",", "")
        if normalized.isdigit():
            return int(normalized)
        print("払戻金は0以上の整数で入力してください。")


def prompt_result_items(race_id):
    results = []
    print("\n候補を見ながら、results.json に入れるデータを手入力で確定します。")

    while True:
        if not prompt_yes_no("結果データを1件追加しますか", default="y" if not results else "n"):
            break

        bet_type = prompt_bet_type()
        combination = prompt_combination(bet_type)
        payout = prompt_payout()
        result = {
            "raceId": race_id,
            "betType": bet_type,
            "combination": combination,
            "payout": payout,
        }
        print("\n追加予定データ:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

        if prompt_yes_no("この内容で追加しますか", default="y"):
            results.append(result)
        else:
            print("追加しませんでした。")

    return results


def load_existing_results(output_path):
    if not output_path.exists():
        return []

    print(f"\n既に {output_path} があります。")
    try:
        with output_path.open("r", encoding="utf-8") as file:
            existing_data = json.load(file)
    except json.JSONDecodeError:
        print("既存ファイルのJSON形式が正しくありません。")
        if prompt_yes_no("既存ファイルを上書きしますか", default="n"):
            return []
        print("中止しました。")
        sys.exit(1)

    if not isinstance(existing_data, list):
        print("既存ファイルは配列形式ではありません。")
        if prompt_yes_no("既存ファイルを上書きしますか", default="n"):
            return []
        print("中止しました。")
        sys.exit(1)

    while True:
        action = input("既存ファイルをどうしますか？ append=追記 / overwrite=上書き / cancel=中止 [append]: ").strip().lower()
        if action == "":
            action = "append"
        if action in {"append", "a"}:
            return existing_data
        if action in {"overwrite", "o"}:
            return []
        if action in {"cancel", "c"}:
            print("中止しました。")
            sys.exit(1)
        print("append、overwrite、cancel のいずれかを入力してください。")


def write_results(output_path, results):
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)
        file.write("\n")


def print_summary(source_label, html_path, candidate_count, added_count, race_id):
    print("\n実行結果")
    print(f"HTML入力元: {source_label}")
    print(f"HTMLファイル: {html_path.resolve()}")
    print(f"抽出候補数: {candidate_count}件")
    print(f"results.json に出力した件数: {added_count}件")
    print(f"対象raceId: {race_id}")
    print("\n作成した results.json は、アプリの「結果データ取り込み」で読み込んでください。")


def main():
    print_notice()
    if not prompt_yes_no("注意事項を確認しましたか？", default="n"):
        print("中止しました。")
        return

    input_mode = prompt_input_mode()
    url = None
    local_html_path = None

    if input_mode == "url":
        config = load_config()
        url = prompt_url()
    else:
        local_html_path = prompt_html_file_path()

    race_id = prompt_race_id()

    try:
        if input_mode == "url":
            html = fetch_html(url, config["timeoutSeconds"])
            html_path = save_html(html, url, race_id)
            source_label = f"URL取得: {url}"
        else:
            html = load_local_html(local_html_path)
            html_path = local_html_path
            source_label = f"ローカルHTML: {local_html_path}"

        candidates = extract_candidates(html)
    except RuntimeError as error:
        print(f"\nエラー: {error}")
        sys.exit(1)

    show_candidates(candidates)
    added_results = prompt_result_items(race_id)

    if not added_results:
        print("\nresults.json に出力するデータがないため、ファイルは変更しません。")
        print_summary(source_label, html_path, len(candidates), 0, race_id)
        return

    output_path = Path("results.json")
    existing_results = load_existing_results(output_path)
    all_results = existing_results + added_results
    write_results(output_path, all_results)
    print_summary(source_label, html_path, len(candidates), len(added_results), race_id)


if __name__ == "__main__":
    main()
