from PIL import Image

from app.core.config import Settings
from app.core.storage import JobStore
from app.services import image_detector
from app.workers.analysis_worker import AnalysisWorker


class VideoRegistryMustNotBeUsed:
    def resolve_version(self, *_):
        raise AssertionError("image inference must not resolve a video checkpoint")

    def load(self, *_):
        raise AssertionError("image inference must not load a video checkpoint")


def test_image_job_uses_local_image_detector_without_video_checkpoint(tmp_path, monkeypatch):
    source = tmp_path / "source.png"
    Image.new("RGB", (640, 480), (10, 20, 30)).save(source)
    settings = Settings(
        models_dir=tmp_path / "models",
        jobs_dir=tmp_path / "jobs",
        artifacts_dir=tmp_path / "artifacts",
        image_threshold=0.35,
    )
    store = JobStore()
    worker = AnalysisWorker(settings, store, VideoRegistryMustNotBeUsed())
    analysis_id = "image-job-test"
    job = {
        "media": {"type": "image", "filename": source.name},
        "_stored_path": str(source),
        "_job_dir": str(tmp_path / "job"),
        "request_xai": True,
    }
    store.create(analysis_id, job)
    monkeypatch.setattr(
        image_detector,
        "predict_image",
        lambda *_: image_detector.ImagePrediction(
            0.42, 640, 480, "smaug-test", "three native-resolution crops"
        ),
    )

    try:
        worker._execute(analysis_id, store.get(analysis_id), persistent=False)
    finally:
        worker.shutdown()

    result = store.get(analysis_id)
    assert result["status"] == "COMPLETED"
    assert result["prediction"]["label"] == "FAKE"
    assert result["prediction"]["method"] == "smaug_3_crop"
    assert result["prediction"]["threshold"] == 0.35
    assert result["model"]["name"] == "Smaug AI Image Detector"
    assert result["media"]["width"] == 640
    assert result["artifacts"]["processed_face"].startswith("/v1/artifacts/image_")
    assert not result["explainability"]["available"]
    assert result["explainability"]["limitation"] == (
        "LIME is not supported for the Smaug image detector."
    )
    assert any("LIME is not supported" in warning
               for warning in result["processing"]["warnings"])
    assert not any("AI-image detector, not the video deepfake model" in warning
                   for warning in result["processing"]["warnings"])
    assert not result["windows"]
