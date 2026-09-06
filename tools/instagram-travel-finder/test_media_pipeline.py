import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from import_approved import (
    allocate_unique_video_title,
    build_media_plan,
    content_kind_for,
    validate_plan_structure,
    validate_raw_media,
)
import download_approved as downloader
import import_highlight as highlight_importer
from download_highlights import parse_highlight_id, target_stem, validate_slug
from import_highlight import build_payload, parse_destination_ref


class MediaPipelineTest(unittest.TestCase):
    def test_highlight_import_payload_uses_manifest_media_and_catalog_relations(self):
        manifest = {
            "sourceUrl": "https://www.instagram.com/stories/highlights/123/",
            "instagramUsername": "khanoomhoteli",
            "category": "HOTEL",
            "personSlug": "khanoomhoteli",
            "hotelSlug": "hotelalmas2",
            "contentIndex": 4,
            "mediaItems": [
                {
                    "displayOrder": 1,
                    "mediaType": "VIDEO",
                    "mediaUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-01.mp4",
                    "thumbnailUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-01-thumbnail.webp",
                }
            ],
        }
        catalog = {
            "people": [
                {
                    "id": "person-id",
                    "slug": "khanoomhoteli",
                    "instagramHandle": "khanoomhoteli",
                    "primaryCategory": "INFLUENCER",
                }
            ],
            "hotels": [
                {"id": "hotel-id", "slug": "hotelalmas2", "name": "هتل الماس ۲"}
            ],
            "destinations": [],
            "videos": [],
        }
        with patch.object(Path, "is_file", return_value=True), patch.object(
            Path, "stat", return_value=type("Stat", (), {"st_size": 1})()
        ):
            payload = build_payload(
                manifest,
                catalog,
                "اقامت در هتل الماس ۲",
                [],
                None,
                None,
                None,
                None,
            )
        self.assertEqual(payload["id"], "khanoomhoteli-004")
        self.assertEqual(payload["hotelIds"], ["hotel-id"])
        self.assertEqual(payload["placeName"], "هتل الماس ۲")
        self.assertEqual(
            payload["mediaItems"],
            [
                {
                    "mediaType": "VIDEO",
                    "mediaUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-01.mp4",
                    "thumbnailUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-01-thumbnail.webp",
                }
            ],
        )
        self.assertEqual(parse_destination_ref("city:mashhad"), ("CITY", "mashhad"))

    def test_highlight_import_skips_manually_deleted_media_without_renaming(self):
        with tempfile.TemporaryDirectory() as temporary:
            public = Path(temporary)
            folder = public / "hotel-videos" / "khanoomhoteli"
            folder.mkdir(parents=True)
            kept_video = folder / "hotelalmas2-004-05.mp4"
            kept_thumbnail = folder / "hotelalmas2-004-05-thumbnail.webp"
            kept_video.write_bytes(b"video")
            kept_thumbnail.write_bytes(b"image")
            manifest = {
                "sourceUrl": "https://www.instagram.com/stories/highlights/123/",
                "instagramUsername": "khanoomhoteli",
                "category": "HOTEL",
                "personSlug": "khanoomhoteli",
                "hotelSlug": "hotelalmas2",
                "contentIndex": 4,
                "mediaItems": [
                    {
                        "displayOrder": 1,
                        "mediaType": "VIDEO",
                        "mediaUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-05.mp4",
                        "thumbnailUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-05-thumbnail.webp",
                    },
                    {
                        "displayOrder": 2,
                        "mediaType": "IMAGE",
                        "mediaUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-09.webp",
                        "thumbnailUrl": "/hotel-videos/khanoomhoteli/hotelalmas2-004-09.webp",
                    },
                ],
            }
            with patch.object(highlight_importer, "WEB_PUBLIC", public):
                media_items = highlight_importer.validate_media(manifest)
            self.assertEqual(len(media_items), 1)
            self.assertEqual(
                media_items[0]["mediaUrl"],
                "/hotel-videos/khanoomhoteli/hotelalmas2-004-05.mp4",
            )

    def test_highlight_url_and_public_filename_mapping(self):
        self.assertEqual(
            parse_highlight_id(
                "https://www.instagram.com/stories/highlights/17905390495673423/"
            ),
            "17905390495673423",
        )
        self.assertEqual(validate_slug("khanoomhoteli", "Person slug"), "khanoomhoteli")
        self.assertEqual(
            target_stem("hotel", "khanoomhoteli", "hotelalmas2", 4, 1).name,
            "hotelalmas2-004-01",
        )
        self.assertEqual(
            target_stem("travel", "morteza-kowsari", None, 1, 2).name,
            "001-02",
        )

    def test_duplicate_titles_receive_stable_numeric_suffixes(self):
        used_titles = {"سفر به گیلان", "سفر به گیلان 2"}

        title, changed = allocate_unique_video_title(
            "سفر به گیلان",
            used_titles,
        )

        self.assertTrue(changed)
        self.assertEqual(title, "سفر به گیلان 3")
        self.assertIn("سفر به گیلان 3", used_titles)

    def test_content_kind_mapping(self):
        self.assertEqual(content_kind_for("REEL"), "VIDEO")
        self.assertEqual(content_kind_for("VIDEO_POST"), "VIDEO")
        self.assertEqual(content_kind_for("CAROUSEL"), "POST")
        self.assertEqual(content_kind_for("POST"), "POST")
        self.assertEqual(content_kind_for("HIGHLIGHT"), "STORY")

    def test_builds_mixed_post_plan_from_download_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            excel_path = root / "sample.xlsx"
            media_folder = root / "sample.person" / "media" / "ABC123"
            media_folder.mkdir(parents=True)
            (media_folder / "01.jpg").write_bytes(b"image")
            (media_folder / "02.mp4").write_bytes(b"video")
            (media_folder / "02-thumbnail.jpg").write_bytes(b"thumb")
            (media_folder / "media.json").write_text(
                json.dumps(
                    {
                        "version": 1,
                        "shortcode": "ABC123",
                        "contentKind": "POST",
                        "items": [
                            {
                                "displayOrder": 1,
                                "mediaType": "IMAGE",
                                "mediaPath": "01.jpg",
                                "thumbnailPath": None,
                            },
                            {
                                "displayOrder": 2,
                                "mediaType": "VIDEO",
                                "mediaPath": "02.mp4",
                                "thumbnailPath": "02-thumbnail.jpg",
                            },
                        ],
                    }
                ),
                encoding="utf-8",
            )

            approved = [{"_row_number": 2, "Shortcode": "ABC123"}]
            results = [
                {
                    "row": 2,
                    "status": "READY",
                    "username": "sample.person",
                    "source_url": "https://www.instagram.com/p/ABC123/",
                    "video_category": "TRAVEL",
                    "content_kind": "POST",
                    "creator_slug": "sample-person",
                    "identity": {
                        "video_id": "sample.person-001",
                        "stem": "/travel-videos/sample-person/001",
                    },
                    "payload": {
                        "id": "sample.person-001",
                        "contentKind": "POST",
                        "sourceUrl": "https://www.instagram.com/p/ABC123/",
                        "mediaUrl": "",
                        "thumbnailUrl": "",
                    },
                }
            ]

            plan = build_media_plan(excel_path, approved, results)
            self.assertEqual(plan["version"], 2)
            payload = plan["items"][0]["payload"]
            self.assertEqual(
                [item["mediaType"] for item in payload["mediaItems"]],
                ["IMAGE", "VIDEO"],
            )
            self.assertEqual(
                payload["mediaItems"][0]["mediaUrl"],
                "/travel-videos/sample-person/001-01.webp",
            )
            self.assertEqual(
                payload["mediaItems"][1]["mediaUrl"],
                "/travel-videos/sample-person/001-02.mp4",
            )
            validate_raw_media(excel_path, plan)
            validate_plan_structure(plan)

    def test_downloader_reports_failed_posts_and_continues_batch(self):
        with tempfile.TemporaryDirectory() as temporary:
            excel_path = Path(temporary) / "sample.xlsx"
            excel_path.write_bytes(b"xlsx")
            jobs = [
                {
                    "row": 2,
                    "shortcode": "BLOCKED1",
                    "username": "sample.person",
                    "contentKind": "VIDEO",
                },
                {
                    "row": 3,
                    "shortcode": "BLOCKED2",
                    "username": "sample.person",
                    "contentKind": "VIDEO",
                },
            ]

            with (
                patch.object(downloader, "approved_jobs", return_value=jobs),
                patch.object(downloader, "load_candidate_index", return_value={}),
                patch.object(downloader, "create_loader", return_value=object()),
                patch.object(
                    downloader,
                    "instagram_items",
                    side_effect=[RuntimeError("restricted"), RuntimeError("deleted")],
                ) as instagram_items,
                patch.object(downloader, "run_prepare_media") as prepare_media,
            ):
                succeeded = downloader.run(
                    excel_path,
                    download=True,
                    login=None,
                    browser="chrome",
                    cookie_file=None,
                    prepare=True,
                )

            self.assertFalse(succeeded)
            self.assertEqual(instagram_items.call_count, 2)
            prepare_media.assert_not_called()
            failures = json.loads(
                (Path(temporary) / "sample.download-failures.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(
                [failure["shortcode"] for failure in failures],
                ["BLOCKED1", "BLOCKED2"],
            )


if __name__ == "__main__":
    unittest.main()
