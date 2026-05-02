#!/usr/bin/env python3
"""アプリで読み込める results.json を手入力で作成する補助ツール。"""

import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path


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


def normalize_date_input(raw_value):
    """入力された日付を YYYY-MM-DD と YYYYMMDD に正規化します。"""
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
    display_date = date_value.strftime("%Y-%m-%d")
    race_id_date = date_value.strftime("%Y%m%d")
    return display_date, race_id_date


def prompt_required(prompt_text, default=None):
    """空入力を許可しない入力。default があれば空入力で再利用します。"""
    while True:
        suffix = f" [{default}]" if default is not None else ""
        value = input(f"{prompt_text}{suffix}: ").strip()
        if value:
            return value
        if default is not None:
            return str(default)
        print("入力してください。")


def prompt_yes_no(prompt_text, default=None):
    """y / n の確認入力。default には 'y' または 'n' を指定できます。"""
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


def prompt_date(default=None):
    while True:
        value = prompt_required("日付を入力してください（例: 2026-05-02）", default)
        try:
            display_date, _race_id_date = normalize_date_input(value)
            return display_date
        except ValueError:
            print("日付の形式が正しくありません。YYYY-MM-DD 形式を基本に、2026/05/02、2026.05.02、20260502、2026-5-2 などで入力してください。")


def prompt_choice(title, choices, default_label=None):
    """番号または表示名で選択させます。choices は [(label, value), ...] 形式です。"""
    print(title)
    for index, (label, _value) in enumerate(choices, start=1):
        print(f"  {index}. {label}")

    while True:
        default_text = default_label if default_label is not None else None
        value = prompt_required("番号または名前を入力してください", default_text)

        if value.isdigit():
            index = int(value)
            if 1 <= index <= len(choices):
                return choices[index - 1]

        for label, choice_value in choices:
            if value == label:
                return label, choice_value

        print("選択肢にある番号または名前を入力してください。")


def prompt_race_number(default=None):
    while True:
        value = prompt_required("レース番号を 1〜12 で入力してください", default)
        if value.endswith(("R", "r")):
            value = value[:-1]
        if value.isdigit() and 1 <= int(value) <= 12:
            return int(value)
        print("レース番号は 1〜12 の整数で入力してください。")


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
        if value.isdigit():
            return int(value)
        print("払戻金は0以上の整数で入力してください。")


def create_race_id(date_text, track_code, race_number):
    _display_date, compact_date = normalize_date_input(date_text)
    return f"{compact_date}-{track_code}-{race_number}R"


def prompt_result_item(previous_race):
    default_date = previous_race.get("date") if previous_race else None
    default_track_label = previous_race.get("track_label") if previous_race else None
    default_race_number = previous_race.get("race_number") if previous_race else None

    date_text = prompt_date(default_date)
    track_label, track_code = prompt_choice("競馬場を選んでください。", TRACKS, default_track_label)
    race_number = prompt_race_number(default_race_number)
    bet_type = prompt_bet_type()
    combination = prompt_combination(bet_type)
    payout = prompt_payout()
    race_id = create_race_id(date_text, track_code, race_number)

    return {
        "result": {
            "raceId": race_id,
            "betType": bet_type,
            "combination": combination,
            "payout": payout,
        },
        "race": {
            "date": date_text,
            "track_label": track_label,
            "race_number": race_number,
        },
    }


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


def print_summary(output_path, added_results, all_results):
    race_ids = sorted({result["raceId"] for result in added_results})

    print("\nresults.json を作成しました。")
    print(f"追加した件数: {len(added_results)}件")
    print(f"ファイル内の合計件数: {len(all_results)}件")
    print(f"出力ファイル: {output_path.resolve()}")
    print("対象raceId一覧:")
    for race_id in race_ids:
        print(f"  - {race_id}")

    print("\nアプリでの読み込み方法:")
    print("  1. index.html をブラウザで開きます。")
    print("  2. 「結果データ取り込み」で作成した results.json を選びます。")
    print("  3. 「プレビューを作成」で照合内容を確認します。")
    print("  4. 問題なければ「結果を反映」を押します。")
    print("\n注意: payout は100円あたりの払戻金です。")


def main():
    output_path = Path("results.json")
    existing_results = load_existing_results(output_path)
    added_results = []
    previous_race = {}

    print("競馬結果データ results.json 作成ツール")
    print("Webスクレイピングや外部サイト取得は行いません。手入力で結果データを作成します。\n")

    while True:
        item = prompt_result_item(previous_race)
        added_results.append(item["result"])
        previous_race = item["race"]

        print("\n追加予定データ:")
        print(json.dumps(item["result"], ensure_ascii=False, indent=2))

        if not prompt_yes_no("\n続けて入力しますか", default="y"):
            break
        print("次の入力では、日付・競馬場・レース番号はEnterで前回値を使えます。\n")

    all_results = existing_results + added_results
    write_results(output_path, all_results)
    print_summary(output_path, added_results, all_results)


if __name__ == "__main__":
    main()
