"""
Gamification Service for Blockchain Academy
Manages Streaks, XP calculations, Badge unlocks, and Leaderboard aggregation.
"""
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Dict, Any, Optional


BADGES_CATALOG = {
    "first_lesson": {
        "id": "first_lesson",
        "name": "Học Giả Khởi Hành",
        "icon": "🚀",
        "description": "Hoàn thành bài lý thuyết/trắc nghiệm đầu tiên"
    },
    "halfway": {
        "id": "halfway",
        "name": "Kiểm Toán Viên Bền Bỉ",
        "icon": "🛡️",
        "description": "Hoàn thành 50% lộ trình học tập cơ bản"
    },
    "streak_3": {
        "id": "streak_3",
        "name": "Chuỗi 3 Ngày Rực Lửa",
        "icon": "🔥",
        "description": "Duy trì chuỗi ngày học 3 ngày liên tiếp"
    },
    "streak_7": {
        "id": "streak_7",
        "name": "7 Ngày Kiên Định",
        "icon": "⚡",
        "description": "Duy trì chuỗi ngày học 7 ngày liên tiếp"
    },
    "quiz_master": {
        "id": "quiz_master",
        "name": "Bậc Thầy Trắc Nghiệm",
        "icon": "🧠",
        "description": "Hoàn thành ít nhất 5 bài kiểm tra lý thuyết"
    },
    "lab_hunter": {
        "id": "lab_hunter",
        "name": "Lab Hunter Bảo Mật",
        "icon": "⚔️",
        "description": "Vượt qua kiểm thử 100% của ít nhất 1 bài thực hành Lab"
    },
    "security_lead": {
        "id": "security_lead",
        "name": "Huyền Thoại Security Lead",
        "icon": "👑",
        "description": "Đạt danh hiệu tối cao (XP > 8000)"
    }
}


class GamificationService:
    @classmethod
    async def update_user_gamification(
        cls,
        db,
        user_id: str,
        xp_gain: int = 500,
        completed_lessons_count: int = 0,
        is_lab_pass: bool = False
    ) -> Dict[str, Any]:
        """
        Updates user XP, recalculates daily streak, and awards new badges.
        Returns dict containing gained XP, current streak, and any newly awarded badges.
        """
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id)})
            if not user:
                return {}

            now = datetime.utcnow()
            today_str = now.strftime("%Y-%m-%d")
            yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

            current_xp = user.get("xp", 0) + xp_gain
            current_streak = user.get("current_streak", 0)
            max_streak = user.get("max_streak", 0)
            last_active = user.get("last_active_date")
            existing_badges = user.get("badges", [])
            existing_badge_ids = {b["id"] for b in existing_badges}

            # 1. Update Streak logic
            if last_active == today_str:
                # Already active today, streak unchanged
                pass
            elif last_active == yesterday_str:
                # Active yesterday, increment streak
                current_streak += 1
            else:
                # Missed a day or first active day, reset/start streak at 1
                current_streak = 1

            max_streak = max(max_streak, current_streak)

            # 2. Evaluate new badges
            new_badges = []

            def award_badge(b_id: str):
                if b_id in BADGES_CATALOG and b_id not in existing_badge_ids:
                    badge_info = {
                        "id": b_id,
                        "name": BADGES_CATALOG[b_id]["name"],
                        "icon": BADGES_CATALOG[b_id]["icon"],
                        "description": BADGES_CATALOG[b_id]["description"],
                        "earned_at": today_str
                    }
                    new_badges.append(badge_info)
                    existing_badge_ids.add(b_id)

            if completed_lessons_count >= 1:
                award_badge("first_lesson")
            if completed_lessons_count >= 5:
                award_badge("quiz_master")
            if completed_lessons_count >= 8:
                award_badge("halfway")
            if current_streak >= 3:
                award_badge("streak_3")
            if current_streak >= 7:
                award_badge("streak_7")
            if is_lab_pass:
                award_badge("lab_hunter")
            if current_xp >= 8000:
                award_badge("security_lead")

            updated_badges = existing_badges + new_badges

            # 3. Save updates to user document
            await db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "xp": current_xp,
                        "current_streak": current_streak,
                        "max_streak": max_streak,
                        "last_active_date": today_str,
                        "badges": updated_badges
                    }
                }
            )

            return {
                "xp": current_xp,
                "current_streak": current_streak,
                "max_streak": max_streak,
                "new_badges": new_badges
            }
        except Exception as e:
            print(f"[Gamification] Error updating gamification for {user_id}: {e}")
            return {}

    @classmethod
    async def get_leaderboard(cls, db, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves top users ranked accurately by effective XP descending, enriched with progress stats.
        Ensures users whose XP wasn't synced in DB get evaluated and ranked properly based on completed lessons/labs.
        """
        try:
            # Fetch users to evaluate accurate XP & ranking across student base
            all_users = await db["users"].find().to_list(length=300)
            raw_entries = []

            for u in all_users:
                u_id = str(u["_id"])
                # Look up completed lessons from user_progress
                progress = await db["user_progress"].find_one({"user_id": u_id})
                completed_ids = progress.get("completed_lessons", []) if progress else []
                core_completed = [lid for lid in completed_ids if not str(lid).startswith("lab-")]
                labs_completed = [lid for lid in completed_ids if str(lid).startswith("lab-")]

                # Calculate retroactive/effective XP
                calculated_xp = len(core_completed) * 500 + len(labs_completed) * 1000
                raw_xp = u.get("xp") or 0
                effective_xp = max(raw_xp, calculated_xp)

                # Sync back to DB if DB XP was lagging behind completed items
                if raw_xp < effective_xp:
                    await db["users"].update_one(
                        {"_id": u["_id"]},
                        {"$set": {"xp": effective_xp}}
                    )

                # Calculate rank title
                progress_percent = min(100.0, (len(core_completed) / 16.0) * 100)
                if progress_percent >= 81 or effective_xp >= 8000:
                    title = "Huyền thoại Security Lead"
                    color = "text-rose-400"
                elif progress_percent >= 51 or effective_xp >= 5000:
                    title = "Senior Auditor Cao cấp"
                    color = "text-purple-400"
                elif progress_percent >= 26 or effective_xp >= 2500:
                    title = "Chuyên viên Smart Contract"
                    color = "text-cyan-400"
                else:
                    title = "Học viên Tập sự (Novice)"
                    color = "text-amber-500"

                raw_entries.append({
                    "user_id": u_id,
                    "username": u.get("username", "Anonymous"),
                    "avatar_url": u.get("avatar_url"),
                    "xp": effective_xp,
                    "current_streak": u.get("current_streak", 0),
                    "max_streak": u.get("max_streak", 0),
                    "completed_lessons_count": len(core_completed),
                    "completed_labs_count": len(labs_completed),
                    "badges_count": len(u.get("badges", [])),
                    "title": title,
                    "title_color": color
                })

            # Sort accurately by XP descending, then completed lessons descending, then username ascending
            raw_entries.sort(key=lambda x: (-x["xp"], -x["completed_lessons_count"], -x["completed_labs_count"], x["username"].lower()))

            # Assign accurate ranks up to limit
            leaderboard = []
            for rank, entry in enumerate(raw_entries[:limit], start=1):
                entry["rank"] = rank
                leaderboard.append(entry)

            return leaderboard
        except Exception as e:
            print(f"[Gamification] Error generating leaderboard: {e}")
            return []
