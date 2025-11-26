import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def verify_interview_flow():
    # 1. Register/Login as Recruiter
    import random
    import string
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    recruiter_email = f"recruiter_{rand_suffix}@example.com"
    recruiter_pass = "password"
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": recruiter_email, 
            "password": recruiter_pass, 
            "re_password": recruiter_pass,
            "full_name": "Recruiter", 
            "phone_number": f"090{rand_suffix}", 
            "user_type": "business",
            "company_name": "Test Corp"
        })
        if resp.status_code != 201: # Expect 201
            print(f"Recruiter registration failed: {resp.text}")
    except Exception as e:
        print(f"Recruiter registration exception: {e}")

    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": recruiter_email, "password": recruiter_pass})
    if resp.status_code != 200:
        print(f"Recruiter login failed: {resp.text}")
        return
    recruiter_token = resp.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 2. Create Job with questions_template
    job_data = {
        "title": "Test Job",
        "description": "Test Desc",
        "requirements": "Test Req",
        "questions_template": [
            {"question_text": "Q1", "criteria": [{"keyword": "k1", "score": 10}]},
            {"question_text": "Q2", "criteria": [{"keyword": "k2", "score": 10}]}
        ]
    }
    resp = requests.post(f"{BASE_URL}/jobs/", json=job_data, headers=recruiter_headers)
    if resp.status_code != 200:
        print(f"Create Job failed: {resp.text}")
        return
    job_id = resp.json()["id"]
    print(f"Job created: {job_id}")

    # 3. Register/Login as Candidate
    candidate_email = f"candidate_{rand_suffix}@example.com"
    candidate_pass = "password"
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": candidate_email, 
            "password": candidate_pass, 
            "re_password": candidate_pass,
            "full_name": "Candidate", 
            "phone_number": f"091{rand_suffix}", 
            "user_type": "candidate"
        })
        if resp.status_code != 201:
             print(f"Candidate registration failed: {resp.text}")
    except Exception as e:
        print(f"Candidate registration exception: {e}")

    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": candidate_email, "password": candidate_pass})
    if resp.status_code != 200:
        print(f"Candidate login failed: {resp.text}")
        return
    candidate_token = resp.json()["access_token"]
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}

    # 4. Start Interview
    resp = requests.post(f"{BASE_URL}/interviews/start", json={"job_id": job_id}, headers=candidate_headers)
    if resp.status_code != 200:
        print(f"Start Interview failed: {resp.text}")
        return
    interview = resp.json()
    interview_id = interview["id"]
    print(f"Interview started: {interview_id}")
    
    # Check content in start response (should have criteria if using Interview schema, wait, the prompt said "Chỉ trả về nội dung câu hỏi, KHÔNG trả về criteria" for the GET endpoint. 
    # For POST /start, I used `response_model=interview_schema.Interview` which INCLUDES criteria. 
    # The prompt didn't explicitly say POST /start should hide criteria, but it implies the candidate shouldn't see it.
    # However, usually /start returns the interview object. If I want to hide it there too, I should use the CandidateView schema.
    # Let's check the GET endpoint first as requested.
    
    # 5. Get Interview (Candidate View)
    resp = requests.get(f"{BASE_URL}/interviews/{interview_id}", headers=candidate_headers)
    if resp.status_code != 200:
        print(f"Get Interview failed: {resp.text}")
        return
    
    interview_data = resp.json()
    print("Get Interview Response:", json.dumps(interview_data, indent=2))
    
    # Verify criteria is NOT present
    questions = interview_data["content"]["questions"]
    if "criteria" in questions[0]:
        print("FAIL: Criteria found in response!")
    else:
        print("SUCCESS: Criteria hidden from candidate.")

    # 6. Verify Get or Create Logic
    print("Verifying Get or Create logic...")
    resp = requests.post(f"{BASE_URL}/interviews/start", json={"job_id": job_id}, headers=candidate_headers)
    if resp.status_code != 200:
        print(f"Start Interview (2nd time) failed: {resp.text}")
        return
    
    interview_2 = resp.json()
    interview_id_2 = interview_2["id"]
    
    if interview_id == interview_id_2:
        print(f"SUCCESS: Get or Create logic working. Interview ID {interview_id} == {interview_id_2}")
    else:
        print(f"FAIL: New interview created! {interview_id} != {interview_id_2}")

if __name__ == "__main__":
    verify_interview_flow()
