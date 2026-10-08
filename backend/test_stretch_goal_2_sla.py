import os
import sys
import time
import subprocess
from datetime import datetime, timezone, timedelta
import requests
import pymongo
from app.config import settings

BASE_URL = "http://localhost:8000"


def print_step(num: int, title: str):
    print(f"\n==================================================================")
    print(f"STEP {num}: {title}")
    print(f"==================================================================")


def run_sla_e2e_tests():
    print("==================================================================")
    print(">>> STARTING STRETCH GOAL 2: SLA BREACH ALERTS E2E TEST SUITE <<<")
    print("==================================================================")

    # Direct MongoDB client for deterministic controlled timestamp simulation
    mongo_client = pymongo.MongoClient(settings.MONGODB_URI)
    db = mongo_client[settings.database_name]
    collection = db["complaints"]

    # 1. Health check
    print_step(1, "Verify Backend Health & Database Connectivity")
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print("Health check response:", health_data)
    assert health_data["status"] == "healthy", "Backend must report healthy status"
    assert health_data["database"] == "connected", "Database must be connected"
    print("[OK] STEP 1 PASSED: Backend is healthy and connected to MongoDB Atlas.")

    # 2. Citizen login (register + login)
    print_step(2, "Citizen Registration & Authentication")
    ts = int(time.time())
    citizen_email = f"citizen_sla_{ts}@example.com"
    citizen_pass = "SecurePass123!"

    reg_res = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Sarah Connor",
            "email": citizen_email,
            "password": citizen_pass,
            "confirm_password": citizen_pass,
        },
    )
    assert reg_res.status_code == 201, f"Citizen registration failed: {reg_res.text}"
    citizen_token = reg_res.json()["access_token"]
    citizen_user = reg_res.json()["user"]
    print(f"Registered Citizen: {citizen_user['name']} ({citizen_user['email']}) [ID: {citizen_user['id']}]")

    # Verify citizen login endpoint
    login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": citizen_email, "password": citizen_pass},
    )
    assert login_res.status_code == 200, f"Citizen login failed: {login_res.text}"
    assert login_res.json()["user"]["role"] == "CITIZEN"
    print("[OK] STEP 2 PASSED: Citizen login verified with valid JWT.")

    # 3. Government login
    print_step(3, "Government Official Authentication")
    admin_email = "admin@smartcivic.gov"
    admin_pass = "Admin@12345"

    admin_login_res = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": admin_email, "password": admin_pass},
    )
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_user = admin_login_res.json()["user"]
    print(f"Logged in Government Official: {admin_user['name']} ({admin_user['email']}) [Role: {admin_user['role']}]")
    assert admin_user["role"] == "ADMIN"
    print("[OK] STEP 3 PASSED: Government Official login verified.")

    # 4. Submit HIGH urgency complaint
    print_step(4, "Submit High-Urgency Civic Complaint with Gemini Triage")
    sub_res = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Exposed high-voltage electrical cable sparking furiously near the school entrance gate, severe electrocution danger to pedestrians.",
            "citizen_name": "Sarah Connor",
            "citizen_contact": "sarah@resistance.org | +1-555-0911",
            "location_address": "404 North Avenue, High School Gate 1, Sector 4",
            "latitude": 28.5360,
            "longitude": 77.3920,
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert sub_res.status_code == 201, f"Complaint submission failed: {sub_res.text}"
    complaint_1 = sub_res.json()
    cid_1 = complaint_1["complaint_id"]
    urgency_1 = complaint_1["ai_analysis"]["urgency"]
    print(f"Submitted Complaint ID: {cid_1}")
    print(f"Gemini Triage Urgency: {urgency_1}")
    print(f"Priority Score: {complaint_1['ai_analysis']['priority_score']}")
    print(f"Assigned Department: {complaint_1['ai_analysis']['department']}")
    print("[OK] STEP 4 PASSED: Complaint submitted and triaged by Gemini.")

    # 5. Verify sla_hours
    print_step(5, "Verify SLA Hours Matching Urgency")
    sla_hours_1 = complaint_1.get("sla_hours")
    print(f"Calculated SLA Hours: {sla_hours_1} hours")
    if urgency_1 == "CRITICAL":
        assert sla_hours_1 == settings.SLA_CRITICAL_HOURS, f"Expected {settings.SLA_CRITICAL_HOURS}h, got {sla_hours_1}"
    elif urgency_1 == "HIGH":
        assert sla_hours_1 == settings.SLA_HIGH_HOURS, f"Expected {settings.SLA_HIGH_HOURS}h, got {sla_hours_1}"
    elif urgency_1 == "MEDIUM":
        assert sla_hours_1 == settings.SLA_MEDIUM_HOURS, f"Expected {settings.SLA_MEDIUM_HOURS}h, got {sla_hours_1}"
    else:
        assert sla_hours_1 == settings.SLA_LOW_HOURS, f"Expected {settings.SLA_LOW_HOURS}h, got {sla_hours_1}"
    print("[OK] STEP 5 PASSED: SLA hours correctly match prototype urgency duration.")

    # 6. Verify sla_due_at exists
    print_step(6, "Verify sla_due_at Target Deadline")
    sla_due_at_1 = complaint_1.get("sla_due_at")
    assert sla_due_at_1 is not None, "sla_due_at must not be null"
    created_at_dt = datetime.fromisoformat(complaint_1["created_at"].replace("Z", "+00:00"))
    due_at_dt = datetime.fromisoformat(sla_due_at_1.replace("Z", "+00:00"))
    expected_diff_hours = (due_at_dt - created_at_dt).total_seconds() / 3600.0
    print(f"Created: {created_at_dt}, Due: {due_at_dt}, Diff: {expected_diff_hours:.1f} hours")
    assert abs(expected_diff_hours - sla_hours_1) < 0.1, "sla_due_at must equal created_at + sla_hours"
    print("[OK] STEP 6 PASSED: sla_due_at correctly computed and validated.")

    # 7. Verify initial SLA status
    print_step(7, "Verify Initial SLA Status (WITHIN_SLA)")
    assert complaint_1.get("sla_status") == "WITHIN_SLA", f"Expected WITHIN_SLA, got {complaint_1.get('sla_status')}"
    assert complaint_1.get("sla_breached_at") is None, "sla_breached_at should be null initially"
    assert complaint_1.get("sla_remaining_seconds", 0) > 0, "sla_remaining_seconds must be positive"
    print(f"Initial SLA Status: {complaint_1.get('sla_status')}")
    print(f"Remaining Text: {complaint_1.get('sla_remaining_text')}")
    print("[OK] STEP 7 PASSED: Initial SLA status is correctly WITHIN_SLA.")

    # 8. Simulate/construct an expired SLA complaint
    print_step(8, "Simulate Controlled Expired SLA Timestamp")
    # Adjust sla_due_at in MongoDB Atlas to 3 hours in the past
    now_utc = datetime.now(timezone.utc)
    expired_due = now_utc - timedelta(hours=3)
    collection.update_one(
        {"complaint_id": cid_1},
        {"$set": {"sla_due_at": expired_due, "sla_breached_at": None}},
    )
    print(f"Adjusted complaint {cid_1} sla_due_at in MongoDB Atlas to {expired_due} (past deadline).")
    print("[OK] STEP 8 PASSED: Controlled expired timestamp set.")

    # 9. Verify SLA becomes BREACHED
    print_step(9, "Verify Dynamic SLA Evaluation Returns BREACHED")
    admin_detail_res = requests.get(
        f"{BASE_URL}/api/admin/complaints/{cid_1}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_detail_res.status_code == 200
    comp_1_breached = admin_detail_res.json()
    print(f"Dynamic SLA Status: {comp_1_breached.get('sla_status')}")
    print(f"Remaining / Overdue Text: {comp_1_breached.get('sla_remaining_text')}")
    assert comp_1_breached.get("sla_status") == "BREACHED", f"Expected BREACHED, got {comp_1_breached.get('sla_status')}"
    assert comp_1_breached.get("sla_remaining_seconds") <= 0, "Remaining seconds must be <= 0 for breached complaint"
    print("[OK] STEP 9 PASSED: Expired complaint dynamically evaluated as BREACHED.")

    # 10. Verify sla_breached_at is populated
    print_step(10, "Verify sla_breached_at is Permanently Recorded")
    breached_at = comp_1_breached.get("sla_breached_at")
    assert breached_at is not None, "sla_breached_at must be populated when breached"
    print(f"Recorded sla_breached_at: {breached_at}")

    # Query again and verify sla_breached_at is not repeatedly modified
    second_check = requests.get(
        f"{BASE_URL}/api/admin/complaints/{cid_1}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    breached_at_2 = second_check.get("sla_breached_at")
    assert breached_at_2 is not None, "sla_breached_at must remain populated"
    dt1 = datetime.fromisoformat(breached_at.replace("Z", "+00:00"))
    dt2 = datetime.fromisoformat(breached_at_2.replace("Z", "+00:00"))
    assert abs((dt2 - dt1).total_seconds()) < 1.0, f"sla_breached_at should remain stable: {dt1} vs {dt2}"

    # Verify subsequent queries match identical stored timestamp
    third_check = requests.get(
        f"{BASE_URL}/api/admin/complaints/{cid_1}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    assert third_check.get("sla_breached_at") == breached_at_2, "sla_breached_at should match exactly on repeated calls"
    print("[OK] STEP 10 PASSED: sla_breached_at recorded and preserved without repeated overwriting.")

    # 11. Verify Due-Soon calculation
    print_step(11, "Verify DUE_SOON Threshold Calculation")
    # For a 12-hour or 24-hour SLA with 20% threshold (2.4h or 4.8h threshold):
    # Set remaining time to 1.25 hours (< 2.4h threshold)
    due_soon_target = datetime.now(timezone.utc) + timedelta(hours=1, minutes=15)
    collection.update_one(
        {"complaint_id": cid_1},
        {"$set": {"sla_due_at": due_soon_target, "sla_breached_at": None, "status": "IN_PROGRESS"}},
    )
    due_soon_res = requests.get(
        f"{BASE_URL}/api/admin/complaints/{cid_1}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    print(f"SLA Status under 2.5h remaining: {due_soon_res.get('sla_status')}")
    print(f"SLA Remaining Text: {due_soon_res.get('sla_remaining_text')}")
    assert due_soon_res.get("sla_status") == "DUE_SOON", f"Expected DUE_SOON, got {due_soon_res.get('sla_status')}"
    print("[OK] STEP 11 PASSED: DUE_SOON status correctly calculated.")

    # 12. Verify completed complaint gets SLA status COMPLETED
    print_step(12, "Verify COMPLETED Lifecycle Status Closes SLA")
    status_update_res = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{cid_1}/status",
        json={"status": "COMPLETED", "admin_notes": "Hazard resolved safely by emergency line crew."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status_update_res.status_code == 200, f"Status update failed: {status_update_res.text}"

    comp_1_completed = requests.get(
        f"{BASE_URL}/api/admin/complaints/{cid_1}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    print(f"Complaint Status: {comp_1_completed.get('status')}")
    print(f"SLA Status: {comp_1_completed.get('sla_status')}")
    print(f"SLA Text: {comp_1_completed.get('sla_remaining_text')}")
    assert comp_1_completed.get("sla_status") == "COMPLETED", f"Expected COMPLETED, got {comp_1_completed.get('sla_status')}"
    print("[OK] STEP 12 PASSED: Completed complaints receive SLA status COMPLETED.")

    # 13. Verify merged complaint follows master SLA
    print_step(13, "Verify Merged Complaint Follows Master Complaint SLA")
    # Submit Master Complaint
    sub_m = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Deep dangerous crater pothole near Main Bus Stand platform 2 damaging tires.",
            "citizen_name": "Citizen M",
            "citizen_contact": "m@example.com",
            "location_address": "Main Bus Terminal, Platform 2",
            "latitude": 28.5300,
            "longitude": 77.3900,
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    ).json()
    master_cid = sub_m["complaint_id"]

    # Submit Duplicate Complaint
    sub_d = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Hazardous road pothole crater at Main Bus Stand platform 2 near buses.",
            "citizen_name": "Citizen D",
            "citizen_contact": "d@example.com",
            "location_address": "Main Bus Terminal, Platform 2",
            "latitude": 28.5301,
            "longitude": 77.3901,
        },
        headers={"Authorization": f"Bearer {citizen_token}"},
    ).json()
    dup_cid = sub_d["complaint_id"]

    print(f"Created Master candidate: {master_cid}, Duplicate candidate: {dup_cid}")

    # Merge duplicate into master
    merge_res = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_cid}/merge",
        json={"duplicate_complaint_ids": [dup_cid]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert merge_res.status_code == 200, f"Merge failed: {merge_res.text}"
    print(f"Successfully merged {dup_cid} into {master_cid}")

    # Check merged complaint SLA (should follow master's WITHIN_SLA)
    merged_view = requests.get(
        f"{BASE_URL}/api/admin/complaints/{dup_cid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    assert merged_view["status"] == "MERGED"
    assert merged_view["sla_status"] == "WITHIN_SLA"
    print(f"Merged Complaint Status: {merged_view['status']}, Master SLA: {merged_view['sla_status']}")

    # Simulate Master SLA becoming BREACHED
    collection.update_one(
        {"complaint_id": master_cid},
        {"$set": {"sla_due_at": datetime.now(timezone.utc) - timedelta(hours=4)}},
    )

    merged_breached_view = requests.get(
        f"{BASE_URL}/api/admin/complaints/{dup_cid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    print(f"When Master breaches -> Linked complaint SLA: {merged_breached_view['sla_status']}")
    assert merged_breached_view["sla_status"] == "BREACHED", "Merged complaint SLA must track master breach"

    # Complete the Master -> Merged complaint SLA must become COMPLETED
    requests.patch(
        f"{BASE_URL}/api/admin/complaints/{master_cid}/status",
        json={"status": "COMPLETED", "admin_notes": "Master pothole patched and repaved."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    merged_completed_view = requests.get(
        f"{BASE_URL}/api/admin/complaints/{dup_cid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    print(f"When Master completed -> Linked complaint SLA: {merged_completed_view['sla_status']}")
    assert merged_completed_view["sla_status"] == "COMPLETED", "Merged complaint SLA must track master completion"
    print("[OK] STEP 13 PASSED: Merged complaint SLA strictly follows master complaint lifecycle.")

    # 14. Verify government can access SLA information
    print_step(14, "Verify Government SLA APIs Access")
    # List with SLA filter
    within_res = requests.get(
        f"{BASE_URL}/api/admin/complaints?sla_status=WITHIN_SLA",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert within_res.status_code == 200
    within_list = within_res.json()
    print(f"Government retrieved {len(within_list)} WITHIN_SLA complaints.")
    for c in within_list[:3]:
        assert c["sla_status"] == "WITHIN_SLA"

    # Admin SLA alerts endpoint
    sla_alerts_res = requests.get(
        f"{BASE_URL}/api/admin/sla-alerts?limit=10",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert sla_alerts_res.status_code == 200, f"SLA alerts failed: {sla_alerts_res.text}"
    sla_alerts = sla_alerts_res.json()
    print(f"Government Official retrieved {len(sla_alerts)} active SLA alerts.")
    for a in sla_alerts:
        assert a["sla_status"] in ["BREACHED", "DUE_SOON"], f"Alert had status {a['sla_status']}"
    print("[OK] STEP 14 PASSED: Government Official can access all SLA endpoints and filters.")

    # 15. Verify citizen cannot access admin SLA alerts
    print_step(15, "Verify Citizen Access Forbidden (403 Forbidden)")
    cit_alert_res = requests.get(
        f"{BASE_URL}/api/admin/sla-alerts",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    print(f"Citizen access attempt to /api/admin/sla-alerts -> HTTP {cit_alert_res.status_code}")
    assert cit_alert_res.status_code == 403, f"Expected 403 Forbidden, got {cit_alert_res.status_code}"
    print("[OK] STEP 15 PASSED: Citizens are forbidden from accessing admin SLA operational alerts.")

    # 16. Verify dashboard SLA counts
    print_step(16, "Verify Real MongoDB SLA Counts in Analytics Summary")
    summary_res = requests.get(f"{BASE_URL}/api/analytics/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    print(f"Analytics Summary SLA Counts:")
    print(f"  - SLA Breached: {summary.get('sla_breached')}")
    print(f"  - Due Soon:     {summary.get('sla_due_soon')}")
    print(f"  - Within SLA:   {summary.get('sla_within')}")
    print(f"  - Completed:    {summary.get('sla_completed')}")
    assert "sla_breached" in summary
    assert "sla_due_soon" in summary
    assert "sla_within" in summary
    assert "sla_completed" in summary
    print("[OK] STEP 16 PASSED: Real SLA counts present in analytics summary.")

    # 17. Verify analytics SLA performance breakdown
    print_step(17, "Verify SLA Performance Breakdown Percentages")
    perf = summary.get("sla_performance", {})
    print(f"SLA Performance:")
    print(f"  - Total Active:   {perf.get('total_active')}")
    print(f"  - Within SLA %:   {perf.get('within_percent')}%")
    print(f"  - Due Soon %:     {perf.get('due_soon_percent')}%")
    print(f"  - Breached %:     {perf.get('breached_percent')}%")
    assert "within_percent" in perf
    assert "due_soon_percent" in perf
    assert "breached_percent" in perf
    if perf.get("total_active", 0) > 0:
        total_pct = perf.get("within_percent", 0) + perf.get("due_soon_percent", 0) + perf.get("breached_percent", 0)
        assert abs(total_pct - 100.0) < 1.0, f"Percentages should sum to ~100%, got {total_pct}"
    print("[OK] STEP 17 PASSED: SLA performance metrics calculated from real data.")

    # 18. Verify existing duplicate merge functionality still works
    print_step(18, "Verify Stretch Goal 1 Duplicate Merging Preserved")
    master_check = requests.get(
        f"{BASE_URL}/api/admin/complaints/{master_cid}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()
    assert master_check.get("is_master_complaint") is True
    assert dup_cid in master_check.get("merged_complaint_ids", [])
    print(f"Master {master_cid} verified with linked duplicates: {master_check.get('merged_complaint_ids')}")
    print("[OK] STEP 18 PASSED: Duplicate merge functionality operates smoothly.")

    # 19. Run existing regression test scripts
    print_step(19, "Execute Regression Test Suites")
    print("Running test_stretch_goal_1_merge.py...")
    ret_merge = subprocess.run([sys.executable, "test_stretch_goal_1_merge.py"], cwd=".")
    assert ret_merge.returncode == 0, "test_stretch_goal_1_merge.py failed!"
    print("[OK] test_stretch_goal_1_merge.py PASSED!")

    print("\nRunning test_e2e_two_role.py...")
    ret_two_role = subprocess.run([sys.executable, "test_e2e_two_role.py"], cwd=".")
    assert ret_two_role.returncode == 0, "test_e2e_two_role.py failed!"
    print("[OK] test_e2e_two_role.py PASSED!")
    print("[OK] STEP 19 PASSED: All regression test suites passed with 100% success.")

    # 20. Verify npm build
    print_step(20, "Verify Production Frontend Build")
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    print(f"Building frontend at: {frontend_dir}")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    ret_build = subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir)
    assert ret_build.returncode == 0, "npm run build failed!"
    print("[OK] STEP 20 PASSED: Production npm build succeeded with 0 errors.")

    print("\n==================================================================")
    print(">>> ALL 20 STRETCH GOAL 2 SLA TESTS PASSED SUCCESSFULLY! <<<")
    print("==================================================================")


if __name__ == "__main__":
    try:
        run_sla_e2e_tests()
    except Exception as e:
        print(f"\n[ERROR] TEST RUN FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
