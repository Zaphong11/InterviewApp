import requests
import json
import random
import string

BASE_URL = "http://localhost:8000/api/v1"

def verify_job_candidates():
    # 1. Register/Login as Recruiter
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    recruiter_email = f"recruiter_{rand_suffix}@example.com"
    recruiter_pass = "password"
    
    print(f"Creating Recruiter: {recruiter_email}")
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": recruiter_email, 
        "password": recruiter_pass, 
        "re_password": recruiter_pass,
        "full_name": "Recruiter", 
        "phone_number": f"090{rand_suffix}", 
        "user_type": "business",
        "company_name": "Test Corp"
    })

    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": recruiter_email, "password": recruiter_pass})
    recruiter_token = resp.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 2. Create Job
    job_data = {
        "title": "Test Job Candidates",
        "description": "Desc",
        "requirements": "Req",
        "questions_template": [{"question_text": "Q1"}]
    }
    resp = requests.post(f"{BASE_URL}/jobs/", json=job_data, headers=recruiter_headers)
    job_id = resp.json()["id"]
    print(f"Job created: {job_id}")

    # 3. Register/Login as Candidate
    candidate_email = f"candidate_{rand_suffix}@example.com"
    candidate_pass = "password"
    print(f"Creating Candidate: {candidate_email}")
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": candidate_email, 
        "password": candidate_pass, 
        "re_password": candidate_pass,
        "full_name": "Candidate Name", 
        "phone_number": f"091{rand_suffix}", 
        "user_type": "candidate"
    })

    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": candidate_email, "password": candidate_pass})
    candidate_token = resp.json()["access_token"]
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}

    # 4. Start Interview (to create record)
    requests.post(f"{BASE_URL}/interviews/start", json={"job_id": job_id}, headers=candidate_headers)
    print("Interview started by candidate")

    # 5. Get Candidates as Recruiter (Should Success)
    print("Fetching candidates as Recruiter...")
    resp = requests.get(f"{BASE_URL}/jobs/{job_id}/candidates", headers=recruiter_headers)
    if resp.status_code == 200:
        candidates = resp.json()
        print("Success! Candidates found:", len(candidates))
        print(json.dumps(candidates, indent=2))
        if len(candidates) > 0 and candidates[0]["candidate_email"] == candidate_email:
             print("PASS: Correct candidate returned")
        else:
             print("FAIL: Candidate data mismatch")
    else:
        print(f"FAIL: Recruiter fetch failed: {resp.status_code} {resp.text}")

    # 6. Get Candidates as Candidate (Should Fail)
    print("Fetching candidates as Candidate (Should Fail)...")
    resp = requests.get(f"{BASE_URL}/jobs/{job_id}/candidates", headers=candidate_headers)
    if resp.status_code == 403:
        print("PASS: Candidate denied access")
    else:
        print(f"FAIL: Candidate access not denied correctly: {resp.status_code}")

if __name__ == "__main__":
    verify_job_candidates()
