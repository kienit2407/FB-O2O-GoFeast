#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.database import Database
from pymongo.errors import ConfigurationError


ACTION_WEIGHTS = {
    "view": 1.0,
    "click": 2.0,
    "add_to_cart": 4.0,
    "order": 8.0,
    "rate": 5.0,
}

REASON = "Dựa trên các món bạn quan tâm gần đây"


def load_env() -> None:
    here = Path(__file__).resolve()
    load_dotenv(here.parent / ".env")
    load_dotenv(here.parents[1] / "api" / ".env")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train offline product recommendations from MongoDB interactions and orders.",
    )
    parser.add_argument("--mongo-uri", default=os.getenv("MONGO_URI"))
    parser.add_argument("--db-name", default=os.getenv("MONGO_DB_NAME"))
    parser.add_argument("--lookback-days", type=int, default=90)
    parser.add_argument("--expires-hours", type=int, default=8)
    parser.add_argument("--top-k", type=int, default=30)
    parser.add_argument("--max-user-items", type=int, default=100)
    parser.add_argument("--min-score", type=float, default=0.01)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def get_database(args: argparse.Namespace) -> Database:
    if not args.mongo_uri:
        raise SystemExit("MONGO_URI is required. Set it in apps/api/.env or pass --mongo-uri.")

    client = MongoClient(args.mongo_uri)
    if args.db_name:
        return client[args.db_name]

    try:
        return client.get_default_database()
    except ConfigurationError as exc:
        raise SystemExit("Database name is required. Pass --db-name or include it in MONGO_URI.") from exc


def as_object_id(value: Any) -> ObjectId | None:
    if value is None:
        return None
    try:
        text = str(value)
        return ObjectId(text) if ObjectId.is_valid(text) else None
    except Exception:
        return None


def action_weight(doc: dict[str, Any]) -> float:
    action = str(doc.get("action") or "").lower()
    if action == "rate":
        rating = doc.get("rating")
        try:
            return max(float(rating), 1.0)
        except (TypeError, ValueError):
            return ACTION_WEIGHTS["rate"]

    raw_weight = doc.get("weight")
    try:
        parsed = float(raw_weight)
        if parsed > 0:
            return parsed
    except (TypeError, ValueError):
        pass

    return ACTION_WEIGHTS.get(action, 1.0)


def load_interaction_events(db: Database, since: datetime) -> pd.DataFrame:
    cursor = db.user_interactions.find(
        {
            "created_at": {"$gte": since},
            "product_id": {"$ne": None},
            "user_id": {"$ne": None},
        },
        {"user_id": 1, "product_id": 1, "action": 1, "weight": 1, "rating": 1},
    )

    rows: list[dict[str, Any]] = []
    for doc in cursor:
        user_id = as_object_id(doc.get("user_id"))
        product_id = as_object_id(doc.get("product_id"))
        if not user_id or not product_id:
            continue

        rows.append(
            {
                "user_id": str(user_id),
                "product_id": str(product_id),
                "weight": action_weight(doc),
                "source": "interaction",
            }
        )

    return pd.DataFrame(rows)


def load_order_events(db: Database, since: datetime) -> pd.DataFrame:
    cursor = db.orders.find(
        {
            "created_at": {"$gte": since},
            "customer_id": {"$ne": None},
            "payment_status": "paid",
            "status": {"$ne": "cancelled"},
        },
        {"customer_id": 1, "items": 1},
    )

    rows: list[dict[str, Any]] = []
    for order in cursor:
        user_id = as_object_id(order.get("customer_id"))
        if not user_id:
            continue

        for item in order.get("items") or []:
            product_id = as_object_id(item.get("product_id"))
            if not product_id:
                continue

            quantity = item.get("quantity") or 1
            try:
                quantity = max(float(quantity), 1.0)
            except (TypeError, ValueError):
                quantity = 1.0

            rows.append(
                {
                    "user_id": str(user_id),
                    "product_id": str(product_id),
                    "weight": ACTION_WEIGHTS["order"] * min(quantity, 5.0),
                    "source": "order",
                }
            )

    return pd.DataFrame(rows)


