"""Local AI-generated-image detector using Abacus.AI's Smaug model."""

import logging
import math
import threading
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from ..core.config import Settings
from .model_registry import ModelNotAvailableError

logger = logging.getLogger("deepfake.image_detector")

MODEL_SIZE = 528
MODEL_CROPS = 3
_VISION_TOKENS = 140

_lock = threading.Lock()
_inference_lock = threading.Lock()
_loaded_key = None
_loaded_model = None
_loaded_torch = None


class ImageInputError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass
class ImagePrediction:
    fake_score: float
    width: int
    height: int
    version: str
    description: str


def image_views(image: Image.Image) -> list[Image.Image]:
    """Prepare three native-resolution 528px crops, as used by Smaug."""
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    shorter_side = min(width, height)
    if shorter_side > 576:
        scale = 576 / shorter_side
        image = image.resize(
            (round(width * scale), round(height * scale)), Image.Resampling.LANCZOS
        )
    elif shorter_side < MODEL_SIZE:
        scale = MODEL_SIZE / shorter_side
        image = image.resize(
            (math.ceil(width * scale), math.ceil(height * scale)),
            Image.Resampling.BICUBIC,
        )

    width, height = image.size
    center_x, center_y = (width - MODEL_SIZE) // 2, (height - MODEL_SIZE) // 2
    if width >= height:
        offsets = (0, center_x, width - MODEL_SIZE)
        return [
            image.crop((x, center_y, x + MODEL_SIZE, center_y + MODEL_SIZE))
            for x in offsets
        ]
    offsets = (0, center_y, height - MODEL_SIZE)
    return [
        image.crop((center_x, y, center_x + MODEL_SIZE, y + MODEL_SIZE))
        for y in offsets
    ]


def image_dimensions(path: Path) -> tuple[int, int]:
    try:
        with Image.open(path) as source:
            return ImageOps.exif_transpose(source).size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageInputError("MEDIA_UNREADABLE", "The image could not be read.") from exc


def _load_model(settings: Settings):
    global _loaded_key, _loaded_model, _loaded_torch

    key = (
        settings.image_model_id,
        settings.image_model_revision,
        str(settings.image_model_cache_dir),
        settings.image_model_offline,
    )
    if key == _loaded_key:
        return _loaded_model, _loaded_torch

    with _lock:
        if key == _loaded_key:
            return _loaded_model, _loaded_torch
        try:
            import torch
            from huggingface_hub import snapshot_download
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise ModelNotAvailableError(
                "Local image-model dependencies are missing. Install the project "
                "requirements, including sentence-transformers."
            ) from exc

        try:
            model_path = snapshot_download(
                repo_id=settings.image_model_id,
                revision=settings.image_model_revision,
                cache_dir=str(settings.image_model_cache_dir),
                local_files_only=settings.image_model_offline,
                token=False,
            )
        except Exception as exc:
            mode = "offline cache" if settings.image_model_offline else "Hugging Face download"
            raise ModelNotAvailableError(
                f"Could not load {settings.image_model_id} from the local cache or "
                f"{mode}: {exc}"
            ) from exc

        device = (
            "cuda" if torch.cuda.is_available()
            else "mps" if torch.backends.mps.is_available()
            else "cpu"
        )
        logger.info("Loading local image detector %s on %s", settings.image_model_id, device)
        try:
            model = SentenceTransformer(
                model_path,
                device=device,
                config_kwargs={"audio_config": None},
                model_kwargs={
                    "torch_dtype": torch.bfloat16 if device == "cuda" else torch.float32
                },
            )
            processor = model[0].processor.image_processor
            processor.max_soft_tokens = _VISION_TOKENS
            processor.image_seq_length = _VISION_TOKENS
        except Exception as exc:
            logger.exception("Could not initialize local image detector at %s", model_path)
            raise ModelNotAvailableError(
                f"Could not initialize the local image detector from {model_path}: {exc}"
            ) from exc
        _loaded_key, _loaded_model, _loaded_torch = key, model, torch
        return model, torch


def predict_image(path: Path, settings: Settings) -> ImagePrediction:
    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageInputError("MEDIA_UNREADABLE", "The image could not be read.") from exc

    width, height = image.size
    views = image_views(image)
    model, torch = _load_model(settings)
    features = [{"image": view} for view in views]
    with _inference_lock, torch.inference_mode():
        logits = model.encode(
            features, batch_size=MODEL_CROPS, convert_to_tensor=True,
            show_progress_bar=False,
        )
        score = torch.sigmoid(logits.float().mean()).item()

    return ImagePrediction(
        fake_score=float(score),
        width=width,
        height=height,
        version=f"smaug-{settings.image_model_revision[:12]}",
        description=(
            "Smaug AI image detector; three 528px native-resolution crops "
            "averaged at the logit level."
        ),
    )


def save_preview(source_path: Path, destination: Path) -> None:
    try:
        with Image.open(source_path) as source:
            preview = ImageOps.exif_transpose(source).convert("RGB")
            preview.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            preview.save(destination, format="PNG", optimize=True)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageInputError("MEDIA_UNREADABLE", "The image preview could not be created.") from exc
