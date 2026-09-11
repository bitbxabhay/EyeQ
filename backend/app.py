#!/usr/bin/env python3
"""FastAPI backend for the DR screening application.

This version is safe to run without external secrets: the frontend can use a
local demo auth fallback, the doctor directory works offline, and the image
model stays optional if the packaged weights are not present.
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import cv2
import numpy as np
import timm
import torch

load_dotenv()
import base64
import io
import json
from pathlib import Path

import cv2
import numpy as np
import timm
import torch
import torch.nn.functional as F
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

import db
import places
from auth import get_current_user
from doctors_seed import DOCTORS

HERE = Path(__file__).resolve().parent
GRADES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
GRADE_DESCRIPTIONS = {
    0: "No visible signs of diabetic retinopathy.",
    1: "Mild non-proliferative changes — a few microaneurysms.",
    2: "Moderate non-proliferative changes — more widespread retinal damage.",
    3: "Severe non-proliferative changes — high risk of progression.",
    4: "Proliferative diabetic retinopathy — abnormal new vessel growth.",
}
DATASET_CONTEXT = {
    "dataset": "IDRiD reference labels + APTOS 2019 training data",
    "model_family": "EfficientNet-B3",
    "grading_scale": [
        "0 = No DR",
        "1 = Mild NPDR",
        "2 = Moderate NPDR",
        "3 = Severe NPDR",
        "4 = Proliferative DR",
    ],
    "notes": [
        "The model is trained on the retinal lesion patterns used in standard diabetic retinopathy grading datasets.",
        "This is a screening aid, not a diagnosis; grade numbers are meant to support triage and referral decisions.",
    ],
}

API_PORT = int(__import__('os').getenv('PORT', '8001'))

app = FastAPI(title="DR Screening API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def crop_retina(img: np.ndarray, tol: int = 7) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    mask = gray > tol
    if mask.sum() == 0:
        return img
    return img[np.ix_(mask.any(1), mask.any(0))]


def ben_graham(img_rgb: np.ndarray, size: int, sigma_scale: float = 10.0) -> np.ndarray:
    img = crop_retina(img_rgb)
    img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)

    q = max(size // 4, 8)
    small = cv2.resize(img, (q, q), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), (size / sigma_scale) * q / size)
    blur = cv2.resize(small, (size, size), interpolation=cv2.INTER_LINEAR)

    img = cv2.addWeighted(img, 4, blur, -4, 128)

    mask = np.zeros((size, size), np.uint8)
    cv2.circle(mask, (size // 2, size // 2), int(size * 0.47), 1, -1)
    return (img * mask[..., None]).astype(np.uint8)


def assess_image_quality(img_rgb: np.ndarray) -> dict:
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_32F).var())
    brightness = float(gray.mean())
    contrast = float(gray.std())
    h, w = gray.shape
    center = gray[int(h * 0.2) : int(h * 0.8), int(w * 0.2) : int(w * 0.8)]
    center_contrast = float(center.std())

    quality_ok = blur > 60 and 30 < brightness < 220 and contrast > 18 and center_contrast > 12
    reason = "Image quality is acceptable for screening." if quality_ok else "Low image quality: retake the photo with better focus, lighting, and centering."

    return {
        "is_good": quality_ok,
        "score": round(float(blur), 2),
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "center_contrast": round(center_contrast, 2),
        "status": "good" if quality_ok else "poor",
        "reason": reason,
    }


def detect_lesions(img_rgb: np.ndarray) -> dict:
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    dark_mask = cv2.inRange(hsv, (0, 20, 20), (180, 255, 180))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(dark_mask, connectivity=8)
    candidates = []
    for i in range(1, num_labels):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if 8 <= area <= 600:
            candidates.append(area)

    count = len(candidates)
    if count == 0:
        return {"count": 0, "level": "none", "summary": "No obvious microaneurysm or hemorrhage-like spots detected."}
    if count <= 5:
        level = "mild"
        summary = "A small number of lesion-like spots are visible; consider clinical review."
    elif count <= 12:
        level = "moderate"
        summary = "Multiple lesion-like features are visible and may reflect retinal disease activity."
    else:
        level = "severe"
        summary = "Extensive lesion-like changes are visible; urgent clinical evaluation is advisable."
    return {"count": count, "level": level, "summary": summary}


class DRModel:
    def __init__(self):
        cfg = json.loads((HERE / "model_config.json").read_text())
        self.size = int(cfg["image_size"])
        self.mean = torch.tensor(cfg["mean"]).view(3, 1, 1)
        self.std = torch.tensor(cfg["std"]).view(3, 1, 1)
        self.thresholds = sorted(float(t) for t in cfg["thresholds"])
        self.referral_grade = int(cfg.get("referral_grade", 2))
        self.operating_point = cfg.get("operating_point")
        self.metrics = cfg.get("metrics", {})

        self.net = timm.create_model("efficientnet_b3", num_classes=1)
        state = torch.load(HERE / "best_fold0.pth", map_location="cpu")
        state = {k.replace("backbone.", ""): v for k, v in state.items()}
        self.net.load_state_dict(state)
        self.net.eval()
        self._activations = None
        self._gradients = None
        self.net.conv_head.register_forward_hook(self._save_activation)
        self.net.conv_head.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, inp, out):
        self._activations = out

    def _save_gradient(self, module, grad_in, grad_out):
        self._gradients = grad_out[0]

    def _preprocess(self, pil_img: Image.Image) -> tuple[np.ndarray, torch.Tensor]:
        rgb = np.array(pil_img.convert("RGB"))
        prepped = ben_graham(rgb, self.size)
        x = torch.from_numpy(prepped).float().permute(2, 0, 1) / 255.0
        x = (x - self.mean) / self.std
        return prepped, x.unsqueeze(0)

    def predict(self, pil_img: Image.Image) -> dict:
        prepped, x = self._preprocess(pil_img)
        image_quality = assess_image_quality(prepped)
        lesions = detect_lesions(prepped)
        x.requires_grad_(False)
        out = self.net(x)
        severity = float(out.item())
        self.net.zero_grad(set_to_none=True)
        out.backward()

        grade = int(sum(severity >= t for t in self.thresholds))
        grade = max(0, min(grade, 4))

        if self.operating_point is not None:
            refer = severity >= float(self.operating_point)
        else:
            refer = grade >= self.referral_grade

        grads = self._gradients[0]
        acts = self._activations[0].detach()
        weights = grads.mean(dim=(1, 2))
        cam = F.relu((weights[:, None, None] * acts).sum(0))
        cam = cam / (cam.max() + 1e-8)
        cam = cam.numpy()
        cam = cv2.resize(cam, (self.size, self.size))

        heatmap_b64 = self._make_overlay(prepped, cam)

        bounds = [-np.inf] + self.thresholds + [np.inf]
        lo, hi = bounds[grade], bounds[grade + 1]
        span = min(severity - lo, hi - severity)
        confidence = int(round(min(99, 55 + span * 40))) if np.isfinite(span) else 90

        if not image_quality["is_good"]:
            confidence = max(0, confidence - 25)
        if lesions["count"] > 0 and grade >= 2:
            confidence = min(99, confidence + 4)

        if confidence >= 80:
            confidence_label = "High"
        elif confidence >= 60:
            confidence_label = "Moderate"
        else:
            confidence_label = "Low"

        clinical_flags = []
        if not image_quality["is_good"]:
            clinical_flags.append("Image quality is low — retake with better focus and lighting before relying on this screening.")
        if lesions["count"] > 0:
            clinical_flags.append(lesions["summary"])
        if refer:
            clinical_flags.append("Referral recommended based on current findings.")
        if not clinical_flags:
            clinical_flags.append("No major retinal red flags were detected in the current image.")

        recommendation = "Urgent clinical review recommended." if refer else "Routine review recommended; consider rechecking if symptoms persist."
        if not image_quality["is_good"]:
            recommendation = "Retake the fundus image to improve screening reliability before continuing."

        return {
            "grade": grade,
            "label": GRADES[grade],
            "description": GRADE_DESCRIPTIONS[grade],
            "severity": round(severity, 4),
            "refer": bool(refer),
            "confidence": confidence,
            "confidence_label": confidence_label,
            "recommendation": recommendation,
            "quality": image_quality,
            "lesions": lesions,
            "clinical_flags": clinical_flags,
            "heatmap": heatmap_b64,
            "metrics": self.metrics,
            "dataset": DATASET_CONTEXT["dataset"],
            "model_family": DATASET_CONTEXT["model_family"],
            "grade_explanation": ", ".join(DATASET_CONTEXT["grading_scale"]),
        }

    @staticmethod
    def _make_overlay(prepped_rgb: np.ndarray, cam: np.ndarray) -> str:
        heat = np.uint8(255 * cam)
        heat_color = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
        heat_color = cv2.cvtColor(heat_color, cv2.COLOR_BGR2RGB)
        overlay = cv2.addWeighted(prepped_rgb, 0.6, heat_color, 0.4, 0)
        ok, buf = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        if not ok:
            raise RuntimeError("failed to encode heatmap")
        return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode()


try:
    print("Loading model...")
    model = DRModel()
except Exception as exc:  # pragma: no cover - fallback for missing weights/env
    model = None
    print(f"Model load failed: {exc}")


db.init_db()


def validate_retinal_image(raw: bytes, filename: str) -> Image.Image:
    try:
        pil_img = Image.open(io.BytesIO(raw))
    except Exception as exc:  # pragma: no cover - defensive validation
        raise HTTPException(400, f"Invalid retinal image: unable to read the uploaded file '{filename}'.") from exc

    if pil_img.mode not in {"RGB", "RGBA", "L"}:
        raise HTTPException(400, "Invalid retinal image: the file is not a standard retinal fundus image.")

    width, height = pil_img.size
    min_dim = min(width, height)
    max_dim = max(width, height)
    if min_dim < 400 or max_dim < 600:
        raise HTTPException(
            400,
            "Invalid retinal image: the file is too small to be a fundus photograph. Please upload a retinal image only.",
        )

    ratio = width / height
    if ratio < 0.45 or ratio > 2.3:
        raise HTTPException(
            400,
            "Invalid retinal image: this does not match the expected fundus/retinal photo aspect ratio. Please upload a retinal image only.",
        )

    rgb = np.asarray(pil_img.convert("RGB"), dtype=np.float32)
    grayscale = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    if float(grayscale.std()) < 12:
        raise HTTPException(
            400,
            "Invalid retinal image: this image does not contain enough retinal detail. Please upload an eye fundus image only.",
        )

    height, width = grayscale.shape
    corner_size = max(8, min(height, width) // 10)
    corners = np.concatenate(
        [
            grayscale[:corner_size, :corner_size].ravel(),
            grayscale[:corner_size, -corner_size:].ravel(),
            grayscale[-corner_size:, :corner_size].ravel(),
            grayscale[-corner_size:, -corner_size:].ravel(),
        ]
    )
    center = grayscale[height // 5 : height * 4 // 5, width // 5 : width * 4 // 5]
    dark_corner_fraction = float((corners < 55).mean())
    center_mean = float(center.mean())
    if dark_corner_fraction < 0.08 or center_mean < 35:
        raise HTTPException(
            400,
            "Invalid retinal image: no fundus field was detected. Please upload an eye fundus image only.",
        )

    return pil_img


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_ready": model is not None,
        "metrics": model.metrics if model else {},
        "dataset": DATASET_CONTEXT["dataset"],
        "model_family": DATASET_CONTEXT["model_family"],
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(503, "Model is not available in this environment")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload a retinal fundus image only. Other file types are not supported for retinal screening.")
    try:
        raw = await file.read()
        pil_img = validate_retinal_image(raw, file.filename or "uploaded-image")
        result = model.predict(pil_img)
        return result
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"inference failed: {exc}") from exc


class ScreeningIn(BaseModel):
    type: str
    status: str = "Complete"
    va_od: str | None = None
    va_os: str | None = None
    retinal_grade: int | None = None
    retinal_label: str | None = None
    retinal_refer: bool | None = None
    overall_score: int
    risk_level: str
    conditions: list[str]
    factors: list[dict]
    summary: str
    recommendation: str


class DiabetesProfileIn(BaseModel):
    diabetes_history: str | None = None
    diabetes_duration: str | None = None
    diabetes_duration_value: float | None = None
    diabetes_duration_unit: str | None = None
    recent_diabetic_eye_exam: str | None = None


@app.post("/api/screenings")
def create_screening(body: ScreeningIn):
    return db.insert_screening(body.model_dump())


@app.get("/api/screenings")
def get_screenings():
    return db.list_screenings()


@app.get("/api/screenings/{sid}")
def get_screening(sid: str):
    rec = db.get_screening(sid)
    if not rec:
        raise HTTPException(404, "screening not found")
    return rec


@app.get("/api/dashboard")
def dashboard_summary():
    screenings = db.list_screenings()
    low = sum(1 for s in screenings if s["risk_level"] == "Low")
    return {
        "latest": screenings[0] if screenings else None,
        "total": len(screenings),
        "low_risk_count": low,
        "recent": screenings[:5],
    }


@app.get("/api/profile/diabetes")
def get_diabetes_profile(user_id: str = Depends(get_current_user)):
    profile = db.get_diabetes_profile(user_id)
    if not profile:
        raise HTTPException(404, "diabetes profile not found")
    return profile


@app.put("/api/profile/diabetes")
def save_diabetes_profile(body: DiabetesProfileIn, user_id: str = Depends(get_current_user)):
    profile = body.model_dump()
    valid_durations = {"under-1", "1-5", "5-10", "10-15", "over-15", "custom", "unsure", None}
    if profile["diabetes_duration"] not in valid_durations:
        raise HTTPException(422, "Invalid diabetes duration range")
    if profile["diabetes_duration"] == "custom":
        value = profile["diabetes_duration_value"]
        if value is None or not np.isfinite(value) or value < 0 or value > 100:
            raise HTTPException(422, "Custom duration must be between 0 and 100")
        if profile["diabetes_duration_unit"] not in {"years", "months"}:
            raise HTTPException(422, "Custom duration unit must be years or months")
    else:
        profile["diabetes_duration_value"] = None
        profile["diabetes_duration_unit"] = None
    return db.upsert_diabetes_profile(user_id, profile)


def _doctor_with_availability(doc: dict) -> dict:
    return {**doc, "availableSlots": doc.get("baseSlots", [])}


@app.get("/api/doctors/search")
def search_doctors(
    query: str = "eye hospital ophthalmologist",
    location: str = "",
    lat: float | None = None,
    lng: float | None = None,
):
    if not location.strip() and (lat is None or lng is None):
        return {"source": "google_places", "results": [], "error": "Enter a location to search."}
    try:
        results = places.search_eye_care(query, location or None, lat=lat, lon=lng)
        return {"source": "google_places", "results": results}
    except places.PlacesNotConfigured as exc:
        raise HTTPException(500, str(exc)) from exc
    except places.PlacesError as exc:
        raise HTTPException(502, str(exc)) from exc


@app.get("/api/doctors")
def get_doctors():
    return [_doctor_with_availability(d) for d in DOCTORS]


class AppointmentIn(BaseModel):
    place_id: str | None = None
    doctor_name: str
    clinic: str
    location: str
    phone: str | None = None
    date: str
    time: str
    reason: str


class ReferralCaseIn(BaseModel):
    patient_name: str
    patient_age: str | None = None
    risk_level: str = "Medium"
    summary: str = ""
    recommendation: str = ""
    doctor_name: str = "Reviewing ophthalmologist"
    clinic: str = "EyeCare referral desk"
    location: str = "Remote review"


@app.post("/api/appointments")
def create_appointment(body: AppointmentIn):
    if db.is_slot_taken(body.place_id, body.date, body.time):
        raise HTTPException(409, "you already have a reminder saved for this clinic at that time")
    return db.insert_appointment(body.model_dump())


@app.get("/api/appointments")
def get_appointments():
    return db.list_appointments()


@app.post("/api/referrals")
def create_referral_case(body: ReferralCaseIn):
    return db.insert_referral_case(body.model_dump())


@app.get("/api/referrals")
def get_referral_cases():
    return db.list_referral_cases()


@app.patch("/api/referrals/{rid}")
def update_referral_case(rid: str, body: dict):
    status = body.get("status", "pending")
    review_note = body.get("review_note")
    rec = db.update_referral_case(rid, status, review_note)
    if not rec:
        raise HTTPException(404, "referral not found")
    return rec