def load_valid_product_ids(db: Database) -> set[str]:
    cursor = db.products.find(
        {
            "is_active": True,
            "is_available": True,
            "deleted_at": None,
        },
        {"_id": 1},
    )
    return {str(doc["_id"]) for doc in cursor}


def build_user_vectors(events: pd.DataFrame, valid_product_ids: set[str]) -> dict[str, Counter[str]]:
    vectors: dict[str, Counter[str]] = defaultdict(Counter)
    if events.empty:
        return vectors

    for row in events.itertuples(index=False):
        product_id = str(row.product_id)
        if product_id not in valid_product_ids:
            continue
        vectors[str(row.user_id)][product_id] += float(row.weight)

    return vectors


def build_item_neighbors(
    user_vectors: dict[str, Counter[str]],
    max_user_items: int,
) -> dict[str, Counter[str]]:
    neighbors: dict[str, Counter[str]] = defaultdict(Counter)

    for vector in user_vectors.values():
        items = vector.most_common(max_user_items)
        if len(items) < 2:
            continue

        for i, (left_id, left_weight) in enumerate(items):
            for right_id, right_weight in items[i + 1 :]:
                weight = math.sqrt(max(left_weight, 0.0) * max(right_weight, 0.0))
                if weight <= 0:
                    continue
                neighbors[left_id][right_id] += weight
                neighbors[right_id][left_id] += weight

    return neighbors


def recommend_for_user(
    vector: Counter[str],
    neighbors: dict[str, Counter[str]],
    top_k: int,
    min_score: float,
) -> list[dict[str, Any]]:
    scores: Counter[str] = Counter()
    seen = set(vector.keys())

    for product_id, user_weight in vector.items():
        user_boost = math.log1p(max(user_weight, 0.0))
        for candidate_id, neighbor_weight in neighbors.get(product_id, {}).items():
            if candidate_id in seen:
                continue
            scores[candidate_id] += float(neighbor_weight) * user_boost

    if not scores:
        return []

    max_score = max(scores.values()) or 1.0
    output: list[dict[str, Any]] = []

    for product_id, score in scores.most_common(top_k):
        normalized = float(np.clip(score / max_score, 0.0, 1.0))
        if normalized < min_score:
            continue
        output.append(
            {
                "item_id": ObjectId(product_id),
                "score": normalized,
                "reason": REASON,
            }
        )

    return output


def train(args: argparse.Namespace) -> None:
    db = get_database(args)
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=args.lookback_days)
    expires_at = now + timedelta(hours=args.expires_hours)

    interactions = load_interaction_events(db, since)
    orders = load_order_events(db, since)
    events = pd.concat([interactions, orders], ignore_index=True)

    valid_product_ids = load_valid_product_ids(db)
    user_vectors = build_user_vectors(events, valid_product_ids)
    neighbors = build_item_neighbors(user_vectors, args.max_user_items)

    operations: list[UpdateOne] = []
    users_with_recs = 0

    for user_id, vector in user_vectors.items():
        recommendations = recommend_for_user(
            vector=vector,
            neighbors=neighbors,
            top_k=args.top_k,
            min_score=args.min_score,
        )
        if not recommendations:
            continue

        users_with_recs += 1
        operations.append(
            UpdateOne(
                {"user_id": ObjectId(user_id), "type": "products"},
                {
                    "$set": {
                        "items": recommendations,
                        "generated_at": now,
                        "expires_at": expires_at,
                    }
                },
                upsert=True,
            )
        )

    print(
        "Loaded "
        f"{len(interactions)} interaction events, {len(orders)} order events, "
        f"{len(user_vectors)} users, {len(neighbors)} products with neighbors, "
        f"{users_with_recs} users with recommendations."
    )

    if args.dry_run:
        print(f"Dry run: would upsert {len(operations)} recommendation documents.")
        return

    if not operations:
        print("No recommendations to write.")
        return

    result = db.recommendations.bulk_write(operations, ordered=False)
    print(
        "Wrote recommendations: "
        f"matched={result.matched_count}, modified={result.modified_count}, "
        f"upserted={len(result.upserted_ids)}."
    )


if __name__ == "__main__":
    load_env()
    train(parse_args())
