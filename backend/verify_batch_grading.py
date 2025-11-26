import requests
import json
import random
import string
import time

BASE_URL = "http://localhost:8000/api/v1"

def verify_batch_grading():
    # 1. Register/Login as Candidate
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    candidate_email = f"candidate_{rand_suffix}@example.com"
    candidate_pass = "password"
    
    print(f"Creating Candidate: {candidate_email}")
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": candidate_email, 
        "password": candidate_pass, 
        "re_password": candidate_pass,
        "full_name": "Candidate Batch", 
        "phone_number": f"092{rand_suffix}", 
        "user_type": "candidate"
    })

    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": candidate_email, "password": candidate_pass})
    candidate_token = resp.json()["access_token"]
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}

    # 2. Create Job (Need Recruiter first)
    recruiter_email = f"recruiter_{rand_suffix}@example.com"
    requests.post(f"{BASE_URL}/auth/register", json={
        "email": recruiter_email, 
        "password": "password", 
        "re_password": "password",
        "full_name": "Recruiter Batch", 
        "phone_number": f"093{rand_suffix}", 
        "user_type": "business",
        "company_name": "Test Corp"
    })
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": recruiter_email, "password": "password"})
    recruiter_token = resp.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    
    job_data = {
        "title": "Batch Grading Job",
        "description": "Desc",
        "requirements": "Req",
        "questions_template": [
            {"question_text": "What is Python?", "criteria": [{"keyword": "language", "score": 5}]},
            {"question_text": "What is AI?", "criteria": [{"keyword": "intelligence", "score": 5}]}
        ]
    }
    resp = requests.post(f"{BASE_URL}/jobs/", json=job_data, headers=recruiter_headers)
    job_id = resp.json()["id"]
    print(f"Job created: {job_id}")

    # 3. Start Interview
    resp = requests.post(f"{BASE_URL}/interviews/start", json={"job_id": job_id}, headers=candidate_headers)
    interview_id = resp.json()["id"]
    print(f"Interview started: {interview_id}")

    # 4. Submit Answers (Should be fast, no grading)
    print("Submitting Answer 1...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/interviews/{interview_id}/submit", json={
        "question_id": 0,
        "answer_text": "Python is a programming language."
    }, headers=candidate_headers)
    duration = time.time() - start_time
    print(f"Response time: {duration:.4f}s")
    
    if resp.status_code == 200 and resp.json().get("status") == "saved":
        print("PASS: Answer 1 saved successfully.")
    else:
        print(f"FAIL: Answer 1 submission failed: {resp.text}")

    print("Submitting Answer 2...")
    resp = requests.post(f"{BASE_URL}/interviews/{interview_id}/submit", json={
        "question_id": 1,
        "answer_text": "AI is artificial intelligence."
    }, headers=candidate_headers)
    if resp.status_code == 200:
        print("PASS: Answer 2 saved successfully.")

    # 5. Finish Interview (Batch Grading)
    print("Finishing Interview (Batch Grading)...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/interviews/{interview_id}/finish", headers=candidate_headers)
    duration = time.time() - start_time
    print(f"Grading time: {duration:.4f}s")
    
    if resp.status_code == 200:
        result = resp.json()
        print("Success! Result:", json.dumps(result, indent=2))
        if result["total_score"] > 0:
             print("PASS: Total score calculated.")
        else:
             print("FAIL: Total score is 0 (Check grading logic).")
        
        if "summary" in result and result["summary"]:
            print("PASS: Summary generated.")
            print("Summary content:", result["summary"])
        else:
            print("FAIL: No summary generated.")
    else:
        print(f"FAIL: Finish interview failed: {resp.text}")

if __name__ == "__main__":
    verify_batch_grading()
