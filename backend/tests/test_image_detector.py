from contextlib import nullcontext

import numpy as np
import pytest
from PIL import Image

from app.core.config import Settings
from app.services import image_detector


def test_image_views_are_native_resolution_crops():
    pixels = np.zeros((1200, 2400, 3), dtype=np.uint8)
    pixels[:, :, 0] = np.arange(2400, dtype=np.uint8)
    image = Image.fromarray(pixels)
    crops = image_detector.image_views(image)

    assert len(crops) == 3
    assert [crop.size for crop in crops] == [(528, 528)] * 3
    assert len({crop.tobytes() for crop in crops}) == 3


def test_portrait_images_are_cropped_along_the_vertical_axis():
    pixels = np.zeros((2400, 1200, 3), dtype=np.uint8)
    pixels[:, :, 0] = np.arange(2400, dtype=np.uint8)[:, None]
    crops = image_detector.image_views(Image.fromarray(pixels))

    assert len(crops) == 3
    assert [crop.size for crop in crops] == [(528, 528)] * 3
    assert len({crop.tobytes() for crop in crops}) == 3


def test_small_image_is_upscaled_before_cropping():
    crops = image_detector.image_views(Image.new("RGB", (32, 64)))
    assert [crop.size for crop in crops] == [(528, 528)] * 3


def test_prediction_scores_original_photo_with_three_views(tmp_path, monkeypatch):
    class Logits:
        def float(self):
            return self

        def mean(self):
            return self

    class FakeModel:
        def encode(self, features, **kwargs):
            assert len(features) == 3
            assert kwargs["convert_to_tensor"] is True
            assert all(item["image"].size == (528, 528) for item in features)
            return Logits()

    class FakeTorch:
        @staticmethod
        def inference_mode():
            return nullcontext()

        @staticmethod
        def sigmoid(_):
            class Score:
                @staticmethod
                def item():
                    return 0.73
            return Score()

    image_path = tmp_path / "large.png"
    Image.fromarray(np.zeros((1200, 2400, 3), dtype=np.uint8)).save(image_path)
    monkeypatch.setattr(image_detector, "_load_model", lambda settings: (FakeModel(), FakeTorch))
    settings = Settings(models_dir=tmp_path)

    result = image_detector.predict_image(image_path, settings)

    assert (result.width, result.height) == (2400, 1200)
    assert result.fake_score == pytest.approx(0.73)
    assert result.version.startswith("smaug-")


def test_unreadable_image_is_a_clear_input_error(tmp_path):
    path = tmp_path / "bad.png"
    path.write_bytes(b"not an image")

    with pytest.raises(image_detector.ImageInputError) as exc:
        image_detector.predict_image(path, Settings(models_dir=tmp_path))

    assert exc.value.code == "MEDIA_UNREADABLE"
