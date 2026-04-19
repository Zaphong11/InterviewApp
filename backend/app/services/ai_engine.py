import os
import re
import torch
import torch.nn as nn
import numpy as np
from sentence_transformers import SentenceTransformer

class ATSDomainClassifier(nn.Module):
    def __init__(self, input_dim=384, num_classes=5):
        super(ATSDomainClassifier, self).__init__()
        self.fc1 = nn.Linear(input_dim, 128)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        return self.fc2(x)

print("Start all-MiniLM-L6-v2")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '../../cv_domain_production_v2.pth')

domain_model = None
label_map = {}

if os.path.exists(MODEL_PATH):
    production_data = torch.load(MODEL_PATH, map_location=torch.device('cpu'), weights_only=False)
    label_map = production_data['label_map']
    domain_model = ATSDomainClassifier(input_dim=384, num_classes=len(label_map))
    domain_model.load_state_dict(production_data['model_state_dict'])
    domain_model.eval()  # Tắt chế độ training
else:
    print(f"{MODEL_PATH} Not found")


# 3. Các hàm công cụ dùng cho cv_analyzer
def get_text_embedding(text: str) -> list[float]:
    clean_txt = re.sub(r'[^a-zA-Z0-9\s]', ' ', str(text))
    clean_txt = re.sub(r'\s+', ' ', clean_txt).strip().lower()
    return embed_model.encode([clean_txt])[0].tolist()


def get_domain_prediction(embedding_vector: list[float]) -> dict:
    if not domain_model:
        return {"Unknown": 100.0}

    tensor_vector = torch.tensor([embedding_vector], dtype=torch.float32)
    with torch.no_grad():
        logits = domain_model(tensor_vector)
        probabilities = torch.softmax(logits, dim=1)[0]

    reverse_map = {v: k for k, v in label_map.items()}
    results = {reverse_map[idx]: round(prob.item() * 100, 2) for idx, prob in enumerate(probabilities)}
    return dict(sorted(results.items(), key=lambda item: item[1], reverse=True))


def calculate_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
        return 0.0
    return float((np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))) * 100)