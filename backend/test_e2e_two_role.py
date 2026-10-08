import time
import requests

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== STARTING SMARTCIVIC AI END-TO-END VERIFICATION ===")

    # 0. Health check
    h = requests.get(f"{BASE_URL}/health").json()
    print("0. Health check:", h)
    assert h["status"] == "healthy", "Backend must be healthy"
    assert h["database"] == "connected", "Database must be connected"

    ts = int(time.time())
    email_a = f"citizen_a_{ts}@example.com"
    email_b = f"citizen_b_{ts}@example.com"
    admin_email = "admin@smartcivic.gov"
    admin_pass = "Admin@12345"

    # STEP 1: Register Citizen A & Login
    print("\n--- STEP 1: Register Citizen A ---")
    reg_a = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Citizen Alice",
            "email": email_a,
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    print("Register Citizen A response:", reg_a.status_code)
    assert reg_a.status_code == 201, f"Failed to register Citizen A: {reg_a.text}"
    token_a = reg_a.json()["access_token"]
    user_a = reg_a.json()["user"]
    print("Citizen A registered:", user_a["name"], "Role:", user_a["role"], "ID:", user_a["id"])
    assert user_a["role"] == "CITIZEN", "Registered user role must be CITIZEN"

    # STEP 2: Citizen A submits complaint
    print("\n--- STEP 2: Citizen A submits complaint ---")
    complaint_data = {
        "description": "Large dangerous pothole near Main Bus Terminal causing severe vehicle damage and collision hazard.",
        "citizen_name": "Citizen Alice",
        "location_address": "Main Bus Terminal, Bay 4, Sector 12",
        "latitude": 28.6139,
        "longitude": 77.2090,
    }
    sub_res = requests.post(
        f"{BASE_URL}/api/complaints",
        data=complaint_data,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    print("Complaint submission response:", sub_res.status_code)
    assert sub_res.status_code == 201, f"Failed complaint submission: {sub_res.text}"
    comp_a = sub_res.json()
    complaint_id_a = comp_a["complaint_id"]
    print("Created Complaint:", complaint_id_a)
    print("Status:", comp_a["status"])
    print("Citizen ID linked:", comp_a["citizen_id"])
    print("Assigned Department:", comp_a["ai_analysis"]["department"])
    print("Urgency:", comp_a["ai_analysis"]["urgency"])
    print("Priority Score:", comp_a["ai_analysis"]["priority_score"])
    print("Duplicate Found:", comp_a["duplicate_found"])

    assert comp_a["status"] == "REQUESTED", "Initial status must be REQUESTED"
    assert comp_a["citizen_id"] == user_a["id"], "Complaint must be linked to authenticated Citizen A"
    assert complaint_id_a.startswith("CIV-2026-"), "Complaint ID must follow CIV-2026-XXXXXX format"

    # STEP 3: Citizen A opens My Complaints
    print("\n--- STEP 3: Citizen A opens My Complaints ---")
    my_a = requests.get(
        f"{BASE_URL}/api/complaints/my",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert my_a.status_code == 200
    my_a_list = my_a.json()
    print("Citizen A complaints count:", len(my_a_list))
    assert any(c["complaint_id"] == complaint_id_a for c in my_a_list), "Citizen A must see their own complaint"

    # STEP 4: Register & Login Citizen B
    print("\n--- STEP 4: Register Citizen B & Verify Security Isolation ---")
    reg_b = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "name": "Citizen Bob",
            "email": email_b,
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    user_b = reg_b.json()["user"]
    print("Citizen B registered:", user_b["name"], "Role:", user_b["role"])

    # Citizen B opens My Complaints -> MUST NOT see Citizen A's complaint!
    my_b = requests.get(
        f"{BASE_URL}/api/complaints/my",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert my_b.status_code == 200
    my_b_list = my_b.json()
    print("Citizen B complaints count:", len(my_b_list))
    assert len(my_b_list) == 0, "Citizen B MUST have 0 complaints (must not see Citizen A's complaints!)"

    # Citizen B attempts direct access to Citizen A's complaint -> MUST RETURN 403 FORBIDDEN!
    direct_hack = requests.get(
        f"{BASE_URL}/api/complaints/{complaint_id_a}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    print("Citizen B unauthorized attempt to read Citizen A complaint:", direct_hack.status_code)
    assert direct_hack.status_code == 403, "Citizen B MUST NOT be able to view Citizen A's complaint (403 expected)"

    # Citizen B attempts to access government admin complaints -> MUST RETURN 403 FORBIDDEN!
    admin_hack = requests.get(
        f"{BASE_URL}/api/admin/complaints",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    print("Citizen B unauthorized attempt to access admin endpoints:", admin_hack.status_code)
    assert admin_hack.status_code == 403, "Citizen B MUST NOT access admin endpoints"

    # STEP 5: Login as Government Official (ADMIN)
    print("\n--- STEP 5: Login as Government Official ---")
    login_admin = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": admin_email, "password": admin_pass},
    )
    assert login_admin.status_code == 200, f"Government Official login failed: {login_admin.text}"
    token_admin = login_admin.json()["access_token"]
    user_admin = login_admin.json()["user"]
    print("Government Official logged in:", user_admin["name"], "Role:", user_admin["role"])
    assert user_admin["role"] == "ADMIN", "Role must be ADMIN"

    # Government Official sees ALL complaints including Citizen A's
    admin_list = requests.get(
        f"{BASE_URL}/api/admin/complaints",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert admin_list.status_code == 200
    admin_comps = admin_list.json()
    print("Total complaints visible to Government Official:", len(admin_comps))
    assert any(c["complaint_id"] == complaint_id_a for c in admin_comps), "Government Official MUST see Citizen A complaint"

    # STEP 6: Government opens complaint details
    print("\n--- STEP 6: Government inspects Complaint Details ---")
    admin_detail = requests.get(
        f"{BASE_URL}/api/admin/complaints/{complaint_id_a}",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert admin_detail.status_code == 200
    comp_detail = admin_detail.json()
    print("Inspected Complaint:", comp_detail["complaint_id"])
    print("Category:", comp_detail["ai_analysis"]["category"])
    print("Department:", comp_detail["ai_analysis"]["department"])
    print("Recommended solution:", comp_detail["ai_analysis"]["recommended_solution"][:80], "...")
    print("Resolution steps count:", len(comp_detail["ai_analysis"]["resolution_steps"]))

    # STEP 7: Government updates status: REQUESTED -> IN_PROGRESS
    print("\n--- STEP 7: Government updates status to IN_PROGRESS ---")
    patch1 = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{complaint_id_a}/status",
        json={"status": "IN_PROGRESS", "admin_notes": "Field Officer Kumar dispatched with patch repair truck."},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert patch1.status_code == 200, f"Status patch failed: {patch1.text}"
    print("Status update result:", patch1.json())
    assert patch1.json()["status"] == "IN_PROGRESS"

    # STEP 8: Citizen A verifies updated status: IN_PROGRESS
    print("\n--- STEP 8: Citizen A views complaint and sees IN_PROGRESS ---")
    chk_a1 = requests.get(
        f"{BASE_URL}/api/complaints/{complaint_id_a}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert chk_a1.status_code == 200
    print("Citizen A sees status:", chk_a1.json()["status"])
    assert chk_a1.json()["status"] == "IN_PROGRESS"

    # STEP 9: Government updates status: IN_PROGRESS -> COMPLETED
    print("\n--- STEP 9: Government updates status to COMPLETED ---")
    patch2 = requests.patch(
        f"{BASE_URL}/api/admin/complaints/{complaint_id_a}/status",
        json={"status": "COMPLETED", "admin_notes": "Asphalt patch applied and road inspected. Hazard eliminated."},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert patch2.status_code == 200
    print("Status update result:", patch2.json())
    assert patch2.json()["status"] == "COMPLETED"

    # STEP 10: Citizen A verifies completed status: COMPLETED
    print("\n--- STEP 10: Citizen A views complaint and sees COMPLETED ---")
    chk_a2 = requests.get(
        f"{BASE_URL}/api/complaints/{complaint_id_a}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert chk_a2.status_code == 200
    print("Citizen A sees status:", chk_a2.json()["status"])
    assert chk_a2.json()["status"] == "COMPLETED"

    # STEP 11: Test Duplicate Detection with similar complaint
    print("\n--- STEP 11: Testing Duplicate Complaint Detection ---")
    dup_submission = requests.post(
        f"{BASE_URL}/api/complaints",
        data={
            "description": "Deep broken pothole near Main Bus Terminal with road damage swerving cars.",
            "citizen_name": "Citizen Bob",
            "location_address": "Main Bus Terminal, Sector 12",
            "latitude": 28.6140,
            "longitude": 77.2091,
        },
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert dup_submission.status_code == 201
    dup_res = dup_submission.json()
    print("Second complaint created:", dup_res["complaint_id"])
    print("Duplicate Found:", dup_res["duplicate_found"])
    print("Related Complaints:", dup_res["duplicate_complaint_ids"])
    if dup_res["duplicate_details"]:
        print("Duplicate details top score:", dup_res["duplicate_details"][0]["similarity_score"], "%")

    # STEP 12: Verify Analytics
    print("\n--- STEP 12: Verify Real MongoDB Analytics ---")
    analytics_res = requests.get(f"{BASE_URL}/api/analytics/summary")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    print("Analytics total complaints:", analytics_data["total_complaints"])
    print("Status breakdown:", analytics_data["status_chart"])
    print("High priority:", analytics_data["high_priority"])
    print("Critical:", analytics_data["critical"])

    print("\n=======================================================")
    print(">>> ALL END-TO-END TESTS PASSED WITH 100% SUCCESS! <<<")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
