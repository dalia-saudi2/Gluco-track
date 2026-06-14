from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Appointment, User
from config import settings
import sys

"""
This script manages the "Approved Doctors" list and cleans up existing data.
It's useful for ensuring that only relevant, verified doctors appear in the UI.
"""

def clean_database():
    """
    Remove appointments belonging to doctors not in the primary approved list.
    This helps keep the 'Upcoming Appointments' section clean and consistent.
    """
    try:
        engine = create_engine(settings.database_url)
        Session = sessionmaker(bind=engine)
        session = Session()

        approved_doctors = [
            'Dr. Mahmoud El-Sayed',
            'Dr. Amira Mansour',
            'Dr. Khaled Ibrahim'
        ]

        # 1. Identify and delete appointments with unapproved doctors
        # This keeps the dashboard from showing "junk" or "test" appointments
        # by only allowing a specific set of doctors.
        deleted_count = session.query(Appointment).filter(
            ~Appointment.doctor_name.in_(approved_doctors)
        ).delete(synchronize_session=False)

        session.commit()
        print(f"✅ Successfully deleted {deleted_count} appointments from unapproved doctors.")

    except Exception as e:
        print(f"❌ Error during database cleanup: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    clean_database()
