import time
import requests

BASE_URL = "http://localhost:8000"

def run_merge_e2e_tests():
    print("==================================================================")
    print(">>> STARTING STRETCH GOAL 1: DUPLICATE COMPLAINT MERGING E2E TEST <<<")
    print("==================================================================")

    # 0. Health check
    h = requests.get(f"{BASE_URL}/health").json()
    print("0. Health check:", h)
    assert h["status"] == "healthy", "Backend must be healthy"
    assert h["database"] == "connected", "Database must be connected"

    ts = int(time.time())
    email_a = f"citizen_alice_{ts}@example.com"
    email_b = f"citizen_bob_{ts}@example.com"
    admin_email = "admin@smartcivic.gov"
    admin_pass = "Admin@12345"

    # STEP 1: Register Citizen A
    print("\n--- STEP 1: Register Citizen A ---")
    reg_a = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Alice Green",
            "email": email_a,
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert reg_a.status_code == 201, f"Failed to register Citizen A: {reg_a.text}"
    token_a = reg_a.json()["access_token"]
    user_a = reg_a.json()["user"]
    print("Citizen A registered successfully. ID:", user_a["id"])

    # STEP 2: Register Citizen B
    print("\n--- STEP 2: Register Citizen B ---")
    reg_b = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Bob Stone",
            "email": email_b,
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert reg_b.status_code == 201, f"Failed to register Citizen B: {reg_b.text}"
    token_b = reg_b.json()["access_token"]
    user_b = reg_b.json()["user"]
    print("Citizen B registered successfully. ID:", user_b["id"])

    # STEP 3: Citizen A submits first complaint (will become Master)
    print("\n--- STEP 3: Citizen A submits complaint (Master candidate) ---")
    sub_a = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Massive crater pothole on Main Avenue near Metro Gate 3 causing severe vehicle alignment damage.",
            "citizen_name": "Alice Green",
            "citizen_contact": "alice@personal.test | +1-555-0101",
            "location_address": "Main Avenue, Metro Gate 3, Sector 9",
            "latitude": 28.5355,
            "longitude": 77.3910,
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert sub_a.status_code == 201, f"Submission A failed: {sub_a.text}"
    comp_a = sub_a.json()
    master_id = comp_a["complaint_id"]
    print(f"Citizen A submitted complaint: {master_id}")
    print(f"Status: {comp_a['status']}, Department: {comp_a['ai_analysis']['department']}")

    # STEP 4: Citizen B submits similar complaint (Duplicate candidate)
    print("\n--- STEP 4: Citizen B submits similar complaint (Duplicate candidate) ---")
    sub_b = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Deep broken pothole crater on Main Avenue near Metro Gate 3 swerving motorcycles dangerously.",
            "citizen_name": "Bob Stone",
            "citizen_contact": "bob@personal.test | +1-555-0202",
            "location_address": "Main Avenue, Metro Gate 3, Sector 9",
            "latitude": 28.5356,
            "longitude": 77.3911,
        },
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert sub_b.status_code == 201, f"Submission B failed: {sub_b.text}"
    comp_b = sub_b.json()
    dup_id = comp_b["complaint_id"]
    print(f"Citizen B submitted complaint: {dup_id}")
    print(f"Duplicate Found: {comp_b['duplicate_found']}")
    print(f"Reported Duplicate IDs: {comp_b['duplicate_complaint_ids']}")

    assert comp_b["duplicate_found"] is True, "Duplicate detection must detect potential duplicate relationship"
    assert master_id in comp_b["duplicate_complaint_ids"], f"Master ID {master_id} must be in duplicate_complaint_ids"

    # STEP 5: Security Test - Citizen B attempts to call Merge API -> MUST RETURN 403 FORBIDDEN!
    print("\n--- STEP 5: Security Test - Citizen attempts to merge (expect 403 Forbidden) ---")
    unauth_merge = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_id}/merge",
        json={"duplicate_complaint_ids": [dup_id]},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    print("Citizen merge attempt status:", unauth_merge.status_code)
    assert unauth_merge.status_code == 403, "Citizen must receive 403 Forbidden on merge endpoint"

    # STEP 6: Login as Government Official (ADMIN)
    print("\n--- STEP 6: Login as Government Official ---")
    login_admin = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": admin_email, "password": admin_pass},
    )
    assert login_admin.status_code == 200, f"Admin login failed: {login_admin.text}"
    token_admin = login_admin.json()["access_token"]
    print("Government official logged in.")

    # STEP 7: Validation Test - Try to merge master complaint into itself -> MUST FAIL (400)
    print("\n--- STEP 7: Validation Test - Merge master into itself (expect 400 Bad Request) ---")
    self_merge = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_id}/merge",
        json={"duplicate_complaint_ids": [master_id]},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    print("Self merge attempt status:", self_merge.status_code)
    assert self_merge.status_code == 400, "Merging master into itself must return 400"

    # STEP 8: Validation Test - Try to merge non-existent ID -> MUST FAIL (404)
    print("\n--- STEP 8: Validation Test - Merge non-existent ID (expect 404 Not Found) ---")
    ghost_merge = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_id}/merge",
        json={"duplicate_complaint_ids": ["CIV-2026-999999"]},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    print("Ghost merge attempt status:", ghost_merge.status_code)
    assert ghost_merge.status_code == 404, "Merging non-existent ID must return 404"

    # STEP 9: Government executes successful merge
    print(f"\n--- STEP 9: Government merges {dup_id} into MASTER {master_id} ---")
    merge_res = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_id}/merge",
        json={"duplicate_complaint_ids": [dup_id]},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    print("Merge response code:", merge_res.status_code)
    assert merge_res.status_code == 200, f"Merge failed: {merge_res.text}"
    merge_data = merge_res.json()
    print("Merge response body:", merge_data)
    assert merge_data["success"] is True
    assert merge_data["master_complaint_id"] == master_id
    assert dup_id in merge_data["merged_complaint_ids"]
    assert merge_data["message"] == "Complaints merged successfully"

    # STEP 10: Verify Master Complaint properties
    print("\n--- STEP 10: Verify Master Complaint properties in DB ---")
    admin_master_view = requests.get(
        f"{BASE_URL}/api/admin/complaints/{master_id}",
        headers={"Authorization": f"Bearer {token_admin}"},
    ).json()
    print("Master is_master_complaint:", admin_master_view["is_master_complaint"])
    print("Master merged_complaint_ids:", admin_master_view["merged_complaint_ids"])
    print("Master merged_complaints_details count:", len(admin_master_view["merged_complaints_details"]))
    assert admin_master_view["is_master_complaint"] is True
    assert dup_id in admin_master_view["merged_complaint_ids"]
    assert admin_master_view["status"] == "REQUESTED", "Master retains its normal status lifecycle"

    # STEP 11: Verify Duplicate Complaint properties
    print("\n--- STEP 11: Verify Duplicate Complaint properties in DB ---")
    admin_dup_view = requests.get(
        f"{BASE_URL}/api/admin/complaints/{dup_id}",
        headers={"Authorization": f"Bearer {token_admin}"},
    ).json()
    print("Duplicate status:", admin_dup_view["status"])
    print("Duplicate is_master_complaint:", admin_dup_view["is_master_complaint"])
    print("Duplicate master_complaint_id:", admin_dup_view["master_complaint_id"])
    print("Duplicate merged_at:", admin_dup_view["merged_at"])
    print("Duplicate merged_by:", admin_dup_view["merged_by"])
    assert admin_dup_view["status"] == "MERGED"
    assert admin_dup_view["is_master_complaint"] is False
    assert admin_dup_view["master_complaint_id"] == master_id
    assert admin_dup_view["merged_at"] is not None
    assert admin_dup_view["merged_by"] is not None

    # STEP 12: Validation Test - Cannot merge an already merged complaint into another master
    print("\n--- STEP 12: Validation Test - Cannot re-merge already merged complaint ---")
    re_merge = requests.post(
        f"{BASE_URL}/api/admin/complaints/{master_id}/merge",
        json={"duplicate_complaint_ids": [dup_id]},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    print("Re-merge attempt status:", re_merge.status_code)
    assert re_merge.status_code == 400, "Re-merging an already merged complaint must return 400"

    # STEP 13: Citizen B views their own merged complaint
    print("\n--- STEP 13: Citizen B opens their merged complaint ---")
    b_view = requests.get(
        f"{BASE_URL}/api/complaints/{dup_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_view.status_code == 200, f"Citizen B view failed: {b_view.text}"
    b_doc = b_view.json()
    print("Citizen B sees status:", b_doc["status"])
    print("Citizen B sees master_complaint_id:", b_doc["master_complaint_id"])
    print("Citizen B sees master_status:", b_doc["master_status"])
    assert b_doc["status"] == "MERGED"
    assert b_doc["master_complaint_id"] == master_id
    assert b_doc["master_status"] == "REQUESTED"

    # STEP 14: Citizen B clicks [View Master Complaint] -> Must succeed without 403 Forbidden!
    print(f"\n--- STEP 14: Citizen B accesses linked Master Complaint {master_id} ---")
    b_master_view = requests.get(
        f"{BASE_URL}/api/complaints/{master_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    print("Citizen B access to master status code:", b_master_view.status_code)
    assert b_master_view.status_code == 200, "Citizen B must be authorized to view the master complaint"
    b_master_doc = b_master_view.json()
    print("Citizen B sees master problem:", b_master_doc["ai_analysis"]["problem_summary"])
    print("Citizen B sees sanitized submitter name:", b_master_doc["citizen_name"])
    print("Citizen B sees submitter contact:", b_master_doc["citizen_contact"])
    assert b_master_doc["citizen_contact"] is None, "Citizen A's private contact info must NOT be exposed to Citizen B!"

    # STEP 15: Citizen B in My Complaints list
    print("\n--- STEP 15: Citizen B opens My Complaints list ---")
    my_b = requests.get(
        f"{BASE_URL}/api/complaints/my",
        headers={"Authorization": f"Bearer {token_b}"},
    ).json()
    assert len(my_b) == 1
    assert my_b[0]["complaint_id"] == dup_id
    assert my_b[0]["status"] == "MERGED"
    assert my_b[0]["master_complaint_id"] == master_id
    print("Citizen B's complaint is retained in My Complaints with status MERGED and linked master ID.")

    # STEP 16: Merged complaint cannot be updated directly
    print("\n--- STEP 16: Cannot update status of a merged complaint directly ---")
    patch_merged = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{dup_id}/status",
        json={"status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    print("Direct update on merged complaint status:", patch_merged.status_code)
    assert patch_merged.status_code == 400, "Direct status change on merged complaint must return 400"

    # STEP 17: Government updates Master Complaint status: REQUESTED -> IN_PROGRESS
    print("\n--- STEP 17: Government updates Master to IN_PROGRESS ---")
    patch_master1 = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{master_id}/status",
        json={"status": "IN_PROGRESS", "admin_notes": "Road repair team dispatched to Metro Gate 3."},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert patch_master1.status_code == 200
    assert patch_master1.json()["status"] == "IN_PROGRESS"

    # STEP 18: Citizen B sees linked master status is now IN_PROGRESS
    print("\n--- STEP 18: Citizen B checks their complaint and sees master IN_PROGRESS ---")
    b_view_prog = requests.get(
        f"{BASE_URL}/api/complaints/{dup_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    ).json()
    print("Citizen B sees master_status:", b_view_prog["master_status"])
    assert b_view_prog["master_status"] == "IN_PROGRESS"

    # STEP 19: Government completes Master Complaint: IN_PROGRESS -> COMPLETED
    print("\n--- STEP 19: Government updates Master to COMPLETED ---")
    patch_master2 = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{master_id}/status",
        json={"status": "COMPLETED", "admin_notes": "Crater asphalted and reinforced."},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert patch_master2.status_code == 200
    assert patch_master2.json()["status"] == "COMPLETED"

    # STEP 20: Citizen B verifies master is COMPLETED
    print("\n--- STEP 20: Citizen B checks their complaint and sees master COMPLETED ---")
    b_view_comp = requests.get(
        f"{BASE_URL}/api/complaints/{dup_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    ).json()
    print("Citizen B sees master_status:", b_view_comp["master_status"])
    assert b_view_comp["master_status"] == "COMPLETED"

    # STEP 21: Government Dashboard Analytics KPI - Duplicate Groups count
    print("\n--- STEP 21: Verify Dashboard KPI - Duplicate Groups ---")
    analytics = requests.get(f"{BASE_URL}/api/analytics/summary").json()
    print("Duplicate Groups count in MongoDB:", analytics.get("duplicate_groups"))
    print("Total Merged Complaints in MongoDB:", analytics.get("merged"))
    assert analytics.get("duplicate_groups", 0) >= 1, "Duplicate groups KPI must be >= 1"
    assert analytics.get("merged", 0) >= 1, "Merged complaints count must be >= 1"

    print("\n==================================================================")
    print(">>> ALL 21 TEST STEPS FOR STRETCH GOAL 1 PASSED WITH 100% SUCCESS! <<<")
    print("==================================================================")

if __name__ == "__main__":
    run_merge_e2e_tests()
