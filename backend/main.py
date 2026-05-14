# from fastapi import FastAPI, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware

# import torch
# import torchvision
# import cv2
# import numpy as np
# from math import radians, cos, sin, asin, sqrt

# from torchvision.ops import nms

# # ---------------- APP ----------------
# app = FastAPI()

# # ---------------- CORS ----------------
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ---------------- DEVICE ----------------
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# # ---------------- MODEL ----------------
# model = torchvision.models.detection.fasterrcnn_resnet50_fpn(weights=None)
# num_classes = 2
# in_features = model.roi_heads.box_predictor.cls_score.in_features
# model.roi_heads.box_predictor = torchvision.models.detection.faster_rcnn.FastRCNNPredictor(
#     in_features, num_classes
# )

# try:
#     model.load_state_dict(torch.load("best_model.pth", map_location=device))
#     print("Model weights loaded successfully")
# except FileNotFoundError:
#     print("Warning: model.pth not found. Using untrained model.")

# model.to(device)
# model.eval()

# # ---------------- LOGIC ----------------
# def get_traffic_level(count):
#     if count < 10:
#         return "LOW"
#     elif count < 30:
#         return "MEDIUM"
#     else:
#         return "HIGH"

# def get_signal_recommendation(count, level):
#     if level == "LOW":
#         return {
#             "green_duration": 30,
#             "priority": "NORMAL",
#             "action": "Standard cycle — low traffic",
#             "vehicles_per_cycle": count
#         }
#     elif level == "MEDIUM":
#         return {
#             "green_duration": 60,
#             "priority": "MODERATE",
#             "action": "Extended green — moderate congestion",
#             "vehicles_per_cycle": count
#         }
#     else:
#         return {
#             "green_duration": 90,
#             "priority": "HIGH",
#             "action": "Maximum green + alert traffic control",
#             "vehicles_per_cycle": count
#         }

# def get_congestion_score(count):
#     # 0–100 score for visual gauge
#     return min(100, int((count / 50) * 100))

# # ---------------- API ----------------
# @app.post("/predict")
# async def predict(
#     file: UploadFile = File(...),
#     lat: float = 18.6298,
#     lng: float = 73.7997
# ):
#     contents = await file.read()
#     nparr = np.frombuffer(contents, np.uint8)
#     img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#     img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

#     img_tensor = torch.tensor(
#         img_rgb / 255.0,
#         dtype=torch.float32
#     ).permute(2, 0, 1).to(device)

#     with torch.no_grad():
#         pred = model([img_tensor])[0]

#     boxes = pred['boxes'].cpu()
#     scores = pred['scores'].cpu()
#     keep = nms(boxes, scores, 0.2)

#     count = 0
#     for i in keep:
#         if scores[i] > 0.9:
#             count += 1

#     level = get_traffic_level(count)
#     signal = get_signal_recommendation(count, level)
#     congestion_score = get_congestion_score(count)

#     return {
#         "vehicle_count": count,
#         "traffic_level": level,
#         "signal_recommendation": signal,
#         "congestion_score": congestion_score,
#         "lat": lat,
#         "lng": lng
#     }
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import torch
import torchvision
import cv2
import numpy as np
from math import radians, cos, sin, asin, sqrt

from torchvision.ops import nms

# ---------------- APP ----------------
app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DEVICE ----------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------- MODEL ----------------
model = torchvision.models.detection.fasterrcnn_resnet50_fpn(weights=None)
num_classes = 2
in_features = model.roi_heads.box_predictor.cls_score.in_features
model.roi_heads.box_predictor = torchvision.models.detection.faster_rcnn.FastRCNNPredictor(
    in_features, num_classes
)

try:
    model.load_state_dict(torch.load("model.pth", map_location=device))
    print("Model weights loaded successfully")
except FileNotFoundError:
    print("Warning: model.pth not found. Using untrained model.")

model.to(device)
model.eval()

# ---------------- LOGIC ----------------
def get_traffic_level(count):
    if count < 10:
        return "LOW"
    elif count < 30:
        return "MEDIUM"
    else:
        return "HIGH"

def get_signal_recommendation(count, level):
    if level == "LOW":
        return {
            "green_duration": 30,
            "priority": "NORMAL",
            "action": "Standard cycle — low traffic",
            "vehicles_per_cycle": count
        }
    elif level == "MEDIUM":
        return {
            "green_duration": 60,
            "priority": "MODERATE",
            "action": "Extended green — moderate congestion",
            "vehicles_per_cycle": count
        }
    else:
        return {
            "green_duration": 90,
            "priority": "HIGH",
            "action": "Maximum green + alert traffic control",
            "vehicles_per_cycle": count
        }

def get_congestion_score(count):
    # 0–100 score for visual gauge
    return min(100, int((count / 50) * 100))

# ---------------- API ----------------
@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    lat: float = 18.6298,
    lng: float = 73.7997
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    img_tensor = torch.tensor(
        img_rgb / 255.0,
        dtype=torch.float32
    ).permute(2, 0, 1).to(device)

    with torch.no_grad():
        pred = model([img_tensor])[0]

    boxes = pred['boxes'].cpu()
    scores = pred['scores'].cpu()
    keep = nms(boxes, scores, 0.2)

    # 0.6 threshold — 0.9 was too strict for a fine-tuned model
    count = 0
    for i in keep:
        if scores[i] > 0.6:
            count += 1

    level = get_traffic_level(count)
    signal = get_signal_recommendation(count, level)
    congestion_score = get_congestion_score(count)

    return {
        "vehicle_count": count,
        "traffic_level": level,
        "signal_recommendation": signal,
        "congestion_score": congestion_score,
        "lat": lat,
        "lng": lng
    }