import sys
import os

# Add backend dir to pythonpath
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from app.db.session import SessionLocal
from app.db.models import Application, User, Job, ApplicationStage

def seed_test_data():
    db = SessionLocal()
    try:
        # Check if job 5 exists
        job = db.query(Job).filter(Job.id == 5).first()
        if not job:
            print("Job ID 5 does not exist. Finding first available job...")
            job = db.query(Job).first()
            if not job:
                print("No jobs found in the database. Exiting.")
                return

        # Find a candidate user or create a temporary one
        candidate = db.query(User).filter(User.role == "candidate").first()
        if not candidate:
            print("No candidate found. Exiting.")
            return

        # Check if application already exists
        existing_app = db.query(Application).filter(
            Application.job_id == job.id,
            Application.candidate_id == candidate.id
        ).first()

        cv_url = candidate.cv_url or "/static/cvs/test_cv.pdf"

        if not existing_app:
            new_app = Application(
                job_id=job.id,
                candidate_id=candidate.id,
                cv_url=cv_url,
                stage=ApplicationStage.SCREENING
            )
            db.add(new_app)
            
            # Khởi tạo một dummy interview để backfill nếu bị sót
            from app.db.models import Interview, InterviewStatus
            existing_interview = db.query(Interview).filter(
                Interview.job_id == job.id,
                Interview.candidate_id == candidate.id
            ).first()
            if not existing_interview:
                 # Just creating an application is enough for ATS Board
                 pass
            
            db.commit()
            print(f"✅ Đã tạo thành công dữ liệu Application ảo cho Job ID {job.id} và Candidate {candidate.email}!")
        else:
            print(f"⚠️ Application đã tồn tại cho Job ID {job.id} và Candidate {candidate.email}.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_data()
